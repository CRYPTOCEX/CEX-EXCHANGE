"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Pagination as PaginationNav,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslations } from "next-intl";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  showPageSizeSelector?: boolean;
}

/**
 * Page-size + range summary over the shared `components/ui/pagination`
 * structure (`<nav aria-label="pagination"><ul><li>` plus the ellipsis), with
 * real `Button`s as the controls.
 *
 * Note for anyone tempted to also swap in `PaginationLink` / `PaginationNext`:
 * those render an `<a>` with **no href**, which has no link role and is not
 * keyboard focusable. They are built for href-driven pagination; this one is
 * JS-driven, so the controls have to stay buttons or the whole pager becomes
 * mouse-only.
 */
export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  showPageSizeSelector = true,
}: PaginationProps) {
  const t = useTranslations("common");
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 7;

    if (totalPages <= maxVisiblePages) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage > 4) {
        pages.push("...");
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        if (i !== 1 && i !== totalPages) {
          pages.push(i);
        }
      }

      if (currentPage < totalPages - 3) {
        pages.push("...");
      }

      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();
  const isFirst = currentPage === 1;
  const isLast = currentPage === totalPages;

  return (
    <div className="flex flex-col items-center justify-between gap-4 rounded-lg border border-border bg-card p-4 sm:flex-row">
      {/* Results info */}
      <div className="text-sm text-muted-foreground">
        {t("showing")} <span className="font-medium text-foreground">{startItem} </span>
        {t("to")} <span className="font-medium text-foreground">{endItem} </span>
        {t("of")} <span className="font-medium text-foreground">{totalItems} </span>
        {t("results")}
      </div>

      {/* Page size selector */}
      {showPageSizeSelector && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{t("show")}</span>
          <Select
            value={pageSize.toString()}
            onValueChange={(value) => onPageSizeChange(Number(value))}
          >
            <SelectTrigger className="h-9 w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">{t("per_page")}</span>
        </div>
      )}

      {/* Pagination controls */}
      <PaginationNav className="mx-0 w-auto">
        <PaginationContent className="flex-wrap justify-center gap-1">
          <PaginationItem>
            <Button
              variant="outline"
              size="sm"
              className="gap-1 px-2.5"
              disabled={isFirst}
              onClick={() => onPageChange(currentPage - 1)}
            >
              <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
              <span className="hidden sm:inline">{t("previous")}</span>
            </Button>
          </PaginationItem>

          {pageNumbers.map((page, index) => (
            <PaginationItem key={index}>
              {page === "..." ? (
                <PaginationEllipsis className="text-muted-foreground" />
              ) : (
                <Button
                  variant={currentPage === page ? "default" : "ghost"}
                  size="sm"
                  aria-label={`${t("page")} ${page}`}
                  aria-current={currentPage === page ? "page" : undefined}
                  className="w-9 px-0"
                  onClick={() => onPageChange(page as number)}
                >
                  {page}
                </Button>
              )}
            </PaginationItem>
          ))}

          <PaginationItem>
            <Button
              variant="outline"
              size="sm"
              className="gap-1 px-2.5"
              disabled={isLast}
              onClick={() => onPageChange(currentPage + 1)}
            >
              <span className="hidden sm:inline">{t("next")}</span>
              <ChevronRight className="h-4 w-4 rtl:rotate-180" />
            </Button>
          </PaginationItem>
        </PaginationContent>
      </PaginationNav>
    </div>
  );
}
