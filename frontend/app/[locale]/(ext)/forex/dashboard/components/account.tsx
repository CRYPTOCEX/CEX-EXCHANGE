"use client";

import { useState } from "react";
import {
  ArrowUpRight,
  ChevronDown,
  Eye,
  EyeOff,
  LineChart,
  RefreshCw,
  Shield,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useRouter } from "@/i18n/routing";

// Format currency with proper symbol and decimal places
const formatCurrency = (amount: number | null) => {
  if (amount === null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

// Mini sparkline chart component
const MiniChart = ({
  data,
  profit,
}: {
  data: number[];
  profit: number | null;
}) => {
  if (!data.length) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min;

  // Normalize data points to fit in the available height
  const normalizedData = data.map((point) =>
    range === 0 ? 50 : 100 - ((point - min) / range) * 100
  );

  // Create path for the sparkline
  const points = normalizedData
    .map((point, i) => `${(i / (data.length - 1)) * 100},${point}`)
    .join(" ");
  return (
    <div className="h-12 w-24">
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <polyline
          points={points}
          fill="none"
          stroke={profit && profit >= 0 ? "#10b981" : "#ef4444"}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};
export default function ForexAccounts({ accounts }) {
  const router = useRouter();
  const [visiblePasswords, setVisiblePasswords] = useState<
    Record<string, boolean>
  >({});
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>(
    {}
  );
  const [isLoading, setIsLoading] = useState(false);

  // Toggle password visibility
  const togglePasswordVisibility = (accountId: string) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [accountId]: !prev[accountId],
    }));
  };

  // Toggle card expansion
  const toggleCardExpansion = (accountId: string) => {
    setExpandedCards((prev) => ({
      ...prev,
      [accountId]: !prev[accountId],
    }));
  };
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Your Accounts</h2>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {accounts.map((account) => {
          return (
            <Card
              key={account.id}
              className={cn(
                "overflow-hidden transition-all duration-300 border-l-4",
                account.status
                  ? account.type === "LIVE"
                    ? "border-l-green-500"
                    : "border-l-blue-500"
                  : "border-l-yellow-500",
                expandedCards[account.id] && "shadow-lg"
              )}
            >
              <CardContent className="p-0">
                {/* Main card section */}
                <div className="p-4 sm:p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left section: Account info */}
                    <div className="flex items-start gap-4">
                      {/* Broker logo/icon placeholder */}
                      <div className="hidden sm:flex h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center flex-shrink-0">
                        <Shield className="h-6 w-6 text-slate-500" />
                      </div>

                      {/* Account details */}
                      <div>
                        <div className="flex items-center flex-wrap gap-2 mb-1">
                          <h3 className="font-semibold text-lg">
                            {account.broker || "Pending"}
                          </h3>
                          <Badge
                            className={cn(
                              "font-medium",
                              account.type === "LIVE"
                                ? "bg-green-500 hover:bg-green-600 text-white"
                                : account.status
                                  ? "bg-blue-500 hover:bg-blue-600 text-white"
                                  : "bg-yellow-500 hover:bg-yellow-600 text-black"
                            )}
                          >
                            {account.status ? account.type : "PENDING"}
                          </Badge>

                          {account.status && (
                            <Badge
                              variant="outline"
                              className="text-xs font-normal"
                            >
                              MT{account.mt}
                            </Badge>
                          )}
                        </div>

                        {/* Account ID or waiting message */}
                        {account.status ? (
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-sm text-slate-600 dark:text-slate-300">
                            <p>
                              Account:{" "}
                              <span className="font-medium">
                                {account.accountId}
                              </span>
                            </p>

                            {/* Password with toggle */}
                            <div className="flex items-center gap-1">
                              <p>
                                Password:{" "}
                                <span className="font-medium">
                                  {visiblePasswords[account.id]
                                    ? account.password
                                    : "••••••••"}
                                </span>
                              </p>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        togglePasswordVisibility(account.id);
                                      }}
                                      className="h-6 w-6 p-0"
                                    >
                                      {visiblePasswords[account.id] ? (
                                        <EyeOff className="h-3.5 w-3.5 text-slate-500" />
                                      ) : (
                                        <Eye className="h-3.5 w-3.5 text-slate-500" />
                                      )}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {visiblePasswords[account.id]
                                      ? "Hide"
                                      : "Show"}{" "}
                                    password
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                            <RefreshCw className="h-3 w-3 animate-spin" />
                            Waiting for admin approval
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right section: Balance & Actions */}
                    {account.status ? (
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        {/* Account metrics */}
                        <div className="grid grid-cols-2 sm:grid-cols-2 gap-x-6 gap-y-2 mr-2">
                          {/* Balance */}
                          <div className="flex flex-col">
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              Balance
                            </span>
                            <span className="font-semibold">
                              {formatCurrency(account.balance)}
                            </span>
                          </div>

                          {/* Leverage */}
                          <div className="flex flex-col">
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              Leverage
                            </span>
                            <span className="font-semibold">
                              1:{account.leverage}
                            </span>
                          </div>
                        </div>

                        {/* Performance chart */}
                        <div className="hidden lg:block">
                          <MiniChart
                            data={
                              Array.isArray(account.performance)
                                ? account.performance
                                : []
                            }
                            profit={account.profit}
                          />
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-wrap gap-2">
                          <Button
                            className="bg-green-600 hover:bg-green-700 text-white"
                            size="sm"
                            onClick={() =>
                              router.push(`/forex/trading/${account.id}`)
                            }
                          >
                            <LineChart className="mr-1 h-4 w-4" />
                            Trade
                          </Button>

                          {account.type === "LIVE" && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-blue-600 text-blue-600 hover:bg-blue-50 dark:border-blue-500 dark:text-blue-500 dark:hover:bg-blue-950/30"
                                onClick={() =>
                                  router.push(
                                    `/forex/account/${account.id}/deposit`
                                  )
                                }
                              >
                                <ArrowUpRight className="mr-1 h-4 w-4 rotate-180" />
                                Deposit
                              </Button>

                              <Button
                                variant="outline"
                                size="sm"
                                className="border-orange-600 text-orange-600 hover:bg-orange-50 dark:border-orange-500 dark:text-orange-500 dark:hover:bg-orange-950/30"
                                onClick={() =>
                                  router.push(
                                    `/forex/account/${account.id}/withdraw`
                                  )
                                }
                              >
                                <Wallet className="mr-1 h-4 w-4" />
                                Withdraw
                              </Button>
                            </>
                          )}
                        </div>
                      </div> /* If not approved, show waiting & refresh button */
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-blue-600 text-blue-600 hover:bg-blue-50 dark:border-blue-500 dark:text-blue-500 dark:hover:bg-blue-950/30"
                          onClick={() => router.push("/forex/dashboard")}
                        >
                          <RefreshCw className="mr-1 h-4 w-4" />
                          Check Status
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Expandable section toggle */}
                  {account.status && (
                    <div className="mt-4 flex justify-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleCardExpansion(account.id)}
                        className="h-6 w-6 p-0 rounded-full"
                      >
                        <ChevronDown
                          className={cn(
                            "h-5 w-5 text-slate-400 transition-transform",
                            expandedCards[account.id] && "rotate-180"
                          )}
                        />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Expanded details section */}
                {account.status && (
                  <div
                    className={cn(
                      "overflow-hidden transition-all duration-300 bg-slate-50 dark:bg-slate-900/50 border-t",
                      expandedCards[account.id] ? "max-h-96" : "max-h-0"
                    )}
                  >
                    <div className="p-4 sm:p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Account details */}
                        <div>
                          <h4 className="text-sm font-medium mb-3">
                            Account Details
                          </h4>
                          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                            <dt className="text-slate-500 dark:text-slate-400">
                              Server
                            </dt>
                            <dd>
                              {account.broker}-Real
                              {account.type === "DEMO" ? "-Demo" : ""}
                            </dd>

                            <dt className="text-slate-500 dark:text-slate-400">
                              Last Updated
                            </dt>
                            <dd>{account.lastUpdated || "—"}</dd>

                            <dt className="text-slate-500 dark:text-slate-400">
                              Account Type
                            </dt>
                            <dd>{account.type}</dd>

                            <dt className="text-slate-500 dark:text-slate-400">
                              Platform
                            </dt>
                            <dd>MetaTrader {account.mt}</dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {/* Loading state */}
        {isLoading && (
          <Card className="overflow-hidden">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Skeleton className="h-6 w-32" />
                      <Skeleton className="h-5 w-16" />
                    </div>
                    <Skeleton className="h-4 w-48" />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="flex flex-col gap-1">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-5 w-20" />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-9 w-20" />
                    <Skeleton className="h-9 w-20" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
