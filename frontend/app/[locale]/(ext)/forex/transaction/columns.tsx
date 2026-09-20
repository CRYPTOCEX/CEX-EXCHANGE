"use client";
import React from "react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import {
  Receipt,
  DollarSign,
  Calendar,
  ArrowUpDown,
  Hash,
  FileText,
  Wallet,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  Fingerprint,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MoneyFigure } from "@/components/ui/money-figure";
import { formatCurrencySafe } from "@/utils/currency";
import type { ViewConfig } from "@/components/blocks/data-table/types/table";

export function useColumns() {
  const t = useTranslations("ext_forex");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  return [
  {
    key: "id",
    title: "ID",
    type: "text",
    icon: Hash,
    sortable: true,
    searchable: true,
    filterable: true,
    description: t("unique_identifier_for_this_forex_transaction"),
    priority: 3,
    expandedOnly: true,
  },
  {
    key: "type",
    title: tCommon("type"),
    type: "select",
    icon: ArrowUpDown,
    sortable: true,
    searchable: true,
    filterable: true,
    description: t("type_of_forex_transaction_deposit_or_withdrawal"),
    render: {
      type: "badge",
      config: {
        withDot: true,
        variant: (value: string) => {
          switch (value) {
            case "FOREX_DEPOSIT":
              return "success";
            case "FOREX_WITHDRAW":
              return "destructive";
            default:
              return "default";
          }
        },
      },
    },
    options: [
      { value: "FOREX_DEPOSIT", label: tCommon("forex_deposit") },
      { value: "FOREX_WITHDRAW", label: tCommon("forex_withdraw") },
    ],
    priority: 1,
  },
  {
    key: "status",
    title: tCommon("status"),
    type: "select",
    icon: CheckCircle,
    sortable: true,
    searchable: true,
    filterable: true,
    description: t("current_status_of_the_forex_transaction"),
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
    render: {
      type: "badge",
      config: {
        // Hue resolves centrally through `lib/status-tone.ts`; do not re-add a
        // local `variant` here.
        withDot: true,
      },
    },
  },
  {
    key: "amount",
    title: tCommon("amount"),
    type: "number",
    icon: DollarSign,
    sortable: true,
    searchable: false,
    filterable: true,
    description: t("transaction_amount_in_the_forex_account_currency"),
    priority: 1,
    render: {
      type: "number",
      format: { minimumFractionDigits: 2, maximumFractionDigits: 8 },
    },
  },
  {
    key: "wallet.currency",
    title: tCommon("wallet"),
    type: "text",
    icon: Wallet,
    sortable: true,
    searchable: true,
    filterable: true,
    description: t("wallet_used_for_this_forex_transaction"),
    priority: 1,
    render: (value: any, row: any) => {
      const wallet = row?.wallet;
      if (!wallet) return value || "N/A";
      if (wallet.currency && wallet.type) {
        return `${wallet.currency} (${wallet.type})`;
      }
      return wallet.currency || value || "N/A";
    },
  },
  {
    key: "fee",
    title: tCommon("fee"),
    type: "number",
    icon: Receipt,
    sortable: true,
    searchable: false,
    filterable: true,
    description: t("transaction_fee_charged_for_this_forex_operation"),
    priority: 2,
    render: {
      type: "number",
      format: { minimumFractionDigits: 2, maximumFractionDigits: 8 },
    },
  },
  {
    key: "createdAt",
    title: tCommon("created"),
    type: "date",
    icon: Calendar,
    sortable: true,
    searchable: false,
    filterable: true,
    description: t("date_and_time_when_the_forex"),
    priority: 2,
    render: {
      type: "date",
      format: "MMM dd, yyyy HH:mm",
    },
  },
  {
    key: "description",
    title: tCommon("description"),
    type: "text",
    icon: FileText,
    sortable: false,
    searchable: true,
    filterable: false,
    description: t("additional_details_about_the_forex_transaction"),
    priority: 3,
    expandedOnly: true,
  },
  {
    key: "metadata",
    title: tCommon("details"),
    type: "text",
    icon: Info,
    sortable: false,
    searchable: false,
    filterable: false,
    description: t("technical_details_and_metadata_for_the"),
    priority: 3,
    expandedOnly: true,
    render: {
      type: "custom",
      render: (value: any) => {
        if (!value) return <span className="text-muted-foreground">-</span>;

        try {
          const metadata = typeof value === "string" ? JSON.parse(value) : value;
          return (
            <div className="space-y-1">
              {metadata.accountId && (
                <div className="text-xs text-muted-foreground">
                  {tCommon("account")} {metadata.accountId}
                </div>
              )}
              {metadata.currency && (
                <div className="text-xs text-muted-foreground">
                  {tCommon("currency")} {metadata.currency}
                </div>
              )}
              {metadata.chain && (
                <div className="text-xs text-muted-foreground">
                  {tExt("chain")} {metadata.chain}
                </div>
              )}
              {metadata.price && (
                <div className="text-xs text-muted-foreground">
                  {tCommon("price")} {metadata.price}
                </div>
              )}
            </div>
          );
        } catch (e) {
          return <span className="text-muted-foreground">-</span>;
        }
      },
    },
  },
] as ColumnDefinition[];
}

/* -------------------------------------------------------------------------- *
 * View dialog
 *
 * A forex movement is not a flat key/value record: the two figures an operator
 * opens it for (amount, fee) are money, the gateway's `metadata` is a JSON blob
 * whose keys vary per rail, and the status carries a consequence the user needs
 * spelled out. Those three things are a stat strip, a rendered list and an
 * advisory strip — none of them a tile.
 * -------------------------------------------------------------------------- */

type DialogTone = "success" | "warning" | "destructive" | "info" | "neutral";

const STATUS_TONE: Record<string, DialogTone> = {
  COMPLETED: "success",
  PENDING: "warning",
  PROCESSING: "info",
  FROZEN: "warning",
  REFUNDED: "info",
  FAILED: "destructive",
  CANCELLED: "destructive",
  REJECTED: "destructive",
  EXPIRED: "destructive",
  TIMEOUT: "destructive",
};

/** What this status means for the person reading it. */
const STATUS_NOTE: Record<string, { tone: "success" | "warning" | "destructive" | "info"; text: string }> = {
  PENDING: {
    tone: "warning",
    text: "This transaction is pending approval and will be processed shortly.",
  },
  PROCESSING: { tone: "info", text: "This transaction is being processed." },
  COMPLETED: { tone: "success", text: "This transaction completed successfully." },
  FAILED: {
    tone: "destructive",
    text: "This transaction failed. Contact support if you need help.",
  },
  CANCELLED: { tone: "destructive", text: "This transaction was cancelled." },
  REJECTED: {
    tone: "destructive",
    text: "This transaction was rejected. Contact support if you need help.",
  },
  EXPIRED: {
    tone: "destructive",
    text: "This transaction expired before it could be processed.",
  },
  TIMEOUT: {
    tone: "destructive",
    text: "This transaction timed out. Contact support if you need help.",
  },
  FROZEN: { tone: "warning", text: "This transaction is frozen pending a review." },
  REFUNDED: { tone: "info", text: "This transaction was refunded." },
};

/* Static class map. A runtime-built `bg-${tone}/10` never reaches Tailwind's
   scanner and compiles to nothing, which is how a "coloured" strip ends up
   transparent. */
const NOTE_CLASS: Record<string, string> = {
  success: "bg-success/10 text-success-ink border-success/20",
  warning: "bg-warning/10 text-warning-ink border-warning/20",
  destructive: "bg-destructive/10 text-destructive-ink border-destructive/20",
  info: "bg-info/10 text-info-ink border-info/20",
};

const NOTE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  success: CheckCircle,
  warning: AlertCircle,
  destructive: XCircle,
  info: Clock,
};

/** `metadata` is a MySQL JSON column: pre-parsed on some deployments, a string on others. */
function parseMetadata(value: any): Record<string, any> {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }
  return typeof value === "object" ? value : {};
}

function metaEntries(value: any): Array<[string, any]> {
  return Object.entries(parseMetadata(value)).filter(
    ([, entry]) => entry !== null && entry !== undefined && entry !== ""
  );
}

function metaLabel(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/^./, (character) => character.toUpperCase());
}

export function useViewConfig(): ViewConfig {
  const t = useTranslations("ext_forex");
  // Only `common` keys are reused here: every other namespace key this file
  // already resolves is a column description, and inventing new paths would
  // render the raw dotted string.
  const tCommon = useTranslations("common");

  return React.useMemo<ViewConfig>(
    () => ({
      size: "3xl",

      title: (row) =>
        row.type === "FOREX_DEPOSIT"
          ? tCommon("forex_deposit")
          : row.type === "FOREX_WITHDRAW"
            ? tCommon("forex_withdrawal")
            : t("forex_transaction"),

      badges: (row) => (
        <Badge
          tone={STATUS_TONE[String(row.status).toUpperCase()] ?? "neutral"}
          appearance="soft"
          className="capitalize"
        >
          {String(row.status ?? "").toLowerCase() || "unknown"}
        </Badge>
      ),

      stats: [
        // `tone` is per-stat, not per-row, so the signed figure is two stats
        // with opposite conditions rather than one stat that cannot change ink.
        {
          label: tCommon("amount"),
          icon: TrendingUp,
          tone: "success",
          condition: (row) => row.type === "FOREX_DEPOSIT",
          value: (row) => (
            <MoneyFigure
              value={formatCurrencySafe(
                Number(row.amount) || 0,
                row.wallet?.currency || "USD"
              )}
            />
          ),
        },
        {
          label: tCommon("amount"),
          icon: TrendingDown,
          tone: "destructive",
          condition: (row) => row.type !== "FOREX_DEPOSIT",
          value: (row) => (
            <MoneyFigure
              value={formatCurrencySafe(
                Number(row.amount) || 0,
                row.wallet?.currency || "USD"
              )}
            />
          ),
        },
        {
          label: tCommon("fee"),
          icon: Receipt,
          tone: "warning",
          condition: (row) => Number(row.fee) > 0,
          value: (row) => (
            <MoneyFigure
              value={formatCurrencySafe(
                Number(row.fee) || 0,
                row.wallet?.currency || "USD"
              )}
            />
          ),
        },
        {
          label: tCommon("wallet"),
          icon: Wallet,
          value: (row) =>
            row.wallet
              ? `${row.wallet.currency ?? ""}${row.wallet.type ? ` (${row.wallet.type})` : ""}`
              : "—",
        },
      ],

      sections: [
        {
          id: "transaction",
          title: tCommon("transaction"),
          icon: Receipt,
          columns: 2,
          priority: 1,
          fields: [
            { key: "id", title: "ID", icon: Hash, copyable: true },
            { key: "createdAt", title: tCommon("created"), icon: Calendar },
            {
              key: "description",
              title: tCommon("description"),
              icon: FileText,
              fullWidth: true,
              hideEmpty: true,
            },
          ],
        },
        {
          id: "metadata",
          title: t("routing_details"),
          description: t("recorded_by_the_gateway_when_this"),
          icon: Info,
          priority: 2,
          variant: "plain",
          condition: (row) => metaEntries(row.metadata).length > 0,
          render: (row) => (
            <div className="rounded-lg border border-border divide-y divide-border">
              {metaEntries(row.metadata).map(([key, entry]) => (
                <div
                  key={key}
                  className="flex items-start justify-between gap-4 px-3 py-2"
                >
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground pt-0.5 shrink-0">
                    {metaLabel(key)}
                  </span>
                  <span className="text-sm font-medium text-end break-all min-w-0">
                    {typeof entry === "object"
                      ? JSON.stringify(entry)
                      : String(entry)}
                  </span>
                </div>
              ))}
            </div>
          ),
        },
        {
          id: "status-note",
          priority: 900,
          variant: "plain",
          condition: (row) =>
            Boolean(STATUS_NOTE[String(row.status).toUpperCase()]),
          render: (row) => {
            const note = STATUS_NOTE[String(row.status).toUpperCase()];
            if (!note) return null;
            const NoteIcon = NOTE_ICON[note.tone] ?? Info;
            return (
              <div
                className={cn(
                  "flex items-center gap-2 rounded-xl border p-3",
                  NOTE_CLASS[note.tone]
                )}
              >
                <NoteIcon className="h-4 w-4 shrink-0" />
                <span className="text-sm">{note.text}</span>
              </div>
            );
          },
        },
      ],
    }),
    [tCommon]
  );
}
