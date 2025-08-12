"use client";

import { type JSX, useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useConfigStore } from "@/store/config";
import { useTranslations } from "next-intl";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  baseUrl: string;
}

export function Pagination({
  currentPage,
  totalPages,
  baseUrl,
}: PaginationProps) {
  const t = useTranslations("blog");
  const { settings } = useConfigStore();
  const [calculatedTotalPages, setCalculatedTotalPages] = useState(totalPages);

  useEffect(() => {
    // Recalculate total pages based on settings
    if (settings.postsPerPage) {
      setCalculatedTotalPages(totalPages);
    }
  }, [settings.postsPerPage, totalPages]);

  if (calculatedTotalPages <= 1) return null;

  const getPageUrl = (page: number) => {
    const separator = baseUrl.includes("?") ? "&" : "?";
    return `${baseUrl}${separator}page=${page}`;
  };

  const renderPageLinks = () => {
    const pages: JSX.Element[] = [];

    // Always show first page
    pages.push(
      <Link
        key="first"
        href={getPageUrl(1)}
        className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
          currentPage === 1
            ? "bg-indigo-600 text-white focus-visible:outline-indigo-700 dark:bg-indigo-700 dark:focus-visible:outline-indigo-600"
            : "text-zinc-900 dark:text-zinc-100 ring-1 ring-inset ring-zinc-300 dark:ring-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 focus:outline-offset-0"
        }`}
      >
        1
      </Link>
    );

    // Add ellipsis if needed
    if (currentPage > 3) {
      pages.push(
        <span
          key="ellipsis-start"
          className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300"
        ></span>
      );
    }

    // Add pages around current page
    for (
      let i = Math.max(2, currentPage - 1);
      i <= Math.min(totalPages - 1, currentPage + 1);
      i++
    ) {
      if (i === 1 || i === totalPages) continue; // Skip first and last page as they're always shown
      pages.push(
        <Link
          key={i}
          href={getPageUrl(i)}
          className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
            currentPage === i
              ? "bg-indigo-600 text-white focus-visible:outline-indigo-700 dark:bg-indigo-700 dark:focus-visible:outline-indigo-600"
              : "text-zinc-900 dark:text-zinc-100 ring-1 ring-inset ring-zinc-300 dark:ring-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 focus:outline-offset-0"
          }`}
        >
          {i}
        </Link>
      );
    }

    // Add ellipsis if needed
    if (currentPage < totalPages - 2) {
      pages.push(
        <span
          key="ellipsis-end"
          className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300"
        ></span>
      );
    }

    // Always show last page
    if (totalPages > 1) {
      pages.push(
        <Link
          key="last"
          href={getPageUrl(totalPages)}
          className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
            currentPage === totalPages
              ? "bg-indigo-600 text-white focus-visible:outline-indigo-700 dark:bg-indigo-700 dark:focus-visible:outline-indigo-600"
              : "text-zinc-900 dark:text-zinc-100 ring-1 ring-inset ring-zinc-300 dark:ring-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 focus:outline-offset-0"
          }`}
        >
          {totalPages}
        </Link>
      );
    }

    return pages;
  };

  return (
    <nav className="flex items-center justify-center border-t border-zinc-200 dark:border-zinc-700 px-4 sm:px-0">
      <div className="flex w-0 flex-1 justify-start">
        {currentPage > 1 && (
          <Link
            href={getPageUrl(currentPage - 1)}
            className="inline-flex items-center border-t-2 border-transparent pr-1 pt-4 text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            <ChevronLeft
              className="mr-3 h-5 w-5 text-zinc-400 dark:text-zinc-500"
              aria-hidden="true"
            />
            {t("Previous")}
          </Link>
        )}
      </div>
      <div className="hidden md:flex">
        <div className="isolate inline-flex -space-x-px rounded-md shadow-sm dark:shadow-zinc-800/50">
          {renderPageLinks()}
        </div>
      </div>
      <div className="flex w-0 flex-1 justify-end">
        {currentPage < totalPages && (
          <Link
            href={getPageUrl(currentPage + 1)}
            className="inline-flex items-center border-t-2 border-transparent pl-1 pt-4 text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            {t("Next")}
            <ChevronRight
              className="ml-3 h-5 w-5 text-zinc-400 dark:text-zinc-500"
              aria-hidden="true"
            />
          </Link>
        )}
      </div>
    </nav>
  );
}
