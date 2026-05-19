"use client";

import React, { memo } from "react";
import { cn } from "../../utils/cn";
import { TradeRow } from "./TradeRow";

interface Trade {
  id: string;
  price: number;
  amount: number;
  side: "buy" | "sell";
  timestamp: number;
}

interface TradesPanelProps {
  trades: Trade[];
  pricePrecision?: number;
  amountPrecision?: number;
  className?: string;
}

export const TradesPanel = memo(function TradesPanel({
  trades,
  pricePrecision = 2,
  amountPrecision = 4,
  className,
}: TradesPanelProps) {
  return (
    <div className={cn("tp-trades-panel h-full flex flex-col", className)}>
      {/* Header */}
      <div className="grid grid-cols-3 gap-2 px-2 py-1 text-[10px] text-[var(--tp-text-muted)] uppercase tracking-wide border-b border-[var(--tp-border)]">
        <span>Price</span>
        <span className="text-right">Amount</span>
        <span className="text-right">Time</span>
      </div>

      {/* Trades list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {trades.length === 0 ? (
          <div className="flex items-center justify-center h-full text-[var(--tp-text-muted)] text-xs">
            No recent trades
          </div>
        ) : (
          trades.map((trade, index) => (
            <TradeRow
              key={trade.id || `trade-${index}`}
              price={trade.price}
              amount={trade.amount}
              side={trade.side}
              timestamp={trade.timestamp}
              isNew={index < 3}
              pricePrecision={pricePrecision}
              amountPrecision={amountPrecision}
            />
          ))
        )}
      </div>
    </div>
  );
});

export default TradesPanel;
