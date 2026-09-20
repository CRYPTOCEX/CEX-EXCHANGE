"use client";
import React from "react";
import { useTranslations } from "next-intl";
import {
  Hash,
  DollarSign,
  CheckCircle2,
  CalendarIcon,
  FileText,
  Coins,
  User,
  Mail,
  Wallet,
  CreditCard,
  Clock,
  Receipt,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { statusTone } from "@/lib/status-tone";
import type { ViewConfig } from "@/components/blocks/data-table/types/table";

export function useColumns() {
  const t = useTranslations("ext_gateway");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  return [
  {
    key: "id",
    title: tExt("payment_id"),
    type: "text",
    icon: Hash,
    sortable: true,
    searchable: true,
    filterable: true,
    description: t("unique_transaction_identifier_for_tracking_your"),
    priority: 1,
  },
  {
    key: "amount",
    title: tCommon("amount"),
    type: "number",
    icon: CreditCard,
    sortable: true,
    searchable: false,
    filterable: false,
    description: t("total_payment_amount_charged_for_this_transaction"),
    priority: 1,
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
    key: "status",
    title: tCommon("status"),
    type: "select",
    icon: CheckCircle2,
    sortable: true,
    searchable: true,
    filterable: true,
    description: t("current_status_of_your_payment_transaction"),
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
      { value: "EXPIRED", label: tCommon("expired") },
      { value: "REFUNDED", label: tCommon("refunded") },
      { value: "PARTIALLY_REFUNDED", label: tExt("partially_refunded") },
    ],
  },
  {
    key: "orderId",
    title: tExt("order_id"),
    type: "text",
    icon: FileText,
    sortable: true,
    searchable: true,
    filterable: true,
    description: t("your_order_reference_number_from_the_merchant"),
    priority: 2,
  },
  {
    key: "createdAt",
    title: tCommon("created_at"),
    type: "date",
    icon: CalendarIcon,
    sortable: true,
    searchable: false,
    filterable: true,
    description: t("date_and_time_when_you_initiated_this_payment"),
    priority: 2,
    render: {
      type: "date",
      format: "PPP p",
    },
  },
  {
    key: "walletType",
    title: tCommon("wallet_type"),
    type: "select",
    icon: Wallet,
    sortable: true,
    searchable: false,
    filterable: true,
    description: t("type_of_wallet_used_to_make_this_payment"),
    priority: 3,
    options: [
      { value: "FIAT", label: tCommon("fiat") },
      { value: "SPOT", label: tCommon("spot") },
      { value: "ECO", label: tCommon("ecosystem") },
    ],
  },
  {
    key: "currency",
    title: tCommon("currency"),
    type: "text",
    icon: Coins,
    sortable: true,
    searchable: false,
    filterable: true,
    description: t("currency_code_for_this_payment_e_g_usd_eur_btc"),
    expandedOnly: true,
  },
  {
    key: "feeAmount",
    title: tCommon("transaction_fee"),
    type: "number",
    icon: DollarSign,
    sortable: true,
    searchable: false,
    filterable: false,
    description: t("gateway_processing_fee_charged_for_this"),
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
    key: "netAmount",
    title: tExt("net_amount"),
    type: "number",
    icon: DollarSign,
    sortable: true,
    searchable: false,
    filterable: false,
    description: t("final_amount_after_transaction_fees_have"),
    expandedOnly: true,
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
    key: "customerEmail",
    title: t("customer_email"),
    type: "text",
    icon: Mail,
    sortable: true,
    searchable: true,
    filterable: false,
    description: t("email_address_associated_with_this_payment"),
    expandedOnly: true,
  },
  {
    key: "customerName",
    title: t("customer_name"),
    type: "text",
    icon: User,
    sortable: true,
    searchable: true,
    filterable: false,
    description: t("name_provided_for_this_payment_transaction"),
    expandedOnly: true,
  },
  {
    key: "completedAt",
    title: tExt("completed_at"),
    type: "date",
    icon: CalendarIcon,
    sortable: true,
    searchable: false,
    filterable: false,
    description: t("date_and_time_when_your_payment"),
    expandedOnly: true,
    render: {
      type: "date",
      format: "PPP p",
    },
  },
] as ColumnDefinition[];
}

/* ---------------------------------------------------------------------- *
 * View dialog
 *
 * `/api/gateway/payment` hands back a deliberately narrow projection — id
 * (the payment intent), orderId, amount/currency/walletType, the fee split,
 * status, the checkout customer, testMode and the two timestamps. Nothing
 * else is available here, so the panel stays compact: the fee split is the
 * headline, and the rest groups as routing / customer / timeline.
 *
 * `orderId` is the table's primary column, so it is the header subtitle
 * rather than a tile.
 * ---------------------------------------------------------------------- */

const money = (value: any, currency?: string) => {
  const amount = Number(value ?? 0);
  return `${Number.isFinite(amount) ? amount.toFixed(2) : "0.00"}${
    currency ? ` ${currency}` : ""
  }`;
};

export function useViewConfig(): ViewConfig {
  const t = useTranslations("ext_gateway");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");

  return React.useMemo<ViewConfig>(
    () => ({
      size: "3xl",

      title: (row) => (
        <span className="block font-mono text-base break-all">{row.id}</span>
      ),
      subtitle: (row) => (row.orderId ? t("order", { orderId: String(row.orderId) }) : undefined),

      badges: (row) => (
        <>
          <Badge tone={statusTone(row.status)} appearance="soft" className="capitalize">
            {String(row.status ?? "").toLowerCase().replace(/_/g, " ")}
          </Badge>
          {row.testMode && (
            <Badge tone="warning" appearance="soft">
              {tCommon("test_mode")}
            </Badge>
          )}
        </>
      ),

      stats: [
        {
          label: tCommon("amount"),
          icon: CreditCard,
          value: (row) => money(row.amount, row.currency),
        },
        {
          label: tCommon("transaction_fee"),
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
          title: tCommon("settlement"),
          description: t("where_the_funds_landed_and_in_which_currency"),
          icon: Wallet,
          columns: 2,
          priority: 1,
          fields: [
            { key: "walletType", icon: Wallet },
            { key: "currency", icon: Coins },
          ],
        },
        {
          id: "customer",
          title: tCommon("customer"),
          icon: User,
          columns: 2,
          priority: 2,
          condition: (row) => Boolean(row.customerName || row.customerEmail),
          fields: [
            { key: "customerName", icon: User },
            { key: "customerEmail", icon: Mail, copyable: true },
          ],
        },
        {
          id: "timeline",
          title: tCommon("timeline"),
          icon: Clock,
          columns: 2,
          priority: 3,
          fields: [
            { key: "createdAt", icon: CalendarIcon },
            { key: "completedAt", icon: CheckCircle2 },
          ],
        },
      ],
    }),
    [tCommon, tExt]
  );
}
