"use client";

import { useCallback, useEffect, useState } from "react";
import { $fetch } from "@/lib/api";

/**
 * Reads one of the two append-only audit tables, scoped to a single record.
 *
 * Deliberately NOT `DataTable`. `useTableStore` is a single global zustand store
 * persisted under one key (`store/index.ts:237`), so two DataTables mounted at
 * the same time overwrite each other's filters, columns and endpoint — the six
 * tables already on the user record page only coexist because Radix unmounts
 * inactive `TabsContent`. A record panel shows two ledgers side by side, which
 * that store cannot express. It is also the wrong shape: an embedded panel does
 * not want a hero, a toolbar, view modes or create/edit affordances.
 *
 * Both endpoints take `crudParameters`, so the filter is a JSON-encoded `filter`
 * query param and paging is `page` / `perPage`. Rows accumulate: an audit trail
 * is read as a continuous history, not flipped through a page at a time.
 *
 * EVERY VALUE IS SENT IN THE `{value, operator}` ENVELOPE the table store uses.
 * A bare scalar is not a shorthand for it: the backend routed anything that was
 * not an envelope down the association-alias path, where a key like `targetId`
 * matched nothing and the filter was dropped without a word — so the record
 * Audit tabs listed the whole platform's audit trail and every customer's
 * ledger. `getFiltered` no longer drops them, and stating the operator here
 * still earns its place: the table store's default for a bare scalar is
 * `contains`, i.e. `LIKE %id%`, and an id is `equal` or it is nothing.
 */

export interface AuditFeedState<T> {
  rows: T[];
  isLoading: boolean;
  /** Set when the endpoint refused — most often a missing permission. */
  error: string | null;
  hasMore: boolean;
  total: number;
  loadMore: () => void;
  reload: () => void;
}

export function useAuditFeed<T = any>({
  endpoint,
  filter,
  perPage = 10,
  enabled = true,
}: {
  endpoint: string;
  /** e.g. `{ targetId: userId }`. The hook no-ops while every value is falsy. */
  filter: Record<string, string | undefined | null>;
  perPage?: number;
  enabled?: boolean;
}): AuditFeedState<T> {
  const [rows, setRows] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Serialised so the effect depends on the VALUES, not on a fresh object
  // identity every render — which would refetch forever.
  const activeFilter = Object.fromEntries(
    Object.entries(filter)
      .filter(([, v]) => Boolean(v))
      .map(([k, v]) => [k, { value: v, operator: "equal" }])
  );
  const filterKey = JSON.stringify(activeFilter);
  const canFetch = enabled && Object.keys(activeFilter).length > 0;

  const fetchPage = useCallback(
    async (targetPage: number, replace: boolean) => {
      if (!canFetch) return;
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set("page", String(targetPage));
      params.set("perPage", String(perPage));
      params.set("filter", filterKey);

      const { data, error: err } = await $fetch({
        url: `${endpoint}?${params.toString()}`,
        silent: true,
      });

      if (err) {
        setError(err);
        setIsLoading(false);
        return;
      }

      const items: T[] = Array.isArray(data?.items) ? data.items : [];
      setRows((prev) => (replace ? items : [...prev, ...items]));
      setTotal(data?.pagination?.totalItems ?? items.length);
      setIsLoading(false);
    },
    [endpoint, filterKey, perPage, canFetch]
  );

  useEffect(() => {
    if (!canFetch) {
      setRows([]);
      setTotal(0);
      return;
    }
    setPage(1);
    void fetchPage(1, true);
  }, [fetchPage, canFetch]);

  const loadMore = useCallback(() => {
    const next = page + 1;
    setPage(next);
    void fetchPage(next, false);
  }, [page, fetchPage]);

  const reload = useCallback(() => {
    setPage(1);
    void fetchPage(1, true);
  }, [fetchPage]);

  return {
    rows,
    isLoading,
    error,
    hasMore: rows.length < total,
    total,
    loadMore,
    reload,
  };
}
