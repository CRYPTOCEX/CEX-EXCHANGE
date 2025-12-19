"use client";
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
} from "lucide-react";

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
      type: "badge",
      config: {
        withDot: true,
        variant: (value: string) => {
          switch (value) {
            case "COMPLETED":
              return "success";
            case "PENDING":
              return "warning";
            case "PROCESSING":
              return "warning";
            case "FAILED":
              return "destructive";
            case "CANCELLED":
              return "destructive";
            case "EXPIRED":
              return "secondary";
            case "REFUNDED":
              return "secondary";
            case "PARTIALLY_REFUNDED":
              return "secondary";
            default:
              return "secondary";
          }
        },
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
      { value: "ECO", label: t("ecosystem") },
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
        <span className="font-medium text-green-600">
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
