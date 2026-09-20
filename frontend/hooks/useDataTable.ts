"use client";

import { useState, useEffect, useCallback } from "react";
import $fetch from "@/lib/api";

interface UseDataTableProps {
  url: string;
  defaultFilters?: Record<string, any>;
  perPage?: number;
}

export function useDataTable({
  url,
  defaultFilters = {},
  perPage = 10,
}: UseDataTableProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(defaultFilters);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("perPage", perPage.toString());

      // Add filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== "" && value !== null && value !== undefined) {
          params.append(key, value.toString());
        }
      });

      const response = await $fetch({
        url: `${url}?${params.toString()}`,
        silent: true,
      });

      if (response.error) {
        console.error("Error fetching data:", response.error);
        setData([]);
        setTotal(0);
      } else {
        // Accept every envelope shape the backend actually returns.
        //
        // `{items, pagination}` is a real, common shape here (all three admin
        // trading-bot list routes use it) and was previously unwrapped by
        // NOTHING: `response.data?.data` missed, `response.data` matched the
        // envelope OBJECT, and DataTable then called `.map` on it —
        // "data.map is not a function" on page load. `Array.isArray` guards the
        // final assignment so a non-array envelope can never reach the table.
        const payload: any = response.data ?? null;
        const rows =
          payload?.data ?? payload?.items ?? (Array.isArray(payload) ? payload : []);
        setData(Array.isArray(rows) ? rows : []);
        setTotal(
          payload?.total ?? payload?.pagination?.total ?? payload?.pagination?.totalItems ?? 0
        );
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [url, page, perPage, filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  const totalPages = Math.ceil(total / perPage);

  const pagination = {
    page,
    perPage,
    total,
    totalPages,
    setPage,
  };

  return {
    data,
    loading,
    pagination,
    filters,
    setFilters,
    refetch,
  };
}
