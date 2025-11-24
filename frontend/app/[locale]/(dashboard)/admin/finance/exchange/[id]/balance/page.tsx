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
  ArrowLeft,
} from "lucide-react";
import { $fetch } from "@/lib/api";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Link } from "@/i18n/routing";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";

interface Balance {
  asset: string;
  available: number;
  inOrder: number;
  total: number;
}

type SortField = keyof Balance;
type SortDirection = "asc" | "desc";

const ExchangeBalancePage = () => {
  const t = useTranslations("dashboard");
  const params = useParams();
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
        if (showLoading) toast.success("Exchange balances loaded successfully");
      } else {
        toast.error("Failed to fetch exchange balances");
        setBalances([]);
      }
    } catch (error) {
      toast.error("An error occurred while fetching balances");
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
    if (percentage >= 80) return "text-green-600";
    if (percentage >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-96 flex-col gap-5">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-muted-foreground">
            {t("loading_exchange_balances")}.
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
              {t("exchange_balances")}
            </h1>
            <p className="text-muted-foreground">
              {t("monitor_and_manage_supported_assets")}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Controls */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between"
      >
        <div className="flex flex-1 items-center space-x-2 max-w-sm">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search assets..."
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
            onClick={() => fetchBalances(false)}
            disabled={refreshing}
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </motion.div>

      {/* Balance Table */}
      <motion.div
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
              {t("real-time_balance_information_connected_exchange")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {currentBalances.length === 0 ? (
              <div className="text-center py-12">
                <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {t("no_balances_found")}
                </h3>
                <p className="text-muted-foreground">
                  {searchTerm
                    ? "No assets match your search criteria"
                    : "No exchange balances available"}
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
                            {t("Asset")}
                            {getSortIcon("asset")}
                          </Button>
                        </TableHead>
                        <TableHead className="text-right">
                          <Button
                            variant="ghost"
                            onClick={() => handleSort("available")}
                            className="h-auto p-0 font-medium"
                          >
                            {t("Available")}
                            {getSortIcon("available")}
                          </Button>
                        </TableHead>
                        <TableHead className="text-right">
                          <Button
                            variant="ghost"
                            onClick={() => handleSort("inOrder")}
                            className="h-auto p-0 font-medium"
                          >
                            {t("in_orders")}
                            {getSortIcon("inOrder")}
                          </Button>
                        </TableHead>
                        <TableHead className="text-right">
                          <Button
                            variant="ghost"
                            onClick={() => handleSort("total")}
                            className="h-auto p-0 font-medium"
                          >
                            {t("total_balance")}
                            {getSortIcon("total")}
                          </Button>
                        </TableHead>
                        <TableHead>{t("Status")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentBalances.map((balance, index) => (
                        <TableRow key={balance.asset}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-xs font-semibold text-primary">
                                  {balance.asset.slice(0, 2)}
                                </span>
                              </div>
                              {balance.asset}
                            </div>
                          </TableCell>
                          <TableCell
                            className={`text-right font-mono ${getBalanceColor(balance.available, balance.total)}`}
                          >
                            {formatNumber(balance.available)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-orange-600">
                            {formatNumber(balance.inOrder)}
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold">
                            {formatNumber(balance.total)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                balance.total > 0 ? "default" : "secondary"
                              }
                            >
                              {balance.total > 0 ? "Active" : "Empty"}
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
                      {t("assets")}
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

export default ExchangeBalancePage;
