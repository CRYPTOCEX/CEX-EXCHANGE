"use client";

import { Link } from "@/i18n/routing";
import {
  Activity,
  ArrowRight,
  ArrowUpDown,
  Banknote,
  ChevronRight,
  Clock,
  CreditCard,
  DollarSign,
  PlusCircle,
  Repeat,
} from "lucide-react";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

// Constants for trade types
const TRADE_TYPE = {
  BUY: "BUY",
  SELL: "SELL",
};
interface TradeItem {
  id: string;
  type: string;
  status: string;
  amount: string;
  value: string;
  user: string;
  userRating: number;
  avatar?: string;
  paymentMethod: string;
  time?: string; // Make time optional
  timestamp?: string; // Add timestamp from P2PTradeActivity
}
interface TradingActivityProps {
  trades: TradeItem[];
  isLoading: boolean;
}
export function TradingActivity({ trades, isLoading }: TradingActivityProps) {
  if (isLoading) {
    return <TradingActivitySkeleton />;
  }
  if (!trades || trades.length === 0) {
    return <EmptyTradingActivity />;
  }
  return (
    <div className="space-y-6">
      {trades.map((trade, index) => {
        return (
          <motion.div
            key={trade.id}
            initial={{
              y: 20,
              opacity: 0,
            }}
            animate={{
              y: 0,
              opacity: 1,
            }}
            transition={{
              duration: 0.3,
              delay: index * 0.1,
            }}
            className="group"
          >
            <div className="p-6 bg-background rounded-2xl border border-border/40 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden">
              <div
                className={cn(
                  "absolute top-0 left-0 w-1.5 h-full",
                  trade.type === TRADE_TYPE.BUY ? "bg-green-500" : "bg-blue-500"
                )}
              />

              <div className="flex items-center gap-5">
                <div
                  className={cn(
                    "flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center",
                    trade.type === TRADE_TYPE.BUY
                      ? "bg-gradient-to-br from-green-400 to-emerald-600 text-white"
                      : "bg-gradient-to-br from-blue-400 to-indigo-600 text-white"
                  )}
                >
                  {trade.type === TRADE_TYPE.BUY ? (
                    <ArrowUpDown className="h-7 w-7" />
                  ) : (
                    <Repeat className="h-7 w-7" />
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-xl">
                      {trade.type === TRADE_TYPE.BUY ? "Bought" : "Sold"}{" "}
                      {trade.amount}
                    </div>
                    <Badge
                      variant={
                        trade.status === STATUS.COMPLETED
                          ? "default"
                          : trade.status === STATUS.IN_PROGRESS
                            ? "secondary"
                            : "outline"
                      }
                      className={cn(
                        "px-3 py-1 rounded-full text-sm",
                        trade.status === STATUS.COMPLETED
                          ? "bg-green-500/10 text-green-500 border-green-200 dark:border-green-900"
                          : trade.status === STATUS.IN_PROGRESS
                            ? "bg-blue-500/10 text-blue-500 border-blue-200 dark:border-blue-900"
                            : "bg-amber-500/10 text-amber-500 border-amber-200 dark:border-amber-900"
                      )}
                    >
                      <div className="flex items-center gap-1">
                        {trade.status === STATUS.COMPLETED ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : trade.status === STATUS.IN_PROGRESS ? (
                          <Clock className="h-3.5 w-3.5" />
                        ) : (
                          <AlertCircle className="h-3.5 w-3.5" />
                        )}
                        {trade.status === STATUS.COMPLETED
                          ? "Completed"
                          : trade.status === STATUS.IN_PROGRESS
                            ? "In Progress"
                            : trade.status === STATUS.PENDING
                              ? "Pending"
                              : trade.status === STATUS.CANCELLED
                                ? "Cancelled"
                                : "Disputed"}
                      </div>
                    </Badge>
                  </div>

                  <div className="mt-2 flex items-center text-sm text-muted-foreground">
                    <div className="flex items-center mr-4">
                      <Avatar className="h-6 w-6 mr-2">
                        <AvatarImage
                          src={trade.avatar || "/placeholder.svg"}
                          alt={trade.user}
                        />
                        <AvatarFallback>
                          {trade.user.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {trade.user}
                    </div>
                    <div className="flex items-center">
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 mr-1" />
                      {trade.userRating}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center text-sm">
                      <div className="flex items-center mr-4">
                        {trade.paymentMethod === "Bank Transfer" ? (
                          <CreditCard className="h-4 w-4 mr-1.5 text-blue-500" />
                        ) : trade.paymentMethod === "PayPal" ? (
                          <DollarSign className="h-4 w-4 mr-1.5 text-indigo-500" />
                        ) : (
                          <Banknote className="h-4 w-4 mr-1.5 text-green-500" />
                        )}
                        {trade.paymentMethod}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {trade.time || trade.timestamp}
                      </div>
                    </div>
                    <div className="font-medium text-lg">{trade.value}</div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t flex justify-end">
                <Link href={`/p2p/trade/${trade.id}`} className="gap-1.5">
                  View Details <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </motion.div>
        );
      })}

      <Link
        href="/p2p/trade"
        className="w-full justify-between group relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-violet-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        <span className="relative z-10">View all activity</span>
        <ChevronRight className="h-4 w-4 relative z-10" />
      </Link>
    </div>
  );
}
export function EmptyTradingActivity() {
  return (
    <div className="border border-dashed rounded-xl p-8 text-center">
      <div className="flex flex-col items-center">
        <Activity className="h-12 w-12 text-muted-foreground/40 mb-4" />
        <h3 className="text-lg font-medium mb-2">No trading activity yet</h3>
        <p className="text-muted-foreground max-w-md mb-6">
          Start trading with other users to see your P2P trading activity here.
        </p>
        <Link href="/p2p/offer">
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> Find Trading Partners
          </Button>
        </Link>
      </div>
    </div>
  );
}
export function TradingActivitySkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className="border rounded-xl p-6">
          <div className="flex gap-4">
            <Skeleton className="h-14 w-14 rounded-full" />
            <div className="flex-1 space-y-4">
              <div className="flex justify-between">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
              <div className="flex items-center">
                <Skeleton className="h-6 w-6 rounded-full mr-2" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16 ml-4" />
              </div>
              <div className="flex justify-between pt-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-6 w-24" />
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t flex justify-end">
            <Skeleton className="h-9 w-28" />
          </div>
        </div>
      ))}
      <Skeleton className="h-10 w-full" />
    </div>
  );
}
import { AlertCircle, CheckCircle2, Star } from "lucide-react";
