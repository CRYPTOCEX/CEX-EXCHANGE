"use client";

/**
 * Equity Curve Component
 *
 * Visual representation of balance over time with drawdown visualization.
 */

import { memo, useMemo, useRef, useEffect, useState } from "react";
import type { EquityPoint } from "./trading-analytics";
import { useTranslations } from "next-intl";

// ============================================================================
// TYPES
// ============================================================================

interface EquityCurveProps {
  data: EquityPoint[];
  startingBalance: number;
  currency?: string;
  theme?: "dark" | "light";
  height?: number;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatDate(date: Date): string {
  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const EquityCurve = memo(function EquityCurve({
  data,
  startingBalance,
  currency = "USDT",
  theme = "dark",
  height = 300,
}: EquityCurveProps) {
  const t = useTranslations("binary_components");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height });
  const [hoveredPoint, setHoveredPoint] = useState<EquityPoint | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Theme colors
  const colors = useMemo(
    () => ({
      bg: theme === "dark" ? "#18181b" : "#ffffff",
      grid: theme === "dark" ? "#27272a" : "#e4e4e7",
      text: theme === "dark" ? "#a1a1aa" : "#71717a",
      line: "#22c55e",
      lineNegative: "#ef4444",
      fill: theme === "dark" ? "rgba(34, 197, 94, 0.1)" : "rgba(34, 197, 94, 0.15)",
      fillNegative: theme === "dark" ? "rgba(239, 68, 68, 0.1)" : "rgba(239, 68, 68, 0.15)",
      drawdown: "rgba(239, 68, 68, 0.3)",
      baseline: theme === "dark" ? "#3f3f46" : "#d4d4d8",
    }),
    [theme]
  );

  // Calculate chart bounds
  const chartBounds = useMemo(() => {
    if (data.length === 0) {
      return {
        minBalance: startingBalance * 0.9,
        maxBalance: startingBalance * 1.1,
        minTime: Date.now() - 86400000,
        maxTime: Date.now(),
      };
    }

    const balances = data.map(d => d.balance);
    const times = data.map(d => d.time.getTime());

    const minBalance = Math.min(...balances) * 0.95;
    const maxBalance = Math.max(...balances) * 1.05;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    return { minBalance, maxBalance, minTime, maxTime };
  }, [data, startingBalance]);

  // Handle resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry) {
        setDimensions({
          width: entry.contentRect.width,
          height,
        });
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [height]);

  // Draw chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const { width, height: h } = dimensions;

    // Set canvas size with DPR
    canvas.width = width * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${h}px`;
    ctx.scale(dpr, dpr);

    // Chart padding
    const padding = { top: 20, right: 20, bottom: 40, left: 70 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = h - padding.top - padding.bottom;

    // Clear canvas
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, width, h);

    // Helper functions
    const scaleX = (time: number) => {
      const range = chartBounds.maxTime - chartBounds.minTime || 1;
      return padding.left + ((time - chartBounds.minTime) / range) * chartWidth;
    };

    const scaleY = (balance: number) => {
      const range = chartBounds.maxBalance - chartBounds.minBalance || 1;
      return padding.top + chartHeight - ((balance - chartBounds.minBalance) / range) * chartHeight;
    };

    // Draw grid
    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 1;

    // Horizontal grid lines
    const numYLines = 5;
    for (let i = 0; i <= numYLines; i++) {
      const y = padding.top + (chartHeight / numYLines) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      // Y-axis labels
      const balance = chartBounds.maxBalance - ((chartBounds.maxBalance - chartBounds.minBalance) / numYLines) * i;
      ctx.fillStyle = colors.text;
      ctx.font = "11px sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(balance.toFixed(0), padding.left - 8, y + 4);
    }

    // Starting balance line
    const baselineY = scaleY(startingBalance);
    ctx.strokeStyle = colors.baseline;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(padding.left, baselineY);
    ctx.lineTo(width - padding.right, baselineY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw equity curve
    if (data.length > 1) {
      // Calculate if overall is profitable
      const finalBalance = data[data.length - 1].balance;
      const isProfitable = finalBalance >= startingBalance;

      // Draw filled area
      ctx.beginPath();
      ctx.moveTo(scaleX(data[0].time.getTime()), scaleY(startingBalance));
      data.forEach((point, i) => {
        const x = scaleX(point.time.getTime());
        const y = scaleY(point.balance);
        if (i === 0) {
          ctx.lineTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.lineTo(scaleX(data[data.length - 1].time.getTime()), scaleY(startingBalance));
      ctx.closePath();
      ctx.fillStyle = isProfitable ? colors.fill : colors.fillNegative;
      ctx.fill();

      // Draw line
      ctx.beginPath();
      data.forEach((point, i) => {
        const x = scaleX(point.time.getTime());
        const y = scaleY(point.balance);
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.strokeStyle = isProfitable ? colors.line : colors.lineNegative;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw points
      data.forEach((point) => {
        const x = scaleX(point.time.getTime());
        const y = scaleY(point.balance);

        // Only draw point if it's a trade
        if (point.trade) {
          const isWin = point.trade.status === "WIN";
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, Math.PI * 2);
          ctx.fillStyle = isWin ? colors.line : colors.lineNegative;
          ctx.fill();
        }
      });
    }

    // Draw X-axis labels
    ctx.fillStyle = colors.text;
    ctx.font = "11px sans-serif";
    ctx.textAlign = "center";

    const numXLabels = Math.min(5, data.length);
    for (let i = 0; i < numXLabels; i++) {
      const index = Math.floor((data.length - 1) * (i / (numXLabels - 1)));
      if (data[index]) {
        const x = scaleX(data[index].time.getTime());
        const label = formatDate(data[index].time);
        ctx.fillText(label, x, h - padding.bottom + 20);
      }
    }
  }, [data, dimensions, colors, chartBounds, startingBalance]);

  // Handle mouse move for tooltip
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setMousePos({ x: e.clientX, y: e.clientY });

    // Find closest point
    const padding = { left: 70 };
    const chartWidth = dimensions.width - padding.left - 20;

    const relX = x - padding.left;
    const progress = relX / chartWidth;
    const index = Math.round(progress * (data.length - 1));

    if (index >= 0 && index < data.length) {
      setHoveredPoint(data[index]);
    }
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
  };

  // Theme classes
  const bgClass = theme === "dark" ? "bg-zinc-900" : "bg-white";
  const borderClass = theme === "dark" ? "border-zinc-800" : "border-zinc-200";
  const subtitleClass = theme === "dark" ? "text-zinc-400" : "text-zinc-600";

  // Calculate summary stats
  const finalBalance = data.length > 0 ? data[data.length - 1].balance : startingBalance;
  const totalReturn = ((finalBalance - startingBalance) / startingBalance) * 100;
  const maxDrawdown = Math.max(...data.map(d => d.drawdownPercent));

  return (
    <div className={`${bgClass} border ${borderClass} rounded-lg p-6`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-sm font-medium ${subtitleClass} uppercase tracking-wide`}>
          {t("equity_curve")}
        </h3>
        <div className="flex items-center gap-4 text-xs">
          <span className={totalReturn >= 0 ? "text-green-500" : "text-red-500"}>
            {totalReturn >= 0 ? "+" : ""}{totalReturn.toFixed(2)}% return
          </span>
          <span className="text-orange-500">
            -{maxDrawdown.toFixed(1)}% max drawdown
          </span>
        </div>
      </div>

      <div ref={containerRef} className="relative">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="cursor-crosshair"
        />

        {/* Tooltip */}
        {hoveredPoint && (
          <div
            className={`fixed z-50 ${bgClass} border ${borderClass} rounded-lg p-3 shadow-lg pointer-events-none`}
            style={{
              left: mousePos.x + 10,
              top: mousePos.y - 60,
              transform: "translateX(0)",
            }}
          >
            <div className={`text-xs ${subtitleClass}`}>
              {formatDate(hoveredPoint.time)} {formatTime(hoveredPoint.time)}
            </div>
            <div className={`text-sm font-semibold ${theme === "dark" ? "text-white" : "text-zinc-900"}`}>
              {hoveredPoint.balance.toFixed(2)} {currency}
            </div>
            {hoveredPoint.trade && (
              <div className={`text-xs mt-1 ${
                hoveredPoint.trade.status === "WIN" ? "text-green-500" : "text-red-500"
              }`}>
                {hoveredPoint.trade.status}: {hoveredPoint.trade.profit?.toFixed(2) || 0} {currency}
              </div>
            )}
            {hoveredPoint.drawdownPercent > 0 && (
              <div className="text-xs text-orange-500">
                {t("drawdown")}{hoveredPoint.drawdownPercent.toFixed(1)}%
              </div>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-zinc-800/50">
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-green-500" />
          <span className={`text-xs ${subtitleClass}`}>Balance</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 border-t-2 border-dashed border-zinc-600" />
          <span className={`text-xs ${subtitleClass}`}>Starting ({startingBalance.toFixed(0)} {currency})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className={`text-xs ${subtitleClass}`}>Win</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span className={`text-xs ${subtitleClass}`}>Loss</span>
        </div>
      </div>
    </div>
  );
});

export default EquityCurve;
