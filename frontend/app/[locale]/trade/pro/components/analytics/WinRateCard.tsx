"use client";

import React, { memo, useRef, useEffect, useState } from "react";
import { cn } from "../../utils/cn";

interface TradeStats {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  avgWin: number;
  avgLoss: number;
  largestWin: number;
  largestLoss: number;
}

interface WinRateCardProps {
  stats: TradeStats;
  className?: string;
}

export const WinRateCard = memo(function WinRateCard({
  stats,
  className,
}: WinRateCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const winRate = (stats.winningTrades / stats.totalTrades) * 100;

  // Draw donut chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = 120;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const centerX = size / 2;
    const centerY = size / 2;
    const radius = 45;
    const lineWidth = 12;

    const greenColor = getComputedStyle(document.documentElement)
      .getPropertyValue("--tp-green")
      .trim() || "#22c55e";
    const redColor = getComputedStyle(document.documentElement)
      .getPropertyValue("--tp-red")
      .trim() || "#ef4444";

    // Animation
    let animationProgress = 0;
    const animate = () => {
      ctx.clearRect(0, 0, size, size);

      // Background arc (losses)
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.strokeStyle = redColor + "40";
      ctx.lineWidth = lineWidth;
      ctx.lineCap = "round";
      ctx.stroke();

      // Win arc
      const winAngle = (winRate / 100) * Math.PI * 2 * animationProgress;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, -Math.PI / 2, -Math.PI / 2 + winAngle);
      ctx.strokeStyle = greenColor;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = "round";
      ctx.stroke();

      if (animationProgress < 1) {
        animationProgress += 0.03;
        requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
      }
    };

    setIsAnimating(true);
    animate();
  }, [winRate]);

  return (
    <div
      className={cn(
        "bg-[var(--tp-bg-tertiary)] rounded-lg p-4",
        className
      )}
    >
      <h3 className="text-sm font-medium text-[var(--tp-text-primary)] mb-4">
        Win Rate
      </h3>

      <div className="flex items-center gap-6">
        {/* Donut Chart */}
        <div className="relative">
          <canvas
            ref={canvasRef}
            className="w-[120px] h-[120px]"
            style={{ width: 120, height: 120 }}
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-[var(--tp-text-primary)]">
              {winRate.toFixed(1)}%
            </span>
            <span className="text-[10px] text-[var(--tp-text-muted)]">
              Win Rate
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex-1 space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[var(--tp-green)]" />
              <span className="text-xs text-[var(--tp-text-secondary)]">Winning</span>
            </div>
            <span className="text-sm font-medium text-[var(--tp-text-primary)]">
              {stats.winningTrades}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[var(--tp-red)]" />
              <span className="text-xs text-[var(--tp-text-secondary)]">Losing</span>
            </div>
            <span className="text-sm font-medium text-[var(--tp-text-primary)]">
              {stats.losingTrades}
            </span>
          </div>

          <div className="h-px bg-[var(--tp-border)] my-2" />

          <div className="flex justify-between items-center">
            <span className="text-xs text-[var(--tp-text-muted)]">Avg Win</span>
            <span className="text-xs font-mono text-[var(--tp-green)]">
              +${stats.avgWin.toFixed(2)}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-xs text-[var(--tp-text-muted)]">Avg Loss</span>
            <span className="text-xs font-mono text-[var(--tp-red)]">
              -${stats.avgLoss.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Largest Win/Loss */}
      <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-[var(--tp-border)]">
        <div className="text-center">
          <div className="text-[10px] text-[var(--tp-text-muted)] mb-1">
            Largest Win
          </div>
          <div className="text-sm font-mono font-medium text-[var(--tp-green)]">
            +${stats.largestWin.toFixed(2)}
          </div>
        </div>
        <div className="text-center">
          <div className="text-[10px] text-[var(--tp-text-muted)] mb-1">
            Largest Loss
          </div>
          <div className="text-sm font-mono font-medium text-[var(--tp-red)]">
            -${stats.largestLoss.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
});

export default WinRateCard;
