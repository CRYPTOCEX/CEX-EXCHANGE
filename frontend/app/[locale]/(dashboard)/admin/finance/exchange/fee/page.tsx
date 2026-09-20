"use client";

import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatsCard, statsCardColors } from "@/components/ui/card/stats-card";
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
  CreditCard,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  DollarSign,
  TrendingUp,
  Calculator,
  ArrowLeft,
} from "lucide-react";
import { Loadable } from "@/components/ui/skeleton";
import { $fetch } from "@/lib/api";
import { toast } from "sonner";
import { m } from "framer-motion";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { PageShell } from "@/components/layout/page-shell";

interface FeeComparison {
  currency: string;
  totalAmount: number;
  totalCalculatedFee: number;
  totalExchangeFee: number;
  totalExtraFee: number;
}

type SortField = keyof FeeComparison;
type SortDirection = "asc" | "desc";

/**
 * Rows the table reserves while the fee comparison is in flight.
 *
 * A `null` row IS the pending row, so one `.map()` renders both states from the
 * same `<TableRow>` markup — there is no second copy of a row to keep in sync
 * with the real one.
 */
const PENDING_ROWS: Array<FeeComparison | null> = Array.from(
  { length: 8 },
  () => null
);

const ExchangeFeePage = () => {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const [fees, setFees] = useState<FeeComparison[]>([]);
  const [filteredFees, setFilteredFees] = useState<FeeComparison[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [sortField, setSortField] = useState<SortField>("totalExtraFee");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const fetchFees = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setRefreshing(true);

    try {
      const { data, error } = await $fetch({
        url: "/api/admin/finance/exchange/fee",
        silent: true,
      });

      if (!error && data?.feesComparison) {
        setFees(data.feesComparison);
        if (showLoading) toast.success(t("exchange_fees_loaded_successfully"));
      } else {
        toast.error(t("failed_to_fetch_exchange_fees"));
        setFees([]);
      }
    } catch (error) {
      toast.error(t("an_error_occurred_while_fetching_fees"));
      setFees([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFees();
  }, []);

  useEffect(() => {
    const filtered = fees.filter((fee) =>
      fee.currency.toLowerCase().includes(searchTerm.toLowerCase())
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

    setFilteredFees(filtered);
    setCurrentPage(1); // Reset to first page when filtering
  }, [fees, searchTerm, sortField, sortDirection]);

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
  const totalItems = filteredFees.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentFees = filteredFees.slice(startIndex, endIndex);

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8,
    }).format(value);
  };

  const getFeeColor = (fee: number) => {
    if (fee === 0) return "text-muted-foreground";
    if (fee > 0) return "text-success";
    return "text-destructive";
  };

  const calculateTotalStats = () => {
    const totals = filteredFees.reduce(
      (acc, fee) => ({
        totalAmount: acc.totalAmount + fee.totalAmount,
        totalCalculatedFee: acc.totalCalculatedFee + fee.totalCalculatedFee,
        totalExchangeFee: acc.totalExchangeFee + fee.totalExchangeFee,
        totalExtraFee: acc.totalExtraFee + fee.totalExtraFee,
      }),
      {
        totalAmount: 0,
        totalCalculatedFee: 0,
        totalExchangeFee: 0,
        totalExtraFee: 0,
      }
    );

    return totals;
  };

  const totalStats = calculateTotalStats();

  /**
   * "NO FEE DATA FOUND" IS AN ANSWER. A PENDING FETCH IS NOT.
   * ==========================================================================
   *
   * The page opened with `if (loading) return <div className="container mx-auto
   * py-8">` around a centred spinner in a 384px box — a different container
   * from the `PageShell` the real page uses, so the frame changed along with
   * everything in it, and the four KPI cards, the search row and the whole
   * table arrived at once as shift.
   *
   * Under it sat the same conflation the table has: `currentFees.length === 0`
   * chooses the "No fee data found" panel, and that is true during the fetch
   * too. Emptiness is a conclusion and needs the fetch to be over before it can
   * be drawn; until then the table renders `PENDING_ROWS` with the same header,
   * the same five columns and the same row markup.
   *
   * The KPI cards take `loading` and keep their own frames — that is what
   * `StatsCard` does with it — instead of summing an empty array to `0.00` and
   * showing four confident zeroes that are about to change.
   */
  const showEmptyState = !loading && currentFees.length === 0;
  const rows: Array<FeeComparison | null> = loading ? PENDING_ROWS : currentFees;

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
              {t("exchange_fees")}
            </h1>
            <p className="text-muted-foreground">
              {t("monitor_fee_calculations_trading_currencies")}
            </p>
          </div>
        </div>
      </m.div>

      {/* Stats Cards */}
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
      >
        <StatsCard
          label={tCommon("total_amount")}
          value={formatNumber(totalStats.totalAmount)}
          icon={DollarSign}
          {...statsCardColors.neutral}
          loading={loading}
        />

        <StatsCard
          label={t("calculated_fees")}
          value={formatNumber(totalStats.totalCalculatedFee)}
          icon={Calculator}
          {...statsCardColors.primary}
          loading={loading}
        />

        <StatsCard
          label={t("exchange_fees")}
          value={formatNumber(totalStats.totalExchangeFee)}
          icon={CreditCard}
          {...statsCardColors.warning}
          loading={loading}
        />

        <StatsCard
          label={t("collectable_fees")}
          value={formatNumber(totalStats.totalExtraFee)}
          icon={TrendingUp}
          {...statsCardColors.success}
          loading={loading}
        />
      </m.div>

      {/* Controls */}
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between"
      >
        <div className="flex flex-1 items-center space-x-2 max-w-sm">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`${tCommon('search_currencies')}…`}
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
            onClick={() => fetchFees(false)}
            disabled={refreshing}
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </m.div>

      {/* Fee Table */}
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              {t("fee_comparison_analysis")}
            </CardTitle>
            <CardDescription>
              {t("detailed_breakdown_of_by_currency")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {showEmptyState ? (
              <div className="text-center py-12">
                <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {t("no_fee_data_found")}
                </h3>
                <p className="text-muted-foreground">
                  {searchTerm
                    ? t("no_currencies_match_your_search_criteria")
                    : t("no_fee_data_available")}
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
                            onClick={() => handleSort("currency")}
                            className="h-auto p-0 font-medium"
                          >
                            {tCommon("currency")}
                            {getSortIcon("currency")}
                          </Button>
                        </TableHead>
                        <TableHead className="text-right">
                          <Button
                            variant="ghost"
                            onClick={() => handleSort("totalAmount")}
                            className="h-auto p-0 font-medium"
                          >
                            {tCommon("total_amount")}
                            {getSortIcon("totalAmount")}
                          </Button>
                        </TableHead>
                        <TableHead className="text-right">
                          <Button
                            variant="ghost"
                            onClick={() => handleSort("totalCalculatedFee")}
                            className="h-auto p-0 font-medium"
                          >
                            {t("calculated_fee")}
                            {getSortIcon("totalCalculatedFee")}
                          </Button>
                        </TableHead>
                        <TableHead className="text-right">
                          <Button
                            variant="ghost"
                            onClick={() => handleSort("totalExchangeFee")}
                            className="h-auto p-0 font-medium"
                          >
                            {t("exchange_fee")}
                            {getSortIcon("totalExchangeFee")}
                          </Button>
                        </TableHead>
                        <TableHead className="text-right">
                          <Button
                            variant="ghost"
                            onClick={() => handleSort("totalExtraFee")}
                            className="h-auto p-0 font-medium"
                          >
                            {t("collectable_fee")}
                            {getSortIcon("totalExtraFee")}
                          </Button>
                        </TableHead>
                        <TableHead>{tCommon("status")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((fee, index) => (
                        <TableRow key={fee ? fee.currency : `pending-${index}`}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {/* The 32px disc is chrome and renders either
                                  way; only the two letters inside it wait. */}
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-xs font-semibold text-primary">
                                  <Loadable loading={!fee} placeholder="US">
                                    {fee?.currency.slice(0, 2)}
                                  </Loadable>
                                </span>
                              </div>
                              <Loadable loading={!fee} placeholder="USDT">
                                {fee?.currency}
                              </Loadable>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            <Loadable loading={!fee} placeholder="12,345.67">
                              {fee ? formatNumber(fee.totalAmount) : null}
                            </Loadable>
                          </TableCell>
                          <TableCell className="text-right font-mono text-primary">
                            <Loadable loading={!fee} placeholder="12,345.67">
                              {fee ? formatNumber(fee.totalCalculatedFee) : null}
                            </Loadable>
                          </TableCell>
                          <TableCell className="text-right font-mono text-warning">
                            <Loadable loading={!fee} placeholder="12,345.67">
                              {fee ? formatNumber(fee.totalExchangeFee) : null}
                            </Loadable>
                          </TableCell>
                          {/* The ink is DERIVED from the sign, so it waits with
                              the figure — a pending cell painted green claims
                              this currency is profitable before anyone knows. */}
                          <TableCell
                            className={`text-right font-mono font-semibold ${fee ? getFeeColor(fee.totalExtraFee) : ""}`}
                          >
                            <Loadable loading={!fee} placeholder="12,345.67">
                              {fee ? formatNumber(fee.totalExtraFee) : null}
                            </Loadable>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                !fee
                                  ? "outline"
                                  : fee.totalExtraFee > 0
                                    ? "default"
                                    : "secondary"
                              }
                            >
                              <Loadable loading={!fee} placeholder="Profitable">
                                {fee
                                  ? fee.totalExtraFee > 0
                                    ? tCommon("profitable")
                                    : t("no_profit")
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
                      {tCommon("currencies")}
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

export default ExchangeFeePage;
