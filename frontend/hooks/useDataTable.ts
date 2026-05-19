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
        setData(response.data?.data || response.data || []);
        setTotal(response.data?.total || 0);
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
