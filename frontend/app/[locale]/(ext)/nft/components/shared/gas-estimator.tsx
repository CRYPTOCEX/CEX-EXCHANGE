"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, TrendingDown, Minus, AlertTriangle } from "lucide-react";
import { $fetch } from "@/lib/api";
import { Loadable } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";
import {
  ChainIcon,
  CurrencyIcon,
  chainDisplayName,
  chainNativeCurrency,
} from "@/app/[locale]/(ext)/nft/components/shared/chain-icon";

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

      const { data, error: fetchError } = await $fetch({
        url: "/api/nft/gas/estimate",
        method: "POST",
        body: requestBody,
        silentSuccess: true,
      });

      // $fetch resolves {data,error} rather than throwing. Without this the
      // null `data` below only blew up on `data.gasEstimate`, so the user was
      // shown a TypeError instead of why the estimate failed.
      if (fetchError || !data) {
        setError(
          typeof fetchError === "string" && fetchError
            ? fetchError
            : t("failed_to_estimate_gas")
        );
        return;
      }

      setEstimate(data);
      // Use ref to avoid dependency issues
      onEstimateUpdateRef.current?.(data.gasEstimate);
    } catch (err: any) {
      setError(err.message || t("failed_to_estimate_gas"));
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
      case "LOW": return "text-success";
      case "MEDIUM": return "text-warning";
      case "HIGH": return "text-warning";
      case "VERY_HIGH": return "text-destructive";
      default: return "text-muted-foreground";
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

  /*
    THE SPINNER CARD THAT USED TO BE HERE
    =====================================
    `if (loading && !estimate) return <Card><CardContent className="p-6">
    <Loader2 spin/> Estimating gas costs…</CardContent></Card>` — the same
    `<Card>` shell, but holding one centred line instead of the estimator's real
    body. That is roughly 76px against the ~210px the resolved card occupies
    (header, cost row, and the details block when `showDetails` is on), so this
    component grew by about 130px when the RPC answered.

    It sits directly above the mint/deploy button on both the create-NFT form
    and the deploy-collection modal, so those 130px arrive under the pointer at
    exactly the moment the user is reaching for the primary action.

    The card's frame, its title, the operation/chain caption, the "Estimated
    cost"/"USD"/"Gas limit" labels and the chain and currency icons are all
    knowable without the estimate. Only four figures are not.
  */
  if (error) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center text-destructive">
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

  /**
   * No estimate AND nothing coming — there is genuinely nothing to show, so
   * this component takes up no space at all, exactly as before.
   *
   * The pair of conditions is the whole point: `!currentEstimate` alone was
   * also true while the very first request was in flight, which is what made
   * the spinner card above necessary in the first place.
   */
  if (!currentEstimate && !loading) return null;

  /** First estimate not back yet. The card renders; the four figures wait. */
  const isPending = !currentEstimate;

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
        <CardDescription className="flex items-center gap-1.5">
          {formatOperation(operation)} on
          <ChainIcon chain={chain} size={14} />
          {chainDisplayName(chain)}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Main cost display */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div>
              <div className="text-sm text-muted-foreground">{t("estimated_cost")}</div>
              {/* Gas is paid in the chain's NATIVE coin — BNB on BSC, ETH on
                  Base — not in a token named after the chain. */}
              <div className="font-semibold flex items-center gap-1.5">
                {/* The currency icon comes from `chain`, a prop — it is known
                    before the estimate and stays put; only the amount waits. */}
                <CurrencyIcon currency={chainNativeCurrency(chain)} size={16} />
                <Loadable loading={isPending} placeholder="0.000000">
                  {currentEstimate ? `${parseFloat(currentEstimate.gasEstimate.gasCostEth).toFixed(6)} ${chainNativeCurrency(chain)}` : null}
                </Loadable>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">USD</div>
              <div className="font-semibold text-success">
                <Loadable loading={isPending} placeholder="$0.00">
                  {currentEstimate ? `$${currentEstimate.gasEstimate.gasCostUsd}` : null}
                </Loadable>
              </div>
            </div>
          </div>

          {/* Details */}
          {showDetails && (
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("gas_limit")}</span>
                <span>
                  <Loadable loading={isPending} placeholder="123,456">
                    {currentEstimate ? parseInt(currentEstimate.gasEstimate.gasLimit || "0").toLocaleString() : null}
                  </Loadable>
                </span>
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