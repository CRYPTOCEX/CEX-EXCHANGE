"use client";

import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";
import { transactionAnalytics } from "./analytics";
import { useUserStore } from "@/store/user";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Receipt,
  Calendar,
  DollarSign,
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
import { formatCurrencySafe } from "@/utils/currency";

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
  const { user } = useUserStore();

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
            {getTypeIcon(transaction.type)}
            <span className="font-medium">
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
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Transaction Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">ID:</span>
                <span className="font-mono text-xs">{transaction.id}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Date:</span>
                <span>{new Date(transaction.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-medium">
                  {formatCurrencySafe(
                    transaction.amount,
                    transaction.wallet?.currency || "USD"
                  )}
                </span>
              </div>
              {transaction.fee > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Fee:</span>
                  <span className="text-orange-600">
                    {formatCurrencySafe(
                      transaction.fee,
                      transaction.wallet?.currency || "USD"
                    )}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Additional Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {transaction.wallet && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Wallet:</span>
                  <span>{transaction.wallet.currency} ({transaction.wallet.type})</span>
                </div>
              )}
              {metadata.accountId && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Account:</span>
                  <span className="font-mono text-xs">{metadata.accountId}</span>
                </div>
              )}
              {metadata.chain && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Chain:</span>
                  <span>{metadata.chain}</span>
                </div>
              )}
              {metadata.price && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Price:</span>
                  <span>${metadata.price}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Description */}
        {transaction.description && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {transaction.description}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Status Information */}
        <Card>
          <CardContent className="pt-4">
            {transaction.status === "PENDING" && (
              <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">
                  Transaction is pending approval and will be processed shortly.
                </span>
              </div>
            )}
            {transaction.status === "COMPLETED" && (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">
                  Transaction completed successfully.
                </span>
              </div>
            )}
            {["FAILED", "CANCELLED", "REJECTED"].includes(transaction.status) && (
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <XCircle className="w-4 h-4" />
                <span className="text-sm">
                  Transaction {transaction.status.toLowerCase()}. Contact support if needed.
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };
  
  return (
    <div className="container mx-auto py-8 px-4">
      
      <DataTable
        apiEndpoint="/api/forex/transaction"
        model="transaction"
        modelConfig={{
          userId: user?.id,
        }}
        userAnalytics={true}
        pageSize={10}
        canView={true}
        isParanoid={false}
        title="Forex Transaction History"
        itemTitle="Transaction"
        columns={columns}
        analytics={transactionAnalytics}
        viewContent={renderTransactionDetails}
      />
    </div>
  );
} 