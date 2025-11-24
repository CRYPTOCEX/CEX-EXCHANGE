import type { CandleData } from "../../types";

export interface ExpiryMarker {
  timestamp: number; // Unix timestamp in seconds
  label: string;
  color: string;
}

// Helper function to calculate the next expiry time based on interval
export function calculateNextExpiryTime(
  currentTime: Date,
  intervalMinutes: number
): Date {
  // Ensure intervalMinutes is a positive number
  intervalMinutes = Math.max(1, intervalMinutes || 5);

  const minutes = currentTime.getMinutes();
  const remainder = minutes % intervalMinutes;

  const nextExpiryTime = new Date(currentTime);
  if (remainder === 0) {
    // If we're exactly at an interval, use the next one
    nextExpiryTime.setMinutes(minutes + intervalMinutes);
  } else {
    // Otherwise round up to the next interval
    nextExpiryTime.setMinutes(minutes + (intervalMinutes - remainder));
  }
  nextExpiryTime.setSeconds(0);
  nextExpiryTime.setMilliseconds(0);

  return nextExpiryTime;
}

// Format time as countdown (MM:SS)
export function formatCountdown(timeLeftMs: number): string {
  if (timeLeftMs <= 0) return "00:00";

  const minutes = Math.floor(timeLeftMs / 60000);
  const seconds = Math.floor((timeLeftMs % 60000) / 1000);

  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

// Generate expiry markers based on the selected expiry interval
export function generateExpiryMarkers(
  expiryMinutes = 5,
  currentTime: Date = new Date()
): ExpiryMarker[] {
  // Ensure expiryMinutes is a positive number
  expiryMinutes = Math.max(1, expiryMinutes || 5);

  // Calculate the next expiry time based on the selected interval
  const nextExpiryTime = calculateNextExpiryTime(currentTime, expiryMinutes);
  const expiryTimestamp = Math.floor(nextExpiryTime.getTime() / 1000);

  // Create a marker for the next expiry - remove the minutes from the label
  const marker: ExpiryMarker = {
    timestamp: expiryTimestamp,
    label: "", // Empty label since we're not showing it anymore
    color: "#f59e0b", // Amber color for visibility
  };

  return [marker];
}

// Map a timestamp to a candle index in the data array
export function mapTimestampToIndex(
  timestamp: number,
  candleData: CandleData[]
): number {
  if (!candleData.length) return -1;

  // Find the closest candle to this timestamp
  let closestIndex = -1;
  let minDiff = Number.MAX_SAFE_INTEGER;

  for (let i = 0; i < candleData.length; i++) {
    const diff = Math.abs(candleData[i].time - timestamp);
    if (diff < minDiff) {
      minDiff = diff;
      closestIndex = i;
    }
  }

  return closestIndex;
}

// Cache for expiry marker positions to prevent recalculation
const expiryMarkerPositionCache = new Map<
  string,
  {
    x: number;
    timestamp: number;
  }
>();

// Calculate X position for a timestamp based on candle positions
function calculateXPosition(
  timestamp: number,
  candleData: any[],
  chartWidth: number,
  visibleRange: { start: number; end: number },
  currentTime: number
): number | null {
  if (!candleData || candleData.length === 0) {
    return null;
  }

  // Calculate visible data range
  const start = Math.max(0, Math.floor(visibleRange.start));
  const end = Math.min(candleData.length, Math.ceil(visibleRange.end));

  // Convert timestamp to milliseconds for comparison with candle data
  const timestampMs = timestamp * 1000;
  const currentTimeMs = currentTime * 1000;

  // If the timestamp is in the past, find the exact candle it corresponds to
  if (timestampMs <= currentTimeMs) {
    // Find the candle with the closest time to the timestamp
    let closestIndex = -1;
    let minTimeDiff = Number.POSITIVE_INFINITY;

    for (let i = start; i < end; i++) {
      const candle = candleData[i];
      const timeDiff = Math.abs(candle.time - timestampMs);
      if (timeDiff < minTimeDiff) {
        minTimeDiff = timeDiff;
        closestIndex = i;
      }
    }

    if (closestIndex !== -1) {
      // Calculate the position based on the index in the visible range
      const position =
        (closestIndex - visibleRange.start) /
        (visibleRange.end - visibleRange.start);
      const xPos = Math.floor(position * chartWidth) + 0.5; // Add 0.5 for crisp lines
      return xPos;
    }
  } else {
    // For future timestamps, we need to extrapolate
    // Get the time interval between candles
    if (end - start < 2) {
      return null;
    }

    const timeInterval =
      (candleData[end - 1].time - candleData[start].time) / (end - start - 1);
    if (timeInterval <= 0) {
      return null;
    }

    // Calculate how many intervals into the future this timestamp is
    const lastCandleTime = candleData[end - 1].time;
    const intervalsIntoFuture = (timestampMs - lastCandleTime) / timeInterval;

    // Calculate the position
    const position =
      (end - 1 - visibleRange.start + intervalsIntoFuture) /
      (visibleRange.end - visibleRange.start);
    const xPos = Math.floor(position * chartWidth) + 0.5; // Add 0.5 for crisp lines

    return xPos;
  }

  return null;
}

// Render expiry markers - EXPORT THIS FUNCTION
export function renderExpiryMarkers(
  ctx: CanvasRenderingContext2D,
  expiryMarkers: ExpiryMarker[],
  candleData: CandleData[],
  chartWidth: number,
  chartHeight: number,
  chartTop: number,
  visibleRange: { start: number; end: number },
  currentTimeMs: number,
  showExpiry = true // Add showExpiry parameter with default value true
): void {
  // Add early return if showExpiry is false
  if (
    !showExpiry ||
    !expiryMarkers ||
    expiryMarkers.length === 0 ||
    !candleData.length
  ) {
    return;
  }

  expiryMarkers.forEach((marker) => {
    // Rest of the function remains unchanged
    const x = calculateXPosition(
      marker.timestamp,
      candleData,
      chartWidth,
      visibleRange,
      Math.floor(currentTimeMs / 1000)
    );

    if (x !== null && x >= 0 && x <= chartWidth) {
      drawMarker(
        ctx,
        x,
        marker,
        chartHeight,
        chartTop,
        Math.floor(currentTimeMs / 1000)
      );
    }
  });
}

// Helper function to draw a marker
function drawMarker(
  ctx: CanvasRenderingContext2D,
  x: number,
  marker: ExpiryMarker,
  chartHeight: number,
  chartTop: number,
  currentTimestamp: number
) {
  // Save the current context state
  ctx.save();

  const timeUntilExpiry = marker.timestamp - currentTimestamp;
  const isExpiringSoon = timeUntilExpiry > 0 && timeUntilExpiry <= 60; // 1 minute or less

  // Create a gradient for the vertical line
  const gradient = ctx.createLinearGradient(
    0,
    chartTop,
    0,
    chartTop + chartHeight
  );
  gradient.addColorStop(0, "rgba(245, 158, 11, 0.1)");
  gradient.addColorStop(0.5, "rgba(245, 158, 11, 0.8)");
  gradient.addColorStop(1, "rgba(245, 158, 11, 0.1)");

  // Draw vertical line with gradient and animation
  ctx.beginPath();
  ctx.strokeStyle = isExpiringSoon
    ? `rgba(239, 68, 68, ${0.7 + 0.3 * Math.sin(Date.now() / 200)})`
    : gradient;
  ctx.lineWidth = isExpiringSoon ? 2 : 1.5;

  // Use animated dash pattern for expiring soon
  if (isExpiringSoon) {
    const dashOffset = (Date.now() / 100) % 16;
    ctx.setLineDash([5, 3]);
    ctx.lineDashOffset = dashOffset;
  } else {
    ctx.setLineDash([5, 3]);
  }

  // Ensure the line is drawn on pixel boundaries for sharpness
  const alignedX = Math.floor(x) + 0.5;
  ctx.moveTo(alignedX, chartTop);
  ctx.lineTo(alignedX, chartTop + chartHeight);
  ctx.stroke();
  ctx.setLineDash([]);

  // Draw countdown at the top position (where the label used to be)
  if (timeUntilExpiry > 0) {
    const minutes = Math.floor(timeUntilExpiry / 60);
    const seconds = timeUntilExpiry % 60;
    const countdownText = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

    const labelY = chartTop + 5;
    const countdownWidth = Math.max(
      ctx.measureText(countdownText).width + 24,
      60
    );
    const countdownHeight = 28;

    // Create a rounded rectangle path for the countdown
    roundRect(
      ctx,
      alignedX - countdownWidth / 2,
      labelY,
      countdownWidth,
      countdownHeight,
      14
    );

    // Apply blur effect (simulated with shadow and opacity)
    ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;

    // Pulsing effect for countdown when close to expiry
    const pulseIntensity = isExpiringSoon
      ? 0.8 + 0.2 * Math.sin(Date.now() / 200)
      : 1;

    // Fill with semi-transparent background
    ctx.fillStyle = isExpiringSoon
      ? `rgba(239, 68, 68, ${0.85 * pulseIntensity})`
      : "rgba(245, 158, 11, 0.85)";
    ctx.fill();

    // Add subtle inner glow for countdown
    if (isExpiringSoon) {
      ctx.shadowColor = "rgba(239, 68, 68, 0.7)";
      ctx.shadowBlur = 15;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.fill();
    }

    // Reset shadow
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;

    // Draw countdown text
    ctx.fillStyle = "#ffffff";
    ctx.font = isExpiringSoon ? "bold 14px Arial" : "bold 13px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(countdownText, alignedX, labelY + countdownHeight / 2);
  }

  // Restore the context state
  ctx.restore();
}

// Helper function to draw rounded rectangles
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
