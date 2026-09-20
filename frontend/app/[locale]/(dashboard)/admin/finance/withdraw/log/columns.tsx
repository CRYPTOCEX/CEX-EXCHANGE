"use client";

import {
  Shield,
  User,
  DollarSign,
  ClipboardList,
  Clock,
  ArrowUpCircle,
  Wallet,
  Hash,
  MapPin,
} from "lucide-react";
import React from "react";
import { format, formatDistanceToNowStrict } from "date-fns";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { statusLabel, statusTone } from "@/lib/status-tone";
import type { ViewConfig } from "@/components/blocks/data-table/types/table";
import { RenderTransactionMetadata } from "../../deposit/log/columns";

/**
 * The withdrawal queue's own columns.
 *
 * This page imported `../../deposit/log/columns` — the DEPOSIT column set — so
 * every tooltip described the wrong direction of money ("deposit amount in the
 * wallet's currency", "associated wallet for the deposit"), and any edit made
 * for deposits silently changed withdrawals and transfers too.
 *
 * WHAT A WITHDRAWAL DECISION NEEDS, AND WHAT IT USED TO GET
 * ---------------------------------------------------------
 * Approving one sends money out of the building irreversibly. The operator has
 * to see WHO, HOW MUCH, WHERE TO, and HOW LONG IT HAS WAITED. The inherited set
 * showed user / wallet / status / amount, and put the destination, the fee and
 * the age behind `expandedOnly` — which the column-toggle menu also hides, so
 * the operator could not even opt back in. That is a queue you cannot triage.
 *
 * `RenderTransactionMetadata` is imported rather than copied: it is a generic
 * key/value renderer with nothing deposit-specific in it.
 */
export function useColumns() {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  return [
    {
      key: "id",
      title: "ID",
      type: "text",
      icon: Shield,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("unique_identifier_for_the_transaction"),
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
      description: t("user_associated_with_the_transaction"),
      render: {
        type: "compound",
        config: {
          image: {
            key: "avatar",
            fallback: "/img/placeholder.svg",
            type: "image",
            title: tCommon("avatar"),
            description: tCommon("user_avatar"),
            filterable: false,
            sortable: false,
          },
          primary: {
            key: ["firstName", "lastName"],
            title: [tCommon("first_name"), tCommon("last_name")],
            description: [
              tCommon("users_first_name"),
              tCommon("users_last_name"),
            ],
            sortable: true,
            sortKey: "firstName",
            icon: User,
          },
          secondary: {
            key: "email",
            title: tCommon("email"),
            description: t("users_email_address"),
            icon: ClipboardList,
            sortable: true,
          },
        },
      },
      priority: 1,
    },
    {
      // Queue contract point 2. Sorting by `createdAt` tells you the order;
      // this tells you whether the oldest one is a problem. The 7-day budget is
      // the same number `system/health/batch.get.ts` raises its dashboard
      // warning from, via `config/sla.ts`.
      key: "createdAt",
      title: tCommon("age"),
      type: "date",
      icon: Clock,
      sortable: true,
      filterable: true,
      description: t("how_long_this_request_has_been_waiting"),
      priority: 1,
      render: {
        type: "age",
        config: {
          sla: "withdrawal",
          activeStatuses: ["PENDING", "PROCESSING"],
        },
      },
    },
    {
      key: "status",
      title: tCommon("status"),
      type: "select",
      icon: ArrowUpCircle,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("current_status_of_the_withdrawal_request"),
      options: [
        { value: "PENDING", label: tCommon("pending") },
        { value: "PROCESSING", label: tCommon("processing") },
        { value: "COMPLETED", label: tCommon("completed") },
        { value: "FAILED", label: tCommon("failed") },
        { value: "CANCELLED", label: tCommon("cancelled") },
        { value: "EXPIRED", label: tCommon("expired") },
        { value: "REJECTED", label: tCommon("rejected") },
        { value: "REFUNDED", label: tCommon("refunded") },
        { value: "FROZEN", label: tCommon("frozen") },
        { value: "TIMEOUT", label: tCommon("timeout") },
      ],
      priority: 1,
      render: {
        // No local `variant`: the hue comes from `lib/status-tone.ts`.
        type: "badge",
        config: { withDot: true },
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
      description: t("amount_leaving_the_users_wallet"),
      priority: 1,
      render: {
        type: "custom",
        render: (value: any) => {
          if (value === null || value === undefined) return "N/A";
          const num = typeof value === "number" ? value : parseFloat(value);
          if (isNaN(num)) return "N/A";
          return num.toFixed(8);
        },
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
      description: t("wallet_the_withdrawal_is_debited_from"),
      render: {
        type: "custom",
        render: (value: any, row: any) => {
          const wallet = row?.wallet;
          if (!wallet) return value || "N/A";
          if (wallet.currency && wallet.type) {
            return `${wallet.currency} (${wallet.type})`;
          }
          return wallet.currency || value || "N/A";
        },
      },
      priority: 1,
    },
    {
      // The single most important field on the row and it was not on the row.
      // Where the money is going is the thing an approver checks; it lived
      // inside the `metadata` blob behind `expandedOnly`.
      key: "destination",
      title: tCommon("destination"),
      type: "text",
      icon: MapPin,
      sortable: false,
      searchable: false,
      filterable: false,
      description: t("where_the_funds_are_being_sent"),
      priority: 2,
      render: {
        type: "custom",
        render: (_value: any, row: any) => {
          let meta: Record<string, any> = {};
          try {
            meta =
              typeof row?.metadata === "string"
                ? JSON.parse(row.metadata)
                : row?.metadata || {};
          } catch {
            return <span className="text-muted-foreground">—</span>;
          }

          // Crypto: address (+ chain). Fiat: bank and the masked account.
          const address = meta.address || meta.toAddress || meta.walletAddress;
          if (address) {
            const chain = meta.chain || meta.network;
            return (
              <span className="font-mono text-xs">
                {String(address).length > 18
                  ? `${String(address).slice(0, 8)}…${String(address).slice(-6)}`
                  : String(address)}
                {chain ? (
                  <span className="ml-1.5 text-muted-foreground">{chain}</span>
                ) : null}
              </span>
            );
          }

          const bank = meta.bankName || meta.bank;
          const account = meta.accountNumber || meta.iban;
          if (bank || account) {
            const masked = account
              ? `••••${String(account).slice(-4)}`
              : "";
            return (
              <span className="text-xs">
                {bank}
                {bank && masked ? " " : ""}
                <span className="font-mono text-muted-foreground">{masked}</span>
              </span>
            );
          }

          const method = meta.method || meta.methodName;
          if (method) return <span className="text-xs">{method}</span>;
          return <span className="text-muted-foreground">—</span>;
        },
      },
    },
    {
      // Was expandedOnly. The fee is part of what the customer receives, so it
      // belongs where the amount is.
      key: "fee",
      title: tCommon("fee"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: false,
      filterable: true,
      description: t("processing_fee_charged_on_this_withdrawal"),
      priority: 3,
      render: {
        type: "custom",
        render: (value: any) => {
          if (value === null || value === undefined) return "N/A";
          const num = typeof value === "number" ? value : parseFloat(value);
          if (isNaN(num)) return "N/A";
          return num.toFixed(8);
        },
      },
    },
    {
      key: "referenceId",
      title: tCommon("reference_id"),
      type: "text",
      icon: Hash,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("external_reference_identifier_for_this_payout"),
      priority: 3,
    },
    {
      key: "trxId",
      title: tCommon("transaction_hash"),
      type: "text",
      icon: Hash,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("on_chain_hash_once_the_payout_is_broadcast"),
      priority: 3,
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
      description: t("additional_notes_about_this_withdrawal"),
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "metadata",
      title: tCommon("metadata"),
      type: "custom",
      icon: ClipboardList,
      sortable: false,
      searchable: false,
      filterable: false,
      description: t("additional_transaction_metadata_and_details"),
      render: {
        type: "custom",
        render: (value: any) => <RenderTransactionMetadata value={value} />,
        title: false,
      },
      priority: 3,
      expandedOnly: true,
    },
  ] as ColumnDefinition[];
}

/* -------------------------------------------------------------------------- *
 * View dialog
 *
 * A payout is not a flat key/value record. The three things an approver needs
 * are a MONEY BREAKDOWN (what leaves the wallet, what the platform keeps, what
 * the customer actually receives), a DESTINATION (an address + chain + memo, or
 * a bank + account), and an AGE. All three live inside the `metadata` blob,
 * which the generic dialog printed as one stringified line at the bottom of a
 * 600px column — so the operator had to read JSON to decide.
 * -------------------------------------------------------------------------- */

/** The transaction metadata arrives as a JSON string in dev and an object in prod. */
function parseMeta(value: any): Record<string, any> {
  if (!value) return {};
  if (typeof value === "object") return value as Record<string, any>;
  try {
    const parsed = JSON.parse(String(value));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/** DECIMAL columns come back from mysql2 as strings, so never trust `typeof`. */
function toNumber(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;
  const num = typeof value === "number" ? value : parseFloat(String(value));
  return Number.isFinite(num) ? num : null;
}

/** 8dp is the crypto precision the columns use; trailing zeros are noise here. */
function formatAmount(value: any): string {
  const num = toNumber(value);
  if (num === null) return "—";
  return num
    .toFixed(8)
    .replace(/(\.\d*?)0+$/, "$1")
    .replace(/\.$/, "");
}

function walletLabel(row: any): string {
  const wallet = row?.wallet;
  if (!wallet?.currency) return "";
  return wallet.type ? `${wallet.currency} (${wallet.type})` : wallet.currency;
}

/**
 * The payout destination, unpacked.
 *
 * The row column has to truncate an address to fit; this is the surface where
 * the operator transcribes it, so nothing is shortened and the memo/tag — the
 * field that loses funds when it is omitted — gets its own line.
 */
function PayoutDestination({ row }: { row: any }) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const meta = parseMeta(row?.metadata);

  const entries: { label: string; value: string; mono?: boolean }[] = [];
  const address = meta.address || meta.toAddress || meta.walletAddress;
  if (address) entries.push({ label: tCommon("address"), value: String(address), mono: true });
  const chain = meta.chain || meta.network;
  if (chain) entries.push({ label: tCommon("network"), value: String(chain) });
  if (meta.memo) entries.push({ label: t("memo_tag"), value: String(meta.memo), mono: true });

  const bank = meta.bankName || meta.bank;
  if (bank) entries.push({ label: t("bank"), value: String(bank) });
  const account = meta.accountNumber || meta.iban;
  if (account) entries.push({ label: tCommon("account"), value: String(account), mono: true });
  if (meta.swift) entries.push({ label: "SWIFT / BIC", value: String(meta.swift), mono: true });

  const method = meta.method || meta.methodName;
  if (method) entries.push({ label: tCommon("method"), value: String(method) });

  if (!entries.length) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("no_destination_was_recorded_on_this_request")}
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-border divide-y divide-border">
      {entries.map((entry) => (
        <div
          key={entry.label}
          className="flex items-start justify-between gap-4 px-3 py-2"
        >
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground shrink-0 pt-0.5">
            {entry.label}
          </span>
          <span
            className={cn(
              "text-sm font-medium min-w-0 text-end break-all",
              entry.mono && "font-mono text-xs"
            )}
          >
            {entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export function useViewConfig(): ViewConfig {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  return React.useMemo<ViewConfig>(
    () => ({
      size: "4xl",

      badges: (row) => (
        <>
          <Badge tone={statusTone(row.status)} appearance="soft">
            {statusLabel(row.status) || tCommon("unknown")}
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
          label: t("debited"),
          icon: DollarSign,
          value: (row) =>
            `${formatAmount(row.amount)} ${row.wallet?.currency ?? ""}`.trim(),
        },
        {
          label: tCommon("fee"),
          icon: DollarSign,
          value: (row) => {
            const meta = parseMeta(row.metadata);
            return formatAmount(toNumber(row.fee) ?? meta.fee);
          },
        },
        {
          // `metadata.netAmount` is what both the fiat and the spot withdrawal
          // routes record as the figure that actually reaches the customer.
          label: t("net_to_recipient"),
          icon: ArrowUpCircle,
          value: (row) => {
            const meta = parseMeta(row.metadata);
            return `${formatAmount(meta.netAmount)} ${row.wallet?.currency ?? ""}`.trim();
          },
          condition: (row) => parseMeta(row.metadata).netAmount != null,
        },
        {
          label: tCommon("waiting"),
          icon: Clock,
          value: (row) =>
            row.createdAt
              ? formatDistanceToNowStrict(new Date(row.createdAt))
              : "—",
        },
      ],

      sections: [
        {
          id: "destination",
          title: t("payout_destination"),
          description: t("where_the_funds_are_being_sent"),
          icon: MapPin,
          variant: "plain",
          render: (row) => <PayoutDestination row={row} />,
        },
        {
          id: "wallet",
          title: tCommon("source_wallet"),
          icon: Wallet,
          columns: 2,
          fields: [
            {
              key: "wallet.currency",
              title: t("debited_from"),
              icon: Wallet,
              render: (_value, row) => walletLabel(row) || "—",
            },
            { key: "description", icon: ClipboardList, fullWidth: true },
          ],
        },
        {
          id: "reference",
          title: tCommon("references"),
          icon: Hash,
          columns: 3,
          fields: [
            { key: "id", title: tCommon("transaction_id"), icon: Shield, copyable: true },
            { key: "referenceId", icon: Hash, copyable: true },
            { key: "trxId", icon: Hash, copyable: true },
          ],
        },
        {
          id: "timeline",
          title: tCommon("timeline"),
          icon: Clock,
          columns: 2,
          fields: [
            {
              key: "createdAt",
              title: tCommon("requested"),
              icon: Clock,
              render: (value) => format(new Date(value), "PPp"),
            },
            {
              key: "updatedAt",
              title: tCommon("last_updated"),
              icon: Clock,
              render: (value) => format(new Date(value), "PPp"),
            },
          ],
        },
        {
          id: "raw-metadata",
          title: tCommon("raw_request_metadata"),
          icon: ClipboardList,
          columns: 1,
          collapsible: true,
          defaultCollapsed: true,
          fields: [{ key: "metadata", title: tCommon("metadata"), fullWidth: true }],
        },
      ],
    }),
    []
  );
}
