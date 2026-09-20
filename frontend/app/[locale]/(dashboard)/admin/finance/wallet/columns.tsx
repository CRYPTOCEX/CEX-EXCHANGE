"use client";

import React from "react";
import {
  Shield,
  User,
  DollarSign,
  ClipboardList,
  CalendarIcon,
  Wallet,
  Fingerprint,
  Lock,
  Coins,
  Link2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import type { ViewConfig } from "@/components/blocks/data-table/types/table";
// One shared renderer, because this page and the customer wallets page had
// drifted into two copies of it — this one had lost the label/value separators
// and the decimal formatting, so it painted "Address0x1234…" and "Balance0".
import { renderEcoAddresses } from "@/components/blocks/wallet/eco-addresses";

export function useColumns(): ColumnDefinition[] {
  const tCommon = useTranslations("common");
  const tDashboardAdmin = useTranslations("dashboard_admin");
  return [
    {
      key: "id",
      title: "ID",
      type: "text",
      icon: Shield,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tCommon("unique_wallet_identifier"),
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "user",
      title: tCommon("user"),
      type: "compound",
      icon: User,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("user_associated_with_this_wallet"),
      render: {
        type: "compound",
        config: {
          image: {
            key: "avatar",
            fallback: "/img/placeholder.svg",
            type: "image",
            title: tCommon("avatar"),
            description: tCommon("user_avatar"),
          },
          primary: {
            key: ["firstName", "lastName"],
            title: [tCommon("first_name"), tCommon("last_name")],
            description: [tDashboardAdmin("user_first_name"), tDashboardAdmin("user_last_name")],
            icon: User,
          },
          secondary: {
            key: "email",
            title: tCommon("email"),
            icon: ClipboardList,
          },
        },
      },
      priority: 1,
    },
    {
      key: "type",
      title: tCommon("type"),
      type: "select",
      icon: Wallet,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("type_of_wallet_fiat_for_fiat"),
      render: {
        type: "badge",
        config: {
          withDot: true,
          variant: (value: string) => {
            switch (value.toUpperCase()) {
              case "FIAT":
                return "success";
              case "SPOT":
                return "primary";
              case "ECO":
                return "info";
              case "FUTURES":
                return "warning";
              default:
                return "default";
            }
          },
        },
      },
      options: [
        {
          value: "FIAT",
          label: tCommon("fiat"),
        },
        {
          value: "SPOT",
          label: tCommon("spot"),
        },
        {
          value: "ECO",
          label: tCommon("eco"),
        },
        {
          value: "FUTURES",
          label: tCommon("futures"),
        },
      ],
      priority: 1,
    },
    {
      key: "currency",
      title: tCommon("currency"),
      type: "text",
      icon: DollarSign,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("currency_symbol_for_this_wallet_e_g_btc_usd_eth"),
      priority: 1,
    },
    {
      key: "balance",
      title: tCommon("balance"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: false,
      filterable: true,
      condition: (values) => !["ECO", "FUTURES"].includes(values.type),
      description: tDashboardAdmin("available_balance_in_this_wallet"),
      priority: 1,
    },
    {
      key: "inOrder",
      title: tCommon("in_order"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: false,
      filterable: true,
      condition: (values) => !["ECO", "FUTURES"].includes(values.type),
      description: tDashboardAdmin("amount_currently_locked_in_open_orders"),
      priority: 2,
    },
    {
      key: "address",
      title: tCommon("address"),
      type: "custom",
      icon: ClipboardList,
      sortable: false,
      searchable: false,
      filterable: false,
      description: tDashboardAdmin("blockchain_addresses_associated_with_this_wallet"),
      render: {
        type: "custom",
        render: (value: any, row: any) => renderEcoAddresses(value, row),
      },
      priority: 2,
      expandedOnly: true,
    },
    {
      key: "status",
      title: tCommon("status"),
      type: "boolean",
      icon: Shield,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("whether_this_wallet_is_active_and_usable"),
      priority: 1,
    },
    {
      key: "createdAt",
      title: tCommon("created_at"),
      type: "date",
      icon: CalendarIcon,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("date_when_the_wallet_was_created"),
      render: {
        type: "date",
        format: "PPP",
      },
      priority: 3,
      expandedOnly: true,
    },
  ];
}

/* -------------------------------------------------------------------------- *
 * View dialog
 *
 * A wallet is three numbers and an owner. The numbers (available, locked in
 * open orders, and the total the two add up to — which no column shows at all)
 * lead; the type and enabled flags are pills; and the ECO address map, the one
 * genuinely structured value here, gets its own full-width block instead of
 * being crushed into a half-width key/value tile.
 * -------------------------------------------------------------------------- */

/** Mirrors the hues the `type` column already paints in the table. */
function walletTypeTone(type?: string) {
  switch (String(type ?? "").toUpperCase()) {
    case "FIAT":
      return "success" as const;
    case "SPOT":
      return "primary" as const;
    case "ECO":
      return "info" as const;
    case "FUTURES":
      return "warning" as const;
    default:
      return "neutral" as const;
  }
}

/**
 * `balance` and `inOrder` are DECIMAL(36,18), and mysql2 hands every DECIMAL
 * back as a STRING — arithmetic on them without this concatenates instead of
 * adding, and a bare `String(...)` prints "12.500000000000000000".
 */
function toNumber(value: unknown): number {
  const num = typeof value === "number" ? value : parseFloat(String(value ?? ""));
  return Number.isFinite(num) ? num : 0;
}

function fmtAmount(value: unknown): string {
  return toNumber(value).toLocaleString(undefined, { maximumFractionDigits: 8 });
}

export function useViewConfig(): ViewConfig {
  const t = useTranslations("common");
  return React.useMemo<ViewConfig>(
    () => ({
      size: "3xl",

      // The user compound is the primary column, so the header already carries
      // the owner's avatar, name and email; this says WHICH of that user's
      // wallets is open.
      subtitle: (row) => `${row.currency ?? ""} wallet`.trim(),

      badges: (row) => (
        <>
          <Badge tone={walletTypeTone(row.type)} appearance="soft">
            {row.type}
          </Badge>
          <Badge tone={row.status ? "success" : "neutral"} appearance="soft">
            {row.status ? t("active") : t("disabled")}
          </Badge>
          {row.deletedAt && (
            <Badge tone="destructive" appearance="soft">
              Deleted
            </Badge>
          )}
        </>
      ),

      stats: [
        {
          label: t("available"),
          icon: DollarSign,
          value: (row) => `${fmtAmount(row.balance)} ${row.currency ?? ""}`.trim(),
        },
        {
          label: t("in_orders"),
          icon: Lock,
          tone: "warning",
          value: (row) => `${fmtAmount(row.inOrder)} ${row.currency ?? ""}`.trim(),
        },
        {
          label: t("total"),
          icon: Coins,
          tone: "primary",
          value: (row) =>
            `${fmtAmount(toNumber(row.balance) + toNumber(row.inOrder))} ${row.currency ?? ""}`.trim(),
        },
        {
          label: t("opened"),
          icon: CalendarIcon,
          value: (row) =>
            row.createdAt ? format(new Date(row.createdAt), "MMM d, yyyy") : "—",
        },
      ],

      sections: [
        {
          id: "identifiers",
          title: t("identifiers"),
          icon: Fingerprint,
          columns: 2,
          fields: [
            { key: "id", title: t("wallet_id"), icon: Wallet },
            {
              // `userId` is stripped from the payload by the endpoint, but the
              // joined `user` object still carries it — and it is the value an
              // operator pastes into the CRM when reconciling a balance.
              key: "user.id",
              title: t("user_id"),
              icon: User,
              copyable: true,
              render: (value) => (
                <span className="font-mono text-xs break-all">{String(value)}</span>
              ),
            },
          ],
        },
        {
          id: "addresses",
          title: t("on_chain_addresses"),
          description: t("deposit_addresses_and_per_chain_balances"),
          icon: Link2,
          columns: 1,
          // The renderer itself prints "N/A" for every non-ECO wallet, which is
          // a heading and a tile spent saying nothing.
          condition: (row) => row.type === "ECO" && Boolean(row.address),
          fields: [{ key: "address", title: t("chains"), fullWidth: true }],
        },
      ],
    }),
    []
  );
}
