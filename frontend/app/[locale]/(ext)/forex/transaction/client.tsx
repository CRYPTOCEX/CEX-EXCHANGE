"use client";

import DataTable from "@/components/blocks/data-table";
import { useColumns } from "./columns";
import { useAnalytics } from "./analytics";
import { useUserStore } from "@/store/user";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Receipt,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
} from "lucide-react";
import { formatCurrencySafe } from "@/utils/currency";
import { useTranslations } from "next-intl";

const getStatusIcon = (status: string) => {
  switch (status) {
    case "PENDING":
      return <Clock className="w-4 h-4" />;
    case "PROCESSING":
      return <AlertCircle className="w-4 h-4" />;
    case "COMPLETED":
      return <CheckCircle className="w-4 h-4" />;
    case "FAILED":
    case "CANCELLED":
    case "EXPIRED":
    case "REJECTED":
    case "REFUNDED":
    case "FROZEN":
    case "TIMEOUT":
      return <XCircle className="w-4 h-4" />;
    default:
      return <Info className="w-4 h-4" />;
  }
};

const getStatusVariant = (status: string) => {
  switch (status) {
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
    case "REFUNDED":
    case "FROZEN":
    case "TIMEOUT":
      return "destructive";
    default:
      return "default";
  }
};

const getTypeIcon = (type: string) => {
  switch (type) {
    case "FOREX_DEPOSIT":
      return <TrendingUp className="w-4 h-4" />;
    case "FOREX_WITHDRAW":
      return <TrendingDown className="w-4 h-4" />;
    default:
      return <Receipt className="w-4 h-4" />;
  }
};

export default function ForexTransactionsClient() {
  const t = useTranslations("ext_forex");
  const tExt = useTranslations("ext");
  const tCommon = useTranslations("common");
  const { user } = useUserStore();
  const columns = useColumns();
  const analytics = useAnalytics();

  const renderTransactionDetails = (transaction: any) => {
    if (!transaction) return null;

    const metadata = transaction.metadata
      ? typeof transaction.metadata === "string"
        ? JSON.parse(transaction.metadata)
        : transaction.metadata
      : {};

    return (
      <div className="space-y-4 p-4">
        {/* Transaction Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                transaction.type === "FOREX_DEPOSIT"
                  ? `bg-emerald-600/10 text-emerald-600 dark:text-emerald-400`
                  : `bg-teal-500/10 text-amber-600 dark:text-amber-400`
              }`}
            >
              {getTypeIcon(transaction.type)}
            </div>
            <span className="font-medium text-zinc-900 dark:text-white">
              {transaction.type === "FOREX_DEPOSIT"
                ? "Forex Deposit"
                : "Forex Withdrawal"}
            </span>
          </div>
          <Badge variant={getStatusVariant(transaction.status)}>
            <div className="flex items-center gap-1">
              {getStatusIcon(transaction.status)}
              {transaction.status}
            </div>
          </Badge>
        </div>

        {/* Transaction Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border border-zinc-200/50 dark:border-zinc-700/50 shadow-lg bg-white dark:bg-zinc-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-900 dark:text-white">
                {tExt("transaction_info")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between items-end text-sm">
                <span className="text-zinc-500 dark:text-zinc-400">ID:</span>
                <span className="font-mono text-xs text-zinc-900 dark:text-white text-right">
                  {transaction.id}
                </span>
              </div>
              <div className="flex justify-between items-end text-sm">
                <span className="text-zinc-500 dark:text-zinc-400">
                  {tCommon("date")}:
                </span>
                <span className="text-zinc-900 dark:text-white text-right">
                  {new Date(transaction.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between items-end text-sm">
                <span className="text-zinc-500 dark:text-zinc-400">
                  {tCommon("amount")}:
                </span>
                <span
                  className={`font-semibold text-emerald-600 dark:text-emerald-400 text-right`}
                >
                  {formatCurrencySafe(
                    transaction.amount,
                    transaction.wallet?.currency || "USD"
                  )}
                </span>
              </div>
              {transaction.fee > 0 && (
                <div className="flex justify-between items-end text-sm">
                  <span className="text-zinc-500 dark:text-zinc-400">
                    {tCommon("fee")}:
                  </span>
                  <span className="text-amber-600 dark:text-amber-400 text-right">
                    {formatCurrencySafe(
                      transaction.fee,
                      transaction.wallet?.currency || "USD"
                    )}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border border-zinc-200/50 dark:border-zinc-700/50 shadow-lg bg-white dark:bg-zinc-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-900 dark:text-white">
                {t("additional_details")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {transaction.wallet && (
                <div className="flex justify-between items-end text-sm">
                  <span className="text-zinc-500 dark:text-zinc-400">
                    {tCommon("wallet")}:
                  </span>
                  <span className="text-zinc-900 dark:text-white text-right">
                    {transaction.wallet.currency} ({transaction.wallet.type})
                  </span>
                </div>
              )}
              {metadata.accountId && (
                <div className="flex justify-between items-end text-sm">
                  <span className="text-zinc-500 dark:text-zinc-400">
                    {tCommon("account")}:
                  </span>
                  <span className="font-mono text-xs text-zinc-900 dark:text-white text-right">
                    {metadata.accountId}
                  </span>
                </div>
              )}
              {metadata.chain && (
                <div className="flex justify-between items-end text-sm">
                  <span className="text-zinc-500 dark:text-zinc-400">
                    {tExt("chain")}:
                  </span>
                  <span className="text-zinc-900 dark:text-white text-right">
                    {metadata.chain}
                  </span>
                </div>
              )}
              {metadata.price && (
                <div className="flex justify-between items-end text-sm">
                  <span className="text-zinc-500 dark:text-zinc-400">
                    {tCommon("price")}:
                  </span>
                  <span className="text-zinc-900 dark:text-white text-right">
                    ${metadata.price}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Description */}
        {transaction.description && (
          <Card className="border border-zinc-200/50 dark:border-zinc-700/50 shadow-lg bg-white dark:bg-zinc-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-900 dark:text-white">
                Description
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {transaction.description}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Status Information */}
        <Card className="border border-zinc-200/50 dark:border-zinc-700/50 shadow-lg bg-white dark:bg-zinc-900">
          <CardContent className="pt-4">
            {transaction.status === "PENDING" && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">
                  {t("transaction_is_pending_approval_and_will")}
                </span>
              </div>
            )}
            {transaction.status === "COMPLETED" && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">
                  {tCommon("transaction_completed_successfully_1")}
                </span>
              </div>
            )}
            {["FAILED", "CANCELLED", "REJECTED"].includes(
              transaction.status
            ) && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 border">
                <XCircle className="w-4 h-4" />
                <span className="text-sm">
                  Transaction {transaction.status.toLowerCase()}
                  {t("contact_support_if_needed")}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  // Premium header handles full page layout, so we just render the DataTable
  return (
    <DataTable
      apiEndpoint="/api/forex/transaction"
      model="transaction"
      modelConfig={{
        userId: user?.id,
      }}
      userAnalytics={true}
      pageSize={12}
      canView={true}
      isParanoid={false}
      title={t("forex_transaction_history")}
      description={t("view_and_manage_all_your_forex_1")}
      itemTitle="Transaction"
      columns={columns}
      analytics={analytics}
      viewContent={renderTransactionDetails}
      design={{
        animation: "orbs",
        primaryColor: `emerald-600`,
        secondaryColor: `teal-500`,
        badge: "Transaction History",
        icon: Receipt,
        detailsAlignment: "bottom",
      }}
    />
  );
}
