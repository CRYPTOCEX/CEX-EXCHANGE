"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import TradeHistoryLoading from "./loading";
import { Badge } from "@/components/ui/badge";
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
import { motion } from "framer-motion";
import { $fetch } from "@/lib/api";
import { formatPnL, formatCurrencyAuto, parseSymbol } from "@/utils/currency";
import { HeroSection } from "@/components/ui/hero-section";
import { useTranslations } from "next-intl";

interface Trade {
  id: string;
  symbol: string;
  side: "BUY" | "SELL";
  type: string;
  amount: number;
  price: number;
  cost: number;
  status: string;
  profit: number;
  profitCurrency?: string;
  latencyMs: number;
  createdAt: string;
  leader?: {
    id: string;
    displayName: string;
  };
}

export default function TradeClient() {
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
  });

  const fetchTrades = async (page = 1, ignore = false) => {
    setIsLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (filters.symbol) params.symbol = filters.symbol;
      if (filters.status) params.status = filters.status;
      if (filters.side) params.side = filters.side;

      const { data } = await $fetch({
        url: "/api/copy-trading/trade",
        method: "GET",
        params,
        silentSuccess: true,
      });

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "EXECUTED":
        return (
          <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border-0">
            <Zap className="h-3 w-3 mr-1" />
            Executed
          </Badge>
        );
      case "CLOSED":
        return (
          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0">
            <CheckCircle className="h-3 w-3 mr-1" />
            Closed
          </Badge>
        );
      case "FAILED":
        return (
          <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      default:
        return (
          <Badge className="bg-zinc-100 text-zinc-700 dark:bg-zinc-900/30 dark:text-zinc-400 border-0">
            <AlertCircle className="h-3 w-3 mr-1" />
            {status}
          </Badge>
        );
    }
  };

  const getSideBadge = (side: string) => {
    return side === "BUY" ? (
      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0">
        <TrendingUp className="h-3 w-3 mr-1" />
        BUY
      </Badge>
    ) : (
      <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0">
        <TrendingDown className="h-3 w-3 mr-1" />
        SELL
      </Badge>
    );
  };

  if (isLoading) {
    return <TradeHistoryLoading />;
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-background via-muted/10 to-background dark:from-zinc-950 dark:via-zinc-900/30 dark:to-zinc-950">
      {/* Hero Header */}
      <HeroSection
        badge={{
          icon: <Activity className="h-3.5 w-3.5" />,
          text: "Trade History",
          gradient: "from-indigo-500/10 to-violet-500/10",
          iconColor: "text-indigo-500",
          textColor: "text-indigo-600 dark:text-indigo-400",
        }}
        title={[
          { text: "My " },
          { text: "Trades", gradient: "from-indigo-500 to-violet-500" },
        ]}
        description={t("view_and_analyze_your_copy_trading_activity")}
        paddingTop="pt-24"
        paddingBottom="pb-12"
        background={{
          orbs: [
            { color: "#6366f1", position: { top: "-10rem", right: "-10rem" }, size: "20rem" },
            { color: "#8b5cf6", position: { bottom: "-5rem", left: "-5rem" }, size: "15rem" },
          ],
        }}
        particles={{ count: 6, type: "floating", colors: ["#6366f1", "#8b5cf6"], size: 8 }}
      />

      <div className="container mx-auto px-4 py-8">
        {/* Summary Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          {/* Total Trades */}
          <Card className="border-0 shadow-lg overflow-hidden group hover:shadow-xl transition-shadow">
            <CardContent className="p-5 relative">
              <div className="absolute inset-0 bg-linear-to-br from-blue-500/5 to-transparent" />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-zinc-500">{tExt("total_trades")}</span>
                  <div className="p-1.5 rounded-lg bg-blue-500/10">
                    <BarChart3 className="h-3.5 w-3.5 text-blue-500" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                  {summary.totalTrades.toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Total Profit */}
          <Card className="border-0 shadow-lg overflow-hidden group hover:shadow-xl transition-shadow">
            <CardContent className="p-5 relative">
              <div
                className={`absolute inset-0 bg-linear-to-br ${
                  summary.totalProfit >= 0
                    ? "from-emerald-500/5 to-transparent"
                    : "from-red-500/5 to-transparent"
                }`}
              />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-zinc-500">{tExt("total_profit")}</span>
                  <div
                    className={`p-1.5 rounded-lg ${
                      summary.totalProfit >= 0
                        ? "bg-emerald-500/10"
                        : "bg-red-500/10"
                    }`}
                  >
                    {summary.totalProfit >= 0 ? (
                      <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                    )}
                  </div>
                </div>
                <p
                  className={`text-2xl font-bold ${
                    summary.totalProfit >= 0
                      ? 'text-emerald-500 dark:text-emerald-400'
                      : 'text-red-500 dark:text-red-400'
                  }`}
                >
                  {formatPnL(summary.totalProfit, summary.currency).formatted}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Win Rate */}
          <Card className="border-0 shadow-lg overflow-hidden group hover:shadow-xl transition-shadow">
            <CardContent className="p-5 relative">
              <div className="absolute inset-0 bg-linear-to-br from-violet-500/5 to-transparent" />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-zinc-500">{tCommon("win_rate")}</span>
                  <div className="p-1.5 rounded-lg bg-violet-500/10">
                    <Target className="h-3.5 w-3.5 text-violet-500" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                  {summary.winRate.toFixed(1)}%
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Avg Latency */}
          <Card className="border-0 shadow-lg overflow-hidden group hover:shadow-xl transition-shadow">
            <CardContent className="p-5 relative">
              <div className="absolute inset-0 bg-linear-to-br from-amber-500/5 to-transparent" />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-zinc-500">{t("avg_latency")}</span>
                  <div className="p-1.5 rounded-lg bg-amber-500/10">
                    <Zap className="h-3.5 w-3.5 text-amber-500" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                  {trades.length > 0
                    ? `${Math.round(trades.reduce((sum, t) => sum + (t.latencyMs || 0), 0) / trades.length)}ms`
                    : "0ms"}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="border-0 shadow-lg mb-6">
            <CardContent className="p-5">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                  <label className="text-xs text-zinc-500 mb-1.5 block">
                    Symbol
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    <Input
                      placeholder={t("search_symbol_ellipsis")}
                      value={filters.symbol}
                      onChange={(e) =>
                        setFilters({ ...filters, symbol: e.target.value })
                      }
                      onKeyPress={handleKeyPress}
                      className="pl-10 h-10 rounded-xl"
                    />
                  </div>
                </div>
                <div className="w-40">
                  <label className="text-xs text-zinc-500 mb-1.5 block">
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
                  <label className="text-xs text-zinc-500 mb-1.5 block">
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
                      <SelectItem value="all">{t("all_sides")}</SelectItem>
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
        </motion.div>

        {/* Trades Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {trades.length > 0 ? (
            <Card className="border-0 shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-zinc-50/50 dark:bg-zinc-800/50">
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
                    {trades.map((trade, index) => (
                      <motion.tr
                        key={trade.id || `trade-${index}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className="group hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30"
                      >
                        <TableCell className="text-sm">
                          <div className="flex flex-col">
                            <span className="font-medium text-zinc-900 dark:text-white">
                              {new Date(trade.createdAt).toLocaleDateString()}
                            </span>
                            <span className="text-xs text-zinc-500">
                              {new Date(trade.createdAt).toLocaleTimeString()}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {trade.leader?.displayName ? (
                            <span className="font-medium text-zinc-900 dark:text-white">
                              {trade.leader.displayName}
                            </span>
                          ) : (
                            <span className="text-zinc-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="font-mono font-semibold text-zinc-900 dark:text-white">
                            {trade.symbol}
                          </span>
                        </TableCell>
                        <TableCell>{getSideBadge(trade.side)}</TableCell>
                        <TableCell className="text-right font-mono text-zinc-600 dark:text-zinc-400">
                          {trade.amount.toFixed(6)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-zinc-600 dark:text-zinc-400">
                          {formatCurrencyAuto(
                            trade.price,
                            parseSymbol(trade.symbol).quote
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {trade.profit !== undefined &&
                          trade.profit !== null ? (
                            <span
                              className={`font-semibold ${
                                trade.profit >= 0
                                  ? 'text-emerald-500 dark:text-emerald-400'
                                  : 'text-red-500 dark:text-red-400'
                              }`}
                            >
                              {trade.profit >= 0 ? "+" : ""}
                              {formatPnL(
                                trade.profit,
                                trade.profitCurrency ||
                                  parseSymbol(trade.symbol).quote
                              ).formatted}
                            </span>
                          ) : (
                            <span className="text-zinc-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(trade.status)}</TableCell>
                        <TableCell className="text-right">
                          {trade.latencyMs ? (
                            <span
                              className={`text-sm font-mono ${
                                trade.latencyMs < 100
                                  ? "text-emerald-500"
                                  : trade.latencyMs < 500
                                    ? "text-amber-500"
                                    : "text-red-500"
                              }`}
                            >
                              {trade.latencyMs}ms
                            </span>
                          ) : (
                            <span className="text-zinc-400">-</span>
                          )}
                        </TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t border-zinc-200/50 dark:border-zinc-800/50">
                  <div className="text-sm text-zinc-500">
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
                      className="h-9 rounded-xl gap-1"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchTrades(pagination.page + 1)}
                      disabled={pagination.page >= pagination.totalPages}
                      className="h-9 rounded-xl gap-1"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ) : (
            <Card className="border-0 shadow-lg">
              <CardContent className="py-20 text-center">
                <div className="w-20 h-20 mx-auto mb-6 bg-linear-to-br from-indigo-500/20 to-violet-500/20 rounded-2xl flex items-center justify-center">
                  <Activity className="h-10 w-10 text-indigo-500" />
                </div>
                <h3 className="text-2xl font-bold mb-2">{t("no_trades_found")}</h3>
                <p className="text-zinc-500 mb-8 max-w-md mx-auto">
                  {t("your_copy_trading_history_will_appear")}
                </p>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    </div>
  );
}
