"use client";

import { Link } from "@/i18n/routing";
import {
  ArrowRightLeft,
  Banknote,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  History,
} from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Constants for status types
const STATUS = {
  COMPLETED: "COMPLETED",
  IN_PROGRESS: "IN_PROGRESS",
  PENDING: "PENDING",
  CANCELLED: "CANCELLED",
  DISPUTED: "DISPUTED",
};

// Constants for transaction types
const TRANSACTION_TYPE = {
  DEPOSIT: "DEPOSIT",
  WITHDRAWAL: "WITHDRAWAL",
  TRADE: "TRADE",
};
interface TransactionItem {
  id: string;
  type: string;
  status: string;
  amount: string;
  value: string;
  change: string;
  time?: string; // Make time optional
  date: string;
  timestamp?: string; // Add timestamp from P2PTransaction
}
interface RecentTransactionsProps {
  transactions: TransactionItem[];
  isLoading: boolean;
}
export function RecentTransactions({
  transactions,
  isLoading,
}: RecentTransactionsProps) {
  if (isLoading) {
    return <TransactionsSkeleton />;
  }
  if (!transactions || transactions.length === 0) {
    return <EmptyTransactions />;
  }
  return (
    <div className="space-y-4">
      {transactions.map((tx, index) => {
        return (
          <motion.div
            key={tx.id}
            initial={{
              x: -20,
              opacity: 0,
            }}
            animate={{
              x: 0,
              opacity: 1,
            }}
            transition={{
              duration: 0.3,
              delay: index * 0.1,
            }}
            className="group"
          >
            <div className="p-4 rounded-xl border border-border/40 bg-background hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center",
                    tx.type === TRANSACTION_TYPE.DEPOSIT
                      ? "bg-green-500/10 text-green-500"
                      : tx.type === TRANSACTION_TYPE.WITHDRAWAL
                        ? "bg-red-500/10 text-red-500"
                        : "bg-blue-500/10 text-blue-500"
                  )}
                >
                  {tx.type === TRANSACTION_TYPE.DEPOSIT ? (
                    <ChevronUp className="h-6 w-6" />
                  ) : tx.type === TRANSACTION_TYPE.WITHDRAWAL ? (
                    <ChevronDown className="h-6 w-6" />
                  ) : (
                    <ArrowRightLeft className="h-6 w-6" />
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-lg capitalize">
                        {tx.type === TRANSACTION_TYPE.DEPOSIT
                          ? "Deposit"
                          : tx.type === TRANSACTION_TYPE.WITHDRAWAL
                            ? "Withdrawal"
                            : "Trade"}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center">
                        {tx.time || tx.timestamp} · {tx.date}
                        <Badge
                          variant="outline"
                          className="ml-2 h-5 text-xs bg-green-500/5 text-green-500 border-green-200 dark:border-green-900"
                        >
                          {tx.status === STATUS.COMPLETED
                            ? "Completed"
                            : tx.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={cn(
                          "font-medium text-lg",
                          tx.type === TRANSACTION_TYPE.DEPOSIT
                            ? "text-green-500"
                            : tx.type === TRANSACTION_TYPE.WITHDRAWAL
                              ? "text-red-500"
                              : ""
                        )}
                      >
                        {tx.amount}
                      </div>
                      <div className="text-sm flex items-center justify-end">
                        {tx.value}
                        <span
                          className={cn(
                            "ml-1.5",
                            tx.change.startsWith("+")
                              ? "text-green-500"
                              : "text-red-500"
                          )}
                        >
                          {tx.change}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}

      <Link href="/transactions" className="w-full justify-between mt-2">
        <Button variant="outline">
          View all transactions <ChevronRight className="h-4 w-4" />
        </Button>
      </Link>
    </div>
  );
}
export function EmptyTransactions() {
  return (
    <div className="border border-dashed rounded-xl p-8 text-center">
      <div className="flex flex-col items-center">
        <History className="h-12 w-12 text-muted-foreground/40 mb-4" />
        <h3 className="text-lg font-medium mb-2">No transactions yet</h3>
        <p className="text-muted-foreground max-w-md mb-6">
          Your recent transactions will appear here once you start trading or
          make deposits.
        </p>
        <Link href="/finance/wallet">
          <Button>
            <Banknote className="mr-2 h-4 w-4" /> Go to Wallet
          </Button>
        </Link>
      </div>
    </div>
  );
}
export function TransactionsSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="border rounded-xl p-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1">
              <div className="flex justify-between">
                <div>
                  <Skeleton className="h-5 w-24 mb-2" />
                  <Skeleton className="h-4 w-40" />
                </div>
                <div className="text-right">
                  <Skeleton className="h-5 w-20 mb-2" />
                  <Skeleton className="h-4 w-28" />
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
      <Skeleton className="h-10 w-full mt-2" />
    </div>
  );
}
