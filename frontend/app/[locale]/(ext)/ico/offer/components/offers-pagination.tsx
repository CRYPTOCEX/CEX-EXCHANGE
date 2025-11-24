"use client";

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import React from "react";
import { useTranslations } from "next-intl";

interface OfferingsPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function OfferingsPagination({
  currentPage,
  totalPages,
  onPageChange,
}: OfferingsPaginationProps) {
  const t = useTranslations("ext");
  // Don't show pagination if there's only one page
  if (totalPages <= 1) return null;

  // Generate page numbers to display
  const getPageNumbers = () => {
    // Explicitly type the array to allow both numbers and strings
    const pages: (number | string)[] = [];

    // Always show first page
    pages.push(1);

    // Calculate range around current page
    let rangeStart = Math.max(2, currentPage - 1);
    let rangeEnd = Math.min(totalPages - 1, currentPage + 1);

    // Adjust range to always show 3 pages if possible
    if (rangeEnd - rangeStart < 2 && totalPages > 3) {
      if (rangeStart === 2) {
        rangeEnd = Math.min(4, totalPages - 1);
      } else if (rangeEnd === totalPages - 1) {
        rangeStart = Math.max(2, totalPages - 3);
      }
    }

    // Add ellipsis before range if needed
    if (rangeStart > 2) {
      pages.push("ellipsis1");
    }

    // Add range pages
    for (let i = rangeStart; i <= rangeEnd; i++) {
      pages.push(i);
    }

    // Add ellipsis after range if needed
    if (rangeEnd < totalPages - 1) {
      pages.push("ellipsis2");
    }

    // Always show last page if more than 1 page
    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <Pagination className="my-6">
      <PaginationContent>
        {/* Custom Previous button that handles disabled state */}
        <PaginationItem>
          <a
            href="#"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "gap-1 pl-2.5",
              currentPage === 1 && "pointer-events-none opacity-50"
            )}
            onClick={(e) => {
              e.preventDefault();
              if (currentPage > 1) onPageChange(currentPage - 1);
            }}
            aria-disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            <span>{t("Previous")}</span>
          </a>
        </PaginationItem>

        {pageNumbers.map((page, index) =>
          typeof page === "number" ? (
            <PaginationItem key={index}>
              <PaginationLink
                href="#"
                isActive={page === currentPage}
                onClick={(e) => {
                  e.preventDefault();
                  onPageChange(page);
                }}
              >
                {page}
              </PaginationLink>
            </PaginationItem>
          ) : (
            <PaginationItem key={String(page)}>
              <PaginationEllipsis />
            </PaginationItem>
          )
        )}

        {/* Custom Next button that handles disabled state */}
        <PaginationItem>
          <a
            href="#"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "gap-1 pr-2.5",
              currentPage === totalPages && "pointer-events-none opacity-50"
            )}
            onClick={(e) => {
              e.preventDefault();
              if (currentPage < totalPages) onPageChange(currentPage + 1);
            }}
            aria-disabled={currentPage === totalPages}
          >
            <span>{t("Next")}</span>
            <ChevronRight className="h-4 w-4" />
          </a>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
