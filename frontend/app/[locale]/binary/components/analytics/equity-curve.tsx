"use client";

/**
 * Equity Curve Component
 *
 * Balance over time, drawn on a canvas.
 *
 * A canvas cannot take a utility class, so every colour here comes from
 * `useTokenColors`, which reads the tokens off the document element and
 * re-reads them when the theme flips. Reading them once at mount is the bug
 * that leaves the chart painted for dark mode on a light page.
 *
 * One y-axis only — balance. Drawdown is reported as a figure beside the
 * title rather than as a second scale.
 */

import { memo, useMemo, useRef, useEffect, useState } from "react";
import { TrendingDown } from "lucide-react";
import type { EquityPoint } from "./trading-analytics";
import { useTranslations } from "next-intl";
import {
  Panel,
  PanelTitle,
  ToneDot,
  pnlTone,
  toneText,
  useTokenColors,
} from "./analytics-ui";
import { MoneyFigure } from "@/components/ui/money-figure";

// ============================================================================
// TYPES
// ============================================================================

interface EquityCurveProps {
  data: EquityPoint[];
  startingBalance: number;
  currency?: string;
  /** @deprecated Tokens are theme-aware; kept so existing call sites compile. */
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

/** Loss marks are a rotated square so win and loss are not hue-alone. */
function drawDiamond(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r, y);
  ctx.lineTo(x, y + r);
  ctx.lineTo(x - r, y);
  ctx.closePath();
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const EquityCurve = memo(function EquityCurve({
  data,
  startingBalance,
  currency = "USDT",
  height = 300,
}: EquityCurveProps) {
  const t = useTranslations("binary_components");
  const tCommon = useTranslations("common");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height });
  const [hoveredPoint, setHoveredPoint] = useState<EquityPoint | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Live token values — re-read on every theme change.
  const { color, alpha, raw } = useTokenColors();

  const colors = useMemo(
    () => ({
      bg: color("card"),
      grid: color("border"),
      text: color("subtle-foreground"),
      line: color("up"),
      lineNegative: color("down"),
      fill: alpha("up", 0.12),
      fillNegative: alpha("down", 0.12),
      baseline: color("border-strong"),
    }),
    [color, alpha]
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
    // Nothing to draw until the tokens have been read off the document.
    if (!raw.card) return;

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
      data.forEach((point) => {
        ctx.lineTo(scaleX(point.time.getTime()), scaleY(point.balance));
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

      // Draw trade markers. Wins are discs, losses are diamonds — the pair of
      // tones is red/green and does not separate under deuteranopia, so shape
      // carries the outcome as well as hue. Each mark gets a surface ring so
      // overlapping points stay countable.
      data.forEach((point) => {
        if (!point.trade) return;
        const x = scaleX(point.time.getTime());
        const y = scaleY(point.balance);
        const isWin = point.trade.status === "WIN";

        if (isWin) {
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, Math.PI * 2);
        } else {
          drawDiamond(ctx, x, y, 4.5);
        }
        ctx.fillStyle = isWin ? colors.line : colors.lineNegative;
        ctx.fill();
        ctx.strokeStyle = colors.bg;
        ctx.lineWidth = 2;
        ctx.stroke();
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
  }, [data, dimensions, colors, chartBounds, startingBalance, raw.card]);

  // Handle mouse move for tooltip
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;

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

  // Calculate summary stats
  const finalBalance = data.length > 0 ? data[data.length - 1].balance : startingBalance;
  const totalReturn = ((finalBalance - startingBalance) / startingBalance) * 100;
  const maxDrawdown = Math.max(...data.map(d => d.drawdownPercent));
  // The curve is drawn in one tone for the whole period, so the legend swatch
  // has to follow it — a green key beside a red line is a lie about the mark.
  const curveTone = finalBalance >= startingBalance ? "up" : "down";

  return (
    <Panel className="p-6">
      <div className="flex items-center justify-between mb-4">
        <PanelTitle>{tCommon("equity_curve")}</PanelTitle>
        <div className="flex items-center gap-4 text-xs">
          <span className={toneText[pnlTone(totalReturn)]}>
            {totalReturn >= 0 ? "+" : ""}{totalReturn.toFixed(2)}% return
          </span>
          {/* Drawdown is a risk figure, not a realised move: the caution hue
              rides the glyph and the number keeps legible foreground ink. */}
          <span className="inline-flex items-center gap-1 text-foreground">
            <TrendingDown size={12} className="text-warning" />
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
            className="fixed z-50 bg-popover text-popover-foreground border border-border rounded-lg p-3 shadow-lg pointer-events-none"
            style={{
              left: mousePos.x + 10,
              top: mousePos.y - 60,
              transform: "translateX(0)",
            }}
          >
            <div className="text-xs text-muted-foreground">
              {formatDate(hoveredPoint.time)} {formatTime(hoveredPoint.time)}
            </div>
            <div className="text-sm font-semibold text-foreground">
              <MoneyFigure value={`${hoveredPoint.balance.toFixed(2)} ${currency}`} />
            </div>
            {hoveredPoint.trade && (
              <div className="flex items-center gap-1.5 text-xs mt-1">
                <ToneDot
                  tone={hoveredPoint.trade.status === "WIN" ? "up" : "down"}
                  size={6}
                />
                <span className={toneText[hoveredPoint.trade.status === "WIN" ? "up" : "down"]}>
                  {hoveredPoint.trade.status}: {hoveredPoint.trade.profit?.toFixed(2) || 0} {currency}
                </span>
              </div>
            )}
            {hoveredPoint.drawdownPercent > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-foreground">
                <TrendingDown size={11} className="text-warning" />
                {t("drawdown")}{hoveredPoint.drawdownPercent.toFixed(1)}%
              </div>
            )}
          </div>
        )}
      </div>

      {/* Legend — always present, and every entry names its mark so identity is
          never colour alone. */}
      <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-border">
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-0.5 ${curveTone === "up" ? "bg-up" : "bg-down"}`}
          />
          <span className="text-xs text-muted-foreground">Balance</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 border-t-2 border-dashed border-border-strong" />
          <span className="text-xs text-muted-foreground">Starting ({startingBalance.toFixed(0)} {currency})</span>
        </div>
        <div className="flex items-center gap-2">
          <ToneDot tone="up" />
          <span className="text-xs text-muted-foreground">Win</span>
        </div>
        <div className="flex items-center gap-2">
          <ToneDot tone="down" />
          <span className="text-xs text-muted-foreground">Loss</span>
        </div>
      </div>
    </Panel>
  );
});

export default EquityCurve;
