"use client";

import React, { memo, useRef, useEffect, useState, useCallback } from "react";
import { cn } from "../../utils/cn";

interface PnLDataPoint {
  timestamp: number;
  pnl: number;
  cumulative: number;
}

interface PnLChartProps {
  data: PnLDataPoint[];
  timeRange: string;
  className?: string;
}

type ChartMode = "cumulative" | "daily";

export const PnLChart = memo(function PnLChart({
  data,
  timeRange,
  className,
}: PnLChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    data: PnLDataPoint;
  } | null>(null);
  const [chartMode, setChartMode] = useState<ChartMode>("cumulative");

  // Handle resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Draw chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || dimensions.width === 0 || data.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    ctx.scale(dpr, dpr);

    const padding = { top: 20, right: 20, bottom: 30, left: 60 };
    const chartWidth = dimensions.width - padding.left - padding.right;
    const chartHeight = dimensions.height - padding.top - padding.bottom;

    // Clear canvas
    ctx.clearRect(0, 0, dimensions.width, dimensions.height);

    // Get values based on mode
    const values = data.map((d) =>
      chartMode === "cumulative" ? d.cumulative : d.pnl
    );
    const minValue = Math.min(...values, 0);
    const maxValue = Math.max(...values, 0);
    const valueRange = maxValue - minValue || 1;

    // Draw grid
    ctx.strokeStyle = getComputedStyle(document.documentElement)
      .getPropertyValue("--tp-border")
      .trim() || "rgba(255,255,255,0.1)";
    ctx.lineWidth = 0.5;

    // Horizontal grid lines
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
      const y = padding.top + (chartHeight / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartWidth, y);
      ctx.stroke();

      // Y-axis labels
      const value = maxValue - (valueRange / gridLines) * i;
      ctx.fillStyle = getComputedStyle(document.documentElement)
        .getPropertyValue("--tp-text-muted")
        .trim() || "rgba(255,255,255,0.5)";
      ctx.font = "10px monospace";
      ctx.textAlign = "right";
      ctx.fillText(
        `$${value >= 0 ? "+" : ""}${value.toFixed(0)}`,
        padding.left - 8,
        y + 3
      );
    }

    // Zero line
    const zeroY =
      padding.top + ((maxValue - 0) / valueRange) * chartHeight;
    if (zeroY > padding.top && zeroY < dimensions.height - padding.bottom) {
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(padding.left, zeroY);
      ctx.lineTo(padding.left + chartWidth, zeroY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw area fill
    const greenColor = getComputedStyle(document.documentElement)
      .getPropertyValue("--tp-green")
      .trim() || "#22c55e";
    const redColor = getComputedStyle(document.documentElement)
      .getPropertyValue("--tp-red")
      .trim() || "#ef4444";

    const points = data.map((d, i) => {
      const value = chartMode === "cumulative" ? d.cumulative : d.pnl;
      return {
        x: padding.left + (i / (data.length - 1)) * chartWidth,
        y: padding.top + ((maxValue - value) / valueRange) * chartHeight,
        value,
      };
    });

    // Gradient fill
    const lastValue = values[values.length - 1];
    const gradient = ctx.createLinearGradient(0, padding.top, 0, dimensions.height - padding.bottom);
    const color = lastValue >= 0 ? greenColor : redColor;
    gradient.addColorStop(0, `${color}40`);
    gradient.addColorStop(1, `${color}00`);

    ctx.beginPath();
    ctx.moveTo(points[0].x, zeroY);
    points.forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.lineTo(points[points.length - 1].x, zeroY);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw line
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();

    // X-axis labels
    const labelCount = Math.min(6, data.length);
    const labelStep = Math.floor(data.length / labelCount);
    ctx.fillStyle = getComputedStyle(document.documentElement)
      .getPropertyValue("--tp-text-muted")
      .trim() || "rgba(255,255,255,0.5)";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "center";

    for (let i = 0; i < data.length; i += labelStep) {
      const x = padding.left + (i / (data.length - 1)) * chartWidth;
      const date = new Date(data[i].timestamp);
      const label = formatDateLabel(date, timeRange);
      ctx.fillText(label, x, dimensions.height - 8);
    }
  }, [data, dimensions, chartMode, timeRange]);

  // Handle mouse move for tooltip
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas || data.length === 0) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const padding = { left: 60, right: 20 };
      const chartWidth = dimensions.width - padding.left - padding.right;

      const index = Math.round(
        ((x - padding.left) / chartWidth) * (data.length - 1)
      );
      if (index >= 0 && index < data.length) {
        setTooltip({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
          data: data[index],
        });
      }
    },
    [data, dimensions.width]
  );

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  return (
    <div
      className={cn(
        "bg-[var(--tp-bg-tertiary)] rounded-lg p-4",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-medium text-[var(--tp-text-primary)]">
            P&L Over Time
          </h3>
          <p className="text-xs text-[var(--tp-text-muted)]">
            {chartMode === "cumulative" ? "Cumulative" : "Daily"} profit/loss
          </p>
        </div>
        <div className="flex gap-1 bg-[var(--tp-bg-secondary)] rounded p-0.5">
          {(["cumulative", "daily"] as ChartMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setChartMode(mode)}
              className={cn(
                "px-2 py-1 text-[10px] font-medium rounded transition-colors capitalize",
                chartMode === mode
                  ? "bg-[var(--tp-bg-elevated)] text-[var(--tp-text-primary)]"
                  : "text-[var(--tp-text-muted)] hover:text-[var(--tp-text-secondary)]"
              )}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div
        ref={containerRef}
        className="relative h-[200px]"
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ width: dimensions.width, height: dimensions.height }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        />

        {/* Tooltip */}
        {tooltip && (
          <div
            className="absolute pointer-events-none z-10 bg-[var(--tp-bg-elevated)] border border-[var(--tp-border)] rounded-lg px-3 py-2 shadow-lg"
            style={{
              left: tooltip.x + 10,
              top: tooltip.y - 60,
              transform: tooltip.x > dimensions.width - 150 ? "translateX(-120%)" : "none",
            }}
          >
            <div className="text-[10px] text-[var(--tp-text-muted)] mb-1">
              {new Date(tooltip.data.timestamp).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
            <div className="flex items-center gap-3">
              <div>
                <div className="text-[10px] text-[var(--tp-text-muted)]">Daily</div>
                <div
                  className={cn(
                    "text-xs font-mono font-medium",
                    tooltip.data.pnl >= 0
                      ? "text-[var(--tp-green)]"
                      : "text-[var(--tp-red)]"
                  )}
                >
                  {tooltip.data.pnl >= 0 ? "+" : ""}${tooltip.data.pnl.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[var(--tp-text-muted)]">Cumulative</div>
                <div
                  className={cn(
                    "text-xs font-mono font-medium",
                    tooltip.data.cumulative >= 0
                      ? "text-[var(--tp-green)]"
                      : "text-[var(--tp-red)]"
                  )}
                >
                  {tooltip.data.cumulative >= 0 ? "+" : ""}${tooltip.data.cumulative.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

function formatDateLabel(date: Date, range: string): string {
  switch (range) {
    case "1D":
      return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    case "1W":
      return date.toLocaleDateString("en-US", { weekday: "short" });
    case "1M":
    case "3M":
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    case "1Y":
    case "ALL":
      return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    default:
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
}

export default PnLChart;
