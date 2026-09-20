"use client";
import React from "react";
import DataTable from "@/components/blocks/data-table";
import {
  ArrowUpCircle,
  Banknote,
  ClipboardList,
  Clock,
  Hash,
  Link2,
  Receipt,
  Trash2,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ViewConfig } from "@/components/blocks/data-table/types/table";
import { useColumns } from "../../../../(dashboard)/admin/finance/deposit/log/columns";
import { useAnalytics } from "./analytics";
import { useTranslations } from "next-intl";

/* ---------------------------------------------------------------------------
 * View dialog
 *
 * The columns for this table are shared with the deposit log, so the view
 * config lives here rather than in that file: a withdrawal is not a deposit
 * read backwards. What an operator approving one needs is the money split
 * (the user is credited `amount`, the desk keeps `fee`, and the forex account
 * was debited the sum of both), the destination wallet, and the forex account
 * the funds left — which lives only inside `metadata`.
 * ------------------------------------------------------------------------ */

const TRANSACTION_STATUS_TONE: Record<
  string,
  "success" | "warning" | "destructive" | "info" | "neutral"
> = {
  COMPLETED: "success",
  PENDING: "warning",
  PROCESSING: "info",
  FROZEN: "info",
  FAILED: "destructive",
  REJECTED: "destructive",
  CANCELLED: "neutral",
  EXPIRED: "neutral",
  TIMEOUT: "destructive",
  REFUNDED: "neutral",
};

function toNumber(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * `amount` and `fee` are DECIMALs and arrive as STRINGS from mysql2, so they
 * are coerced before any arithmetic. Trailing zeros come off an 8-place fixed
 * string: a headline figure of `250.00000000` is noise, `250` is the number.
 */
function formatAmount(value: any): string {
  const parsed = toNumber(value);
  if (parsed === null) return "—";
  const fixed = parsed.toFixed(8);
  return fixed.includes(".") ? fixed.replace(/\.?0+$/, "") : fixed;
}

function walletLabel(row: any): string {
  const wallet = row?.wallet;
  if (!wallet) return "—";
  return wallet.type ? `${wallet.currency} (${wallet.type})` : wallet.currency || "—";
}

/** `metadata` is written with JSON.stringify but may arrive pre-parsed. */
function readMetadata(row: any): Record<string, any> | null {
  const raw = row?.metadata;
  if (!raw) return null;
  if (typeof raw === "object") return raw;
  try {
    const parsed = JSON.parse(String(raw));
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

const ROUTING_LABELS: [string, string][] = [
  ["forexAccountId", "Forex Account"],
  ["accountId", "Account Number"],
  ["walletType", "Wallet Type"],
  ["currency", "Currency"],
  ["chain", "Chain"],
  ["price", "Rate at Request"],
  ["grossAmount", "Gross Debited"],
  ["feeAmount", "Fee Recorded"],
  ["idempotencyKey", "Idempotency Key"],
];

/* Not exported: a Next.js page module's named exports are reserved for the
   framework's own route config, and nothing outside this file needs it. */
function useViewConfig(): ViewConfig {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  return React.useMemo<ViewConfig>(
    () => ({
      size: "3xl",

      badges: (row) => (
        <>
          <Badge
            tone={TRANSACTION_STATUS_TONE[String(row.status)] ?? "neutral"}
            appearance="soft"
          >
            {String(row.status ?? "").replace(/_/g, " ") || tCommon("unknown")}
          </Badge>
          {row.deletedAt && (
            <Badge tone="destructive" appearance="soft">
              <Trash2 className="h-3 w-3" />
              Deleted
            </Badge>
          )}
        </>
      ),

      stats: [
        {
          label: t("amount_to_user"),
          icon: Banknote,
          value: (row) => formatAmount(row.amount),
        },
        {
          label: tCommon("fee"),
          icon: Receipt,
          value: (row) => formatAmount(row.fee),
        },
        {
          // The forex account was debited amount + fee up front; only the
          // amount reaches the wallet, and only on approval.
          label: t("debited_from_account"),
          icon: ArrowUpCircle,
          value: (row) => {
            const amount = toNumber(row.amount);
            const fee = toNumber(row.fee) ?? 0;
            return amount === null ? "—" : formatAmount(amount + fee);
          },
        },
        {
          label: tCommon("destination_wallet"),
          icon: Wallet,
          value: (row) => walletLabel(row),
        },
      ],

      sections: [
        {
          id: "references",
          title: tCommon("references"),
          description:
            t("how_this_withdrawal_is_matched_against"),
          icon: Hash,
          columns: 2,
          fields: [
            { key: "referenceId", emptyText: t("none_recorded"), copyable: true },
            { key: "trxId", emptyText: t("not_paid_out_yet"), copyable: true },
          ],
        },
        {
          id: "notes",
          title: tCommon("description"),
          icon: ClipboardList,
          columns: 1,
          fields: [
            {
              key: "description",
              title: tCommon("description"),
              fullWidth: true,
              emptyText: tCommon("no_description_recorded"),
            },
          ],
        },
        {
          id: "routing",
          title: t("source_routing"),
          description:
            t("captured_when_the_request_was_submitted"),
          icon: Link2,
          condition: (row) => Boolean(readMetadata(row)),
          render: (row) => {
            const meta = readMetadata(row) ?? {};
            const entries = ROUTING_LABELS.filter(
              ([key]) => meta[key] !== undefined && meta[key] !== null && meta[key] !== ""
            );
            if (!entries.length) {
              return (
                <p className="text-sm text-muted-foreground">
                  {t("no_routing_details_were_captured_for_this_request")}
                </p>
              );
            }
            return (
              <div className="rounded-lg border border-border divide-y divide-border">
                {entries.map(([key, label]) => (
                  <div
                    key={key}
                    className="flex items-start justify-between gap-4 px-3 py-2"
                  >
                    <span className="text-xs font-medium text-muted-foreground shrink-0">
                      {label}
                    </span>
                    <span className="text-sm font-medium min-w-0 text-end break-all font-mono">
                      {String(meta[key])}
                    </span>
                  </div>
                ))}
              </div>
            );
          },
        },
        {
          id: "record",
          title: tCommon("record"),
          icon: Clock,
          columns: 2,
          collapsible: true,
          defaultCollapsed: true,
          fields: [
            { key: "createdAt", title: tCommon("requested") },
            { key: "id", title: tCommon("transaction_id"), copyable: true },
          ],
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
      apiEndpoint="/api/admin/forex/withdraw"
      model="transaction"
      modelConfig={{
        type: "FOREX_WITHDRAW",
      }}
      permissions={{
        access: "access.forex.withdraw",
        view: "view.forex.withdraw",
        create: "create.forex.withdraw",
        edit: "edit.forex.withdraw",
        delete: "delete.forex.withdraw",
      }}
      pageSize={12}
      canCreate={false}
      canEdit={true}
      editLink="/admin/forex/withdraw/[id]"
      viewLink="/admin/forex/withdraw/[id]"
      editCondition={(item) => item.status === "PENDING"}
      canDelete={true}
      canView={true}
      isParanoid={true}
      title={t("forex_withdraw_management")}
      itemTitle="Forex Withdraw"
      columns={columns}
      viewConfig={viewConfig}
      analytics={analytics}
      design={{
        icon: ArrowUpCircle,
      }}
    />
  );
}
