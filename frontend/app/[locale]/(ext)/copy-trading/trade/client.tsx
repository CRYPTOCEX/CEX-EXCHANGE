"use client";

import { useEffect, useState, useRef, type ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { StatsCard, statsCardColors } from "@/components/ui/card/stats-card";
import { Badge } from "@/components/ui/badge";
import { Loadable } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  Target,
  Zap,
  Clock,
  Trophy,
  CheckCircle,
  XCircle,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { m } from "framer-motion";
import { $fetch } from "@/lib/api";
import { formatPnL, formatCurrencyAuto, parseSymbol } from "@/utils/currency";
import { MoneyFigure } from "@/components/ui/money-figure";
import { HeroSection } from "@/components/ui/hero-section";
import { useTranslations } from "next-intl";

type BinarySide =
  | "RISE"
  | "FALL"
  | "HIGHER"
  | "LOWER"
  | "TOUCH"
  | "NO_TOUCH"
  | "CALL"
  | "PUT"
  | "UP"
  | "DOWN";

interface Trade {
  id: string;
  symbol: string;
  side: "BUY" | "SELL" | BinarySide;
  type: string;
  amount: number;
  price: number;
  cost: number;
  status: string;
  profit: number;
  profitCurrency?: string;
  latencyMs: number;
  createdAt: string;
  marketType?: "SPOT" | "BINARY";
  binaryResult?: "WIN" | "LOSS" | "DRAW" | null;
  expiresAt?: string | null;
  leader?: {
    id: string;
    displayName: string;
  };
}

const BINARY_GREEN_SIDES = ["RISE", "HIGHER", "TOUCH", "CALL", "UP"];

/**
 * Rows to reserve while a page of trades is in flight, and the row shape that
 * feeds them.
 *
 * None of these values is ever painted — every one is behind a `Loadable` in
 * the table body — so this exists purely so the ONE row markup can render in
 * both states rather than the page keeping a second copy of a nine-column row
 * as a "skeleton". The count is the request's own page size.
 */
const PENDING_ROW_COUNT = 10;

const PENDING_TRADES: Trade[] = Array.from(
  { length: PENDING_ROW_COUNT },
  (_, i) => ({
    id: `pending-${i}`,
    symbol: "BTC/USDT",
    side: "BUY",
    type: "MARKET",
    amount: 0,
    price: 0,
    cost: 0,
    status: "CLOSED",
    profit: 0,
    latencyMs: 0,
    createdAt: new Date().toISOString(),
    marketType: "SPOT",
    leader: { id: `pending-${i}`, displayName: "" },
  })
);

export default function TradeClient() {
  const tExtCopyTrading = useTranslations("ext_copy-trading");
  const t = useTranslations("ext_copy-trading");
  const tExt = useTranslations("ext");
  const tCommon = useTranslations("common");
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  });
  const [summary, setSummary] = useState({
    totalTrades: 0,
    totalProfit: 0,
    winRate: 0,
    currency: "USDT",
  });
  const [filters, setFilters] = useState({
    symbol: "",
    status: "",
    side: "",
    marketType: "",
  });

  const fetchTrades = async (page = 1, ignore = false) => {
    setIsLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (filters.symbol) params.symbol = filters.symbol;
      if (filters.status) params.status = filters.status;
      if (filters.side) params.side = filters.side;
      if (filters.marketType) params.marketType = filters.marketType;

      const { data, error } = await $fetch({
        url: "/api/copy-trading/trade",
        method: "GET",
        params,
        silentSuccess: true,
      });

      // $fetch never throws, so the catch below is dead. Bail out on failure
      // rather than overwriting the table with an empty list and a zeroed
      // profit/win-rate summary, which reads as "you have no trades".
      if (error) {
        if (!ignore) {
          console.error("Failed to fetch trades:", error);
        }
        return;
      }

      if (!ignore) {
        setTrades(data?.items || []);
        setPagination(
          data?.pagination || { total: 0, page: 1, limit: 20, totalPages: 0 }
        );
        setSummary(
          data?.summary || {
            totalTrades: 0,
            totalProfit: 0,
            winRate: 0,
            currency: "USDT",
          }
        );
      }
    } catch (error) {
      if (!ignore) {
        console.error("Failed to fetch trades:", error);
      }
    } finally {
      if (!ignore) {
        setIsLoading(false);
      }
    }
  };

  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    fetchTrades(1);
  }, []);

  const handleSearch = () => {
    fetchTrades(1);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const statusIcons: Record<string, ReactNode> = {
    PENDING: <Clock className="h-3 w-3 mr-1" />,
    EXECUTED: <Zap className="h-3 w-3 mr-1" />,
    OPEN: <Activity className="h-3 w-3 mr-1" />,
    CLOSED: <CheckCircle className="h-3 w-3 mr-1" />,
    FAILED: <XCircle className="h-3 w-3 mr-1" />,
  };

  /**
   * `loading` skeletons the LABEL, not the pill: the chip's box and icon slot
   * are chrome, but the word inside it is a fact about the trade, and the
   * pending row's placeholder status would otherwise assert "CLOSED".
   */
  const getStatusBadge = (status: string, loading = false) => (
    <StatusBadge
      status={status}
      icon={statusIcons[status] ?? <AlertCircle className="h-3 w-3 mr-1" />}
      label={loading ? <Loadable loading placeholder="CLOSED" /> : undefined}
    />
  );

  const getSideBadge = (side: string, loading = false) => {
    const isGreen = side === "BUY" || BINARY_GREEN_SIDES.includes(side);
    /* Same reasoning as the status chip: the pill is chrome, the word is data.
       A pending row must not claim the trade was a BUY. */
    const label: ReactNode = loading ? (
      <Loadable loading placeholder="BUY" />
    ) : (
      side.replace(/_/g, " ")
    );
    return isGreen ? (
      <Badge className="bg-success/10 text-success-ink dark:bg-success/30 border-0">
        <TrendingUp className="h-3 w-3 mr-1" />
        {label}
      </Badge>
    ) : (
      <Badge className="bg-destructive/10 text-destructive-ink dark:bg-destructive/30 border-0">
        <TrendingDown className="h-3 w-3 mr-1" />
        {label}
      </Badge>
    );
  };

  const binaryResultIcons: Record<string, ReactNode> = {
    WIN: <Trophy className="h-3 w-3 mr-1" />,
    LOSS: <XCircle className="h-3 w-3 mr-1" />,
    DRAW: <AlertCircle className="h-3 w-3 mr-1" />,
  };

  const getBinaryResultBadge = (result: "WIN" | "LOSS" | "DRAW") => (
    <StatusBadge
      status={result}
      label={result}
      icon={binaryResultIcons[result]}
    />
  );

  /*
    `if (isLoading) return <TradeHistoryLoading/>` used to sit here, and it did
    not only fire once: `fetchTrades` sets `isLoading` on every filter search
    and every page change, so paging the table replaced the whole page —
    including the filter bar the user had just used and the pagination control
    they had just clicked — with the route's grey skeleton.

    The hero, the four summary cards, the filter bar and all nine column
    headers are structure and stay put. The ONE row markup below renders in
    both states over `displayedTrades`; only the cell values wait.
  */
  const displayedTrades = isLoading ? PENDING_TRADES : trades;

  return (
    /* The page ground comes from `HeroSection` (`WorkspaceGround`,
       `fixed inset-0 -z-10`), so this root must not fill. The wash that was
       here — a grey fading in and back out over the page height — covered it
       completely. `min-h-screen` stays: a fixed ground still needs a page tall
       enough to hold the viewport. */
    <div className="min-h-screen">
      {/* Hero Header */}
      <HeroSection
        badge={{
          icon: <Activity className="h-3.5 w-3.5" />,
          text: "Trade History",
        }}
        title={tExt("my_trades")}
        description={t("view_and_analyze_your_copy_trading_activity")}
      />

      <div className="container mx-auto px-4 py-8">
        {/* Summary Cards */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          {/* Total Trades */}
          <StatsCard
            label={tCommon("total_trades")}
            value={summary.totalTrades.toLocaleString()}
            icon={BarChart3}
            index={0}
            loading={isLoading}
            {...statsCardColors.primary}
          />

          {/* Total Profit. Not a StatsCard: the figure itself is coloured by
              direction of money, and StatsCard deliberately pins the figure to
              --foreground. Same anatomy, hand-built. */}
          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="truncate text-xs font-medium text-muted-foreground">
                {tCommon("total_profit")}
              </span>
              <span
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-sm ${
                  summary.totalProfit >= 0
                    ? "bg-success/15 text-success-ink"
                    : "bg-destructive/15 text-destructive-ink"
                }`}
              >
                {summary.totalProfit >= 0 ? (
                  <TrendingUp className="h-3.5 w-3.5" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5" />
                )}
              </span>
            </div>
            <div
              className={`text-2xl font-semibold leading-tight tracking-tight ${
                summary.totalProfit >= 0
                  ? 'text-success'
                  : 'text-destructive'
              }`}
            >
              <Loadable loading={isLoading} placeholder="+1,234.00 USDT">
                <MoneyFigure
                  value={formatPnL(summary.totalProfit, summary.currency).formatted}
                />
              </Loadable>
            </div>
          </Card>

          {/* Win Rate */}
          <StatsCard
            label={tCommon("win_rate")}
            value={`${summary.winRate.toFixed(1)}%`}
            icon={Target}
            index={2}
            loading={isLoading}
            {...statsCardColors.primary}
          />

          {/* Avg Latency */}
          <StatsCard
            label={t("avg_latency")}
            value={
              trades.length > 0
                ? `${Math.round(trades.reduce((sum, t) => sum + (t.latencyMs || 0), 0) / trades.length)}ms`
                : "0ms"
            }
            icon={Zap}
            index={3}
            loading={isLoading}
            {...statsCardColors.warning}
          />
        </m.div>

        {/* Filters */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="mb-6">
            <CardContent className="p-5">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                  <label className="text-xs text-subtle-foreground mb-1.5 block">
                    Symbol
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={`${t("search_symbol")}…`}
                      value={filters.symbol}
                      onChange={(e) =>
                        setFilters({ ...filters, symbol: e.target.value })
                      }
                      onKeyPress={handleKeyPress}
                      className="pl-10 h-10 rounded-xl"
                    />
                  </div>
                </div>
                <div className="w-36">
                  <label className="text-xs text-subtle-foreground mb-1.5 block">
                    Market
                  </label>
                  <Select
                    value={filters.marketType || "all"}
                    onValueChange={(value) =>
                      setFilters({
                        ...filters,
                        marketType: value === "all" ? "" : value,
                      })
                    }
                  >
                    <SelectTrigger className="h-10 rounded-xl">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="SPOT">Spot</SelectItem>
                      <SelectItem value="BINARY">Binary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-40">
                  <label className="text-xs text-subtle-foreground mb-1.5 block">
                    Status
                  </label>
                  <Select
                    value={filters.status || "all"}
                    onValueChange={(value) =>
                      setFilters({
                        ...filters,
                        status: value === "all" ? "" : value,
                      })
                    }
                  >
                    <SelectTrigger className="h-10 rounded-xl">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{tCommon("all_status")}</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="EXECUTED">Executed</SelectItem>
                      <SelectItem value="CLOSED">Closed</SelectItem>
                      <SelectItem value="FAILED">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-32">
                  <label className="text-xs text-subtle-foreground mb-1.5 block">
                    Side
                  </label>
                  <Select
                    value={filters.side || "all"}
                    onValueChange={(value) =>
                      setFilters({
                        ...filters,
                        side: value === "all" ? "" : value,
                      })
                    }
                  >
                    <SelectTrigger className="h-10 rounded-xl">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{tCommon("all_sides")}</SelectItem>
                      <SelectItem value="BUY">Buy</SelectItem>
                      <SelectItem value="SELL">Sell</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleSearch}>
                  <Search className="h-4 w-4" />
                  Search
                </Button>
              </div>
            </CardContent>
          </Card>
        </m.div>

        {/* Trades Table */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {/* LOADING IS NOT EMPTY. `trades` is `[]` for the duration of every
              fetch, so an unqualified check here showed "No trades found — your
              copy trading history will appear..." to an active trader on every
              page change. */}
          {displayedTrades.length > 0 ? (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">Date</TableHead>
                      <TableHead className="font-semibold">Leader</TableHead>
                      <TableHead className="font-semibold">Symbol</TableHead>
                      <TableHead className="font-semibold">Side</TableHead>
                      <TableHead className="text-right font-semibold">
                        Amount
                      </TableHead>
                      <TableHead className="text-right font-semibold">
                        Price
                      </TableHead>
                      <TableHead className="text-right font-semibold">
                        PnL
                      </TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="text-right font-semibold">
                        Latency
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedTrades.map((trade, index) => (
                      <m.tr
                        key={trade.id || `trade-${index}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className="group hover:bg-muted/50 dark:hover:bg-muted/30"
                      >
                        <TableCell className="text-sm">
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">
                              <Loadable loading={isLoading} placeholder="01/01/2026">
                                {new Date(trade.createdAt).toLocaleDateString()}
                              </Loadable>
                            </span>
                            <span className="text-xs text-subtle-foreground">
                              <Loadable loading={isLoading} placeholder="12:00:00">
                                {new Date(trade.createdAt).toLocaleTimeString()}
                              </Loadable>
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {isLoading ? (
                            <span className="font-medium text-foreground">
                              <Loadable loading placeholder={tExt("leader_name")} />
                            </span>
                          ) : trade.leader?.displayName ? (
                            <span className="font-medium text-foreground">
                              {trade.leader.displayName}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-semibold text-foreground">
                              <Loadable loading={isLoading} placeholder="BTC/USDT">
                                {trade.symbol}
                              </Loadable>
                            </span>
                            {trade.marketType === "BINARY" && (
                              <Badge className="bg-primary/10 text-primary-ink dark:bg-primary/30 border-0 text-[10px] px-1.5 py-0">
                                Binary
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getSideBadge(trade.side, isLoading)}</TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">
                          <Loadable loading={isLoading} placeholder="0.000000">
                            {trade.marketType === "BINARY"
                              ? `${trade.amount.toLocaleString(undefined, {
                                  maximumFractionDigits: 2,
                                })} ${parseSymbol(trade.symbol).quote} stake`
                              : trade.amount.toFixed(6)}
                          </Loadable>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          <Loadable loading={isLoading} placeholder="1,234.00 USDT">
                            <MoneyFigure
                              value={formatCurrencyAuto(
                                trade.price,
                                parseSymbol(trade.symbol).quote
                              )}
                            />
                          </Loadable>
                        </TableCell>
                        <TableCell className="text-right">
                          {isLoading ? (
                            <span className="font-semibold">
                              <Loadable loading placeholder="+123.00 USDT" />
                            </span>
                          ) : trade.profit !== undefined &&
                          trade.profit !== null ? (
                            <span
                              className={`font-semibold ${
                                trade.profit >= 0
                                  ? 'text-success'
                                  : 'text-destructive'
                              }`}
                            >
                              {trade.profit >= 0 ? "+" : ""}
                              <MoneyFigure
                                value={
                                  formatPnL(
                                    trade.profit,
                                    trade.profitCurrency ||
                                      parseSymbol(trade.symbol).quote
                                  ).formatted
                                }
                              />
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {trade.marketType === "BINARY" &&
                          trade.status === "CLOSED" &&
                          trade.binaryResult
                            ? getBinaryResultBadge(trade.binaryResult)
                            : getStatusBadge(trade.status, isLoading)}
                        </TableCell>
                        <TableCell className="text-right">
                          {isLoading ? (
                            <span className="text-sm font-mono">
                              <Loadable loading placeholder="123ms" />
                            </span>
                          ) : trade.latencyMs ? (
                            <span
                              className={`text-sm font-mono ${
                                trade.latencyMs < 100
                                  ? "text-success"
                                  : trade.latencyMs < 500
                                    ? "text-warning"
                                    : "text-destructive"
                              }`}
                            >
                              {trade.latencyMs}ms
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </m.tr>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t border-border/50">
                  <div className="text-sm text-subtle-foreground">
                    Showing {(pagination.page - 1) * pagination.limit + 1} -{" "}
                    {Math.min(
                      pagination.page * pagination.limit,
                      pagination.total
                    )}{" "}
                    of {pagination.total}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchTrades(pagination.page - 1)}
                      disabled={pagination.page <= 1}
                      className="rounded-xl gap-1"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchTrades(pagination.page + 1)}
                      disabled={pagination.page >= pagination.totalPages}
                      className="rounded-xl gap-1"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ) : (
            <Card>
              <CardContent className="py-20 text-center">
                <div className="w-20 h-20 mx-auto mb-6 bg-surface-3 rounded-lg flex items-center justify-center">
                  <Activity className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="text-2xl font-semibold mb-2 text-foreground">{tCommon("no_trades_found")}</h3>
                <p className="text-subtle-foreground mb-8 max-w-md mx-auto">
                  {t("your_copy_trading_history_will_appear")}
                </p>
              </CardContent>
            </Card>
          )}
        </m.div>
      </div>
    </div>
  );
}
