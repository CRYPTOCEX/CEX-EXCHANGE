"use client";

import {
  Shield,
  User,
  DollarSign,
  ClipboardList,
  Clock,
  ArrowLeftRight,
  Wallet,
  Hash,
} from "lucide-react";
import React from "react";
import { format, formatDistanceToNowStrict } from "date-fns";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { statusLabel, statusTone } from "@/lib/status-tone";
import type { ViewConfig } from "@/components/blocks/data-table/types/table";
import { RenderTransactionMetadata } from "../deposit/log/columns";

/**
 * The transfer queue's own columns.
 *
 * This page imported the DEPOSIT column set, so every tooltip described a
 * deposit and the one field that makes a transfer a transfer — where it is
 * going — was not on the row at all.
 *
 * THE DESTINATION IS NOT OPTIONAL HERE. The visible `wallet.currency` is the
 * SOURCE: for an `OUTGOING_TRANSFER`, `transaction.walletId` is the wallet that
 * was debited. The destination lives in `metadata` as
 * `targetWalletId`/`toWallet` plus `toCurrency`/`targetAmount`, and those are
 * the exact keys the settlement reads — an approve **400s** without them. They
 * were `expandedOnly`, i.e. invisible AND un-toggleable, so the operator could
 * not see the one thing that decides whether their click will work.
 */
export function useColumns() {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");

  const parseMeta = (row: any): Record<string, any> => {
    try {
      return typeof row?.metadata === "string"
        ? JSON.parse(row.metadata)
        : row?.metadata || {};
    } catch {
      return {};
    }
  };

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
        config: { sla: "transfer", activeStatuses: ["PENDING", "PROCESSING"] },
      },
    },
    {
      key: "status",
      title: tCommon("status"),
      type: "select",
      icon: ArrowLeftRight,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("current_status_of_the_transfer"),
      options: [
        { value: "PENDING", label: tCommon("pending") },
        { value: "PROCESSING", label: tCommon("processing") },
        { value: "COMPLETED", label: tCommon("completed") },
        { value: "FAILED", label: tCommon("failed") },
        { value: "CANCELLED", label: tCommon("cancelled") },
        { value: "REJECTED", label: tCommon("rejected") },
        { value: "REFUNDED", label: tCommon("refunded") },
      ],
      priority: 1,
      render: { type: "badge", config: { withDot: true } },
    },
    {
      key: "amount",
      title: tCommon("amount"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: false,
      filterable: true,
      description: t("amount_debited_from_the_source_wallet"),
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
      title: tCommon("from"),
      type: "text",
      icon: Wallet,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("source_wallet_the_funds_leave"),
      priority: 2,
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
    },
    {
      // The settlement reads these keys and 400s without them. Showing the
      // destination on the row is both the decision input and an early warning
      // that a given transfer cannot be approved at all.
      key: "destination",
      title: tCommon("to"),
      type: "text",
      icon: Wallet,
      sortable: false,
      searchable: false,
      filterable: false,
      description: t("destination_wallet_and_converted_amount"),
      priority: 2,
      render: {
        type: "custom",
        render: (_value: any, row: any) => {
          const meta = parseMeta(row);
          const currency = meta.toCurrency || meta.targetCurrency;
          const target = Number(meta.targetAmount);
          const hasWallet = Boolean(meta.targetWalletId || meta.toWallet);

          if (!hasWallet) {
            return (
              <span className="text-destructive-ink text-xs">
                {t("missing_destination")}
              </span>
            );
          }
          return (
            <span className="text-xs">
              {Number.isFinite(target) && target > 0 ? target.toFixed(8) : "—"}
              {currency ? (
                <span className="ml-1 text-muted-foreground">{currency}</span>
              ) : null}
            </span>
          );
        },
      },
    },
    {
      key: "fee",
      title: tCommon("fee"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: false,
      filterable: true,
      description: t("fee_charged_on_this_transfer"),
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
      description: t("external_reference_identifier_for_this_transfer"),
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
      description: t("additional_notes_about_this_transfer"),
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
 * A transfer is a ROUTE, not a flat record: money leaves one wallet and is
 * supposed to arrive in another, possibly in a different currency and therefore
 * at a different figure. The generic panel showed only the source (the visible
 * `wallet.*` columns belong to the OUTGOING row) and stringified the rest of the
 * route into one `metadata` line — so the operator approving the transfer could
 * not see where it was going or how much would land, and could not tell in
 * advance that a row is missing `targetWalletId` and will 400 on approve.
 * -------------------------------------------------------------------------- */

/** Transaction metadata arrives as a JSON string in dev and an object in prod. */
function parseTransferMeta(value: any): Record<string, any> {
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

/** 8dp is the precision the columns use; trailing zeros are noise in a panel. */
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
  if (!wallet?.currency) return "—";
  return wallet.type ? `${wallet.currency} (${wallet.type})` : wallet.currency;
}

/** One side of the route: a wallet label, its currency and its wallet id. */
function RouteLeg({
  label,
  title,
  walletId,
  missing,
}: {
  label: string;
  title: string;
  walletId?: string;
  missing?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border p-3 min-w-0">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "text-sm font-medium mt-1 break-words",
          missing && "text-destructive"
        )}
      >
        {title}
      </p>
      {walletId ? (
        <p className="font-mono text-xs text-muted-foreground mt-1 break-all">
          {walletId}
        </p>
      ) : null}
    </div>
  );
}

/**
 * The route, unpacked from `metadata`.
 *
 * `targetWalletId` / `toCurrency` are the exact keys the settlement endpoint
 * reads. A row without them cannot be approved at all, so their absence is
 * stated in the panel rather than left as a blank tile.
 */
function TransferRoute({ row }: { row: any }) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const meta = parseTransferMeta(row?.metadata);
  const targetWalletId = meta.targetWalletId || meta.toWallet;
  const targetCurrency = meta.toCurrency || meta.targetCurrency;

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <RouteLeg
          label={t("debited_from")}
          title={walletLabel(row)}
          walletId={meta.fromWallet ? String(meta.fromWallet) : undefined}
        />
        <RouteLeg
          label={t("credited_to")}
          title={
            targetWalletId
              ? targetCurrency || tCommon("destination_wallet")
              : t("no_destination_recorded")
          }
          walletId={targetWalletId ? String(targetWalletId) : undefined}
          missing={!targetWalletId}
        />
      </div>
      {!targetWalletId && (
        <p className="text-sm text-destructive">
          {t("this_transfer_carries_no_destination_wallet")}
        </p>
      )}
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
          value: (row) => formatAmount(row.fee),
        },
        {
          // The converted figure the destination wallet receives. On a
          // cross-currency transfer this is not the debited amount, and it is
          // the number the recipient will query.
          label: t("recipient_gets"),
          icon: ArrowLeftRight,
          value: (row) => {
            const meta = parseTransferMeta(row.metadata);
            return `${formatAmount(meta.targetAmount)} ${
              meta.toCurrency || meta.targetCurrency || ""
            }`.trim();
          },
          condition: (row) =>
            parseTransferMeta(row.metadata).targetAmount != null,
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
          id: "route",
          title: t("transfer_route"),
          description: t("where_the_funds_leave_from_and_where_they_land"),
          icon: ArrowLeftRight,
          variant: "plain",
          render: (row) => <TransferRoute row={row} />,
        },
        {
          id: "references",
          title: tCommon("references"),
          icon: Hash,
          columns: 2,
          fields: [
            { key: "id", title: tCommon("transaction_id"), icon: Shield, copyable: true },
            { key: "referenceId", icon: Hash, copyable: true },
          ],
        },
        {
          id: "notes",
          title: tCommon("notes"),
          icon: ClipboardList,
          columns: 1,
          condition: (row) => Boolean(row.description),
          fields: [{ key: "description", icon: ClipboardList, fullWidth: true }],
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
