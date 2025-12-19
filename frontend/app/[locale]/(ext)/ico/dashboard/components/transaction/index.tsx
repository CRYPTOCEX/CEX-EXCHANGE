"use client";

import DataTable from "@/components/blocks/data-table";
import { useColumns } from "./columns";
import { analytics } from "./analytics";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Receipt,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  Coins,
} from "lucide-react";
import { formatCurrencySafe } from "@/utils/currency";
import { useTranslations } from "next-intl";

const getStatusIcon = (status: string) => {
  switch (status.toUpperCase()) {
    case "PENDING":
      return <Clock className="w-4 h-4" />;
    case "VERIFICATION":
      return <AlertCircle className="w-4 h-4" />;
    case "RELEASED":
      return <CheckCircle className="w-4 h-4" />;
    case "REJECTED":
      return <XCircle className="w-4 h-4" />;
    default:
      return <Info className="w-4 h-4" />;
  }
};

const getStatusVariant = (status: string) => {
  switch (status.toUpperCase()) {
    case "PENDING":
      return "warning";
    case "VERIFICATION":
      return "outline";
    case "RELEASED":
      return "success";
    case "REJECTED":
      return "destructive";
    default:
      return "default";
  }
};

export default function IcoTransactionsPage() {
  const columns = useColumns();
  const t = useTranslations("ext_ico");
  const tExt = useTranslations("ext");
  const tCommon = useTranslations("common");
  const renderTransactionDetails = (transaction: any) => {
    if (!transaction) return null;

    return (
      <div className="space-y-4 p-4">
        {/* Transaction Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={"w-8 h-8 rounded-lg flex items-center justify-center bg-teal-600/10 text-teal-600 dark:text-teal-400"}>
              <Coins className="w-4 h-4" />
            </div>
            <span className="font-medium text-zinc-900 dark:text-white">
              ICO Token Purchase
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
                <span className="text-zinc-500 dark:text-zinc-400">{tCommon("date")}:</span>
                <span className="text-zinc-900 dark:text-white text-right">
                  {new Date(transaction.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between items-end text-sm">
                <span className="text-zinc-500 dark:text-zinc-400">{tCommon("amount")}:</span>
                <span className={"font-semibold text-teal-600 dark:text-teal-400 text-right"}>
                  {transaction.amount?.toLocaleString()} tokens
                </span>
              </div>
              <div className="flex justify-between items-end text-sm">
                <span className="text-zinc-500 dark:text-zinc-400">{tCommon("price")}:</span>
                <span className={"text-teal-600 dark:text-teal-400 text-right"}>
                  {formatCurrencySafe(transaction.price, "USD")}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-zinc-200/50 dark:border-zinc-700/50 shadow-lg bg-white dark:bg-zinc-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-900 dark:text-white">
                {t("offering_details")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {transaction.offering && (
                <div className="flex justify-between items-end text-sm">
                  <span className="text-zinc-500 dark:text-zinc-400">{tExt("offering")}:</span>
                  <span className="text-zinc-900 dark:text-white text-right">
                    {transaction.offering.name}
                  </span>
                </div>
              )}
              {transaction.walletAddress && (
                <div className="flex justify-between items-end text-sm">
                  <span className="text-zinc-500 dark:text-zinc-400">{tCommon("wallet")}:</span>
                  <span className="font-mono text-xs text-zinc-900 dark:text-white truncate max-w-[200px] text-right">
                    {transaction.walletAddress}
                  </span>
                </div>
              )}
              {transaction.releaseUrl && (
                <div className="flex justify-between items-end text-sm">
                  <span className="text-zinc-500 dark:text-zinc-400">{t("release")}:</span>
                  <a
                    href={transaction.releaseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline text-right"
                  >
                    {t("view_document")}
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Status Information */}
        <Card className="border border-zinc-200/50 dark:border-zinc-700/50 shadow-lg bg-white dark:bg-zinc-900">
          <CardContent className="pt-4">
            {transaction.status === "PENDING" && (
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20">
                <Clock className="w-4 h-4" />
                <span className="text-sm">
                  {t("transaction_is_pending_and_awaiting_processing")}
                </span>
              </div>
            )}
            {transaction.status === "VERIFICATION" && (
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 p-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">
                  {t("transaction_is_under_verification_this_may")}
                </span>
              </div>
            )}
            {transaction.status === "RELEASED" && (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400 p-3 rounded-xl bg-green-50 dark:bg-green-500/10 border border-green-100 dark:border-green-500/20">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">
                  {t("tokens_have_been_successfully_released_to")}
                </span>
              </div>
            )}
            {transaction.status === "REJECTED" && (
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20">
                <XCircle className="w-4 h-4" />
                <span className="text-sm">
                  {t("transaction_was_rejected_contact_support_for")}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <DataTable
      apiEndpoint="/api/ico/transaction"
      userAnalytics={true}
      model="icoTransaction"
      permissions={{
        access: "", // User dashboard - no permission check needed (backend filters by user)
        view: "",
        create: "",
        edit: "",
        delete: "",
      }}
      pageSize={12}
      canCreate={false}
      canEdit={false}
      canDelete={false}
      canView={true}
      isParanoid={false}
      title="ICO Transaction History"
      description={t("view_and_manage_all_your_ico_token_purchases")}
      itemTitle="Transaction"
      columns={columns}
      analytics={analytics}
      viewContent={renderTransactionDetails}
      design={{
        animation: "orbs",
        primaryColor: "teal-600",
        secondaryColor: "cyan-500",
        badge: "Transaction History",
        icon: Receipt,
        detailsAlignment: "bottom",
      }}
    />
  );
}
