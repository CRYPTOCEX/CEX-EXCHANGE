"use client";

import type React from "react";
import type { CandleData } from "../../../types";
import ConnectionStatus from "./connection-status";
import { useChartContext } from "../../../context/chart-context";
import { useIsMobile } from "@/hooks/use-mobile"; // Add a check for mobile devices
// Import the color utilities
import { getAxisColors, getTextColors } from "../../../theme/colors";

interface FooterRendererProps {
  ctx: CanvasRenderingContext2D | null;
  chartWidth: number;
  chartHeight: number;
  timeScaleHeight: number;
  priceScaleWidth: number;
  theme: "dark" | "light" | string;
  data: CandleData[];
  visibleRange: { start: number; end: number };
  isLoadingOlderData?: boolean;
  timeFrame?: string; // Add timeFrame to the props
}

// Improved time formatting based on timeframe
export function formatTimeLabel(time: Date | number, timeFrame = "1m"): string {
  const dateObj = typeof time === "number" ? new Date(time) : time;

  if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
    return "--:--";
  }

  // Format based on timeframe
  if (timeFrame === "1d" || timeFrame === "1w" || timeFrame === "1M") {
    // For daily, weekly, or monthly timeframes, show date only
    return dateObj.toLocaleDateString(undefined, {
      month: "numeric",
      day: "numeric",
    });
  } else {
    // For all other timeframes (4h, 1h, 15m, 5m, 1m), show time in hh:mm format
    const hours = dateObj.getHours().toString().padStart(2, "0");
    const minutes = dateObj.getMinutes().toString().padStart(2, "0");

    // If we're showing multiple days, include the date
    if (shouldShowDate(dateObj, timeFrame)) {
      const month = (dateObj.getMonth() + 1).toString();
      const day = dateObj.getDate().toString();
      return `${month}/${day} ${hours}:${minutes}`;
    } else {
      // Just show time
      return `${hours}:${minutes}`;
    }
  }
}

// Helper function to determine if we should show the date
function shouldShowDate(date: Date, timeFrame: string): boolean {
  // For timeframes of 4h or larger, always show date
  if (timeFrame === "4h" || timeFrame === "1h") {
    return true;
  }

  // For smaller timeframes, check if this is a day boundary
  const now = new Date();
  return (
    date.getDate() !== now.getDate() ||
    date.getMonth() !== now.getMonth() ||
    date.getFullYear() !== now.getFullYear()
  );
}

export function renderFooter({
  ctx,
  chartWidth,
  chartHeight,
  timeScaleHeight,
  priceScaleWidth,
  theme,
  data,
  visibleRange,
  isLoadingOlderData,
  timeFrame = "1m", // Default to 1m if not provided
}: FooterRendererProps) {
  // Check if context is valid before proceeding
  if (!ctx) return;

  const darkMode = theme === "dark";

  // Use theme-appropriate colors from our centralized colors
  const axisColors = getAxisColors(darkMode);
  const textColors = getTextColors(darkMode);

  // Update the background color to use our centralized colors
  const bgColor = axisColors.time.background;
  // Update the text color to use our centralized colors
  const textColor = axisColors.time.text;
  // Update the grid color to use our centralized colors
  const gridColor = axisColors.time.line;

  // Draw time scale background - reduced height by using only the actual timeScaleHeight
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, chartHeight, chartWidth, timeScaleHeight);

  // Get grid positions from the grid renderer
  const gridPositions =
    typeof window !== "undefined"
      ? (window as any).chartGridPositions || []
      : [];

  // Adjust density of time labels based on timeframe
  let skipFactor = 1;

  if (gridPositions.length > 15) {
    // For very dense grids, show fewer labels
    skipFactor = Math.ceil(gridPositions.length / 15);
  }

  // Set text properties
  ctx.fillStyle = textColor;
  ctx.font = "10px Arial"; // Slightly larger font for better readability
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Draw time labels and grid markers
  ctx.beginPath(); // Start a single path for all grid markers

  for (let i = 0; i < gridPositions.length; i++) {
    const pos = gridPositions[i];

    if (pos.x >= 0 && pos.x <= chartWidth) {
      // Only show labels based on skip factor for cleaner display
      if (i % skipFactor === 0) {
        // Format time label based on timeframe
        const label = formatTimeLabel(pos.time, timeFrame);

        // Draw time label
        ctx.fillText(label, pos.x, chartHeight + timeScaleHeight / 2);
      }

      // Add grid marker to path (show all grid lines, even if label is skipped)
      ctx.moveTo(pos.x, chartHeight);
      ctx.lineTo(pos.x, chartHeight + 4); // Slight adjustment to tick height
    }
  }

  // Draw all grid markers at once
  ctx.strokeStyle = gridColor;
  ctx.stroke();

  // Draw corner rectangle
  ctx.fillStyle = bgColor;
  ctx.fillRect(chartWidth, chartHeight, priceScaleWidth, timeScaleHeight);
}

// React component for the footer
const Footer: React.FC = () => {
  const context = useChartContext();
  const {
    wsStatus,
    lastError,
    reconnectAttempt,
    reconnectCount,
    timeFrame, // Get timeframe from context
  } = context;

  // Use type assertion to access showExpiry property
  const showExpiry = (context as any).showExpiry ?? true;

  const isMobile = useIsMobile();

  // Don't render the component if showExpiry is false
  if (!showExpiry) {
    return null;
  }

  // Update the return statement to be more compact on mobile
  return (
    <div
      className={`relative w-full h-full ${isMobile ? "bg-transparent" : ""}`}
    >
      {/* Connection status will be positioned in the bottom right */}
      <div
        className={`absolute bottom-0 right-0 ${isMobile ? "scale-75 origin-bottom-right" : ""}`}
      >
        <ConnectionStatus
          wsStatus={wsStatus}
          lastError={lastError ? lastError : undefined}
          reconnectAttempt={
            typeof reconnectAttempt === "number" ? reconnectAttempt : 0
          }
          reconnectCount={reconnectCount}
          maxReconnectAttempts={5}
        />
      </div>
    </div>
  );
};

// Export the Footer component as default
export default Footer;
