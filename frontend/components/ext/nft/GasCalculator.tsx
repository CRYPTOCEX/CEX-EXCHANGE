"use client";

import React, { useState, useEffect } from "react";
import { Info, TrendingUp, TrendingDown, AlertCircle, Calculator, Fuel } from "lucide-react";
import { $fetch } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

interface GasCalculatorProps {
  transactionType: "mint" | "transfer" | "listing" | "purchase" | "cancel" | "bid";
  chain?: string;
  className?: string;
  showHistory?: boolean;
}

interface GasEstimate {
  slow: {
    gwei: number;
    time: string;
    usd: number;
  };
  standard: {
    gwei: number;
    time: string;
    usd: number;
  };
  fast: {
    gwei: number;
    time: string;
    usd: number;
  };
  baseFee?: number;
  priorityFee?: number;
}

interface GasExplanation {
  title: string;
  description: string;
  estimatedGas: number;
  factors: string[];
}

const gasExplanations: Record<string, GasExplanation> = {
  mint: {
    title: "Minting NFT",
    description: "Creating a new NFT on the blockchain",
    estimatedGas: 150000,
    factors: [
      "Creating new token on blockchain",
      "Storing metadata URI",
      "Updating collection state",
      "Emitting mint event"
    ]
  },
  transfer: {
    title: "Transferring NFT",
    description: "Sending NFT to another wallet",
    estimatedGas: 65000,
    factors: [
      "Updating token ownership",
      "Clearing approvals",
      "Emitting transfer event"
    ]
  },
  listing: {
    title: "Listing NFT",
    description: "Creating a marketplace listing",
    estimatedGas: 120000,
    factors: [
      "Approving marketplace contract",
      "Creating listing data",
      "Storing price and terms",
      "Emitting listing event"
    ]
  },
  purchase: {
    title: "Purchasing NFT",
    description: "Buying an NFT from marketplace",
    estimatedGas: 180000,
    factors: [
      "Transferring payment",
      "Transferring NFT ownership",
      "Paying royalties",
      "Updating marketplace state",
      "Emitting sale event"
    ]
  },
  cancel: {
    title: "Canceling Listing",
    description: "Removing NFT from marketplace",
    estimatedGas: 50000,
    factors: [
      "Removing listing data",
      "Revoking approvals",
      "Emitting cancellation event"
    ]
  },
  bid: {
    title: "Placing Bid",
    description: "Making an offer on an NFT",
    estimatedGas: 100000,
    factors: [
      "Locking bid amount",
      "Recording bid data",
      "Updating auction state",
      "Emitting bid event"
    ]
  }
};

export function GasCalculator({ 
  transactionType, 
  chain = "ETH",
  className = "",
  showHistory = false 
}: GasCalculatorProps) {
  const [gasEstimate, setGasEstimate] = useState<GasEstimate | null>(null);
  const [selectedSpeed, setSelectedSpeed] = useState<"slow" | "standard" | "fast">("standard");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [ethPrice, setEthPrice] = useState(0);
  const [historicalGas, setHistoricalGas] = useState<number[]>([]);

  useEffect(() => {
    fetchGasEstimate();
    const interval = setInterval(fetchGasEstimate, 15000); // Update every 15 seconds
    return () => clearInterval(interval);
  }, [transactionType, chain]);

  const fetchGasEstimate = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await $fetch(`/api/nft/gas/estimate`, {
        params: {
          chain,
          type: transactionType
        }
      });

      if (response.data) {
        setGasEstimate(response.data.estimate);
        setEthPrice(response.data.ethPrice || 0);
        
        if (response.data.history && showHistory) {
          setHistoricalGas(response.data.history);
        }
      }
    } catch (err: any) {
      setError("Failed to fetch gas estimate");
      // Use fallback estimates
      const fallbackEstimate = createFallbackEstimate();
      setGasEstimate(fallbackEstimate);
    } finally {
      setLoading(false);
    }
  };

  const createFallbackEstimate = (): GasEstimate => {
    const explanation = gasExplanations[transactionType];
    const baseGwei = 30;
    
    return {
      slow: {
        gwei: baseGwei * 0.8,
        time: "~10 min",
        usd: calculateUSD(baseGwei * 0.8, explanation.estimatedGas)
      },
      standard: {
        gwei: baseGwei,
        time: "~3 min",
        usd: calculateUSD(baseGwei, explanation.estimatedGas)
      },
      fast: {
        gwei: baseGwei * 1.5,
        time: "~30 sec",
        usd: calculateUSD(baseGwei * 1.5, explanation.estimatedGas)
      },
      baseFee: baseGwei * 0.7,
      priorityFee: baseGwei * 0.3
    };
  };

  const calculateUSD = (gwei: number, gasLimit: number): number => {
    const ethInGwei = gasLimit * gwei;
    const ethAmount = ethInGwei / 1e9;
    return ethAmount * (ethPrice || 2000); // Fallback to $2000 if price not available
  };

  const explanation = gasExplanations[transactionType];
  const currentEstimate = gasEstimate?.[selectedSpeed];

  if (loading && !gasEstimate) {
    return (
      <div className={`bg-gray-50 dark:bg-gray-800 rounded-lg p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2"></div>
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-800 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-blue-200 dark:border-blue-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Fuel className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="font-semibold">Gas Fee Estimate</h3>
          </div>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            {showDetails ? "Hide" : "Show"} Details
          </button>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {explanation.title} - {explanation.description}
        </p>
      </div>

      {/* Speed Selection */}
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-3 gap-2">
          {(["slow", "standard", "fast"] as const).map((speed) => {
            const estimate = gasEstimate?.[speed];
            const isSelected = selectedSpeed === speed;
            
            return (
              <button
                key={speed}
                onClick={() => setSelectedSpeed(speed)}
                className={`p-3 rounded-lg border transition-all ${
                  isSelected
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30"
                    : "border-gray-200 dark:border-gray-700 hover:border-blue-300"
                }`}
              >
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  {speed === "slow" && "🐢 Slow"}
                  {speed === "standard" && "⚡ Standard"}
                  {speed === "fast" && "🚀 Fast"}
                </div>
                <div className="font-semibold">
                  {estimate?.gwei.toFixed(1)} Gwei
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {estimate?.time}
                </div>
                <div className="text-sm font-medium text-blue-600 dark:text-blue-400 mt-1">
                  ${estimate?.usd.toFixed(2)}
                </div>
              </button>
            );
          })}
        </div>

        {/* Current Selection Summary */}
        {currentEstimate && (
          <div className="bg-white dark:bg-gray-900 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Estimated Cost
                </div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  ${currentEstimate.usd.toFixed(2)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Gas Price
                </div>
                <div className="font-semibold">
                  {currentEstimate.gwei.toFixed(1)} Gwei
                </div>
                <div className="text-xs text-gray-500">
                  {currentEstimate.time}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* EIP-1559 Breakdown */}
        {gasEstimate?.baseFee && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Calculator className="w-4 h-4" />
              Gas Price Breakdown
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Base Fee:</span>
                <span>{gasEstimate.baseFee.toFixed(1)} Gwei</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Priority Fee:</span>
                <span>{gasEstimate.priorityFee?.toFixed(1) || "0"} Gwei</span>
              </div>
              <div className="flex justify-between font-medium pt-1 border-t border-gray-200 dark:border-gray-700">
                <span>Total:</span>
                <span>{currentEstimate?.gwei.toFixed(1)} Gwei</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Detailed Explanation */}
      {showDetails && (
        <div className="p-4 border-t border-blue-200 dark:border-blue-800 space-y-3">
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Info className="w-4 h-4" />
              What is Gas?
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Gas is the fee you pay to execute transactions on the blockchain. 
              Think of it like shipping fees for sending a package - the busier 
              the network, the higher the cost.
            </p>
          </div>

          <div>
            <h4 className="font-medium mb-2">Why This Transaction Costs Gas:</h4>
            <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
              {explanation.factors.map((factor, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  <span>{factor}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-medium mb-2">Tips to Save on Gas:</h4>
            <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>Transaction during off-peak hours (weekends, early mornings)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>Use "Slow" speed if you're not in a hurry</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>Batch multiple transactions when possible</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>Consider Layer 2 solutions for lower fees</span>
              </li>
            </ul>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div className="text-sm">
                <strong>Note:</strong> Gas fees are paid to network validators, 
                not to this marketplace. Actual fees may vary based on network conditions.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Historical Gas Trend */}
      {showHistory && historicalGas.length > 0 && (
        <div className="p-4 border-t border-blue-200 dark:border-blue-800">
          <h4 className="font-medium mb-2">24h Gas Trend</h4>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              Average: {(historicalGas.reduce((a, b) => a + b, 0) / historicalGas.length).toFixed(1)} Gwei
            </span>
            <span className={`flex items-center gap-1 ${
              historicalGas[historicalGas.length - 1] > historicalGas[0]
                ? "text-red-500"
                : "text-green-500"
            }`}>
              {historicalGas[historicalGas.length - 1] > historicalGas[0] ? (
                <><TrendingUp className="w-4 h-4" /> Rising</>
              ) : (
                <><TrendingDown className="w-4 h-4" /> Falling</>
              )}
            </span>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800">
          <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </p>
        </div>
      )}
    </div>
  );
}