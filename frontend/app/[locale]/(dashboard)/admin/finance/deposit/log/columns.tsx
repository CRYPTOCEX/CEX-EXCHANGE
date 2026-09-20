"use client";

import {
  Shield,
  User,
  DollarSign,
  ClipboardList,
  Clock,
  ArrowDownCircle,
  Wallet,
  Hash,
} from "lucide-react";
import React from "react";
import { format } from "date-fns";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { statusTone, statusLabel } from "@/lib/status-tone";
import type { ViewConfig } from "@/components/blocks/data-table/types/table";
import { useTranslations } from "next-intl";
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

  return (
    <Card className="bg-muted/10">
      <CardHeader>
        <CardTitle className="text-xs font-semibold">Metadata</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {entries.map(([key, val]) => (
            <div key={key} className="flex justify-between text-xs">
              <span className="font-bold">{metadataLabels[key] || key}</span>
              <span className="text-muted-foreground">{val}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * `amount` and `fee` are DECIMAL columns, and mysql2 hands every DECIMAL back
 * as a STRING — `row.amount - row.fee` would concatenate rather than subtract,
 * and `.toFixed()` would not exist on it at all.
 */
function toNumber(value: any): number {
  const num = typeof value === "number" ? value : parseFloat(String(value ?? ""));
  return Number.isFinite(num) ? num : 0;
}

/** Crypto deposits are read to 8 decimals; the table cell uses the same scale. */
function fmtAmount(value: any): string {
  return toNumber(value).toFixed(8);
}

function fmtDate(value: any): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : format(date, "MMM d, yyyy HH:mm");
}

/**
 * `metadata` is a JSON column: prod pre-parses it into an object, dev hands
 * back the raw string. Both shapes reach this panel.
 */
function metadataEntries(value: any): [string, any][] {
  if (!value) return [];
  let parsed: any = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return [];
  return Object.entries(parsed);
}

export function useViewConfig(): ViewConfig {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  return React.useMemo<ViewConfig>(
    () => ({
      // Three money figures, two opaque references and a metadata block — more
      // than the auto width gives, less than a ledger panel needs.
      size: "3xl",

      // The header already carries the user compound (avatar, name, email), so
      // the subtitle states WHAT the record is rather than repeating who.
      subtitle: (row) =>
        `Deposit of ${fmtAmount(row.amount)} ${row.wallet?.currency ?? ""}`.trim(),

      badges: (row) => (
        <>
          <Badge tone={statusTone(row.status)} appearance="soft">
            {statusLabel(row.status) || tCommon("unknown")}
          </Badge>
          {row.wallet?.type && (
            <Badge tone="neutral" appearance="soft">
              {String(row.wallet.type)}
            </Badge>
          )}
        </>
      ),

      stats: [
        {
          label: tCommon("gross_amount"),
          icon: DollarSign,
          value: (row) => (
            <span className="font-mono">
              {fmtAmount(row.amount)} {row.wallet?.currency ?? ""}
            </span>
          ),
        },
        {
          label: tCommon("fee"),
          icon: DollarSign,
          value: (row) => {
            const fee = toNumber(row.fee);
            return (
              <span className={fee > 0 ? "font-mono text-warning" : "font-mono"}>
                {fee.toFixed(8)}
              </span>
            );
          },
        },
        {
          // The approval path credits `amount - fee`, so this is the figure the
          // customer's wallet actually receives — not the one on the request.
          label: t("net_credited"),
          icon: Wallet,
          tone: "success",
          value: (row) => (
            <span className="font-mono">
              {(toNumber(row.amount) - toNumber(row.fee)).toFixed(8)}{" "}
              {row.wallet?.currency ?? ""}
            </span>
          ),
        },
      ],

      sections: [
        {
          id: "destination",
          title: tCommon("destination"),
          icon: Wallet,
          columns: 2,
          fields: [
            { key: "wallet.currency", title: tCommon("wallet"), icon: Wallet },
            {
              key: "id",
              title: tCommon("transaction_id"),
              icon: Shield,
              copyable: true,
            },
          ],
        },
        {
          id: "references",
          title: tCommon("references"),
          description: t("external_identifiers_used_to_reconcile_this"),
          icon: Hash,
          columns: 2,
          fields: [
            { key: "referenceId", icon: Hash, emptyText: tCommon("not_set") },
            { key: "trxId", icon: Hash, emptyText: tCommon("not_recorded") },
          ],
        },
        {
          id: "notes",
          title: tCommon("description"),
          icon: ClipboardList,
          columns: 1,
          condition: (row) => Boolean(row.description),
          fields: [{ key: "description", fullWidth: true }],
        },
        {
          id: "metadata",
          title: tCommon("metadata"),
          description:
            t("recorded_by_the_gateway_or_by"),
          icon: ClipboardList,
          // The column's own renderer wraps this in a titled Card, which would
          // sit inside a section that already has that title.
          condition: (row) => metadataEntries(row.metadata).length > 0,
          render: (row) => (
            <div className="rounded-lg border border-border divide-y divide-border">
              {metadataEntries(row.metadata).map(([key, value]) => (
                <div
                  key={key}
                  className="flex items-start justify-between gap-4 p-3"
                >
                  <span className="text-xs font-medium text-muted-foreground shrink-0">
                    {metadataLabels[key] || key}
                  </span>
                  <span className="text-sm break-words text-end min-w-0">
                    {typeof value === "object" && value !== null
                      ? JSON.stringify(value)
                      : String(value)}
                  </span>
                </div>
              ))}
            </div>
          ),
        },
        {
          id: "timeline",
          title: tCommon("timeline"),
          icon: Clock,
          columns: 2,
          fields: [
            {
              // The list column renders this as an SLA-aware age chip; a details
              // panel wants the absolute moment the request arrived.
              key: "createdAt",
              title: tCommon("requested"),
              icon: Clock,
              render: (value) => fmtDate(value),
            },
            {
              key: "updatedAt",
              title: tCommon("last_updated"),
              icon: Clock,
              hideEmpty: true,
              render: (value) => fmtDate(value),
            },
            {
              key: "deletedAt",
              title: t("archived"),
              icon: Clock,
              condition: (row) => Boolean(row.deletedAt),
              render: (value) => fmtDate(value),
            },
          ],
        },
      ],
    }),
    []
  );
}

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
          description: [tCommon('users_first_name'), tCommon('users_last_name')],
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
    key: "wallet.currency",
    title: tCommon("wallet"),
    type: "text",
    icon: Wallet,
    sortable: true,
    searchable: true,
    filterable: true,
    description: t("associated_wallet_for_the_deposit"),
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
    priority: 2,
  },
  {
    // Queue contract point 2. The list already sorted by createdAt but said
    // nothing about whether the oldest row was overdue.
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
      config: { sla: "deposit", activeStatuses: ["PENDING"] },
    },
  },
  {
    key: "status",
    title: tCommon("status"),
    type: "select",
    icon: ArrowDownCircle,
    sortable: true,
    searchable: true,
    filterable: true,
    description: t("current_status_of_the_deposit_transaction"),
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
      // No local `variant`: the hue comes from `lib/status-tone.ts`. Adding one
      // back here silently overrides the platform's canonical status colours.
      type: "badge",
      config: {
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
    description: t("deposit_amount_in_the_wallets_currency"),
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
    key: "fee",
    title: tCommon("fee"),
    type: "number",
    icon: DollarSign,
    sortable: true,
    searchable: false,
    filterable: true,
    description: t("processing_fee_charged_for_the_deposit"),
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
    key: "description",
    title: tCommon("description"),
    type: "text",
    icon: ClipboardList,
    sortable: false,
    searchable: true,
    filterable: false,
    description: t("additional_notes_or_information_about_the_deposit"),
    priority: 2,
    expandedOnly: true,
  },
  {
    key: "referenceId",
    title: tCommon("reference_id"),
    type: "text",
    icon: Hash,
    sortable: true,
    searchable: true,
    filterable: true,
    description: t("external_reference_identifier_for_spot_trading"),
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
    description: t("blockchain_transaction_hash_for_crypto_deposits"),
    priority: 3,
  },
  // The absolute-date `createdAt` column that used to sit here is gone: the
  // `age` column above is the same field, and two columns keyed `createdAt`
  // both feed the column-visibility list and the sort menu, so the operator
  // saw the field twice and could sort by whichever one they happened to hit.
  // The absolute timestamp is still one hover away, in the age cell's tooltip.
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
