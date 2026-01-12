"use client";

import React, { memo, useRef, useEffect, useState } from "react";
import { cn } from "../../utils/cn";

interface HourlyData {
  hour: number;
  trades: number;
  pnl: number;
}

interface VolumeStatsProps {
  hourlyData: HourlyData[];
  className?: string;
}

export const VolumeStats = memo(function VolumeStats({
  hourlyData,
  className,
}: VolumeStatsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [hoveredHour, setHoveredHour] = useState<number | null>(null);

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

  // Draw heatmap
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || dimensions.width === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    ctx.scale(dpr, dpr);

    const padding = { top: 10, right: 10, bottom: 25, left: 30 };
    const chartWidth = dimensions.width - padding.left - padding.right;
    const chartHeight = dimensions.height - padding.top - padding.bottom;

    ctx.clearRect(0, 0, dimensions.width, dimensions.height);

    const maxTrades = Math.max(...hourlyData.map((d) => d.trades));
    const barWidth = chartWidth / 24 - 2;

    const greenColor = getComputedStyle(document.documentElement)
      .getPropertyValue("--tp-green")
      .trim() || "#22c55e";
    const redColor = getComputedStyle(document.documentElement)
      .getPropertyValue("--tp-red")
      .trim() || "#ef4444";
    const mutedColor = getComputedStyle(document.documentElement)
      .getPropertyValue("--tp-text-muted")
      .trim() || "rgba(255,255,255,0.5)";

    // Draw bars
    hourlyData.forEach((data, i) => {
      const barHeight = (data.trades / maxTrades) * chartHeight;
      const x = padding.left + i * (chartWidth / 24) + 1;
      const y = padding.top + chartHeight - barHeight;

      // Bar
      const isHovered = hoveredHour === data.hour;
      ctx.fillStyle = data.pnl >= 0 ? greenColor : redColor;
      ctx.globalAlpha = isHovered ? 1 : 0.7;
      ctx.fillRect(x, y, barWidth, barHeight);
      ctx.globalAlpha = 1;

      // Hour label (every 4 hours)
      if (i % 4 === 0) {
        ctx.fillStyle = mutedColor;
        ctx.font = "10px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(
          `${data.hour.toString().padStart(2, "0")}:00`,
          x + barWidth / 2,
          dimensions.height - 5
        );
      }
    });

    // Y-axis labels
    ctx.fillStyle = mutedColor;
    ctx.font = "10px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`${maxTrades}`, padding.left - 5, padding.top + 10);
    ctx.fillText("0", padding.left - 5, padding.top + chartHeight);
  }, [hourlyData, dimensions, hoveredHour]);

  // Handle mouse move
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const padding = { left: 30, right: 10 };
    const chartWidth = dimensions.width - padding.left - padding.right;

    const hour = Math.floor(((x - padding.left) / chartWidth) * 24);
    if (hour >= 0 && hour < 24) {
      setHoveredHour(hour);
    } else {
      setHoveredHour(null);
    }
  };

  // Find best and worst hours
  const sortedByPnL = [...hourlyData].sort((a, b) => b.pnl - a.pnl);
  const bestHour = sortedByPnL[0];
  const worstHour = sortedByPnL[sortedByPnL.length - 1];

  const sortedByTrades = [...hourlyData].sort((a, b) => b.trades - a.trades);
  const mostActiveHour = sortedByTrades[0];

  return (
    <div
      className={cn(
        "bg-[var(--tp-bg-tertiary)] rounded-lg p-4",
        className
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-[var(--tp-text-primary)]">
          Trading Activity
        </h3>
        <span className="text-xs text-[var(--tp-text-muted)]">By hour (UTC)</span>
      </div>

      {/* Heatmap Chart */}
      <div
        ref={containerRef}
        className="relative h-[120px] mb-4"
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-crosshair"
          style={{ width: dimensions.width, height: dimensions.height }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredHour(null)}
        />

        {/* Tooltip */}
        {hoveredHour !== null && (
          <div
            className="absolute top-0 bg-[var(--tp-bg-elevated)] border border-[var(--tp-border)] rounded px-2 py-1 shadow-lg pointer-events-none z-10"
            style={{
              left: `${30 + (hoveredHour / 24) * (dimensions.width - 40)}px`,
              transform: "translateX(-50%)",
            }}
          >
            <div className="text-[10px] text-[var(--tp-text-muted)]">
              {hoveredHour.toString().padStart(2, "0")}:00 - {(hoveredHour + 1).toString().padStart(2, "0")}:00
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--tp-text-primary)]">
                {hourlyData[hoveredHour].trades} trades
              </span>
              <span
                className={cn(
                  "text-xs font-mono",
                  hourlyData[hoveredHour].pnl >= 0
                    ? "text-[var(--tp-green)]"
                    : "text-[var(--tp-red)]"
                )}
              >
                {hourlyData[hoveredHour].pnl >= 0 ? "+" : ""}
                ${hourlyData[hoveredHour].pnl.toFixed(0)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Insights */}
      <div className="space-y-2">
        <div className="flex items-center justify-between p-2 bg-[var(--tp-bg-secondary)] rounded">
          <div className="flex items-center gap-2">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-[var(--tp-green)]"
            >
              <path d="M12 8v4l3 3" />
              <circle cx="12" cy="12" r="10" />
            </svg>
            <span className="text-xs text-[var(--tp-text-secondary)]">Best Hour</span>
          </div>
          <div className="text-right">
            <span className="text-xs font-medium text-[var(--tp-text-primary)]">
              {bestHour.hour.toString().padStart(2, "0")}:00
            </span>
            <span className="text-[10px] text-[var(--tp-green)] ml-2">
              +${bestHour.pnl.toFixed(0)}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between p-2 bg-[var(--tp-bg-secondary)] rounded">
          <div className="flex items-center gap-2">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-[var(--tp-red)]"
            >
              <path d="M12 8v4l3 3" />
              <circle cx="12" cy="12" r="10" />
            </svg>
            <span className="text-xs text-[var(--tp-text-secondary)]">Worst Hour</span>
          </div>
          <div className="text-right">
            <span className="text-xs font-medium text-[var(--tp-text-primary)]">
              {worstHour.hour.toString().padStart(2, "0")}:00
            </span>
            <span className="text-[10px] text-[var(--tp-red)] ml-2">
              ${worstHour.pnl.toFixed(0)}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between p-2 bg-[var(--tp-bg-secondary)] rounded">
          <div className="flex items-center gap-2">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-[var(--tp-blue)]"
            >
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
            <span className="text-xs text-[var(--tp-text-secondary)]">Most Active</span>
          </div>
          <div className="text-right">
            <span className="text-xs font-medium text-[var(--tp-text-primary)]">
              {mostActiveHour.hour.toString().padStart(2, "0")}:00
            </span>
            <span className="text-[10px] text-[var(--tp-text-muted)] ml-2">
              {mostActiveHour.trades} trades
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

export default VolumeStats;
