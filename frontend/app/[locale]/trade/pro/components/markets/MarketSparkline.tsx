"use client";

import React, { memo, useRef, useEffect } from "react";
import { cn } from "../../utils/cn";
import { withAlpha, themeColor } from "../../utils/canvas-color";

interface MarketSparklineProps {
  data: number[];
  width?: number;
  height?: number;
  positive?: boolean;
  className?: string;
}

export const MarketSparkline = memo(function MarketSparkline({
  data,
  width = 60,
  height = 24,
  positive = true,
  className,
}: MarketSparklineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length < 2) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Calculate bounds
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    // Calculate points
    const stepX = width / (data.length - 1);
    const points = data.map((value, i) => ({
      x: i * stepX,
      y: height - ((value - min) / range) * (height - 4) - 2,
    }));

    // Draw line — colors come off the --tp-* palette so the sparkline follows
    // the theme instead of always painting the dark-mode green/red.
    const stroke = themeColor(
      positive ? "--tp-green" : "--tp-red",
      positive ? "--up" : "--down"
    );

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Draw gradient fill
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    // The palette is a design token now, not hex — alpha can no longer be
    // appended to it. See utils/canvas-color.ts.
    gradient.addColorStop(0, withAlpha(ctx, stroke, 0.3));
    gradient.addColorStop(1, withAlpha(ctx, stroke, 0));
    ctx.fillStyle = gradient;
    ctx.fill();
  }, [data, width, height, positive]);

  if (data.length < 2) {
    return <div className={cn("w-[60px] h-6", className)} />;
  }

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={cn("block", className)}
      style={{ width, height }}
    />
  );
});

export default MarketSparkline;
