"use client";

import {
  ExternalLink,
  Send,
  AlertCircle,
  CheckCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/ico/utils";
import { Link } from "@/i18n/routing";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTokenReleaseStore } from "@/store/ico/token-release-store";
interface TransactionsTableProps {
  transactions: any[];
  isLoading: boolean;
  onReleaseClick?: (transactionId: string) => void;
  // Updated to include REJECTED as a possible status
  status: "PENDING" | "VERIFICATION" | "RELEASED" | "REJECTED";
  tokenId: string;
}
interface SortableColumn {
  key: string;
  label: string;
}
export function TransactionsTable({
  transactions,
  isLoading,
  onReleaseClick,
  status,
  tokenId,
}: TransactionsTableProps) {
  const { fetchTransactions, paginationMeta, sortOptions, setSortOptions } =
    useTokenReleaseStore();

  // Get the appropriate pagination meta and sort options based on status
  const getPaginationMeta = () => {
    switch (status) {
      case "PENDING":
        return paginationMeta.pending;
      case "VERIFICATION":
        return paginationMeta.verification;
      case "RELEASED":
        return paginationMeta.released;
      case "REJECTED":
        // New
        return paginationMeta.rejected;
      default:
        return paginationMeta.pending;
    }
  };
  const getSortOptions = () => {
    switch (status) {
      case "PENDING":
        return sortOptions.pending;
      case "VERIFICATION":
        return sortOptions.verification;
      case "RELEASED":
        return sortOptions.released;
      case "REJECTED":
        // New
        return sortOptions.rejected;
      default:
        return sortOptions.pending;
    }
  };
  const meta = getPaginationMeta();
  const sort = getSortOptions();

  // Define sortable columns with unique keys
  const sortableColumns: SortableColumn[] = [
    {
      key: "user.firstName",
      label: "Investor",
    },
    {
      key: "currencyAmount",
      label: "Cost",
    },
    {
      key: "amount",
      label: "Tokens",
    },
    {
      key: "createdAt",
      label: "Date",
    },
  ];

  // Handle sorting
  const handleSort = (field: string) => {
    let backendField = field;
    if (field === "currencyAmount") {
      backendField = "amount";
    }
    const newDirection =
      sort.field === backendField && sort.direction === "asc" ? "desc" : "asc";
    setSortOptions(status, backendField, newDirection);
  };

  // Handle page changes
  const goToPage = (page: number) => {
    fetchTransactions(
      tokenId,
      status,
      page,
      meta.itemsPerPage,
      sort.field,
      sort.direction
    );
  };

  // Handle items per page change
  const handleItemsPerPageChange = (value: string) => {
    fetchTransactions(
      tokenId,
      status,
      1,
      Number(value),
      sort.field,
      sort.direction
    );
  };

  // Initial fetch if needed
  useEffect(() => {
    if (transactions.length === 0 && !isLoading) {
      fetchTransactions(
        tokenId,
        status,
        meta.currentPage,
        meta.itemsPerPage,
        sort.field,
        sort.direction
      );
    }
  }, [status, tokenId]);
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  if (transactions.length === 0 && meta.totalItems === 0) {
    return (
      <div className="text-center py-12 bg-muted/30 rounded-lg">
        <h3 className="text-xl font-medium mb-2">No transactions</h3>
        <p className="text-muted-foreground">
          {status === "PENDING" &&
            "There are no pending transactions that require token release."}
          {status === "VERIFICATION" &&
            "There are no transactions pending verification."}
          {status === "RELEASED" && "There are no released transactions yet."}
          {status === "REJECTED" && "There are no rejected transactions."}
        </p>
      </div>
    );
  }
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge
            variant="outline"
            className="bg-amber-500/10 text-amber-600 border-amber-200"
          >
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "VERIFICATION":
        return (
          <Badge
            variant="outline"
            className="bg-blue-500/10 text-blue-600 border-blue-200"
          >
            <Clock className="h-3 w-3 mr-1" />
            Verifying
          </Badge>
        );
      case "RELEASED":
        return (
          <Badge
            variant="outline"
            className="bg-green-500/10 text-green-600 border-green-200"
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            Released
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge
            variant="outline"
            className="bg-red-500/10 text-red-600 border-red-200"
          >
            <AlertCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge
            variant="outline"
            className="bg-gray-500/10 text-gray-600 border-gray-200"
          >
            <AlertCircle className="h-3 w-3 mr-1" />
            Unknown
          </Badge>
        );
    }
  };
  const renderSortIcon = (field: string) => {
    let backendField = field;
    if (field === "currencyAmount") {
      backendField = "amount";
    }
    if (sort.field !== backendField) {
      return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
    }
    return sort.direction === "asc" ? (
      <ArrowUp className="h-4 w-4 ml-1" />
    ) : (
      <ArrowDown className="h-4 w-4 ml-1" />
    );
  };
  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            {sortableColumns.map((column) => (
              <TableHead
                key={column.key}
                className="cursor-pointer hover:text-primary transition-colors"
                onClick={() => handleSort(column.key)}
              >
                <div className="flex items-center">
                  {column.label}
                  {renderSortIcon(column.key)}
                </div>
              </TableHead>
            ))}
            {(status === "VERIFICATION" || status === "RELEASED") && (
              <TableHead>Release Hash</TableHead>
            )}
            <TableHead className="text-right">
              {status === "PENDING" ? "Actions" : "Status"}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction) => {
            return (
              <TableRow key={transaction.id} className="hover:bg-muted/30">
                <TableCell>
                  <div className="flex items-center gap-3">
                    {transaction.user?.avatar && (
                      <div className="h-8 w-8 rounded-full overflow-hidden">
                        <img
                          src={
                            transaction.user.avatar || "/img/placeholder.svg"
                          }
                          alt={`${transaction.user.firstName} ${transaction.user.lastName}`}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}
                    <div>
                      <div className="font-medium">
                        {transaction.user
                          ? `${transaction.user.firstName} ${transaction.user.lastName}`
                          : "Unknown"}
                      </div>
                    </div>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="text-sm text-muted-foreground truncate max-w-[150px] cursor-help">
                          {transaction.walletAddress || "N/A"}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-mono text-xs">
                          {transaction.walletAddress || "No wallet address"}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>
                <TableCell>
                  <div className="font-medium">
                    {formatCurrency(transaction.amount * transaction.price)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    ${transaction.price} per token
                  </div>
                </TableCell>
                <TableCell>
                  <div className="font-medium">
                    {formatNumber(transaction.amount)}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="font-medium">
                    {formatDateTime(transaction.createdAt)}
                  </div>
                </TableCell>
                {(status === "VERIFICATION" || status === "RELEASED") && (
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-sm truncate max-w-[120px] font-mono">
                        {transaction.transactionId
                          ? transaction.transactionId.substring(0, 10) + "..."
                          : "N/A"}
                      </span>
                      {transaction.transactionId && (
                        <Link
                          href={`https://etherscan.io/tx/${transaction.transactionId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </Link>
                      )}
                    </div>
                  </TableCell>
                )}
                <TableCell className="text-right">
                  {status === "PENDING" ? (
                    <Button
                      variant="default"
                      size="xs"
                      onClick={() => onReleaseClick?.(transaction.id)}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  ) : (
                    getStatusBadge(transaction.status)
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Pagination */}
      {meta.totalItems > 0 && meta.totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t">
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">
              Showing{" "}
              <span className="font-medium">
                {(meta.currentPage - 1) * meta.itemsPerPage + 1}
              </span>{" "}
              to{" "}
              <span className="font-medium">
                {Math.min(
                  meta.currentPage * meta.itemsPerPage,
                  meta.totalItems
                )}
              </span>{" "}
              of <span className="font-medium">{meta.totalItems}</span> results
            </p>
            <div className="flex items-center gap-1">
              <span className="text-sm text-muted-foreground">Show</span>
              <Select
                value={meta.itemsPerPage.toString()}
                onValueChange={handleItemsPerPageChange}
              >
                <SelectTrigger className="h-8 w-[70px]">
                  <SelectValue placeholder={meta.itemsPerPage.toString()} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
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
              disabled={meta.currentPage === 1}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => goToPage(meta.currentPage - 1)}
              disabled={meta.currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-1 mx-2">
              {Array.from(
                {
                  length: Math.min(5, meta.totalPages),
                },
                (_, i) => {
                  let pageToShow: number;
                  if (meta.totalPages <= 5) {
                    pageToShow = i + 1;
                  } else if (meta.currentPage <= 3) {
                    pageToShow = i + 1;
                  } else if (meta.currentPage >= meta.totalPages - 2) {
                    pageToShow = meta.totalPages - 4 + i;
                  } else {
                    pageToShow = meta.currentPage - 2 + i;
                  }
                  return (
                    <Button
                      key={pageToShow}
                      variant={
                        meta.currentPage === pageToShow ? "default" : "outline"
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
              onClick={() => goToPage(meta.currentPage + 1)}
              disabled={meta.currentPage === meta.totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => goToPage(meta.totalPages)}
              disabled={meta.currentPage === meta.totalPages}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
