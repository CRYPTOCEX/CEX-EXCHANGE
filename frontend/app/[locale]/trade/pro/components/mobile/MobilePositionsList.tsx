"use client";

import React, { memo, useState } from "react";
import { cn } from "../../utils/cn";

interface Position {
  id: string;
  symbol: string;
  side: "long" | "short";
  size: number;
  entryPrice: number;
  markPrice: number;
  liquidationPrice?: number;
  leverage?: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  margin?: number;
}

interface MobilePositionsListProps {
  positions?: Position[];
  onClosePosition?: (positionId: string) => void;
  onAddMargin?: (positionId: string) => void;
  className?: string;
}

// Mock positions for demo
const MOCK_POSITIONS: Position[] = [
  {
    id: "pos1",
    symbol: "BTC/USDT",
    side: "long",
    size: 0.05,
    entryPrice: 42000,
    markPrice: 42500,
    liquidationPrice: 38000,
    leverage: 10,
    unrealizedPnL: 25,
    unrealizedPnLPercent: 1.19,
    margin: 210,
  },
  {
    id: "pos2",
    symbol: "ETH/USDT",
    side: "short",
    size: 0.5,
    entryPrice: 2300,
    markPrice: 2280,
    liquidationPrice: 2500,
    leverage: 5,
    unrealizedPnL: 10,
    unrealizedPnLPercent: 0.87,
    margin: 230,
  },
];

export const MobilePositionsList = memo(function MobilePositionsList({
  positions = MOCK_POSITIONS,
  onClosePosition,
  onAddMargin,
  className,
}: MobilePositionsListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const totalPnL = positions.reduce((sum, p) => sum + p.unrealizedPnL, 0);

  if (positions.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center h-full py-12", className)}>
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-[var(--tp-text-muted)]/50 mb-3"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18M9 21V9" />
        </svg>
        <p className="text-sm text-[var(--tp-text-muted)]">No open positions</p>
        <p className="text-xs text-[var(--tp-text-muted)]/70 mt-1">
          Your futures positions will appear here
        </p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full bg-[var(--tp-bg-secondary)]", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--tp-border)]">
        <span className="text-sm font-medium text-[var(--tp-text-primary)]">
          Positions ({positions.length})
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--tp-text-muted)]">Total P&L:</span>
          <span
            className={cn(
              "text-sm font-mono font-medium",
              totalPnL >= 0 ? "text-[var(--tp-green)]" : "text-[var(--tp-red)]"
            )}
          >
            {totalPnL >= 0 ? "+" : ""}${totalPnL.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Positions List */}
      <div className="flex-1 overflow-y-auto">
        {positions.map((position) => (
          <MobilePositionCard
            key={position.id}
            position={position}
            isExpanded={expandedId === position.id}
            onToggle={() => setExpandedId(expandedId === position.id ? null : position.id)}
            onClose={() => onClosePosition?.(position.id)}
            onAddMargin={() => onAddMargin?.(position.id)}
          />
        ))}
      </div>

      {/* Close All Button */}
      {positions.length > 1 && (
        <div className="p-3 border-t border-[var(--tp-border)]">
          <button
            className={cn(
              "w-full py-2.5 rounded-lg",
              "text-sm font-medium",
              "bg-[var(--tp-red)]/10 text-[var(--tp-red)]",
              "active:bg-[var(--tp-red)]/20"
            )}
          >
            Close All Positions
          </button>
        </div>
      )}
    </div>
  );
});

interface MobilePositionCardProps {
  position: Position;
  isExpanded: boolean;
  onToggle: () => void;
  onClose: () => void;
  onAddMargin: () => void;
}

const MobilePositionCard = memo(function MobilePositionCard({
  position,
  isExpanded,
  onToggle,
  onClose,
  onAddMargin,
}: MobilePositionCardProps) {
  const isProfit = position.unrealizedPnL >= 0;

  return (
    <div className="border-b border-[var(--tp-border)]">
      {/* Main Row */}
      <button
        onClick={onToggle}
        className="w-full px-3 py-3 active:bg-[var(--tp-bg-tertiary)]/50"
      >
        <div className="flex items-center justify-between">
          {/* Left: Symbol & Side */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[var(--tp-text-primary)]">
              {position.symbol}
            </span>
            <span
              className={cn(
                "px-1.5 py-0.5 text-[10px] font-medium rounded",
                position.side === "long"
                  ? "bg-[var(--tp-green)]/20 text-[var(--tp-green)]"
                  : "bg-[var(--tp-red)]/20 text-[var(--tp-red)]"
              )}
            >
              {position.side.toUpperCase()} {position.leverage}x
            </span>
          </div>

          {/* Right: PnL */}
          <div className="text-right">
            <div
              className={cn(
                "text-sm font-mono font-medium",
                isProfit ? "text-[var(--tp-green)]" : "text-[var(--tp-red)]"
              )}
            >
              {isProfit ? "+" : ""}${position.unrealizedPnL.toFixed(2)}
            </div>
            <div
              className={cn(
                "text-[10px] font-mono",
                isProfit ? "text-[var(--tp-green)]" : "text-[var(--tp-red)]"
              )}
            >
              ({isProfit ? "+" : ""}{position.unrealizedPnLPercent.toFixed(2)}%)
            </div>
          </div>
        </div>

        {/* Size & Entry */}
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-xs text-[var(--tp-text-muted)]">
            Size: {position.size} @ {position.entryPrice.toFixed(2)}
          </span>
          <span className="text-xs text-[var(--tp-text-muted)]">
            Mark: {position.markPrice.toFixed(2)}
          </span>
        </div>
      </button>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-3 bg-[var(--tp-bg-tertiary)]/30">
          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <div>
              <div className="text-[10px] text-[var(--tp-text-muted)]">Entry Price</div>
              <div className="text-xs font-mono text-[var(--tp-text-primary)]">
                ${position.entryPrice.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-[var(--tp-text-muted)]">Mark Price</div>
              <div className="text-xs font-mono text-[var(--tp-text-primary)]">
                ${position.markPrice.toFixed(2)}
              </div>
            </div>
            {position.liquidationPrice && (
              <div>
                <div className="text-[10px] text-[var(--tp-text-muted)]">Liq. Price</div>
                <div className="text-xs font-mono text-[var(--tp-red)]">
                  ${position.liquidationPrice.toFixed(2)}
                </div>
              </div>
            )}
            {position.margin && (
              <div>
                <div className="text-[10px] text-[var(--tp-text-muted)]">Margin</div>
                <div className="text-xs font-mono text-[var(--tp-text-primary)]">
                  ${position.margin.toFixed(2)}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={onAddMargin}
              className={cn(
                "flex-1 py-2 rounded-lg",
                "text-xs font-medium",
                "bg-[var(--tp-bg-elevated)] text-[var(--tp-text-secondary)]",
                "active:bg-[var(--tp-bg-tertiary)]"
              )}
            >
              Add Margin
            </button>
            <button
              onClick={onClose}
              className={cn(
                "flex-1 py-2 rounded-lg",
                "text-xs font-medium",
                "bg-[var(--tp-red)]/10 text-[var(--tp-red)]",
                "active:bg-[var(--tp-red)]/20"
              )}
            >
              Close Position
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

export default MobilePositionsList;
