"use client";

import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Loadable, SkeletonText } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";

interface Column {
  key: string;
  label: string;
  render?: (row: any) => React.ReactNode;
}

interface EmptyState {
  icon: React.ReactNode;
  title: string;
  description: string;
}

interface Pagination {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
  setPage: (page: number) => void;
}

interface DataTableProps {
  columns: Column[];
  data: any[];
  loading?: boolean;
  pagination?: Pagination;
  emptyState?: EmptyState;
}

export function DataTable({
  columns,
  data,
  loading = false,
  pagination,
  emptyState,
}: DataTableProps) {
  const tCommon = useTranslations("common");
  /**
   * ONE TABLE, IN BOTH STATES.
   * ==========================================================================
   *
   * This used to be three unrelated trees selected by an early return: a
   * `<Card className="p-8">` holding a 32px spinner, a `<Card className="p-12">`
   * holding the empty state, and the table. So the loading card was 64px of
   * padding around a spinner — call it 96px — and it was replaced by a card
   * whose height is `(rows + 1) x row height`, several hundred pixels for any
   * real page, with everything below it moving by the difference.
   *
   * COLUMN HEADERS ARE KNOWABLE BEFORE THE FETCH. `columns` is a prop; the
   * caller has it at first render. Throwing them away meant even the width of
   * each column was re-decided when the data arrived, so the table did not just
   * grow downward — every cell moved sideways too.
   *
   * LOADING IS NOT EMPTY. The old order also made them the same thing on the way
   * in: a page whose first request is in flight has `data.length === 0`, and had
   * the spinner branch not caught it first it would have rendered "No data".
   * The empty state now waits for a resolved fetch, which is the only time it is
   * true.
   *
   * A list has no knowable length, so the pending body reserves the page size
   * (or five rows when the caller does not paginate) and accepts that the count
   * settles. That is reserving the CONTAINER, not predicting the content.
   */
  const pendingRowCount = pagination?.perPage ?? 5;
  const resolvedEmpty = !loading && (!data || data.length === 0);

  return (
    <div className="space-y-4">
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead key={column.key}>{column.label}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? Array.from({ length: pendingRowCount }).map((_, index) => (
                    <TableRow key={`pending-${index}`}>
                      {columns.map((column) => (
                        <TableCell key={column.key}>
                          {/* Measured by the cell's own type, so it tracks a
                              change to `TableCell`'s padding or font on its own. */}
                          <SkeletonText chars={10} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : data.map((row, index) => (
                    <TableRow key={row.id || index}>
                      {columns.map((column) => (
                        <TableCell key={column.key}>
                          {column.render ? column.render(row) : row[column.key]}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </div>

        {/* The empty state keeps the header row above it rather than replacing
            the whole card, so "which columns is this table about" survives
            having no rows to put in them. */}
        {resolvedEmpty ? (
          <div className="flex flex-col items-center justify-center text-center space-y-4 p-12">
            {emptyState?.icon}
            <div>
              <h3 className="text-lg font-semibold">{emptyState?.title || tCommon("no_data")}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {emptyState?.description || tCommon("no_data_available")}
              </p>
            </div>
          </div>
        ) : null}
      </Card>

      {/* Rendered while pending too: `totalPages` is 0 until the fetch answers,
          so gating on it alone made the whole 36px pager appear from nowhere on
          every page that turned out to have more than one page of results. */}
      {pagination && (loading || pagination.totalPages > 1) && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(pagination.page - 1) * pagination.perPage + 1} to{" "}
            <Loadable loading={loading} chars={2}>
              {Math.min(pagination.page * pagination.perPage, pagination.total)}
            </Loadable>{" "}
            of{" "}
            <Loadable loading={loading} chars={3}>
              {pagination.total}
            </Loadable>{" "}
            results
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.setPage(pagination.page - 1)}
              disabled={pagination.page <= 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            {/* `page` is the caller's own state and is known now; only the
                total is the server's answer. */}
            <span className="text-sm">
              Page {pagination.page} of{" "}
              <Loadable loading={loading} chars={2}>
                {pagination.totalPages}
              </Loadable>
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.setPage(pagination.page + 1)}
              disabled={loading || pagination.page >= pagination.totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
