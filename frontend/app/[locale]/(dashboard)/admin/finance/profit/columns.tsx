"use client";

import React from "react";
import {
  CalendarIcon,
  Coins,
  DollarSign,
  Hash,
  TrendingUp,
  ClipboardList,
  Link as LinkIcon,
} from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/routing";
import type { ViewConfig } from "@/components/blocks/data-table/types/table";
import { useTranslations } from "next-intl";
export function useColumns(): ColumnDefinition[] {
  const tCommon = useTranslations("common");
  const tDashboardAdmin = useTranslations("dashboard_admin");
  const tExt = useTranslations("ext");
  return [
    {
      key: "id",
      title: "ID",
      type: "text",
      icon: ClipboardList,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("unique_identifier_for_the_profit_record"),
      priority: 1,
    },
    {
      key: "transaction",
      title: tCommon("transaction"),
      type: "custom",
      icon: LinkIcon,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("associated_transaction"),
      render: (value: any, row: any) => {
        const tx = row?.transaction || value;
        if (tx && typeof tx === "object" && tx.id) {
          return (
            <Link
              href={`/admin/finance/transaction/${tx.id}`}
              className="text-primary hover:underline"
            >
              {tx.id}
            </Link>
          );
        }
        return "N/A";
      },
      priority: 1,
    },
    {
      key: "type",
      title: tCommon("type"),
      type: "select",
      icon: TrendingUp,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("profit_type"),
      render: {
        type: "badge",
        config: {
          withDot: true,
          variant: (value: string) => {
            switch (value.toUpperCase()) {
              case "DEPOSIT":
                return "success";
              case "WITHDRAW":
                return "danger";
              case "TRANSFER":
                return "warning";
              case "BINARY_ORDER":
                return "info";
              case "EXCHANGE_ORDER":
                return "primary";
              case "INVESTMENT":
                return "secondary";
              case "AI_INVESTMENT":
                return "secondary";
              case "FOREX_DEPOSIT":
                return "success";
              case "FOREX_WITHDRAW":
                return "danger";
              case "FOREX_INVESTMENT":
                return "secondary";
              case "ICO_CONTRIBUTION":
                return "info";
              case "STAKING":
                return "primary";
              case "P2P_TRADE":
                return "warning";
              case "DEX_SWAP":
                return "info";
              /*
                DISTINCT TONES, because they are distinct kinds of money.
                DEX_SWAP is a routed-trade fee; DEX_LP_FEE is yield on capital
                the operator put at risk, and it sits beside an impermanent loss
                that is never in this table; DEX_LISTING is an invoice.
              */
              case "DEX_LP_FEE":
                return "primary";
              case "DEX_LISTING":
                return "success";
              default:
                return "default";
            }
          },
        },
      },
      options: [
        { value: "DEPOSIT", label: tCommon("deposit") },
        { value: "WITHDRAW", label: tCommon("withdraw") },
        { value: "TRANSFER", label: tCommon("transfer") },
        { value: "BINARY_ORDER", label: tCommon("binary_order") },
        { value: "EXCHANGE_ORDER", label: tCommon("exchange_order") },
        { value: "INVESTMENT", label: tCommon("investment") },
        { value: "AI_INVESTMENT", label: tCommon("ai_investment") },
        { value: "FOREX_DEPOSIT", label: tCommon("forex_deposit") },
        { value: "FOREX_WITHDRAW", label: tCommon("forex_withdraw") },
        { value: "FOREX_INVESTMENT", label: tCommon("forex_investment") },
        { value: "ICO_CONTRIBUTION", label: tCommon("ico_contribution") },
        { value: "STAKING", label: tCommon("staking") },
        { value: "P2P_TRADE", label: tCommon("p2p_trade") },
        // This list is what the FILTER DROPDOWN renders. Without the entry an
        // operator can never filter to DEX revenue, while every test and the
        // badge switch above stay perfectly green.
        { value: "DEX_SWAP", label: tCommon("dex_swap") },
        { value: "DEX_LP_FEE", label: tCommon("dex_lp_fee") },
        { value: "DEX_LISTING", label: tCommon("dex_listing") },
      ],
      priority: 1,
    },
    {
      key: "amount",
      title: tCommon("amount"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("profit_amount"),
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
      description: tDashboardAdmin("currency_of_the_profit"),
      priority: 1,
    },
    {
      key: "chain",
      title: tExt("chain"),
      type: "text",
      icon: ClipboardList,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("blockchain_or_chain_if_applicable"),
      expandedOnly: true,
      priority: 2,
    },
    {
      key: "description",
      title: tCommon("description"),
      type: "text",
      icon: ClipboardList,
      sortable: false,
      searchable: true,
      filterable: false,
      description: tDashboardAdmin("additional_description"),
      expandedOnly: true,
      priority: 3,
    },
    {
      key: "createdAt",
      title: tCommon("created_at"),
      type: "date",
      icon: CalendarIcon,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("date_when_the_profit_record_was_created"),
      render: {
        type: "date",
        format: "PPP",
      },
      expandedOnly: true,
      priority: 2,
    },
  ];
}

/**
 * mysql2 hands back DECIMAL columns as STRINGS, so `amount` arrives as "12.50"
 * and any comparison against 0 is a string comparison. Coerce once.
 */
function toNumber(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * The full figure, never abbreviated — the same call the summary dashboard on
 * this page makes. Precision follows magnitude because one ledger holds both
 * fiat fees and crypto dust.
 */
function formatAmount(value: any, signed = false): string {
  const amount = toNumber(value);
  if (amount === null) return "—";
  const abs = Math.abs(amount);
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: abs > 0 && abs < 1 ? 8 : 2,
    signDisplay: signed ? "exceptZero" : "auto",
  });
}

/**
 * The view dialog for an admin profit record.
 *
 * A ledger row's amount and its currency are one figure, and the flat grid put
 * them in two tiles a column apart. It also gave a NEGATIVE amount — which is
 * what `recordPlatformLoss` writes, a payout rather than a fee — the same ink as
 * a positive one, so a payout read as revenue. The amount becomes a signed stat
 * carrying its currency, the direction becomes a header pill, and the source
 * transaction gets a section of its own because it is the only field an
 * operator ever navigates from.
 */
export function useViewConfig(): ViewConfig {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");

  return React.useMemo<ViewConfig>(
    () => ({
      size: "3xl",

      /* The table's primary column resolves to `transaction`, which this route
         never joins, so the default header fell back to the bare record UUID.
         What the row IS, is the flow that produced it. */
      title: (row) => (
        <span className="capitalize">
          {String(row.type ?? "")
            .toLowerCase()
            .replace(/_/g, " ") || t("profit_record")}
        </span>
      ),
      subtitle: (row) =>
        row.createdAt
          ? `Recorded ${format(new Date(row.createdAt), "PPp")}`
          : t("recording_date_unknown"),

      badges: (row) => {
        const amount = toNumber(row.amount);
        const payout = amount !== null && amount < 0;
        return (
          <Badge
            tone={payout ? "destructive" : "success"}
            appearance="soft"
          >
            {payout ? t("platform_payout") : t("fee_collected")}
          </Badge>
        );
      },

      stats: [
        {
          label: tCommon("amount"),
          icon: DollarSign,
          value: (row) => {
            const amount = toNumber(row.amount);
            return (
              <span
                className={
                  amount !== null && amount < 0
                    ? "text-destructive"
                    : "text-foreground"
                }
              >
                {formatAmount(row.amount, true)}
              </span>
            );
          },
        },
        {
          label: tCommon("currency"),
          icon: Coins,
          value: (row) => row.currency || "—",
        },
        {
          label: tExt("chain"),
          icon: ClipboardList,
          // On-chain flows only. A dash here would say "no chain recorded" for
          // every fiat and internal-transfer fee, which is most of the ledger.
          condition: (row) => Boolean(row.chain),
          value: (row) => row.chain,
        },
      ],

      sections: [
        {
          id: "profit-source",
          title: tCommon("source"),
          description: t("the_transaction_this_fee_was_taken_from"),
          icon: LinkIcon,
          columns: 2,
          fields: [
            {
              key: "transactionId",
              title: tCommon("transaction"),
              icon: LinkIcon,
              // The `transaction` COLUMN renders a link off a joined relation
              // the list route does not include, so it always printed "N/A".
              // The foreign key is on the row and links to the same place.
              render: (value) =>
                value ? (
                  <Link
                    href={`/admin/finance/transaction/${value}`}
                    className="font-mono text-xs break-all text-primary hover:underline"
                  >
                    {value}
                  </Link>
                ) : (
                  "—"
                ),
            },
            { key: "id", title: "ID", icon: Hash, copyable: true },
          ],
        },
        {
          id: "profit-notes",
          title: tCommon("description"),
          icon: ClipboardList,
          columns: 1,
          fields: [
            {
              key: "description",
              fullWidth: true,
              emptyText: tCommon("no_description_recorded"),
            },
          ],
        },
      ],
    }),
    [tCommon, tExt]
  );
}
