"use client";

import React, { memo, useMemo } from "react";
import { cn } from "../../utils/cn";
import { useExtensionStatus } from "../../providers/ExtensionStatusProvider";
import type { OrderType } from "./OrderTypeSelector";
import type { MarketType } from "../../types/common";

interface FeeEstimateProps {
  total: number;
  orderType: OrderType;
  marketType: MarketType;
}

// Default fee rates (these would come from settings/API in production)
const FEE_RATES = {
  spot: { maker: 0.001, taker: 0.001 },
  futures: { maker: 0.0002, taker: 0.0005 },
  eco: { maker: 0.001, taker: 0.001 },
};

export const FeeEstimate = memo(function FeeEstimate({
  total,
  orderType,
  marketType,
}: FeeEstimateProps) {
  const { settings: adminSettings } = useExtensionStatus();

  const feeRate = useMemo(() => {
    const rates = FEE_RATES[marketType] || FEE_RATES.spot;
    // Market orders are taker, limit orders can be maker
    return orderType === "market" ? rates.taker : rates.maker;
  }, [orderType, marketType]);

  const estimatedFee = useMemo(() => {
    return total * feeRate;
  }, [total, feeRate]);

  const feePercentage = (feeRate * 100).toFixed(3);

  // Respect admin setting for showing estimated fees
  if (!adminSettings.showEstimatedFees || total <= 0) return null;

  return (
    <div className="flex items-center justify-between text-[10px] text-[var(--tp-text-muted)] px-1">
      <span>
        Est. Fee ({feePercentage}%)
      </span>
      <span className="font-mono">
        ~{estimatedFee.toFixed(4)} USDT
      </span>
    </div>
  );
});

export default FeeEstimate;
