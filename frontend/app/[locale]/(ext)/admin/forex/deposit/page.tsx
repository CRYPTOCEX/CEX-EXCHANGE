"use client";
import React from "react";
import DataTable from "@/components/blocks/data-table";
import {
  ArrowDownCircle,
  ClipboardList,
  Clock,
  DollarSign,
  Hash,
  Landmark,
  Shield,
  Wallet,
} from "lucide-react";
import { format, formatDistanceToNowStrict } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { statusLabel, statusTone } from "@/lib/status-tone";
import type { ViewConfig } from "@/components/blocks/data-table/types/table";
import { useAnalytics } from "./analytics";
import { useColumns } from "../../../../(dashboard)/admin/finance/deposit/log/columns";
import { useTranslations } from "next-intl";

/* -------------------------------------------------------------------------- *
 * View dialog
 *
 * Defined here rather than beside the columns on purpose: this page borrows the
 * generic deposit-log column set, which three other tables also use, so a forex
 * specific dialog does not belong in that file.
 *
 * What a forex deposit is, and what the flat panel lost: the money does not
 * stop at the wallet. `metadata` carries the FOREX ACCOUNT it was credited to
 * (`accountId` / `forexAccountId`) plus the chain and the wallet type it came
 * from, and the generic panel stringified all of that into one line. The fee is
 * also charged ON TOP of the amount (see forex/account/[id]/deposit.post.ts) —
 * the wallet is debited `amount + fee` while the trading account receives
 * `amount` — so "how much left the wallet" is a figure neither column shows.
 * -------------------------------------------------------------------------- */

/** Transaction metadata arrives as a JSON string in dev and an object in prod. */
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

/** 8dp is the precision the columns use; trailing zeros are noise in a panel. */
function formatAmount(value: any): string {
  const num = toNumber(value);
  if (num === null) return "—";
  return num
    .toFixed(8)
    .replace(/(\.\d*?)0+$/, "$1")
    .replace(/\.$/, "");
}

function withCurrency(value: any, row: any): string {
  return `${formatAmount(value)} ${row?.wallet?.currency ?? ""}`.trim();
}

/** Where the funds landed: the trading account, and what they came out of. */
function ForexDepositRouting({ row }: { row: any }) {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const meta = parseMeta(row?.metadata);
  const wallet = row?.wallet;
  const walletLabel = wallet?.currency
    ? wallet.type
      ? `${wallet.currency} (${wallet.type})`
      : wallet.currency
    : meta.walletType || "—";

  const entries: { label: string; value: string; mono?: boolean }[] = [
    { label: tCommon("source_wallet"), value: walletLabel },
  ];
  if (meta.accountId)
    entries.push({
      label: t("forex_account"),
      value: String(meta.accountId),
      mono: true,
    });
  if (meta.forexAccountId)
    entries.push({
      label: t("account_record"),
      value: String(meta.forexAccountId),
      mono: true,
    });
  if (meta.chain) entries.push({ label: tCommon("network"), value: String(meta.chain) });
  if (meta.price != null)
    entries.push({ label: t("rate_at_deposit"), value: String(meta.price) });

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
      {!meta.accountId && !meta.forexAccountId && (
        <p className="px-3 py-2 text-sm text-muted-foreground">
          {t("no_forex_account_was_recorded_on_this_deposit")}
        </p>
      )}
    </div>
  );
}

function useViewConfig(): ViewConfig {
  const t = useTranslations("ext_admin");
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
          label: t("credited_to_account"),
          icon: ArrowDownCircle,
          value: (row) => withCurrency(row.amount, row),
        },
        {
          label: tCommon("fee"),
          icon: DollarSign,
          value: (row) => formatAmount(row.fee),
        },
        {
          // Charged on top, so this is the figure the customer sees leave their
          // wallet — and the one that never matched `amount` in a support call.
          label: t("debited_from_wallet"),
          icon: Wallet,
          value: (row) => {
            const amount = toNumber(row.amount);
            const fee = toNumber(row.fee) ?? 0;
            if (amount === null) return "—";
            return withCurrency(amount + fee, row);
          },
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
          id: "routing",
          title: t("deposit_routing"),
          description: t("which_trading_account_the_funds_were_credited_to"),
          icon: Landmark,
          variant: "plain",
          render: (row) => <ForexDepositRouting row={row} />,
        },
        {
          id: "references",
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

export default function DepositLogPage() {
  const t = useTranslations("ext_admin");
  const columns = useColumns();
  const analytics = useAnalytics();
  const viewConfig = useViewConfig();
  return (
    <DataTable
      apiEndpoint="/api/admin/forex/deposit"
      model="transaction"
      modelConfig={{
        type: "FOREX_DEPOSIT",
      }}
      permissions={{
        access: "access.forex.deposit",
        view: "view.forex.deposit",
        create: "create.forex.deposit",
        edit: "edit.forex.deposit",
        delete: "delete.forex.deposit",
      }}
      pageSize={12}
      canCreate={false}
      canEdit={true}
      editLink="/admin/forex/deposit/[id]"
      viewLink="/admin/forex/deposit/[id]"
      editCondition={(item) => ["PENDING", "PROCESSING"].includes(item.status)}
      canDelete={true}
      canView={true}
      isParanoid={true}
      title={t("forex_deposit_management")}
      itemTitle="Forex Deposit"
      columns={columns}
      viewConfig={viewConfig}
      analytics={analytics}
      design={{
        icon: ArrowDownCircle,
      }}
    />
  );
}
