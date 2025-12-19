"use client";

import { type JSX, useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useConfigStore } from "@/store/config";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";

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
  const t = useTranslations("common");
  const { settings } = useConfigStore();
  const [calculatedTotalPages, setCalculatedTotalPages] = useState(totalPages);

  useEffect(() => {
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
        className={`relative inline-flex items-center justify-center w-10 h-10 text-sm font-semibold rounded-xl transition-all duration-200 ${
          currentPage === 1
            ? "bg-linear-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25"
            : "text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 border border-zinc-200 dark:border-zinc-700"
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
          className="inline-flex items-center justify-center w-10 h-10 text-sm font-medium text-zinc-400 dark:text-zinc-500"
        >
          ...
        </span>
      );
    }

    // Add pages around current page
    for (
      let i = Math.max(2, currentPage - 1);
      i <= Math.min(totalPages - 1, currentPage + 1);
      i++
    ) {
      if (i === 1 || i === totalPages) continue;
      pages.push(
        <Link
          key={i}
          href={getPageUrl(i)}
          className={`relative inline-flex items-center justify-center w-10 h-10 text-sm font-semibold rounded-xl transition-all duration-200 ${
            currentPage === i
              ? "bg-linear-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25"
              : "text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 border border-zinc-200 dark:border-zinc-700"
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
          className="inline-flex items-center justify-center w-10 h-10 text-sm font-medium text-zinc-400 dark:text-zinc-500"
        >
          ...
        </span>
      );
    }

    // Always show last page
    if (totalPages > 1) {
      pages.push(
        <Link
          key="last"
          href={getPageUrl(totalPages)}
          className={`relative inline-flex items-center justify-center w-10 h-10 text-sm font-semibold rounded-xl transition-all duration-200 ${
            currentPage === totalPages
              ? "bg-linear-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25"
              : "text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 border border-zinc-200 dark:border-zinc-700"
          }`}
        >
          {totalPages}
        </Link>
      );
    }

    return pages;
  };

  return (
    <motion.nav
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="flex items-center justify-center pt-8"
    >
      <div className="flex items-center gap-2 p-2 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-lg">
        {/* Previous Button */}
        {currentPage > 1 && (
          <Link
            href={getPageUrl(currentPage - 1)}
            className="inline-flex items-center justify-center px-4 h-10 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-xl border border-zinc-200 dark:border-zinc-700 transition-all duration-200 group"
          >
            <ChevronLeft
              className="mr-1 h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5"
              aria-hidden="true"
            />
            {t('prev')}
          </Link>
        )}

        {/* Page Numbers - Hidden on mobile */}
        <div className="hidden md:flex items-center gap-1">
          {renderPageLinks()}
        </div>

        {/* Mobile Page Indicator */}
        <div className="flex md:hidden items-center px-4">
          <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            {currentPage} / {totalPages}
          </span>
        </div>

        {/* Next Button */}
        {currentPage < totalPages && (
          <Link
            href={getPageUrl(currentPage + 1)}
            className="inline-flex items-center justify-center px-4 h-10 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-xl border border-zinc-200 dark:border-zinc-700 transition-all duration-200 group"
          >
            {t("next")}
            <ChevronRight
              className="ml-1 h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
        )}
      </div>
    </motion.nav>
  );
}
