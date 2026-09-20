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
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { formatMoney, isValidCurrencyCode } from "@/utils/currency";

/**
 * An account balance is in the account's OWN currency, which the row stores.
 *
 * This used to be a hardcoded `Intl` USD formatter, so a 40,000 NGN account read
 * "$40,000.00" — a figure about 1,360x the real $29 — and a 0.5 BTC account read
 * "$0.50". `formatMoney` takes the code the account is actually denominated in
 * and prints non-ISO tickers as "USDT 1,234.00" instead of forcing them into a
 * dollar sign.
 *
 * `currency` is null until the account is first funded (deposits bind it), and
 * an unbound balance is 0 by definition, so the bare figure is printed rather
 * than an invented unit.
 *
 * The decimal cap has to follow the currency too. A forex account settles
 * against a wallet that may be SPOT or ECO, so `currency` is as often BTC as it
 * is EUR, and a flat 2 dp printed a real 0.00412 BTC balance as "BTC 0.00" — a
 * funded account reading as empty. `isValidCurrencyCode` is the fiat-or-ticker
 * question ("how many decimals does this deserve"), so fiat keeps its 2 and a
 * ticker gets the 8 its holdings live in.
 */
const formatBalance = (
  amount: number | null | undefined,
  currency?: string | null
) => {
  if (amount === null || amount === undefined) return "—";
  const code = currency ?? "";
  return formatMoney(amount, code, {
    minimumFractionDigits: 2,
    maximumFractionDigits: isValidCurrencyCode(code) ? 2 : 8,
  });
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
          /* R1: a P&L trace is price DIRECTION, so it takes --up/--down, not
             the operation-status tokens. The rest of this module already does
             (`text-up`/`text-down` in the landing sections). */
          stroke={profit && profit >= 0 ? "hsl(var(--up))" : "hsl(var(--down))"}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};
export default function ForexAccounts({ accounts }) {
  const t = useTranslations("ext_forex");
  const tCommon = useTranslations("common");
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
        <h2 className="text-2xl font-bold tracking-tight">
          {t("your_accounts")}
        </h2>
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
                    ? "border-l-success"
                    : "border-l-primary"
                  : "border-l-warning",
                expandedCards[account.id] && "border-border-strong"
              )}
            >
              <CardContent className="p-0">
                {/* Main card section */}
                <div className="p-4 sm:p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left section: Account info */}
                    <div className="flex items-start gap-4">
                      {/* Broker logo/icon placeholder */}
                      <div className="hidden sm:flex h-12 w-12 rounded-full bg-muted items-center justify-center flex-shrink-0">
                        <Shield className="h-6 w-6 text-subtle-foreground" />
                      </div>

                      {/* Account details */}
                      <div>
                        <div className="flex items-center flex-wrap gap-2 mb-1">
                          <h3 className="font-semibold text-lg">
                            {account.broker || tCommon("pending")}
                          </h3>
                          <Badge
                            className={cn(
                              "font-medium",
                              account.type === "LIVE"
                                ? "bg-success hover:bg-success text-success-foreground"
                                : account.status
                                  ? "bg-success hover:bg-success text-success-foreground"
                                  : "bg-warning hover:bg-warning/90 text-warning-foreground"
                            )}
                          >
                            {account.status ? account.type : tCommon("pending")}
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
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-sm text-muted-foreground">
                            <p>
                              {tCommon("account")}:{" "}
                              <span className="font-medium">
                                {account.accountId}
                              </span>
                            </p>

                            {/* Password with toggle */}
                            <div className="flex items-center gap-1">
                              <p>
                                {tCommon("password")}:{" "}
                                <span className="font-medium">
                                  {visiblePasswords[account.id]
                                    ? account.password
                                    : "••••••••"}
                                </span>
                              </p>
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
                                        <EyeOff className="h-3.5 w-3.5 text-subtle-foreground" />
                                      ) : (
                                        <Eye className="h-3.5 w-3.5 text-subtle-foreground" />
                                      )}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {visiblePasswords[account.id]
                                      ? tCommon("hide_detail")
                                      : tCommon("show")}{" "}
                                    password
                                  </TooltipContent>
                                </Tooltip>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-warning flex items-center gap-1">
                            <RefreshCw className="h-3 w-3 animate-spin" />
                            {t("waiting_for_admin_approval")}
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
                            <span className="text-xs text-subtle-foreground">
                              Balance
                            </span>
                            <span className="font-semibold">
                              {formatBalance(account.balance, account.currency)}
                            </span>
                          </div>

                          {/* Leverage */}
                          <div className="flex flex-col">
                            <span className="text-xs text-subtle-foreground">
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
                            className="bg-success hover:bg-success text-success-foreground"
                            size="sm"
                            onClick={() =>
                              router.push(`/forex/trade/${account.id}`)
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
                                className="border-success text-success hover:bg-success/10 hover:text-success-ink dark:hover:bg-success/20"
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
                                className="border-success text-success hover:bg-success/10 hover:text-success-ink dark:hover:bg-success/20"
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
                          className="border-success text-success hover:bg-success/10 hover:text-success-ink dark:hover:bg-success/30"
                          onClick={() => router.push("/forex/dashboard")}
                        >
                          <RefreshCw className="mr-1 h-4 w-4" />
                          {t("check_status")}
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
                            "h-5 w-5 text-muted-foreground transition-transform",
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
                      "overflow-hidden transition-all duration-300 bg-muted dark:bg-surface-2/50 border-t",
                      expandedCards[account.id] ? "max-h-96" : "max-h-0"
                    )}
                  >
                    <div className="p-4 sm:p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Account details */}
                        <div>
                          <h4 className="text-sm font-medium mb-3">
                            {t("account_details")}
                          </h4>
                          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                            <dt className="text-subtle-foreground">
                              Server
                            </dt>
                            <dd>
                              {account.broker}
                              {t("real")}
                              {account.type === "DEMO" ? t("demo") : ""}
                            </dd>

                            <dt className="text-subtle-foreground">
                              {tCommon("last_updated")}
                            </dt>
                            <dd>{account.lastUpdated || "—"}</dd>

                            <dt className="text-subtle-foreground">
                              {tCommon("account_type")}
                            </dt>
                            <dd>{account.type}</dd>

                            <dt className="text-subtle-foreground">
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
