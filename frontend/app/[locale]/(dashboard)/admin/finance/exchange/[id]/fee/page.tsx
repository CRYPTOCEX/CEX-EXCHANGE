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
  CreditCard,
  Loader2,
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
import { $fetch } from "@/lib/api";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Link } from "@/i18n/routing";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";

interface FeeComparison {
  currency: string;
  totalAmount: number;
  totalCalculatedFee: number;
  totalExchangeFee: number;
  totalExtraFee: number;
}

type SortField = keyof FeeComparison;
type SortDirection = "asc" | "desc";

const ExchangeFeePage = () => {
  const t = useTranslations("dashboard");
  const params = useParams();
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
        if (showLoading) toast.success("Exchange fees loaded successfully");
      } else {
        toast.error("Failed to fetch exchange fees");
        setFees([]);
      }
    } catch (error) {
      toast.error("An error occurred while fetching fees");
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
    if (fee > 0) return "text-green-600";
    return "text-red-600";
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

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-96 flex-col gap-5">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-muted-foreground">
            {t("loading_exchange_fees")}.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <div className="flex items-center gap-4">
          <Link href={`/admin/finance/exchange/${params.id}`}>
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">
              {t("exchange_fees")}
            </h1>
            <p className="text-muted-foreground">
              {t("monitor_fee_calculations_trading_currencies")}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
      >
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              {t("total_amount")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(totalStats.totalAmount)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              {t("calculated_fees")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatNumber(totalStats.totalCalculatedFee)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              {t("exchange_fees")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatNumber(totalStats.totalExchangeFee)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              {t("collectable_fees")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatNumber(totalStats.totalExtraFee)}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Controls */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between"
      >
        <div className="flex flex-1 items-center space-x-2 max-w-sm">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search currencies..."
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
              <SelectItem value="10">{t("10_per_page")}</SelectItem>
              <SelectItem value="20">{t("20_per_page")}</SelectItem>
              <SelectItem value="50">{t("50_per_page")}</SelectItem>
              <SelectItem value="100">{t("100_per_page")}</SelectItem>
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
      </motion.div>

      {/* Fee Table */}
      <motion.div
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
            {currentFees.length === 0 ? (
              <div className="text-center py-12">
                <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {t("no_fee_data_found")}
                </h3>
                <p className="text-muted-foreground">
                  {searchTerm
                    ? "No currencies match your search criteria"
                    : "No fee data available"}
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
                            {t("Currency")}
                            {getSortIcon("currency")}
                          </Button>
                        </TableHead>
                        <TableHead className="text-right">
                          <Button
                            variant="ghost"
                            onClick={() => handleSort("totalAmount")}
                            className="h-auto p-0 font-medium"
                          >
                            {t("total_amount")}
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
                        <TableHead>{t("Status")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentFees.map((fee, index) => (
                        <TableRow key={fee.currency}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-xs font-semibold text-primary">
                                  {fee.currency.slice(0, 2)}
                                </span>
                              </div>
                              {fee.currency}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatNumber(fee.totalAmount)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-blue-600">
                            {formatNumber(fee.totalCalculatedFee)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-orange-600">
                            {formatNumber(fee.totalExchangeFee)}
                          </TableCell>
                          <TableCell
                            className={`text-right font-mono font-semibold ${getFeeColor(fee.totalExtraFee)}`}
                          >
                            {formatNumber(fee.totalExtraFee)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                fee.totalExtraFee > 0 ? "default" : "secondary"
                              }
                            >
                              {fee.totalExtraFee > 0
                                ? "Profitable"
                                : "No Profit"}
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
                      {t("Showing")}
                      {startIndex + 1}
                      {t("to")}
                      {Math.min(endIndex, totalItems)}
                      {t("of")}
                      {totalItems}
                      {t("currencies")}
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
                        {t("Page")}
                        {currentPage}
                        {t("of")}
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
      </motion.div>
    </div>
  );
};

export default ExchangeFeePage;
