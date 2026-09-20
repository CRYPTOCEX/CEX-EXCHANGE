"use client";

import {
  Shield,
  User,
  DollarSign,
  ClipboardList,
  CalendarIcon,
  Wallet,
  ArrowRightLeft,
  Fingerprint,
  Receipt,
} from "lucide-react";
import React from "react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import type { ViewConfig } from "@/components/blocks/data-table/types/table";

// Mapping for friendly labels
const metadataLabels: Record<string, string> = {
  fromWallet: "From Wallet",
  toWallet: "To Wallet",
  fromCurrency: "From Currency",
  toCurrency: "To Currency",
};

export function RenderTransactionMetadata({ value }: { value: any }) {
  const tCommon = useTranslations("common");
  if (!value) return "N/A";

  let parsed: Record<string, any>;
  try {
    parsed = typeof value === "string" ? JSON.parse(value) : value;
  } catch (error) {
    return <span className="text-destructive">{tCommon("invalid_metadata")}</span>;
  }

  const entries = Object.entries(parsed);
  if (entries.length === 0) return "None";

  /* A two-column GRID, not `flex justify-between`. Half these values are
     idempotency keys and reference ids ~60 characters long: with
     justify-between they wrapped onto a line that started underneath the
     label, so the key and its value overlapped and neither was readable. The
     grid gives the label its own column and lets the value wrap inside its
     own. */
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-xs font-semibold mb-2">{tCommon("metadata")}</p>
      <dl className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)] gap-x-3 gap-y-1 text-xs">
        {entries.map(([key, val]) => (
          <React.Fragment key={key}>
            <dt className="font-medium break-words">
              {metadataLabels[key] || key}
            </dt>
            <dd className="text-muted-foreground min-w-0 break-words">
              {typeof val === "object" && val !== null
                ? JSON.stringify(val)
                : String(val ?? "")}
            </dd>
          </React.Fragment>
        ))}
      </dl>
    </div>
  );
}

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
      description: tDashboardAdmin("unique_identifier_for_the_transaction"),
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
      description: tDashboardAdmin("user_associated_with_the_transaction"),
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
            description: [tCommon('users_first_name'), tCommon('users_last_name')],
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
      key: "wallet.currency",
      title: tCommon("wallet"),
      type: "text",
      icon: DollarSign,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("associated_wallet"),
      render: (value: any, row: any) => {
        const wallet = row?.wallet;
        if (!wallet) return value || "N/A";
        if (wallet.currency && wallet.type) {
          return `${wallet.currency} (${wallet.type})`;
        }
        return wallet.currency || value || "N/A";
      },
      priority: 2,
    },
    {
      key: "type",
      title: tCommon("type"),
      type: "select",
      icon: ArrowRightLeft,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("type_of_transaction_deposit_withdrawal_transfer"),
      render: {
        type: "badge",
        config: {
          withDot: true,
          variant: (value: string) => {
            switch (value?.toUpperCase()) {
              case "DEPOSIT":
                return "success";
              case "WITHDRAW":
                return "danger";
              case "OUTGOING_TRANSFER":
                return "warning";
              case "INCOMING_TRANSFER":
                return "info";
              case "PAYMENT":
                return "primary";
              case "REFUND":
                return "secondary";
              case "BINARY_ORDER":
                return "info";
              case "EXCHANGE_ORDER":
                return "primary";
              case "INVESTMENT":
                return "secondary";
              case "INVESTMENT_ROI":
                return "secondary";
              case "AI_INVESTMENT":
                return "secondary";
              case "AI_INVESTMENT_ROI":
                return "secondary";
              case "INVOICE":
                return "info";
              case "FOREX_DEPOSIT":
                return "success";
              case "FOREX_WITHDRAW":
                return "danger";
              case "FOREX_INVESTMENT":
                return "secondary";
              case "FOREX_INVESTMENT_ROI":
                return "secondary";
              case "ICO_CONTRIBUTION":
                return "info";
              case "REFERRAL_REWARD":
                return "primary";
              case "STAKING":
                return "info";
              case "STAKING_REWARD":
                return "info";
              case "P2P_OFFER_TRANSFER":
                return "warning";
              case "P2P_TRADE":
                return "primary";
              case "FAILED":
                return "danger";
              default:
                return "default";
            }
          },
          options: [
            { value: "FAILED", label: tCommon("failed") },
            { value: "DEPOSIT", label: tCommon("deposit") },
            { value: "WITHDRAW", label: tCommon("withdraw") },
            { value: "OUTGOING_TRANSFER", label: tCommon("outgoing_transfer") },
            { value: "INCOMING_TRANSFER", label: tCommon("incoming_transfer") },
            { value: "PAYMENT", label: tCommon("payment") },
            { value: "REFUND", label: tCommon("refund") },
            { value: "BINARY_ORDER", label: tCommon("binary_order") },
            { value: "EXCHANGE_ORDER", label: tCommon("exchange_order") },
            { value: "INVESTMENT", label: tCommon("investment") },
            { value: "INVESTMENT_ROI", label: tCommon("investment_roi") },
            { value: "AI_INVESTMENT", label: tCommon("ai_investment") },
            { value: "AI_INVESTMENT_ROI", label: tCommon("ai_investment_roi") },
            { value: "INVOICE", label: tCommon("invoice") },
            { value: "FOREX_DEPOSIT", label: tCommon("forex_deposit") },
            { value: "FOREX_WITHDRAW", label: tCommon("forex_withdraw") },
            { value: "FOREX_INVESTMENT", label: tCommon("forex_investment") },
            { value: "FOREX_INVESTMENT_ROI", label: tCommon("forex_investment_roi") },
            { value: "ICO_CONTRIBUTION", label: tCommon("ico_contribution") },
            { value: "REFERRAL_REWARD", label: tCommon("referral_reward") },
            { value: "STAKING", label: tCommon("staking") },
            { value: "STAKING_REWARD", label: tCommon("staking_reward") },
            { value: "P2P_OFFER_TRANSFER", label: tCommon("p2p_offer_transfer") },
            { value: "P2P_TRADE", label: tCommon("p2p_trade") },
          ],
        },
      },
      options: [
        { value: "FAILED", label: tCommon("failed") },
        { value: "DEPOSIT", label: tCommon("deposit") },
        { value: "WITHDRAW", label: tCommon("withdraw") },
        { value: "OUTGOING_TRANSFER", label: tCommon("outgoing_transfer") },
        { value: "INCOMING_TRANSFER", label: tCommon("incoming_transfer") },
        { value: "PAYMENT", label: tCommon("payment") },
        { value: "REFUND", label: tCommon("refund") },
        { value: "BINARY_ORDER", label: tCommon("binary_order") },
        { value: "EXCHANGE_ORDER", label: tCommon("exchange_order") },
        { value: "INVESTMENT", label: tCommon("investment") },
        { value: "INVESTMENT_ROI", label: tCommon("investment_roi") },
        { value: "AI_INVESTMENT", label: tCommon("ai_investment") },
        { value: "AI_INVESTMENT_ROI", label: tCommon("ai_investment_roi") },
        { value: "INVOICE", label: tCommon("invoice") },
        { value: "FOREX_DEPOSIT", label: tCommon("forex_deposit") },
        { value: "FOREX_WITHDRAW", label: tCommon("forex_withdraw") },
        { value: "FOREX_INVESTMENT", label: tCommon("forex_investment") },
        { value: "FOREX_INVESTMENT_ROI", label: tCommon("forex_investment_roi") },
        { value: "ICO_CONTRIBUTION", label: tCommon("ico_contribution") },
        { value: "REFERRAL_REWARD", label: tCommon("referral_reward") },
        { value: "STAKING", label: tCommon("staking") },
        { value: "STAKING_REWARD", label: tCommon("staking_reward") },
        { value: "P2P_OFFER_TRANSFER", label: tCommon("p2p_offer_transfer") },
        { value: "P2P_TRADE", label: tCommon("p2p_trade") },
      ],
      priority: 1,
    },
    {
      key: "status",
      title: tCommon("status"),
      type: "select",
      icon: Shield,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("current_status_of_the_transaction"),
      render: {
        type: "badge",
        // No local `variant`: the hue comes from `lib/status-tone.ts`. Adding one
        // back here silently overrides the platform's canonical status colours.
        config: {
          withDot: true,
          options: [
            { value: "PENDING", label: tCommon("pending") },
            { value: "COMPLETED", label: tCommon("completed") },
            { value: "FAILED", label: tCommon("failed") },
            { value: "CANCELLED", label: tCommon("cancelled") },
            { value: "EXPIRED", label: tCommon("expired") },
            { value: "REJECTED", label: tCommon("rejected") },
            { value: "REFUNDED", label: tCommon("refunded") },
            { value: "FROZEN", label: tCommon("frozen") },
            { value: "PROCESSING", label: tCommon("processing") },
            { value: "TIMEOUT", label: tCommon("timeout") },
          ],
        },
      },
      options: [
        { value: "PENDING", label: tCommon("pending") },
        { value: "COMPLETED", label: tCommon("completed") },
        { value: "FAILED", label: tCommon("failed") },
        { value: "CANCELLED", label: tCommon("cancelled") },
        { value: "EXPIRED", label: tCommon("expired") },
        { value: "REJECTED", label: tCommon("rejected") },
        { value: "REFUNDED", label: tCommon("refunded") },
        { value: "FROZEN", label: tCommon("frozen") },
        { value: "PROCESSING", label: tCommon("processing") },
        { value: "TIMEOUT", label: tCommon("timeout") },
      ],
      priority: 1,
    },
    {
      key: "amount",
      title: tCommon("amount"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tDashboardAdmin("transaction_amount_in_the_wallets_currency"),
      priority: 1,
    },
    {
      key: "fee",
      title: tCommon("fee"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tDashboardAdmin("fee_charged_for_this_transaction"),
      priority: 2,
      expandedOnly: true,
    },
    {
      key: "description",
      title: tCommon("description"),
      type: "text",
      icon: ClipboardList,
      sortable: false,
      searchable: true,
      filterable: false,
      description: tDashboardAdmin("human_readable_description_of_the_transaction"),
      priority: 2,
      expandedOnly: true,
    },
    {
      key: "referenceId",
      title: tCommon("reference_id"),
      type: "text",
      icon: ClipboardList,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("external_reference_id_from_payment_processor"),
      priority: 2,
      expandedOnly: true,
    },
    {
      key: "createdAt",
      title: tCommon("created_at"),
      type: "date",
      icon: CalendarIcon,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("date_when_the_transaction_was_created"),
      priority: 2,
      expandedOnly: true,
      render: { type: "date", format: "PPP", fullDate: true },
    },
    {
      key: "metadata",
      title: tCommon("metadata"),
      type: "custom",
      icon: ClipboardList,
      sortable: false,
      searchable: false,
      filterable: false,
      description: tDashboardAdmin("additional_transaction_data_in_json_format"),
      render: {
        type: "custom",
        render: (value: any) => <RenderTransactionMetadata value={value} />,
        title: false,
      },
      priority: 2,
      expandedOnly: true,
    },
  ];
}

/* -------------------------------------------------------------------------- *
 * View dialog
 *
 * A transaction is a money movement, not a bag of columns. The four figures an
 * operator opens the row for — how much, what it cost, out of which wallet,
 * when — go in the stat strip; type and status are pills beside the title; and
 * the two free-form blocks (the description and the JSON metadata payload) get
 * the full width that the old flat 2-column grid never gave them.
 *
 * The user compound is the table's primary column, so the header already
 * renders the avatar/name/email plate — it is deliberately NOT repeated below.
 * -------------------------------------------------------------------------- */

/** Types that CREDIT the user's wallet. */
const CREDIT_TYPES = new Set([
  "DEPOSIT",
  "FOREX_DEPOSIT",
  "INCOMING_TRANSFER",
  "REFUND",
  "INVESTMENT_ROI",
  "AI_INVESTMENT_ROI",
  "FOREX_INVESTMENT_ROI",
  "REFERRAL_REWARD",
  "STAKING_REWARD",
]);

/** Types that DEBIT it. */
const DEBIT_TYPES = new Set([
  "WITHDRAW",
  "FOREX_WITHDRAW",
  "OUTGOING_TRANSFER",
  "PAYMENT",
  "INVESTMENT",
  "AI_INVESTMENT",
  "FOREX_INVESTMENT",
  "ICO_CONTRIBUTION",
  "STAKING",
  "P2P_OFFER_TRANSFER",
  "INVOICE",
]);

/**
 * Direction ink for the amount.
 *
 * `ViewStatConfig.tone` is a static field, but the direction of a transaction
 * is a property of the ROW — so the tone is applied as a semantic token class
 * on the value itself rather than on the tile.
 */
function amountInk(type?: string): string {
  const key = String(type ?? "").toUpperCase();
  if (CREDIT_TYPES.has(key)) return "text-success";
  if (DEBIT_TYPES.has(key)) return "text-destructive";
  return "";
}

/** Mirrors the hues the `type` column already paints in the table. */
function typeTone(type?: string) {
  switch (String(type ?? "").toUpperCase()) {
    case "DEPOSIT":
    case "FOREX_DEPOSIT":
      return "success" as const;
    case "WITHDRAW":
    case "FOREX_WITHDRAW":
    case "FAILED":
      return "destructive" as const;
    case "OUTGOING_TRANSFER":
    case "P2P_OFFER_TRANSFER":
      return "warning" as const;
    case "INCOMING_TRANSFER":
    case "BINARY_ORDER":
    case "INVOICE":
    case "ICO_CONTRIBUTION":
    case "STAKING":
    case "STAKING_REWARD":
      return "info" as const;
    case "PAYMENT":
    case "EXCHANGE_ORDER":
    case "REFERRAL_REWARD":
    case "P2P_TRADE":
      return "primary" as const;
    default:
      return "neutral" as const;
  }
}

function statusTone(status?: string) {
  switch (String(status ?? "").toUpperCase()) {
    case "COMPLETED":
      return "success" as const;
    case "PENDING":
    case "PROCESSING":
    case "FROZEN":
      return "warning" as const;
    case "FAILED":
    case "CANCELLED":
    case "REJECTED":
    case "EXPIRED":
    case "TIMEOUT":
      return "destructive" as const;
    case "REFUNDED":
      return "info" as const;
    default:
      return "neutral" as const;
  }
}

/** ENUM_CASE → "enum case", so a `capitalize` class can title it. */
function humanize(value?: string): string {
  return String(value ?? "").toLowerCase().replace(/_/g, " ");
}

/**
 * `amount` and `fee` are DECIMAL(36,18), and mysql2 hands every DECIMAL back as
 * a STRING — so `row.amount.toFixed()` would throw and a bare `String(...)`
 * prints "12.500000000000000000".
 */
function fmtAmount(value: unknown): string {
  const num = typeof value === "number" ? value : parseFloat(String(value ?? ""));
  if (!Number.isFinite(num)) return "0";
  return num.toLocaleString(undefined, { maximumFractionDigits: 8 });
}

export function useViewConfig(): ViewConfig {
  const tCommon = useTranslations("common");
  return React.useMemo<ViewConfig>(
    () => ({
      size: "3xl",

      badges: (row) => (
        <>
          <Badge tone={typeTone(row.type)} appearance="soft" className="capitalize">
            {humanize(row.type)}
          </Badge>
          <Badge tone={statusTone(row.status)} appearance="soft" className="capitalize">
            {humanize(row.status)}
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
          label: tCommon("amount"),
          icon: DollarSign,
          value: (row) => (
            <span className={amountInk(row.type)}>
              {fmtAmount(row.amount)} {row.wallet?.currency ?? ""}
            </span>
          ),
        },
        {
          label: tCommon("fee"),
          icon: Receipt,
          value: (row) =>
            `${fmtAmount(row.fee)} ${row.wallet?.currency ?? ""}`.trim(),
        },
        {
          label: tCommon("wallet"),
          icon: Wallet,
          value: (row) => row.wallet?.type ?? "—",
        },
        {
          label: tCommon("created"),
          icon: CalendarIcon,
          value: (row) =>
            row.createdAt ? format(new Date(row.createdAt), "MMM d, yyyy HH:mm") : "—",
        },
      ],

      sections: [
        {
          id: "description",
          title: tCommon("description"),
          icon: ClipboardList,
          columns: 1,
          // A lone em-dash tile under a heading is noise; drop the block when
          // the ledger entry carries no narration at all.
          condition: (row) => Boolean(row.description),
          fields: [{ key: "description", fullWidth: true }],
        },
        {
          id: "identifiers",
          title: tCommon("identifiers"),
          icon: Fingerprint,
          columns: 2,
          fields: [
            { key: "id", title: tCommon("transaction_id"), icon: Shield },
            { key: "referenceId", icon: ArrowRightLeft, emptyText: tCommon("not_provided") },
            {
              // The row carries the joined `user` object but has no `user.id`
              // column, so this needs an explicit render to reach the panel —
              // it is the value an operator pastes into the CRM to trace the
              // other side of a disputed movement.
              key: "user.id",
              title: tCommon("user_id"),
              icon: User,
              copyable: true,
              render: (value) => (
                <span className="font-mono text-xs break-all">{String(value)}</span>
              ),
            },
          ],
        },
        {
          id: "metadata",
          // Untitled on purpose: the metadata renderer draws its own captioned
          // box, so a section heading would say "Metadata" three times over.
          icon: ClipboardList,
          condition: (row) => Boolean(row.metadata),
          render: (_row, ctx) => ctx.renderCell("metadata"),
        },
      ],
    }),
    []
  );
}
