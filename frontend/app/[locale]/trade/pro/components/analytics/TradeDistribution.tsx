"use client";

import React, { memo, useMemo } from "react";
import { cn } from "../../utils/cn";

interface PairVolume {
  pair: string;
  volume: number;
  trades: number;
  pnl: number;
}

interface TradeDistributionProps {
  data: PairVolume[];
  className?: string;
}

export const TradeDistribution = memo(function TradeDistribution({
  data,
  className,
}: TradeDistributionProps) {
  const maxVolume = useMemo(() => Math.max(...data.map((d) => d.volume)), [data]);
  const totalVolume = useMemo(() => data.reduce((sum, d) => sum + d.volume, 0), [data]);
  const totalTrades = useMemo(() => data.reduce((sum, d) => sum + d.trades, 0), [data]);
  const totalPnL = useMemo(() => data.reduce((sum, d) => sum + d.pnl, 0), [data]);

  return (
    <div
      className={cn(
        "bg-[var(--tp-bg-tertiary)] rounded-lg p-4",
        className
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-[var(--tp-text-primary)]">
          Trade Distribution
        </h3>
        <span className="text-xs text-[var(--tp-text-muted)]">
          By trading pair
        </span>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-3 gap-2 mb-4 p-2 bg-[var(--tp-bg-secondary)] rounded-lg">
        <div className="text-center">
          <div className="text-[10px] text-[var(--tp-text-muted)]">Total Volume</div>
          <div className="text-sm font-mono text-[var(--tp-text-primary)]">
            ${(totalVolume / 1000).toFixed(1)}K
          </div>
        </div>
        <div className="text-center">
          <div className="text-[10px] text-[var(--tp-text-muted)]">Trades</div>
          <div className="text-sm font-mono text-[var(--tp-text-primary)]">
            {totalTrades}
          </div>
        </div>
        <div className="text-center">
          <div className="text-[10px] text-[var(--tp-text-muted)]">Total P&L</div>
          <div
            className={cn(
              "text-sm font-mono",
              totalPnL >= 0 ? "text-[var(--tp-green)]" : "text-[var(--tp-red)]"
            )}
          >
            {totalPnL >= 0 ? "+" : ""}${totalPnL.toFixed(0)}
          </div>
        </div>
      </div>

      {/* Distribution Bars */}
      <div className="space-y-3">
        {data.map((item) => {
          const volumePercent = (item.volume / maxVolume) * 100;
          const sharePercent = (item.volume / totalVolume) * 100;

          return (
            <div key={item.pair} className="group">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-[var(--tp-text-primary)]">
                    {item.pair}
                  </span>
                  <span className="text-[10px] text-[var(--tp-text-muted)]">
                    {sharePercent.toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-[var(--tp-text-muted)]">
                    {item.trades} trades
                  </span>
                  <span
                    className={cn(
                      "text-xs font-mono",
                      item.pnl >= 0 ? "text-[var(--tp-green)]" : "text-[var(--tp-red)]"
                    )}
                  >
                    {item.pnl >= 0 ? "+" : ""}${item.pnl.toFixed(0)}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="h-2 bg-[var(--tp-bg-secondary)] rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    item.pnl >= 0 ? "bg-[var(--tp-green)]" : "bg-[var(--tp-red)]"
                  )}
                  style={{ width: `${volumePercent}%` }}
                />
              </div>

              {/* Volume Label */}
              <div className="text-[10px] text-[var(--tp-text-muted)] mt-0.5">
                ${item.volume.toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-4 mt-4 pt-3 border-t border-[var(--tp-border)]">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[var(--tp-green)]" />
          <span className="text-[10px] text-[var(--tp-text-muted)]">Profitable</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[var(--tp-red)]" />
          <span className="text-[10px] text-[var(--tp-text-muted)]">Loss</span>
        </div>
      </div>
    </div>
  );
});

export default TradeDistribution;
