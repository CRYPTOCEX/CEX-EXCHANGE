"use client";

import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Wallet,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
} from "lucide-react";
import { Loadable } from "@/components/ui/skeleton";
import { $fetch } from "@/lib/api";
import { toast } from "sonner";
import { m } from "framer-motion";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { PageShell } from "@/components/layout/page-shell";

interface Balance {
  asset: string;
  available: number;
  inOrder: number;
  total: number;
}

type SortField = keyof Balance;
type SortDirection = "asc" | "desc";

/**
 * Rows the table reserves while the balance list is in flight.
 *
 * A `null` row IS the pending row, so one `.map()` renders both states from the
 * same `<TableRow>` markup and there is no second copy of a row to drift out of
 * sync with the real one. Eight because the exchange returns every funded
 * asset and that is a plausible page — the count settles, the frame does not.
 */
const PENDING_ROWS: Array<Balance | null> = Array.from({ length: 8 }, () => null);

const ExchangeBalancePage = () => {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const [balances, setBalances] = useState<Balance[]>([]);
  const [filteredBalances, setFilteredBalances] = useState<Balance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [sortField, setSortField] = useState<SortField>("total");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const fetchBalances = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setRefreshing(true);

    try {
      const { data, error } = await $fetch({
        url: "/api/admin/finance/exchange/balance",
        silent: true,
      });

      if (!error && data?.balance) {
        setBalances(data.balance);
        if (showLoading) toast.success(t("exchange_balances_loaded_successfully"));
      } else {
        toast.error(t("failed_to_fetch_exchange_balances"));
        setBalances([]);
      }
    } catch (error) {
      toast.error(t("an_error_occurred_while_fetching_balances"));
      setBalances([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBalances();
  }, []);

  useEffect(() => {
    const filtered = balances.filter((balance) =>
      balance.asset.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Apply sorting
    filtered.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortDirection === "asc"
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });

    setFilteredBalances(filtered);
    setCurrentPage(1); // Reset to first page when filtering
  }, [balances, searchTerm, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />;
    return sortDirection === "asc" ? (
      <ArrowUp className="h-4 w-4" />
    ) : (
      <ArrowDown className="h-4 w-4" />
    );
  };

  // Pagination
  const totalItems = filteredBalances.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentBalances = filteredBalances.slice(startIndex, endIndex);

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8,
    }).format(value);
  };

  const getBalanceColor = (available: number, total: number) => {
    const percentage = total > 0 ? (available / total) * 100 : 0;
    if (percentage >= 80) return "text-success";
    if (percentage >= 50) return "text-warning";
    return "text-destructive";
  };

  /**
   * "NO BALANCES FOUND" IS AN ANSWER. A PENDING FETCH IS NOT.
   * ==========================================================================
   *
   * Two defects here, and they were the same defect twice. The page opened with
   * `if (loading) return <div className="container mx-auto py-8">` holding a
   * centred spinner in a 384px box — a different container from the `PageShell`
   * the real page uses, so the frame itself changed when data landed, on top of
   * everything inside it. And the card below tested `currentBalances.length ===
   * 0` to decide between the table and an empty state, which is true during the
   * fetch as well: had the spinner ever not fired first, the operator would
   * have been told there are no balances before anyone had asked the exchange.
   *
   * Both are fixed by the same split. `showEmptyState` requires the fetch to be
   * OVER before it will claim emptiness, and the table renders `PENDING_ROWS`
   * until then — same header, same columns, same row markup, values pending.
   */
  const showEmptyState = !loading && currentBalances.length === 0;
  const rows: Array<Balance | null> = loading ? PENDING_ROWS : currentBalances;

  return (
    <PageShell rhythm="md">
      {/* Header */}
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <div className="flex items-center gap-4">
          <Link href="/admin/finance/exchange">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {t("exchange_balances")}
            </h1>
            <p className="text-muted-foreground">
              {t("monitor_and_manage_supported_assets")}
            </p>
          </div>
        </div>
      </m.div>

      {/* Controls */}
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between"
      >
        <div className="flex flex-1 items-center space-x-2 max-w-sm">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`${tCommon("search_assets")}…`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={itemsPerPage.toString()}
            onValueChange={(value) => {
              setItemsPerPage(Number(value));
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">{`10 ${tCommon('per_page')}`}</SelectItem>
              <SelectItem value="20">{`20 ${tCommon('per_page')}`}</SelectItem>
              <SelectItem value="50">{`50 ${tCommon('per_page')}`}</SelectItem>
              <SelectItem value="100">{`100 ${tCommon('per_page')}`}</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            onClick={() => fetchBalances(false)}
            disabled={refreshing}
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </m.div>

      {/* Balance Table */}
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              {t("exchange_wallet_balances")}
            </CardTitle>
            <CardDescription>
              {t("real_time_balance_information_connected_exchange")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {showEmptyState ? (
              <div className="text-center py-12">
                <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {t("no_balances_found")}
                </h3>
                <p className="text-muted-foreground">
                  {searchTerm
                    ? t("no_assets_match_your_search_criteria")
                    : t("no_exchange_balances_available")}
                </p>
              </div>
            ) : (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>
                          <Button
                            variant="ghost"
                            onClick={() => handleSort("asset")}
                            className="h-auto p-0 font-medium"
                          >
                            {tCommon("asset")}
                            {getSortIcon("asset")}
                          </Button>
                        </TableHead>
                        <TableHead className="text-right">
                          <Button
                            variant="ghost"
                            onClick={() => handleSort("available")}
                            className="h-auto p-0 font-medium"
                          >
                            {tCommon("available")}
                            {getSortIcon("available")}
                          </Button>
                        </TableHead>
                        <TableHead className="text-right">
                          <Button
                            variant="ghost"
                            onClick={() => handleSort("inOrder")}
                            className="h-auto p-0 font-medium"
                          >
                            {tCommon("in_orders")}
                            {getSortIcon("inOrder")}
                          </Button>
                        </TableHead>
                        <TableHead className="text-right">
                          <Button
                            variant="ghost"
                            onClick={() => handleSort("total")}
                            className="h-auto p-0 font-medium"
                          >
                            {tCommon("total_balance")}
                            {getSortIcon("total")}
                          </Button>
                        </TableHead>
                        <TableHead>{tCommon("status")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((balance, index) => (
                        <TableRow key={balance ? balance.asset : `pending-${index}`}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {/* The 32px disc is chrome and renders either
                                  way; only the two letters inside it wait. */}
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-xs font-semibold text-primary">
                                  <Loadable loading={!balance} placeholder="US">
                                    {balance?.asset.slice(0, 2)}
                                  </Loadable>
                                </span>
                              </div>
                              <Loadable loading={!balance} placeholder="USDT">
                                {balance?.asset}
                              </Loadable>
                            </div>
                          </TableCell>
                          {/* The colour is DERIVED from the ratio, so it waits
                              with the figure: painting a pending cell green
                              would say this asset is 80% free before anyone
                              knows. */}
                          <TableCell
                            className={`text-right font-mono ${balance ? getBalanceColor(balance.available, balance.total) : ""}`}
                          >
                            <Loadable loading={!balance} placeholder="12,345.67">
                              {balance ? formatNumber(balance.available) : null}
                            </Loadable>
                          </TableCell>
                          <TableCell className="text-right font-mono text-warning">
                            <Loadable loading={!balance} placeholder="12,345.67">
                              {balance ? formatNumber(balance.inOrder) : null}
                            </Loadable>
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold">
                            <Loadable loading={!balance} placeholder="12,345.67">
                              {balance ? formatNumber(balance.total) : null}
                            </Loadable>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                !balance
                                  ? "outline"
                                  : balance.total > 0
                                    ? "default"
                                    : "secondary"
                              }
                            >
                              <Loadable loading={!balance} placeholder="Active">
                                {balance
                                  ? balance.total > 0
                                    ? tCommon("active")
                                    : t("empty")
                                  : null}
                              </Loadable>
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">
                      {tCommon("showing")}
                      {startIndex + 1}
                      {tCommon("to")}
                      {Math.min(endIndex, totalItems)}
                      {tCommon("of")}
                      {totalItems}
                      {tCommon("assets")}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                      >
                        <ChevronsLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() =>
                          setCurrentPage(Math.max(1, currentPage - 1))
                        }
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>

                      <span className="text-sm font-medium px-2">
                        {tCommon("page")}
                        {currentPage}
                        {tCommon("of")}
                        {totalPages}
                      </span>

                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() =>
                          setCurrentPage(Math.min(totalPages, currentPage + 1))
                        }
                        disabled={currentPage === totalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronsRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </m.div>
    </PageShell>
  );
};

export default ExchangeBalancePage;
