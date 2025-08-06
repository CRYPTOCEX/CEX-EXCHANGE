"use client";

import { useState, useEffect, useCallback } from "react";
import { $fetch } from "@/lib/api";

interface GasEstimate {
  gasLimit: string;
  gasPrice: string;
  gasCostWei: string;
  gasCostEth: string;
  gasCostUsd: string;
}

interface GasEstimateParams {
  operation: string;
  chain?: string;
  contractAddress?: string;
  tokenId?: string;
  amount?: string;
  recipientAddress?: string;
}

interface UseGasEstimationReturn {
  estimate: GasEstimate | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  canAfford: (userBalance: string, bufferPercent?: number) => boolean;
}

export function useGasEstimation(params: GasEstimateParams): UseGasEstimationReturn {
  const [estimate, setEstimate] = useState<GasEstimate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEstimate = useCallback(async () => {
    if (!params.operation) return;

    setLoading(true);
    setError(null);

    try {
      const requestBody: any = {
        operation: params.operation,
        chain: params.chain || "ETH",
      };

      if (params.contractAddress) requestBody.contractAddress = params.contractAddress;
      if (params.tokenId) requestBody.tokenId = params.tokenId;
      if (params.amount) requestBody.amount = params.amount;
      if (params.recipientAddress) requestBody.recipientAddress = params.recipientAddress;

      const { data } = await $fetch({
        url: "/api/nft/gas/estimate",
        method: "POST",
        body: requestBody,
      });

      setEstimate(data.gasEstimate);
    } catch (err: any) {
      setError(err.message || "Failed to estimate gas");
      setEstimate(null);
    } finally {
      setLoading(false);
    }
  }, [params.operation, params.chain, params.contractAddress, params.tokenId, params.amount, params.recipientAddress]);

  useEffect(() => {
    fetchEstimate();
  }, [fetchEstimate]);

  const canAfford = useCallback((userBalance: string, bufferPercent: number = 10): boolean => {
    if (!estimate || !userBalance) return false;

    try {
      const balanceWei = BigInt(userBalance);
      const gasCostWei = BigInt(estimate.gasCostWei);
      
      // Add buffer for potential gas price fluctuations
      const bufferedCost = gasCostWei + (gasCostWei * BigInt(bufferPercent)) / BigInt(100);
      
      return balanceWei >= bufferedCost;
    } catch (error) {
      console.error("Error checking affordability:", error);
      return false;
    }
  }, [estimate]);

  return {
    estimate,
    loading,
    error,
    refetch: fetchEstimate,
    canAfford
  };
}

// Hook for getting current gas prices without specific operation
export function useGasPrices(chain: string = "ETH") {
  const [gasPrices, setGasPrices] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGasPrices = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data } = await $fetch({
        url: `/api/nft/gas/estimate?chain=${chain}`,
        method: "GET",
      });

      setGasPrices(data);
    } catch (err: any) {
      setError(err.message || "Failed to fetch gas prices");
      setGasPrices(null);
    } finally {
      setLoading(false);
    }
  }, [chain]);

  useEffect(() => {
    fetchGasPrices();
    
    // Update gas prices every 30 seconds
    const interval = setInterval(fetchGasPrices, 30000);
    return () => clearInterval(interval);
  }, [fetchGasPrices]);

  return {
    gasPrices,
    loading,
    error,
    refetch: fetchGasPrices,
    networkCongestion: gasPrices?.networkCongestion || 'UNKNOWN'
  };
}

// Utility function to format gas values
export const formatGasValue = {
  toGwei: (wei: string): string => {
    try {
      const weiValue = BigInt(wei);
      const gweiValue = Number(weiValue) / 1e9;
      return gweiValue.toFixed(2);
    } catch {
      return "0";
    }
  },
  
  toEth: (wei: string): string => {
    try {
      const weiValue = BigInt(wei);
      const ethValue = Number(weiValue) / 1e18;
      return ethValue.toFixed(6);
    } catch {
      return "0";
    }
  },
  
  toUsd: (eth: string, ethPrice: number = 2000): string => {
    try {
      const ethValue = parseFloat(eth);
      const usdValue = ethValue * ethPrice;
      return usdValue.toFixed(2);
    } catch {
      return "0";
    }
  }
};