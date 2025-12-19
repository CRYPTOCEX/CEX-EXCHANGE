"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, TrendingDown, Minus, AlertTriangle } from "lucide-react";
import { $fetch } from "@/lib/api";
import { useTranslations } from "next-intl";

interface GasEstimate {
  gasLimit: string;
  gasPrice: string;
  gasCostWei: string;
  gasCostEth: string;
  gasCostUsd: string;
}

interface GasEstimateResponse {
  operation: string;
  chain: string;
  gasEstimate: GasEstimate;
  breakdown: {
    baseGas: string;
    adjustmentFactor: number;
    networkCongestion: string;
  };
  timestamp: string;
}

interface GasPricesResponse {
  chain: string;
  currentGasPrice: {
    wei: string;
    gwei: string;
    eth: string;
  };
  networkCongestion: string;
  standardOperations: {
    [key: string]: {
      gasLimit: string;
      gasCostWei: string;
      gasCostEth: string;
      gasCostUsd: string;
    };
  };
  timestamp: string;
}

interface GasEstimatorProps {
  operation: string;
  chain?: string;
  contractAddress?: string;
  tokenId?: string;
  amount?: string;
  recipientAddress?: string;
  onEstimateUpdate?: (estimate: GasEstimate) => void;
  showDetails?: boolean;
}

export function GasEstimator({
  operation,
  chain = "ETH",
  contractAddress,
  tokenId,
  amount,
  recipientAddress,
  onEstimateUpdate,
  showDetails = true
}: GasEstimatorProps) {
  const t = useTranslations("ext_nft");
  const [estimate, setEstimate] = useState<GasEstimateResponse | null>(null);
  const [gasPrices, setGasPrices] = useState<GasPricesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use ref to avoid recreating callback on every render
  const onEstimateUpdateRef = useRef(onEstimateUpdate);
  useEffect(() => {
    onEstimateUpdateRef.current = onEstimateUpdate;
  }, [onEstimateUpdate]);

  const fetchGasPrices = useCallback(async () => {
    try {
      const { data } = await $fetch({
        url: `/api/nft/gas/estimate?chain=${chain}`,
        method: "GET",
        silentSuccess: true,
      });
      setGasPrices(data);
    } catch (err: any) {
      console.error("Failed to fetch gas prices:", err);
    }
  }, [chain]);

  const fetchGasEstimate = useCallback(async () => {
    if (!operation) return;

    setLoading(true);
    setError(null);

    try {
      const requestBody: any = {
        operation,
        chain,
      };

      if (contractAddress) requestBody.contractAddress = contractAddress;
      if (tokenId) requestBody.tokenId = tokenId;
      if (amount) requestBody.amount = amount;
      if (recipientAddress) requestBody.recipientAddress = recipientAddress;

      const { data } = await $fetch({
        url: "/api/nft/gas/estimate",
        method: "POST",
        body: requestBody,
        silentSuccess: true,
      });

      setEstimate(data);
      // Use ref to avoid dependency issues
      onEstimateUpdateRef.current?.(data.gasEstimate);
    } catch (err: any) {
      setError(err.message || "Failed to estimate gas");
    } finally {
      setLoading(false);
    }
  }, [operation, chain, contractAddress, tokenId, amount, recipientAddress]);

  // Fetch gas prices on mount and periodically
  useEffect(() => {
    fetchGasPrices();
    const interval = setInterval(fetchGasPrices, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [fetchGasPrices]);

  // Fetch specific estimate when parameters change
  useEffect(() => {
    fetchGasEstimate();
  }, [fetchGasEstimate]);

  const getCongestionColor = (congestion: string) => {
    switch (congestion) {
      case "LOW": return "text-green-600";
      case "MEDIUM": return "text-yellow-600";
      case "HIGH": return "text-orange-600";
      case "VERY_HIGH": return "text-red-600";
      default: return "text-gray-600";
    }
  };

  const getCongestionIcon = (congestion: string) => {
    switch (congestion) {
      case "LOW": return <TrendingDown className="h-4 w-4" />;
      case "MEDIUM": return <Minus className="h-4 w-4" />;
      case "HIGH": return <TrendingUp className="h-4 w-4" />;
      case "VERY_HIGH": return <AlertTriangle className="h-4 w-4" />;
      default: return <Minus className="h-4 w-4" />;
    }
  };

  const formatOperation = (op: string) => {
    return op.charAt(0).toUpperCase() + op.slice(1).replace(/([A-Z])/g, ' $1');
  };

  if (loading && !estimate) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">{t("estimating_gas_costs_ellipsis")}</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center text-red-600">
            <AlertTriangle className="h-4 w-4 mr-2" />
            <span className="text-sm">{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentEstimate = estimate || (gasPrices?.standardOperations[operation] && gasPrices?.currentGasPrice ? {
    operation,
    chain,
    gasEstimate: {
      ...gasPrices.standardOperations[operation],
      gasPrice: gasPrices.currentGasPrice.wei
    },
    breakdown: {
      baseGas: gasPrices.standardOperations[operation].gasLimit,
      adjustmentFactor: 1.2,
      networkCongestion: gasPrices.networkCongestion
    },
    timestamp: gasPrices.timestamp
  } : null);

  if (!currentEstimate) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{t("gas_estimate")}</CardTitle>
          {gasPrices && (
            <div className="flex items-center space-x-2">
              <Badge 
                variant="outline" 
                className={`${getCongestionColor(gasPrices.networkCongestion)} border-current`}
              >
                <span className="mr-1">{getCongestionIcon(gasPrices.networkCongestion)}</span>
                {gasPrices.networkCongestion}
              </Badge>
            </div>
          )}
        </div>
        <CardDescription>
          {formatOperation(operation)} on {chain}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Main cost display */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div>
              <div className="text-sm text-muted-foreground">{t("estimated_cost")}</div>
              <div className="font-semibold">
                {parseFloat(currentEstimate.gasEstimate.gasCostEth).toFixed(6)} {chain}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">USD</div>
              <div className="font-semibold text-green-600">
                ${currentEstimate.gasEstimate.gasCostUsd}
              </div>
            </div>
          </div>

          {/* Details */}
          {showDetails && (
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("gas_limit")}</span>
                <span>{parseInt(currentEstimate.gasEstimate.gasLimit || "0").toLocaleString()}</span>
              </div>
              
              {gasPrices && gasPrices.currentGasPrice && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("gas_price")}</span>
                  <span>{parseFloat(gasPrices.currentGasPrice.gwei).toFixed(2)} gwei</span>
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                <span>{t("network_congestion_may_affect_actual_costs")}</span>
                {loading && <Loader2 className="h-3 w-3 animate-spin" />}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}