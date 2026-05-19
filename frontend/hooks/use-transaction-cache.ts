"use client";

import { useState, useCallback, useEffect } from "react";
import { $fetch } from "@/lib/api";
import { useLocalStorage } from "./use-local-storage";

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

interface Transaction {
  id: string;
  type: string;
  status: string;
  amount: number;
  fee: number;
  currency: string;
  walletType: string;
  timestamp: string;
  description: string;
  category?: string;
  tags?: string[];
  transactionHash?: string;
  fromAddress?: string;
  toAddress?: string;
  network?: string;
  confirmations?: number;
  requiredConfirmations?: number;
  metadata?: Record<string, any>;
}

interface TransactionCache {
  transactions: Transaction[];
  currencies: string[];
  popularTags: string[];
  lastUpdated: number;
  totalCount: number;
}

interface TransactionCacheOptions {
  ttl?: number;
}

interface TransactionFilters {
  type?: string;
  status?: string;
  category?: string;
  walletType?: string;
  currency?: string;
  search?: string;
  tags?: string[];
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export function useTransactionCache(options: TransactionCacheOptions = {}) {
  const ttl = options.ttl || CACHE_TTL;

  // State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentFilters, setCurrentFilters] = useState<TransactionFilters>({});

  // Use local storage for persistent cache
  const [cache, setCache] = useLocalStorage<TransactionCache>(
    "transaction-cache",
    {
      transactions: [],
      currencies: [],
      popularTags: [],
      lastUpdated: 0,
      totalCount: 0,
    }
  );

  // Extract values from cache
  const { transactions, currencies, popularTags, lastUpdated, totalCount } =
    cache;

  // Check if cache is expired
  const isCacheExpired = useCallback(() => {
    return Date.now() - lastUpdated > ttl;
  }, [lastUpdated, ttl]);

  // Update the cache
  const updateCache = useCallback(
    (newData: Partial<TransactionCache>) => {
      setCache((prevCache) => ({
        ...prevCache,
        ...newData,
        lastUpdated: Date.now(),
      }));
    },
    [setCache]
  );

  // Clear the cache
  const clearCache = useCallback(() => {
    setCache({
      transactions: [],
      currencies: [],
      popularTags: [],
      lastUpdated: 0,
      totalCount: 0,
    });
  }, [setCache]);

  // Fetch transactions from API
  const fetchTransactions = useCallback(
    async (filters: TransactionFilters = {}, reset = false) => {
      setLoading(true);
      setError(null);
      setCurrentFilters(filters);

      try {
        // Build query params
        const params: Record<string, any> = {
          ...filters,
        };

        // Fetch data from API
        const { data, error } = await $fetch({
          url: "/api/finance/history",
          params,
          silent: true,
        });

        if (error) {
          setError(error);
          return;
        }

        if (!data) {
          setError("Failed to fetch transactions");
          return;
        }

        // Update cache
        updateCache({
          transactions: reset ? data.data : [...transactions, ...data.data],
          totalCount: data.pagination.total,
          currencies: Array.isArray(data.currencies)
            ? data.currencies
            : currencies,
          popularTags: Array.isArray(data.popularTags)
            ? data.popularTags
            : popularTags,
        });
      } catch (err) {
        console.error("Error fetching transactions:", err);
        setError("An unexpected error occurred");
      } finally {
        setLoading(false);
      }
    },
    [updateCache, transactions, currencies, popularTags]
  );

  // Update transaction category
  const updateTransactionCategory = useCallback(
    (id: string, category: string) => {
      setCache((prevCache) => {
        const updatedTransactions = prevCache.transactions.map((tx) => {
          if (tx.id === id) {
            return { ...tx, category };
          }
          return tx;
        });

        return {
          ...prevCache,
          transactions: updatedTransactions,
          lastUpdated: Date.now(),
        };
      });

      // In a real application, we would also update the server
      // This is a mock implementation
      setTimeout(() => {
        console.log(`Updated transaction ${id} category to ${category}`);
      }, 500);
    },
    [setCache]
  );

  // Update transaction tags
  const updateTransactionTags = useCallback(
    (id: string, tags: string[]) => {
      setCache((prevCache) => {
        const updatedTransactions = prevCache.transactions.map((tx) => {
          if (tx.id === id) {
            return { ...tx, tags };
          }
          return tx;
        });

        // Update popular tags
        const tagCounts = new Map<string, number>();

        // Count occurrences of each tag
        updatedTransactions.forEach((tx) => {
          (tx.tags || []).forEach((tag) => {
            tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
          });
        });

        // Sort tags by count and take top 10
        const sortedTags = Array.from(tagCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([tag]) => tag);

        return {
          ...prevCache,
          transactions: updatedTransactions,
          popularTags: sortedTags,
          lastUpdated: Date.now(),
        };
      });

      // In a real application, we would also update the server
      // This is a mock implementation
      setTimeout(() => {
        console.log(`Updated transaction ${id} tags to ${tags.join(", ")}`);
      }, 500);
    },
    [setCache]
  );

  // Set transactions directly (useful for tests or direct updates)
  const setTransactions = useCallback(
    (newTransactions: Transaction[]) => {
      updateCache({ transactions: newTransactions });
    },
    [updateCache]
  );

  // Initialize cache if expired or empty
  useEffect(() => {
    if (transactions.length === 0 || isCacheExpired()) {
      fetchTransactions();
    }
  }, [transactions.length, isCacheExpired, fetchTransactions]);

  return {
    transactions,
    totalCount,
    currencies,
    popularTags,
    loading,
    error,
    fetchTransactions,
    clearCache,
    updateTransactionCategory,
    updateTransactionTags,
    setTransactions,
  };
}
