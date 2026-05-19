"use client";

import React, { memo, useMemo, useRef, useEffect, useState } from "react";
import { cn } from "../../utils/cn";

interface DepthChartProps {
  bids: [number, number][];
  asks: [number, number][];
  className?: string;
}

export const DepthChart = memo(function DepthChart({ bids, asks, className }: DepthChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    price: number;
    volume: number;
    side: "bid" | "ask";
  } | null>(null);

  // Calculate cumulative data for depth chart
  const depthData = useMemo(() => {
    if (!bids.length && !asks.length) {
      return { bidData: [], askData: [], maxCumulative: 0, minPrice: 0, maxPrice: 0 };
    }

    let bidCumulative = 0;
    const bidData = bids
      .map(([price, amount]) => {
        bidCumulative += amount;
        return { price, cumulative: bidCumulative };
      })
      .reverse();

    let askCumulative = 0;
    const askData = asks.map(([price, amount]) => {
      askCumulative += amount;
      return { price, cumulative: askCumulative };
    });

    const minPrice = bidData[0]?.price || 0;
    const maxPrice = askData[askData.length - 1]?.price || 0;
    const maxCumulative = Math.max(bidCumulative, askCumulative);

    return { bidData, askData, maxCumulative, minPrice, maxPrice };
  }, [bids, asks]);

  // Draw depth chart
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const { bidData, askData, maxCumulative, minPrice, maxPrice } = depthData;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    if (!bidData.length && !askData.length) {
      // Draw "No data" message
      ctx.fillStyle = "#525252";
      ctx.font = "12px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("No order book data", width / 2, height / 2);
      return;
    }

    const priceRange = maxPrice - minPrice;
    if (priceRange === 0) return;

    // Helper to convert price to X coordinate
    const priceToX = (price: number) => {
      return ((price - minPrice) / priceRange) * width;
    };

    // Helper to convert cumulative to Y coordinate
    const cumulativeToY = (cumulative: number) => {
      if (maxCumulative === 0) return height;
      return height - (cumulative / maxCumulative) * height * 0.85 - 10;
    };

    // Draw grid lines
    ctx.strokeStyle = "#1f1f1f";
    ctx.lineWidth = 1;

    // Horizontal grid lines
    for (let i = 0; i <= 4; i++) {
      const y = (height / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Mid price line
    const midPrice = (minPrice + maxPrice) / 2;
    const midX = priceToX(midPrice);
    ctx.beginPath();
    ctx.moveTo(midX, 0);
    ctx.lineTo(midX, height);
    ctx.strokeStyle = "#404040";
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw bid area (green)
    if (bidData.length > 0) {
      ctx.beginPath();
      ctx.moveTo(0, height);

      bidData.forEach(({ price, cumulative }) => {
        const x = priceToX(price);
        const y = cumulativeToY(cumulative);
        ctx.lineTo(x, y);
      });

      ctx.lineTo(priceToX(bidData[bidData.length - 1]?.price || midPrice), height);
      ctx.closePath();

      const bidGradient = ctx.createLinearGradient(0, 0, 0, height);
      bidGradient.addColorStop(0, "rgba(34, 197, 94, 0.4)");
      bidGradient.addColorStop(1, "rgba(34, 197, 94, 0.05)");
      ctx.fillStyle = bidGradient;
      ctx.fill();

      // Draw bid line
      ctx.beginPath();
      bidData.forEach(({ price, cumulative }, i) => {
        const x = priceToX(price);
        const y = cumulativeToY(cumulative);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = "#22c55e";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Draw ask area (red)
    if (askData.length > 0) {
      ctx.beginPath();
      ctx.moveTo(priceToX(askData[0]?.price || midPrice), height);

      askData.forEach(({ price, cumulative }) => {
        const x = priceToX(price);
        const y = cumulativeToY(cumulative);
        ctx.lineTo(x, y);
      });

      ctx.lineTo(width, height);
      ctx.closePath();

      const askGradient = ctx.createLinearGradient(0, 0, 0, height);
      askGradient.addColorStop(0, "rgba(239, 68, 68, 0.4)");
      askGradient.addColorStop(1, "rgba(239, 68, 68, 0.05)");
      ctx.fillStyle = askGradient;
      ctx.fill();

      // Draw ask line
      ctx.beginPath();
      askData.forEach(({ price, cumulative }, i) => {
        const x = priceToX(price);
        const y = cumulativeToY(cumulative);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Draw price labels
    ctx.font = "10px JetBrains Mono, monospace";
    ctx.fillStyle = "#525252";
    ctx.textAlign = "left";
    ctx.fillText(formatPrice(minPrice), 4, height - 4);
    ctx.textAlign = "right";
    ctx.fillText(formatPrice(maxPrice), width - 4, height - 4);
    ctx.textAlign = "center";
    ctx.fillText(formatPrice(midPrice), width / 2, height - 4);
  }, [depthData]);

  // Handle mouse move for tooltip
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const { bidData, askData, minPrice, maxPrice } = depthData;

    if (!bidData.length && !askData.length) return;

    const priceRange = maxPrice - minPrice;
    if (priceRange === 0) return;

    const price = minPrice + (x / rect.width) * priceRange;
    const midPrice = (minPrice + maxPrice) / 2;

    let volume = 0;
    const side: "bid" | "ask" = price < midPrice ? "bid" : "ask";

    if (price < midPrice) {
      // Find cumulative volume at this price in bids
      const bidPoint = bidData.find((b) => b.price <= price);
      volume = bidPoint?.cumulative || 0;
    } else {
      // Find cumulative volume at this price in asks
      const askPoint = askData.find((a) => a.price >= price);
      volume = askPoint?.cumulative || 0;
    }

    setTooltip({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      price,
      volume,
      side,
    });
  };

  const handleMouseLeave = () => {
    setTooltip(null);
  };

  return (
    <div ref={containerRef} className={cn("tp-depth-chart relative w-full h-full bg-[var(--tp-bg-primary)]", className)}>
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />

      {/* Tooltip */}
      {tooltip && (
        <div
          className={cn(
            "absolute z-10",
            "px-2 py-1",
            "bg-[var(--tp-bg-elevated)]",
            "border border-[var(--tp-border)]",
            "rounded shadow-lg",
            "text-[10px] font-mono",
            "pointer-events-none"
          )}
          style={{
            left: Math.min(tooltip.x + 10, containerRef.current!.clientWidth - 100),
            top: Math.max(tooltip.y - 40, 0),
          }}
        >
          <div className={cn(tooltip.side === "bid" ? "text-[var(--tp-green)]" : "text-[var(--tp-red)]")}>
            {formatPrice(tooltip.price)}
          </div>
          <div className="text-[var(--tp-text-muted)]">Vol: {formatVolume(tooltip.volume)}</div>
        </div>
      )}
    </div>
  );
});

function formatPrice(price: number): string {
  if (price >= 1000) return price.toFixed(2);
  if (price >= 1) return price.toFixed(4);
  return price.toFixed(8);
}

function formatVolume(volume: number): string {
  if (volume >= 1000000) return `${(volume / 1000000).toFixed(2)}M`;
  if (volume >= 1000) return `${(volume / 1000).toFixed(2)}K`;
  return volume.toFixed(4);
}

export default DepthChart;
