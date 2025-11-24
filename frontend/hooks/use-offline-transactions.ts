"use client";

import { useState, useEffect, useCallback } from "react";
import {
  saveOfflineTransaction,
  getPendingTransactions,
  syncOfflineTransactions,
  isOnline,
  addOnlineListener,
  addOfflineListener,
  removeOnlineListener,
  removeOfflineListener,
} from "@/lib/offline-transaction-manager";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  currency: string;
  walletType: string;
  timestamp?: number;
  status?: string;
  metadata?: Record<string, any>;
}

export function useOfflineTransactions() {
  const [pendingTransactions, setPendingTransactions] = useState<Transaction[]>(
    []
  );
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Load pending transactions
  const loadPendingTransactions = useCallback(async () => {
    const transactions = await getPendingTransactions();
    setPendingTransactions(transactions);
  }, []);

  // Save a transaction for offline processing
  const saveTransaction = useCallback(
    async (transaction: Transaction) => {
      const transactionWithTimestamp = {
        ...transaction,
        timestamp: transaction.timestamp ?? Date.now(),
        status: transaction.status ?? "pending",
        metadata: transaction.metadata ?? {},
      };
      await saveOfflineTransaction(transactionWithTimestamp);
      await loadPendingTransactions();
    },
    [loadPendingTransactions]
  );

  // Sync transactions when online
  const syncTransactions = useCallback(async () => {
    if (!isOnline()) return;

    setSyncing(true);
    try {
      await syncOfflineTransactions();
      await loadPendingTransactions();
    } catch (error) {
      console.error("Error syncing transactions:", error);
    } finally {
      setSyncing(false);
    }
  }, [loadPendingTransactions]);

  // Handle online status change
  const handleOnline = useCallback(() => {
    setOnline(true);
    syncTransactions();
  }, [syncTransactions]);

  // Handle offline status change
  const handleOffline = useCallback(() => {
    setOnline(false);
  }, []);

  // Initialize
  useEffect(() => {
    setOnline(isOnline());
    loadPendingTransactions();

    // Add event listeners
    addOnlineListener(handleOnline);
    addOfflineListener(handleOffline);

    // Clean up
    return () => {
      removeOnlineListener(handleOnline);
      removeOfflineListener(handleOffline);
    };
  }, [handleOnline, handleOffline, loadPendingTransactions]);

  return {
    online,
    syncing,
    pendingTransactions,
    saveTransaction,
    syncTransactions,
    hasPendingTransactions: pendingTransactions.length > 0,
  };
}
