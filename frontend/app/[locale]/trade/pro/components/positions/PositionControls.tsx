"use client";

import React, { memo, useState } from "react";
import { cn } from "../../utils/cn";

interface Position {
  id: string;
  symbol: string;
  side: "LONG" | "SHORT";
  size: number;
  entryPrice: number;
  markPrice: number;
  liquidationPrice: number;
  unrealizedPnl: number;
  margin: number;
  leverage: number;
  stopLoss?: number;
  takeProfit?: number;
}

interface PositionControlsProps {
  position: Position;
  onClose: () => void;
  onSetTpSl?: (tp?: number, sl?: number) => void;
  onAddMargin?: (amount: number) => void;
}

export const PositionControls = memo(function PositionControls({
  position,
  onClose,
  onSetTpSl,
  onAddMargin,
}: PositionControlsProps) {
  const [showTpSl, setShowTpSl] = useState(false);
  const [tp, setTp] = useState(position.takeProfit?.toString() || "");
  const [sl, setSl] = useState(position.stopLoss?.toString() || "");

  const handleSaveTpSl = () => {
    onSetTpSl?.(
      tp ? parseFloat(tp) : undefined,
      sl ? parseFloat(sl) : undefined
    );
    setShowTpSl(false);
  };

  return (
    <div className="mt-3 space-y-2">
      {/* TP/SL Display or Edit */}
      {showTpSl ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="text-[10px] text-[var(--tp-text-muted)]">Take Profit</label>
              <input
                type="text"
                value={tp}
                onChange={(e) => setTp(e.target.value)}
                placeholder="0.00"
                className={cn(
                  "w-full px-2 py-1 mt-0.5",
                  "text-xs font-mono",
                  "bg-[var(--tp-bg-elevated)]",
                  "border border-[var(--tp-green)]/30",
                  "rounded",
                  "outline-none focus:border-[var(--tp-green)]"
                )}
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-[var(--tp-text-muted)]">Stop Loss</label>
              <input
                type="text"
                value={sl}
                onChange={(e) => setSl(e.target.value)}
                placeholder="0.00"
                className={cn(
                  "w-full px-2 py-1 mt-0.5",
                  "text-xs font-mono",
                  "bg-[var(--tp-bg-elevated)]",
                  "border border-[var(--tp-red)]/30",
                  "rounded",
                  "outline-none focus:border-[var(--tp-red)]"
                )}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSaveTpSl}
              className="flex-1 py-1.5 text-xs font-medium bg-[var(--tp-blue)] text-white rounded hover:bg-[var(--tp-blue)]/80 transition-colors"
            >
              Save
            </button>
            <button
              onClick={() => setShowTpSl(false)}
              className="flex-1 py-1.5 text-xs font-medium bg-[var(--tp-bg-elevated)] text-[var(--tp-text-secondary)] rounded hover:bg-[var(--tp-bg-tertiary)] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* TP/SL Status */}
          {(position.takeProfit || position.stopLoss) && (
            <div className="flex items-center gap-3 text-[10px]">
              {position.takeProfit && (
                <span className="text-[var(--tp-green)]">
                  TP: {position.takeProfit.toFixed(2)}
                </span>
              )}
              {position.stopLoss && (
                <span className="text-[var(--tp-red)]">
                  SL: {position.stopLoss.toFixed(2)}
                </span>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowTpSl(true)}
              className={cn(
                "flex-1 py-1.5",
                "text-xs font-medium",
                "bg-[var(--tp-bg-elevated)]",
                "text-[var(--tp-text-secondary)]",
                "rounded",
                "hover:bg-[var(--tp-blue)]/10 hover:text-[var(--tp-blue)]",
                "transition-colors"
              )}
            >
              TP/SL
            </button>
            <button
              onClick={onClose}
              className={cn(
                "flex-1 py-1.5",
                "text-xs font-medium",
                "bg-[var(--tp-red)]/10",
                "text-[var(--tp-red)]",
                "rounded",
                "hover:bg-[var(--tp-red)]/20",
                "transition-colors"
              )}
            >
              Close
            </button>
          </div>
        </>
      )}
    </div>
  );
});

export default PositionControls;
