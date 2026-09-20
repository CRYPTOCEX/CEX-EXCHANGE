"use client";

import React from "react";
import {
  Hash,
  Building2,
  Mail,
  DollarSign,
  CheckCircle2,
  CalendarIcon,
  Wallet,
  FileText,
  TrendingUp,
  ArrowDownToLine,
  Clock,
  Coins,
  Link2,
  Code,
  Receipt,
} from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { statusTone } from "@/lib/status-tone";
import type {
  FormConfig,
  ViewConfig,
} from "@/components/blocks/data-table/types/table";

import { useTranslations } from "next-intl";
export function useColumns(): ColumnDefinition[] {
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const tExtAdmin = useTranslations("ext_admin");
  return [
    {
      key: "id",
      title: tExt("payout_id"),
      type: "text",
      icon: Hash,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("unique_payout_transaction_identifier_for_tracking"),
      priority: 1,
    },
    {
      key: "merchant",
      title: tExtAdmin("merchant"),
      type: "compound",
      icon: Building2,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("the_merchant_business_receiving_funds_from"),
      priority: 1,
      render: {
        type: "compound",
        config: {
          primary: {
            key: "name",
            title: tExtAdmin("merchant_name"),
            description: tExtAdmin("merchant_business_name"),
            icon: Building2,
          },
          secondary: {
            key: "email",
            title: tCommon("email"),
            icon: Mail,
          },
        },
      },
    },
    {
      key: "netAmount",
      title: tExt("net_amount"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: false,
      filterable: false,
      description: tExtAdmin("final_payout_amount_transferred_to_merchant"),
      priority: 1,
      render: {
        type: "custom",
        render: (value: number, row: any) => (
          <span className="font-medium text-success">
            {value?.toFixed(2)} {row.currency}
          </span>
        ),
      },
    },
    {
      key: "status",
      title: tCommon("status"),
      type: "select",
      icon: CheckCircle2,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("current_processing_status_of_the_payouts_account"),
      priority: 1,
      render: {
        // No local `variant`: the hue comes from `lib/status-tone.ts`. Adding one
        // back here silently overrides the platform's canonical status colours.
        type: "badge",
        config: {
          withDot: true,
        },
      },
      options: [
        { value: "PENDING", label: tCommon("pending") },
        { value: "PROCESSING", label: tCommon("processing") },
        { value: "COMPLETED", label: tCommon("completed") },
        { value: "FAILED", label: tCommon("failed") },
        { value: "CANCELLED", label: tCommon("cancelled") },
      ],
    },
    {
      key: "createdAt",
      title: tCommon("created_at"),
      type: "date",
      icon: CalendarIcon,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tExtAdmin("date_and_time_when_the_payout"),
      render: {
        type: "date",
        format: "PPP p",
      },
      priority: 2,
    },
    {
      key: "grossAmount",
      title: tCommon("gross_amount"),
      type: "number",
      icon: TrendingUp,
      sortable: true,
      searchable: false,
      filterable: false,
      description: tExtAdmin("total_revenue_amount_from_all_payments"),
      priority: 3,
      render: {
        type: "custom",
        render: (value: number, row: any) => (
          <span className="font-medium">
            {value?.toFixed(2)} {row.currency}
          </span>
        ),
      },
    },
    {
      key: "paymentCount",
      title: tCommon("payments"),
      type: "number",
      icon: FileText,
      sortable: true,
      searchable: false,
      filterable: false,
      description: tExtAdmin("total_number_of_successful_payments_included"),
      expandedOnly: true,
    },
    {
      key: "refundCount",
      title: tCommon("refunds"),
      type: "number",
      icon: ArrowDownToLine,
      sortable: true,
      searchable: false,
      filterable: false,
      description: tExtAdmin("total_number_of_refunds_processed_and"),
      expandedOnly: true,
    },
    {
      key: "feeAmount",
      title: tCommon("fee"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: false,
      filterable: false,
      description: tExtAdmin("total_gateway_fees_deducted_from_the_gross_amount"),
      expandedOnly: true,
      render: {
        type: "custom",
        render: (value: number, row: any) => (
          <span className="text-muted-foreground">
            {value?.toFixed(2)} {row.currency}
          </span>
        ),
      },
    },
    {
      key: "walletType",
      title: tCommon("wallet_type"),
      type: "text",
      icon: Wallet,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tExtAdmin("type_of_wallet_or_account_where"),
      expandedOnly: true,
    },
    {
      key: "periodStart",
      title: tCommon("period_start"),
      type: "date",
      icon: CalendarIcon,
      sortable: true,
      searchable: false,
      filterable: false,
      description: tExtAdmin("starting_date_of_the_billing_period"),
      render: {
        type: "date",
        format: "PPP",
      },
      expandedOnly: true,
    },
    {
      key: "periodEnd",
      title: tCommon("period_end"),
      type: "date",
      icon: CalendarIcon,
      sortable: true,
      searchable: false,
      filterable: false,
      description: tExtAdmin("ending_date_of_the_billing_period"),
      render: {
        type: "date",
        format: "PPP",
      },
      expandedOnly: true,
    },
  ];
}

/* ---------------------------------------------------------------------- *
 * View dialog
 *
 * A payout is a settlement statement: one merchant, one period, and the
 * gross → fee → net arithmetic that produced the transfer. The three money
 * figures are the headline; the period, the counts that back it and the
 * settlement identifiers are the body. `payoutId`, `transactionId`,
 * `currency`, `processedAt`, `updatedAt` and `metadata` are on the payload
 * (whole `gatewayPayout` row) but have no column, so they carry a `render`.
 * ---------------------------------------------------------------------- */

const money = (value: any, currency?: string) => {
  const amount = Number(value ?? 0);
  return `${Number.isFinite(amount) ? amount.toFixed(2) : "0.00"}${
    currency ? ` ${currency}` : ""
  }`;
};

const dateTime = (value: any) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : format(date, "PPP p");
};

/** MySQL JSON columns arrive parsed on prod and as a string on some drivers. */
const asObject = (value: any): Record<string, any> | null => {
  let parsed = value;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return null;
    }
  }
  return parsed && typeof parsed === "object" && !Array.isArray(parsed)
    ? parsed
    : null;
};

const mono = (value: any) => (
  <span className="font-mono text-xs break-all">{String(value)}</span>
);

export function useViewConfig(): ViewConfig {
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const tExtAdmin = useTranslations("ext_admin");

  return React.useMemo<ViewConfig>(
    () => ({
      size: "4xl",

      // `merchant` is the table's primary (compound) column and therefore the
      // dialog header, not a tile.
      title: (row) => (
        <span className="block truncate">
          {row.merchant?.name || tExtAdmin("merchant")}
        </span>
      ),
      subtitle: (row) => row.merchant?.email || undefined,

      badges: (row) => (
        <>
          <Badge tone={statusTone(row.status)} appearance="soft" className="capitalize">
            {String(row.status ?? "").toLowerCase().replace(/_/g, " ")}
          </Badge>
          {row.walletType && (
            <Badge tone="neutral" appearance="soft">
              <Wallet className="h-3 w-3" />
              {row.walletType}
            </Badge>
          )}
        </>
      ),

      stats: [
        {
          label: tCommon("gross_amount"),
          icon: TrendingUp,
          value: (row) => money(row.grossAmount, row.currency),
        },
        {
          label: tCommon("fee"),
          icon: Receipt,
          value: (row) => money(row.feeAmount, row.currency),
        },
        {
          label: tExt("net_amount"),
          icon: Wallet,
          tone: "success",
          value: (row) => money(row.netAmount, row.currency),
        },
      ],

      sections: [
        {
          id: "settlement",
          title: tCommon("payout_information"),
          icon: Hash,
          columns: 3,
          priority: 1,
          fields: [
            { key: "id", icon: Hash },
            {
              // NOT the same value as `id`: `id` is the row's uuid (and the
              // table's "Payout ID" column), `payoutId` is the generated
              // human-facing reference the merchant sees and support quotes.
              // Titled apart so the two do not appear as duplicate tiles.
              key: "payoutId",
              title: tExtAdmin("payout_reference"),
              icon: Receipt,
              copyable: true,
              render: mono,
            },
            { key: "walletType", icon: Wallet },
            {
              key: "currency",
              title: tCommon("currency"),
              icon: Coins,
              render: (value) => String(value),
            },
            {
              key: "merchantId",
              title: tExtAdmin("merchant_id"),
              icon: Building2,
              copyable: true,
              render: mono,
            },
            {
              key: "transactionId",
              title: tExtAdmin("wallet_transaction"),
              icon: Link2,
              copyable: true,
              condition: (row) => Boolean(row.transactionId),
              render: mono,
            },
          ],
        },
        {
          id: "period",
          title: tCommon("period"),
          description: tExtAdmin("the_window_of_merchant_activity_this"),
          icon: CalendarIcon,
          columns: 2,
          priority: 2,
          fields: [
            { key: "periodStart", icon: CalendarIcon },
            { key: "periodEnd", icon: CalendarIcon },
          ],
        },
        {
          id: "counts",
          title: tExtAdmin("transaction_counts"),
          icon: FileText,
          columns: 2,
          priority: 3,
          fields: [
            { key: "paymentCount", title: tCommon("payments"), icon: FileText },
            {
              key: "refundCount",
              title: tCommon("refunds"),
              icon: ArrowDownToLine,
            },
          ],
        },
        {
          id: "timeline",
          title: tCommon("timeline"),
          icon: Clock,
          columns: 3,
          priority: 4,
          fields: [
            { key: "createdAt", icon: CalendarIcon },
            {
              key: "processedAt",
              title: tExtAdmin("processed_at"),
              icon: CheckCircle2,
              condition: (row) => Boolean(row.processedAt),
              render: dateTime,
            },
            {
              key: "updatedAt",
              title: tCommon("last_updated"),
              icon: Clock,
              render: dateTime,
            },
          ],
        },
        {
          id: "metadata",
          title: tCommon("metadata"),
          icon: Code,
          priority: 5,
          condition: (row) =>
            Object.keys(asObject(row.metadata) ?? {}).length > 0,
          render: (row) => (
            <pre className="rounded-lg border border-border bg-muted p-3 text-xs text-muted-foreground overflow-x-auto">
              {JSON.stringify(asObject(row.metadata), null, 2)}
            </pre>
          ),
        },
      ],
    }),
    [tCommon, tExt, tExtAdmin]
  );
}

export function useFormConfig(): FormConfig {
  const tCommon = useTranslations("common");
  const tExtAdmin = useTranslations("ext_admin");
  return {
    edit: {
      title: tExtAdmin("edit_payout"),
      description: tExtAdmin("update_payout_transaction_details_including_amount"),
      groups: [
        {
          id: "payout-info",
          title: tCommon("payout_information"),
          icon: DollarSign,
          priority: 1,
          fields: [
            {
              key: "amount",
              required: true,
              min: 0
            },
            {
              key: "currency",
              required: true,
              maxLength: 20
            },
            {
              key: "walletType",
              required: true,
              maxLength: 20
            },
          ],
        },
        {
          id: "status-info",
          title: tCommon("status"),
          icon: CheckCircle2,
          priority: 2,
          fields: [
            {
              key: "status",
              required: true,
              options: [
                { value: "PENDING", label: tCommon("pending") },
                { value: "PROCESSING", label: tCommon("processing") },
                { value: "COMPLETED", label: tCommon("completed") },
                { value: "FAILED", label: tCommon("failed") },
                { value: "CANCELLED", label: tCommon("cancelled") },
              ],
            },
          ],
        },
        {
          id: "amounts",
          title: tExtAdmin("amount_details"),
          icon: TrendingUp,
          priority: 3,
          fields: [
            {
              key: "grossAmount",
              required: true,
              min: 0
            },
            {
              key: "feeAmount",
              required: true,
              min: 0
            },
            {
              key: "netAmount",
              required: true,
              min: 0
            },
          ],
        },
        {
          id: "counts",
          title: tExtAdmin("transaction_counts"),
          icon: FileText,
          priority: 4,
          fields: [
            {
              key: "paymentCount",
              required: true,
              min: 0
            },
            {
              key: "refundCount",
              required: true,
              min: 0
            },
          ],
        },
        {
          id: "period",
          title: tCommon("period"),
          icon: CalendarIcon,
          priority: 5,
          fields: [
            {
              key: "periodStart",
              required: true
            },
            {
              key: "periodEnd",
              required: true
            },
          ],
        },
      ],
    },
  };
}
