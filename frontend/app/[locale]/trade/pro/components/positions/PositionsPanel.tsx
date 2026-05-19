"use client";

import React, { memo, useState, useEffect, useCallback, useMemo } from "react";
import { cn } from "../../utils/cn";
import { PositionCard, type Position } from "./PositionCard";
import { ClosePositionModal } from "./ClosePositionModal";
import { EmptyState } from "../orders/EmptyState";

interface PositionsPanelProps {
  symbol: string;
  className?: string;
}

export const PositionsPanel = memo(function PositionsPanel({
  symbol,
  className,
}: PositionsPanelProps) {
  const [positions, setPositions] = useState<Position[]>([]);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "current">("all");

  // Generate mock data for demo
  useEffect(() => {
    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      const mockPositions: Position[] = [
        {
          id: "pos1",
          symbol: "BTC/USDT",
          side: "LONG",
          size: 0.1,
          entryPrice: 42500,
          markPrice: 43250,
          liquidationPrice: 38000,
          unrealizedPnl: 75,
          realizedPnl: 0,
          margin: 425,
          leverage: 10,
          takeProfit: 45000,
          stopLoss: 41000,
        },
        {
          id: "pos2",
          symbol: "ETH/USDT",
          side: "SHORT",
          size: 2,
          entryPrice: 2350,
          markPrice: 2285,
          liquidationPrice: 2800,
          unrealizedPnl: 130,
          realizedPnl: 45,
          margin: 235,
          leverage: 20,
        },
      ];

      setPositions(mockPositions);
      setIsLoading(false);
    }, 500);
  }, []);

  // Simulate real-time price updates
  useEffect(() => {
    if (positions.length === 0) return;

    const interval = setInterval(() => {
      setPositions((prev) =>
        prev.map((p) => {
          const variation = (Math.random() - 0.5) * 0.002;
          const newMarkPrice = p.markPrice * (1 + variation);
          const newPnl =
            p.side === "LONG"
              ? (newMarkPrice - p.entryPrice) * p.size
              : (p.entryPrice - newMarkPrice) * p.size;
          return {
            ...p,
            markPrice: newMarkPrice,
            unrealizedPnl: newPnl,
          };
        })
      );
    }, 2000);

    return () => clearInterval(interval);
  }, [positions.length]);

  // Filter positions
  const filteredPositions = useMemo(() => {
    if (filter === "current") {
      return positions.filter((p) => p.symbol === symbol);
    }
    return positions;
  }, [positions, filter, symbol]);

  // Calculate totals
  const totalUnrealizedPnl = positions.reduce((sum, p) => sum + p.unrealizedPnl, 0);
  const totalMargin = positions.reduce((sum, p) => sum + p.margin, 0);

  // Handle close position
  const handleClosePosition = useCallback((position: Position) => {
    setSelectedPosition(position);
    setShowCloseModal(true);
  }, []);

  // Handle confirm close
  const handleConfirmClose = useCallback(
    async (closeType: "market" | "limit", price?: number, amount?: number) => {
      if (!selectedPosition) return;

      // In real implementation, call API
      console.log("Closing position:", {
        positionId: selectedPosition.id,
        closeType,
        price,
        amount,
      });

      // Remove or update position
      if (amount && amount < selectedPosition.size) {
        // Partial close
        setPositions((prev) =>
          prev.map((p) =>
            p.id === selectedPosition.id
              ? { ...p, size: p.size - amount }
              : p
          )
        );
      } else {
        // Full close
        setPositions((prev) => prev.filter((p) => p.id !== selectedPosition.id));
      }
    },
    [selectedPosition]
  );

  // Handle set TP/SL
  const handleSetTpSl = useCallback(
    (positionId: string, tp?: number, sl?: number) => {
      setPositions((prev) =>
        prev.map((p) =>
          p.id === positionId ? { ...p, takeProfit: tp, stopLoss: sl } : p
        )
      );
    },
    []
  );

  if (isLoading) {
    return (
      <div className={cn("tp-positions-panel flex flex-col h-full bg-[var(--tp-bg-secondary)]", className)}>
        <div className="p-4 space-y-3">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-24 bg-[var(--tp-bg-tertiary)] rounded-lg animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("tp-positions-panel flex flex-col h-full bg-[var(--tp-bg-secondary)]", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--tp-border)]">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--tp-text-muted)]">
            {filteredPositions.length} Position{filteredPositions.length !== 1 ? "s" : ""}
          </span>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as "all" | "current")}
            className={cn(
              "px-2 py-1 text-[10px]",
              "bg-[var(--tp-bg-tertiary)]",
              "border border-[var(--tp-border)]",
              "rounded",
              "text-[var(--tp-text-secondary)]",
              "outline-none cursor-pointer"
            )}
          >
            <option value="all">All Positions</option>
            <option value="current">{symbol} Only</option>
          </select>
        </div>
        <div className="text-right">
          <div
            className={cn(
              "text-sm font-mono font-semibold",
              totalUnrealizedPnl >= 0 ? "text-[var(--tp-green)]" : "text-[var(--tp-red)]"
            )}
          >
            {totalUnrealizedPnl >= 0 ? "+" : ""}
            {totalUnrealizedPnl.toFixed(2)} USDT
          </div>
          <div className="text-[10px] text-[var(--tp-text-muted)]">
            Total Margin: {totalMargin.toFixed(2)} USDT
          </div>
        </div>
      </div>

      {/* Positions list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {filteredPositions.length === 0 ? (
          <EmptyState type="positions" />
        ) : (
          filteredPositions.map((position) => (
            <PositionCard
              key={position.id}
              position={position}
              onClose={() => handleClosePosition(position)}
              onSetTpSl={(tp, sl) => handleSetTpSl(position.id, tp, sl)}
            />
          ))
        )}
      </div>

      {/* Close modal */}
      {selectedPosition && (
        <ClosePositionModal
          isOpen={showCloseModal}
          onClose={() => setShowCloseModal(false)}
          position={selectedPosition}
          onConfirm={handleConfirmClose}
        />
      )}
    </div>
  );
});

export default PositionsPanel;
