"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  Search,
  SlidersHorizontal,
  User,
} from "lucide-react";
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
import { useDebounce } from "@/hooks/use-debounce";
import { useInvestorsStore } from "@/store/ico/creator/investor-store";
import { useTranslations } from "next-intl";

export function CreatorInvestorsList() {
  const t = useTranslations("ext");
  const {
    investors,
    isLoadingInvestors,
    investorsError,
    fetchInvestors,
    investorsPagination,
    investorsSortOptions,
    setInvestorsSortOptions,
    investorsSearchQuery,
    setInvestorsSearchQuery,
  } = useInvestorsStore();
  const [searchInput, setSearchInput] = useState(investorsSearchQuery);
  const debouncedSearchTerm = useDebounce(searchInput, 500);
  useEffect(() => {
    fetchInvestors(
      investorsPagination.currentPage,
      investorsPagination.itemsPerPage,
      investorsSortOptions.field,
      investorsSortOptions.direction
    );
  }, []);
  useEffect(() => {
    if (debouncedSearchTerm !== investorsSearchQuery) {
      setInvestorsSearchQuery(debouncedSearchTerm);
    }
  }, [debouncedSearchTerm]);
  const handleSort = (field: string) => {
    const newDirection =
      investorsSortOptions.field === field &&
      investorsSortOptions.direction === "asc"
        ? "desc"
        : "asc";
    setInvestorsSortOptions(field, newDirection);
  };
  const goToPage = (page: number) => {
    fetchInvestors(
      page,
      investorsPagination.itemsPerPage,
      investorsSortOptions.field,
      investorsSortOptions.direction,
      investorsSearchQuery
    );
  };
  const handleItemsPerPageChange = (value: string) => {
    fetchInvestors(
      1,
      // Reset to first page when changing items per page
      Number(value),
      investorsSortOptions.field,
      investorsSortOptions.direction,
      investorsSearchQuery
    );
  };

  // Render sort icon based on current sort state
  const renderSortIcon = (field: string) => {
    if (investorsSortOptions.field !== field) {
      return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
    }
    return investorsSortOptions.direction === "asc" ? (
      <ArrowUp className="h-4 w-4 ml-1" />
    ) : (
      <ArrowDown className="h-4 w-4 ml-1" />
    );
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold">{t("Investors")}</h2>
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Input
              placeholder="Search investors..."
              className="pl-8"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              icon="mdi:magnify"
            />
          </div>
        </div>
      </div>

      <div>
        <CardContent className="p-0">
          {isLoadingInvestors ? (
            <div className="py-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto" />
              <p>{t("loading_investors")}.</p>
            </div>
          ) : investorsError ? (
            <div className="py-8 text-center text-red-600">
              {t("error")}
              {investorsError}
            </div>
          ) : investors.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead
                      className="cursor-pointer hover:text-primary transition-colors"
                      onClick={() => handleSort("user.firstName")}
                    >
                      <div className="flex items-center">
                        {t("Investor")}
                        {renderSortIcon("user.firstName")}
                      </div>
                    </TableHead>
                    <TableHead>{t("Token")}</TableHead>
                    <TableHead
                      className="cursor-pointer hover:text-primary transition-colors"
                      onClick={() => handleSort("totalCost")}
                    >
                      <div className="flex items-center">
                        {t("Amount")}
                        {renderSortIcon("totalCost")}
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:text-primary transition-colors"
                      onClick={() => handleSort("totalTokens")}
                    >
                      <div className="flex items-center">
                        {t("Tokens")}
                        {renderSortIcon("totalTokens")}
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:text-primary transition-colors"
                      onClick={() => handleSort("lastTransactionDate")}
                    >
                      <div className="flex items-center">
                        {t("Date")}
                        {renderSortIcon("lastTransactionDate")}
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {investors.map((investor) => {
                    // Safely handle any null or undefined fields
                    const totalCost = investor.totalCost ?? 0;
                    const totalTokens = investor.totalTokens ?? 0;
                    const date = investor.lastTransactionDate
                      ? new Date(investor.lastTransactionDate).toLocaleString(
                          undefined,
                          {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )
                      : "N/A";
                    const firstName = investor.user?.firstName || "Unknown";
                    const lastName = investor.user?.lastName || "User";
                    const avatar =
                      investor.user?.avatar || "/img/placeholder.svg";
                    const symbol = investor.offering?.symbol || "???";
                    const name = investor.offering?.name || "???";
                    const icon =
                      investor.offering?.icon || "/img/placeholder.svg";
                    return (
                      <TableRow
                        key={investor.userId + "-" + investor.offeringId}
                        className="hover:bg-muted/30"
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full overflow-hidden">
                              <img
                                src={avatar || "/img/placeholder.svg"}
                                alt={`${firstName} ${lastName}`}
                                className="h-full w-full object-cover"
                              />
                            </div>
                            <div>
                              <div className="font-medium">
                                {firstName} {lastName}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full overflow-hidden">
                              <img
                                src={icon || "/img/placeholder.svg"}
                                alt={name}
                                className="h-full w-full object-cover"
                              />
                            </div>
                            <div>
                              <Badge variant="outline" className="font-medium">
                                {symbol}
                              </Badge>
                              <div className="text-xs text-muted-foreground mt-1">
                                {name}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          / $
                          {totalCost.toLocaleString()}
                        </TableCell>
                        <TableCell>{totalTokens.toLocaleString()}</TableCell>
                        <TableCell>{date}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              {investorsPagination.totalItems > 0 &&
                investorsPagination.totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t">
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-muted-foreground">
                        {t("Showing")}{" "}
                        <span className="font-medium">
                          {(investorsPagination.currentPage - 1) *
                            investorsPagination.itemsPerPage +
                            1}
                        </span>{" "}
                        {t("to")}{" "}
                        <span className="font-medium">
                          {Math.min(
                            investorsPagination.currentPage *
                              investorsPagination.itemsPerPage,
                            investorsPagination.totalItems
                          )}
                        </span>{" "}
                        {t("of")}{" "}
                        <span className="font-medium">
                          {investorsPagination.totalItems}
                        </span>{" "}
                        {t("results")}
                      </p>
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-muted-foreground">
                          {t("Show")}
                        </span>
                        <Select
                          value={investorsPagination.itemsPerPage.toString()}
                          onValueChange={handleItemsPerPageChange}
                        >
                          <SelectTrigger className="h-8 w-[70px]">
                            <SelectValue
                              placeholder={investorsPagination.itemsPerPage.toString()}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="5">/ 5</SelectItem>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="20">20</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => goToPage(1)}
                        disabled={investorsPagination.currentPage === 1}
                      >
                        <ChevronsLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() =>
                          goToPage(investorsPagination.currentPage - 1)
                        }
                        disabled={investorsPagination.currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>

                      <div className="flex items-center gap-1 mx-2">
                        {Array.from(
                          {
                            length: Math.min(5, investorsPagination.totalPages),
                          },
                          (_, i) => {
                            // Show pages around current page
                            let pageToShow: number;
                            if (investorsPagination.totalPages <= 5) {
                              pageToShow = i + 1;
                            } else if (investorsPagination.currentPage <= 3) {
                              pageToShow = i + 1;
                            } else if (
                              investorsPagination.currentPage >=
                              investorsPagination.totalPages - 2
                            ) {
                              pageToShow =
                                investorsPagination.totalPages - 4 + i;
                            } else {
                              pageToShow =
                                investorsPagination.currentPage - 2 + i;
                            }
                            return (
                              <Button
                                key={pageToShow}
                                variant={
                                  investorsPagination.currentPage === pageToShow
                                    ? "default"
                                    : "outline"
                                }
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => goToPage(pageToShow)}
                              >
                                {pageToShow}
                              </Button>
                            );
                          }
                        )}
                      </div>

                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() =>
                          goToPage(investorsPagination.currentPage + 1)
                        }
                        disabled={
                          investorsPagination.currentPage ===
                          investorsPagination.totalPages
                        }
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => goToPage(investorsPagination.totalPages)}
                        disabled={
                          investorsPagination.currentPage ===
                          investorsPagination.totalPages
                        }
                      >
                        <ChevronsRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
            </div>
          ) : (
            <div className="py-8 text-center">
              <User className="h-8 w-8 mb-2 mx-auto" />
              <p>{t("no_investors_found")}</p>
              <p className="text-sm">{t("try_adjusting_your_search")}</p>
            </div>
          )}
        </CardContent>
      </div>
    </div>
  );
}
