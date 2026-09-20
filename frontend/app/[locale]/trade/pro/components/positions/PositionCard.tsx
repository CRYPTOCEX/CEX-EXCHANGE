"use client";

import React, { memo, useState } from "react";
import { cn } from "../../utils/cn";
import { PositionPnL } from "./PositionPnL";
import { PositionControls } from "./PositionControls";
import { useTranslations } from "next-intl";

export interface Position {
  id: string;
  symbol: string;
  /** Display vocabulary. Never send this back — see `wireSide`. */
  side: "LONG" | "SHORT";
  /**
   * The side as the futures API stated it. Carried because the close route
   * resolves the row by (symbol, userId, side) with a CQL equality on the stored
   * BUY/SELL value: `side` alone used to be sent, matched nothing, and every
   * close from this panel came back 404.
   */
  wireSide: "BUY" | "SELL";
  size: number;
  entryPrice: number;
  markPrice: number;
  liquidationPrice: number;
  unrealizedPnl: number;
  realizedPnl: number;
  margin: number;
  leverage: number;
  stopLoss?: number;
  takeProfit?: number;
}

interface PositionCardProps {
  position: Position;
  onClose: () => void;
  onSetTpSl?: (tp?: number, sl?: number) => void;
  onAddMargin?: (amount: number) => void;
}

export const PositionCard = memo(function PositionCard({
  position,
  onClose,
  onSetTpSl,
  onAddMargin,
}: PositionCardProps) {
  const t = useTranslations("trade_pro");
  const tCommon = useTranslations("common");
  const tTrade = useTranslations("trade");
  const [isExpanded, setIsExpanded] = useState(false);
  const isLong = position.side === "LONG";
  const roe = position.margin > 0 ? (position.unrealizedPnl / position.margin) * 100 : 0;

  // Calculate distance to liquidation
  const distanceToLiq = isLong
    ? ((position.markPrice - position.liquidationPrice) / position.markPrice) * 100
    : ((position.liquidationPrice - position.markPrice) / position.markPrice) * 100;

  return (
    <div
      className={cn(
        "tp-position-card",
        "bg-[var(--tp-bg-tertiary)]",
        "rounded-lg",
        "border",
        isLong ? "border-[var(--tp-green)]/20" : "border-[var(--tp-red)]/20"
      )}
    >
      {/* Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between px-3 py-2 cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "px-1.5 py-0.5 text-[10px] font-semibold rounded",
              isLong
                ? "bg-[var(--tp-green)]/20 text-[var(--tp-green)]"
                : "bg-[var(--tp-red)]/20 text-[var(--tp-red)]"
            )}
          >
            {position.side} {position.leverage}x
          </span>
          <span className="text-sm font-medium text-[var(--tp-text-primary)]">
            {position.symbol}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <PositionPnL pnl={position.unrealizedPnl} roe={roe} />
          <svg
            className={cn(
              "w-4 h-4 text-[var(--tp-text-muted)] transition-transform",
              isExpanded && "rotate-180"
            )}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </div>

      {/* Details (expanded) */}
      {isExpanded && (
        <div className="px-3 pb-3 border-t border-[var(--tp-border)]/50">
          <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
            <div className="flex justify-between">
              <span className="text-[var(--tp-text-muted)]">Size</span>
              <span className="text-[var(--tp-text-secondary)] font-mono">
                {position.size.toFixed(4)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--tp-text-muted)]">Entry</span>
              <span className="text-[var(--tp-text-secondary)] font-mono">
                {position.entryPrice.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--tp-text-muted)]">Mark</span>
              <span className="text-[var(--tp-text-secondary)] font-mono">
                {position.markPrice.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--tp-text-muted)]">{tTrade("liq_price")}</span>
              <span className="text-[var(--tp-orange)] font-mono">
                {position.liquidationPrice.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--tp-text-muted)]">Margin</span>
              <span className="text-[var(--tp-text-secondary)] font-mono">
                {position.margin.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--tp-text-muted)]">{tCommon("distance_to_liq")}</span>
              <span
                className={cn(
                  "font-mono",
                  distanceToLiq > 20
                    ? "text-[var(--tp-green)]"
                    : distanceToLiq > 10
                    ? "text-[var(--tp-yellow)]"
                    : "text-[var(--tp-red)]"
                )}
              >
                {distanceToLiq.toFixed(2)}%
              </span>
            </div>
          </div>

          {/* Controls */}
          <PositionControls
            position={position}
            onClose={onClose}
            onSetTpSl={onSetTpSl}
            onAddMargin={onAddMargin}
          />
        </div>
      )}
    </div>
  );
});

export default PositionCard;
