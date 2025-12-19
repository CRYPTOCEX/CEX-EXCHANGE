"use client";
import { useTranslations } from "next-intl";
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
} from "lucide-react";

export function useColumns() {
  const t = useTranslations("ext_forex");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  return [
  {
    key: "id",
    title: tCommon("id"),
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
        withDot: true,
        variant: (value: string) => {
          switch (value) {
            case "PENDING":
              return "secondary";
            case "PROCESSING":
              return "outline";
            case "COMPLETED":
              return "success";
            case "FAILED":
            case "CANCELLED":
            case "EXPIRED":
            case "REJECTED":
            case "TIMEOUT":
              return "destructive";
            case "REFUNDED":
            case "FROZEN":
              return "warning";
            default:
              return "default";
          }
        },
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
    key: "wallet",
    title: tCommon("wallet"),
    type: "custom",
    icon: Wallet,
    sortable: true,
    searchable: true,
    filterable: true,
    description: t("wallet_used_for_this_forex_transaction"),
    priority: 1,
    render: (value: any, row: any) => {
      const wallet = row?.wallet || value;
      if (!wallet) return "N/A";
      // If wallet has 'currency' and 'type', show them in a formatted string.
      if (wallet.currency && wallet.type) {
        return `${wallet.currency} (${wallet.type})`;
      }
      // Otherwise fallback to wallet.name or wallet.id
      return wallet.name || wallet.id || "N/A";
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
        if (!value) return <span className="text-gray-400">-</span>;

        try {
          const metadata = typeof value === "string" ? JSON.parse(value) : value;
          return (
            <div className="space-y-1">
              {metadata.accountId && (
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {tCommon("account")} {metadata.accountId}
                </div>
              )}
              {metadata.currency && (
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {tCommon("currency")} {metadata.currency}
                </div>
              )}
              {metadata.chain && (
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {tExt("chain")} {metadata.chain}
                </div>
              )}
              {metadata.price && (
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {tCommon("price")} {metadata.price}
                </div>
              )}
            </div>
          );
        } catch (e) {
          return <span className="text-gray-400">-</span>;
        }
      },
    },
  },
] as ColumnDefinition[];
}
