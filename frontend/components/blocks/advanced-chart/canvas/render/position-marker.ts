import type { CandleData } from "../../types";
import {
  pulseAnimation,
  flashAnimation,
  countdownAnimation,
  easeOutElastic,
} from "../../utils/animation-utils";

// Define a more comprehensive interface for binary orders
export interface PositionMarker {
  id: string;
  entryTime: number; // Unix timestamp in seconds
  entryPrice: number;
  expiryTime: number; // Unix timestamp in seconds
  type: "CALL" | "PUT";
  amount: number;
  status?: "ACTIVE" | "COMPLETED" | "EXPIRED";
  result?: "WIN" | "LOSS" | null;
  createdAt?: number; // For animation timing
  side?: "RISE" | "FALL"; // For compatibility with binary store
  // Additional properties that might come from binary store
  outcome?: "WIN" | "LOSS"; // Actual outcome from binary store
}

// Animation constants
const ANIMATION_DURATION = 1000; // ms
const PULSE_SPEED = 0.003;
const GLOW_INTENSITY_MIN = 0.3;
const GLOW_INTENSITY_MAX = 0.8;
const EXPIRY_WARNING_THRESHOLD = 30; // seconds

// Helper function to draw rounded rectangles
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  radius = Math.min(Math.max(0, radius), Math.min(width, height) / 2);
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

// Helper function to check if a value is a valid, finite number
function isValidNumber(value: any): boolean {
  return typeof value === "number" && isFinite(value);
}

// Calculate X position for a timestamp based on candle positions
export function calculateXPosition(
  timestamp: number,
  candleData: CandleData[],
  chartWidth: number,
  visibleRange: { start: number; end: number }
): number | null {
  if (!candleData.length || visibleRange.start >= visibleRange.end) {
    return null;
  }

  // Get the time range of visible candles
  const visibleStart = Math.max(0, Math.floor(visibleRange.start));
  const visibleEnd = Math.min(
    candleData.length - 1,
    Math.ceil(visibleRange.end)
  );

  if (visibleStart >= visibleEnd) return null;

  const firstCandle = candleData[visibleStart];
  const lastCandle = candleData[visibleEnd];

  if (!firstCandle || !lastCandle) return null;

  // Calculate time range
  const startTime = firstCandle.time;
  const endTime = lastCandle.time;
  const timeRange = endTime - startTime;

  if (timeRange <= 0) return null;

  // Calculate position based on time proportion
  const visibleWidth = visibleRange.end - visibleRange.start;

  // For timestamps in the future (beyond the last candle)
  if (timestamp > endTime) {
    // Calculate average time between candles
    const avgCandleTime = timeRange / (visibleEnd - visibleStart);

    // Calculate how many candle widths into the future
    const futureCandles = (timestamp - endTime) / avgCandleTime;

    // Calculate x position
    const x =
      ((visibleEnd + futureCandles - visibleRange.start) / visibleWidth) *
      chartWidth;
    return x;
  }

  // For timestamps in the past (before the first candle)
  if (timestamp < startTime) {
    // Calculate average time between candles
    const avgCandleTime = timeRange / (visibleEnd - visibleStart);

    // Calculate how many candle widths into the past
    const pastCandles = (startTime - timestamp) / avgCandleTime;

    // Calculate x position
    const x =
      ((visibleStart - pastCandles - visibleRange.start) / visibleWidth) *
      chartWidth;
    return x;
  }

  // For timestamps within the visible range
  const position = (timestamp - startTime) / timeRange;
  const relativeIndex = visibleStart + position * (visibleEnd - visibleStart);
  const x = ((relativeIndex - visibleRange.start) / visibleWidth) * chartWidth;

  return x;
}

// Find the exact X position of an expiry marker
function findExpiryMarkerPosition(
  expiryTimestamp: number,
  candleData: CandleData[],
  chartWidth: number,
  visibleRange: { start: number; end: number }
): number | null {
  // First try to find an exact match for the expiry timestamp
  for (let i = 0; i < candleData.length; i++) {
    const candle = candleData[i];
    // Use a small tolerance (5 seconds) to find matching candles
    if (Math.abs(candle.time - expiryTimestamp) <= 5) {
      // Calculate the X position for this candle
      const relativeIndex =
        (i - visibleRange.start) / (visibleRange.end - visibleRange.start);
      return relativeIndex * chartWidth;
    }
  }

  // If no exact match, use the standard calculation
  return calculateXPosition(
    expiryTimestamp,
    candleData,
    chartWidth,
    visibleRange
  );
}

export function renderPositionMarkers(
  ctx: CanvasRenderingContext2D,
  orders: PositionMarker[],
  candleData: CandleData[],
  chartWidth: number,
  chartHeight: number,
  chartTop: number,
  visibleRange: { start: number; end: number },
  priceRange: { min: number; max: number },
  currentTimeMs: number
) {
  if (
    !orders ||
    orders.length === 0 ||
    !candleData ||
    candleData.length === 0
  ) {
    return;
  }

  // Ensure we have valid price range values
  if (
    !isValidNumber(priceRange.min) ||
    !isValidNumber(priceRange.max) ||
    priceRange.min >= priceRange.max
  ) {
    console.warn("Invalid price range:", {
      min: priceRange.min,
      max: priceRange.max,
    });
    return;
  }

  const minPrice = priceRange.min;
  const maxPrice = priceRange.max;
  const priceChartHeight = chartHeight - chartTop;

  // Convert order format if necessary
  const normalizedOrders = orders.map((order) => {
    // If the order already has the correct format, return it as is
    if (order.entryTime && order.entryPrice && order.expiryTime && order.type) {
      return order;
    }

    // Otherwise, convert from the binary store format
    const normalizedOrder: PositionMarker = {
      id: order.id,
      entryTime:
        typeof order.entryTime === "number"
          ? order.entryTime
          : order.createdAt
            ? order.createdAt / 1000
            : Date.now() / 1000,
      entryPrice: order.entryPrice,
      expiryTime:
        typeof order.expiryTime === "number"
          ? order.expiryTime
          : order.expiryTime
            ? new Date(order.expiryTime).getTime() / 1000
            : Date.now() / 1000 + 300,
      type: order.side === "RISE" ? "CALL" : "PUT",
      amount: order.amount,
      status: order.status as "ACTIVE" | "COMPLETED" | "EXPIRED" | undefined,
      createdAt: order.createdAt,
    };

    // Determine result based on outcome or other properties
    if (order.outcome) {
      normalizedOrder.result = order.outcome;
    } else if (order.result) {
      normalizedOrder.result = order.result;
    }

    return normalizedOrder;
  });

  // Define price axis width without safety margin
  const priceAxisWidth = 90;
  const effectiveChartWidth = chartWidth - priceAxisWidth;

  // Current time in seconds
  const currentTimeSec = Math.floor(currentTimeMs / 1000);

  // Filter and render orders
  normalizedOrders.forEach((order) => {
    // Skip invalid orders
    if (
      !isValidNumber(order.entryPrice) ||
      !isValidNumber(order.entryTime) ||
      !isValidNumber(order.expiryTime)
    ) {
      console.warn("Skipping invalid order:", order);
      return;
    }

    // Determine if the order has expired
    const isExpired = order.expiryTime < currentTimeSec;
    const hasResult = order.status === "COMPLETED" && order.result !== null;
    
    // Skip orders that are expired and don't have a result
    // For expired orders without results, hide them immediately after expiry
    if (isExpired && !hasResult) {
      return; // Don't render expired orders without results
    }
    
    // For completed orders with results, show them briefly for the animation
    if (hasResult && isExpired) {
      // Show completed orders for up to 5 seconds after expiry for the result animation
      if (currentTimeSec - order.expiryTime > 5) {
        return;
      }
    }

    // Calculate Y position based on entry price
    // Ensure we have valid price range values
    if (
      !isValidNumber(minPrice) ||
      !isValidNumber(maxPrice) ||
      minPrice >= maxPrice
    ) {
      console.warn("Invalid price range:", { min: minPrice, max: maxPrice });
      return;
    }

    // Calculate Y position correctly - orders should appear at their entry price level
    // The Y coordinate increases as you go down, so higher prices should have smaller Y values
    const priceRatio = (order.entryPrice - minPrice) / (maxPrice - minPrice);
    // Invert the ratio because canvas Y coordinates are inverted (0 is top)
    const orderY = chartTop + priceChartHeight - (priceRatio * priceChartHeight);
    
    // Ensure Y position is within chart bounds with a small margin
    const margin = 10;
    if (orderY < chartTop - margin || orderY > chartTop + priceChartHeight + margin) {
      return; // Skip orders outside visible price range
    }

    // Skip if Y position is invalid
    if (!isValidNumber(orderY)) {
      console.warn("Invalid orderY position:", orderY);
      return;
    }

    // Set colors based on order type with futuristic palette
    const baseColor =
      order.type === "CALL"
        ? "#0078FF" // Pure blue for CALL/RISE
        : "#FF3B30"; // Red for PUT/FALL

    // Secondary colors for effects
    const secondaryColor =
      order.type === "CALL"
        ? "#00A3FF" // Light blue for CALL/RISE effects
        : "#FF6B5B"; // Light red for PUT/FALL effects

    // Accent color for highlights
    const accentColor =
      order.type === "CALL"
        ? "#00C2FF" // Bright blue accent for CALL/RISE
        : "#FF8F00"; // Orange accent for PUT/FALL

    // Calculate timestamps
    const entryTimestamp = order.entryTime;

    const expiryTimestamp = order.expiryTime;

    // Animation timing
    const creationTime = order.createdAt || Date.now() - 2000; // Default if not provided
    const entryAnimProgress = Math.min(
      1,
      (currentTimeMs - creationTime) / ANIMATION_DURATION
    );
    const entryAnimValue = easeOutElastic(entryAnimProgress);

    // Pulse animation based on current time
    const pulseValue = pulseAnimation(
      currentTimeMs,
      PULSE_SPEED,
      GLOW_INTENSITY_MIN,
      GLOW_INTENSITY_MAX
    );

    // Countdown animation - increases intensity as expiry approaches
    const timeRemaining = expiryTimestamp - currentTimeSec;
    const isNearExpiry =
      timeRemaining > 0 && timeRemaining < EXPIRY_WARNING_THRESHOLD;
    const countdownIntensity = isNearExpiry
      ? countdownAnimation(timeRemaining, EXPIRY_WARNING_THRESHOLD)
      : 0;

    // Result animation for completed trades
    // Using the hasResult variable defined earlier (line 258)
    const resultFlashIntensity = hasResult
      ? flashAnimation(
          currentTimeMs,
          typeof order.expiryTime === "number"
            ? order.expiryTime * 1000
            : Date.now(),
          2000
        )
      : 0;

    // Calculate X positions
    const entryX = calculateXPosition(
      entryTimestamp,
      candleData,
      chartWidth,
      visibleRange
    );

    // Use the specialized function to find the exact expiry marker position
    const expiryX = findExpiryMarkerPosition(
      expiryTimestamp,
      candleData,
      chartWidth,
      visibleRange
    );

    // Skip if X positions are invalid
    if (
      entryX === null ||
      expiryX === null ||
      !isValidNumber(entryX) ||
      !isValidNumber(expiryX)
    ) {
      return;
    }

    // Apply color modifications based on animations
    let glowColor = baseColor;
    let glowIntensity = pulseValue;

    // Enhance glow for near-expiry positions
    if (isNearExpiry) {
      glowIntensity = Math.max(glowIntensity, countdownIntensity);
      // Blink effect for last 5 seconds
      if (timeRemaining < 5 && Math.floor(currentTimeMs / 500) % 2 === 0) {
        glowIntensity = 1;
      }
    }

    // Flash effect for completed trades
    if (hasResult) {
      const resultColor = order.result === "WIN" ? "#64FFDA" : "#FF5252";
      glowColor = resultColor;
      glowIntensity = Math.max(glowIntensity, resultFlashIntensity);
    }

    // ===== FUTURISTIC TRADE PATH =====

    // Draw futuristic path with animation
    ctx.beginPath();
    ctx.strokeStyle = baseColor;
    ctx.lineWidth = 2 * entryAnimValue;

    // Create gradient for the line - SAFELY
    try {
      // Ensure all gradient coordinates are valid numbers
      if (
        isValidNumber(entryX) &&
        isValidNumber(orderY) &&
        isValidNumber(expiryX)
      ) {
        const gradient = ctx.createLinearGradient(
          entryX,
          orderY,
          expiryX,
          orderY
        );
        gradient.addColorStop(0, baseColor);
        gradient.addColorStop(1, secondaryColor);
        ctx.strokeStyle = gradient;
      } else {
        // Fallback to solid color if gradient coordinates are invalid
        ctx.strokeStyle = baseColor;
      }
    } catch (error) {
      console.warn("Error creating gradient:", error);
      ctx.strokeStyle = baseColor; // Fallback to solid color
    }

    // Use solid line for completed positions, dashed for active ones
    if (order.status === "COMPLETED") {
      ctx.setLineDash([]); // Solid line for completed positions
    } else {
      // Animated dash pattern
      const dashOffset = (currentTimeMs / 100) % 20;
      ctx.setLineDash([5, 4]);
      ctx.lineDashOffset = -dashOffset; // Animate the dash pattern
    }

    // Always draw the line all the way to the expiry point
    // Remove animation for line length - always show full line
    const lineEndX = Math.min(expiryX, effectiveChartWidth);

    // Add glow effect to the line
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 8 * glowIntensity;

    // Draw the line up to the expiry point or price axis
    if (entryX < effectiveChartWidth) {
      ctx.moveTo(entryX, orderY);

      // Always draw the line all the way to the expiry point, regardless of animation state
      // Make sure we don't exceed the chart width
      const lineEndX = Math.min(expiryX, effectiveChartWidth - 2);

      ctx.lineTo(lineEndX, orderY);
      ctx.stroke();

      // Add vertical line at the end of the position marker (12px height)
      // Only draw the vertical line if we're not at the price axis
      if (lineEndX < effectiveChartWidth - 2) {
        ctx.beginPath();
        ctx.moveTo(lineEndX, orderY - 6);
        ctx.lineTo(lineEndX, orderY + 6);
        ctx.stroke();
      }
    }

    ctx.setLineDash([]);
    ctx.shadowBlur = 0;

    // ===== FUTURISTIC ENTRY POINT MARKER =====

    // Always show entry marker if it's within the chart area
    if (entryX < effectiveChartWidth) {
      // Scale animation for entry point
      const scale = entryAnimValue;
      // Reduced size for the marker
      const markerSize = 8;

      // Draw futuristic entry marker
      // Outer glow
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 15 * glowIntensity;

      // Hexagonal marker background
      ctx.beginPath();
      drawHexagon(ctx, entryX, orderY, markerSize * scale);
      ctx.fillStyle = "#131722";
      ctx.fill();

      // Hexagonal border with glow
      ctx.beginPath();
      drawHexagon(ctx, entryX, orderY, markerSize * scale);
      ctx.strokeStyle = baseColor;
      ctx.lineWidth = 2 * scale;
      ctx.stroke();

      // Inner hexagon with pulse
      ctx.beginPath();
      drawHexagon(ctx, entryX, orderY, 4 * scale * (1 + pulseValue * 0.3));
      ctx.fillStyle = baseColor;
      ctx.fill();

      // Reset shadow
      ctx.shadowBlur = 0;

      // Draw amount label with holographic effect
      const amountText = `$${order.amount}`;
      ctx.font = "bold 12px Inter, sans-serif";
      const amountW = ctx.measureText(amountText).width + 20;
      const amountSpacing = 20;

      // Only draw amount label if it fits within the chart
      if (entryX - amountW - amountSpacing > 0) {
        // Set opacity based on animation progress
        ctx.globalAlpha = entryAnimValue;

        // Holographic background effect
        ctx.shadowColor = baseColor;
        ctx.shadowBlur = 10 * (0.5 + pulseValue * 0.5);

        // Futuristic background with angled corners - SAFELY
        try {
          if (
            isValidNumber(entryX - amountW - amountSpacing) &&
            isValidNumber(orderY - 12) &&
            isValidNumber(amountW) &&
            isValidNumber(24)
          ) {
            drawFuturisticBox(
              ctx,
              entryX - amountW - amountSpacing,
              orderY - 12,
              amountW,
              24,
              baseColor,
              secondaryColor,
              pulseValue
            );
          }
        } catch (error) {
          console.warn("Error drawing futuristic box:", error);
        }

        // Reset shadow
        ctx.shadowBlur = 0;

        // Amount text with glow
        ctx.fillStyle = "#ffffff";
        ctx.shadowColor = baseColor;
        ctx.shadowBlur = 4;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(amountText, entryX - amountW / 2 - amountSpacing, orderY);
        ctx.shadowBlur = 0;

        // Reset opacity
        ctx.globalAlpha = 1;
      }
    }

    // ===== FUTURISTIC EXPIRY MARKER =====

    // Add vertical end marker for completed positions
    // Only draw if within the chart area and not at the price axis
    if (order.status === "COMPLETED" && expiryX < effectiveChartWidth - 2) {
      const endMarkerX = Math.min(expiryX, effectiveChartWidth - 2);

      // Glow effect
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 10 * glowIntensity;

      // Draw futuristic end marker
      ctx.beginPath();
      ctx.strokeStyle = baseColor;
      ctx.lineWidth = 2 * entryAnimValue;

      // Diamond shape at the end
      drawDiamond(ctx, endMarkerX, orderY, 10 * entryAnimValue);
      ctx.stroke();
      ctx.fillStyle = "#131722";
      ctx.fill();

      // Reset shadow
      ctx.shadowBlur = 0;
    }

    // ===== FUTURISTIC RESULT INDICATOR =====

    // Draw result indicator for completed trades
    // Only draw if within the chart area
    if (
      hasResult &&
      resultFlashIntensity > 0 &&
      expiryX < effectiveChartWidth
    ) {
      const resultText = order.result === "WIN" ? "WIN" : "LOSS";
      const resultColor = order.result === "WIN" ? "#64FFDA" : "#FF5252";
      const resultSecondary = order.result === "WIN" ? "#00E5FF" : "#FF00AA";

      ctx.font = "bold 16px Inter, sans-serif";
      const resultW = ctx.measureText(resultText).width + 40;

      // Position at expiry point
      const resultX = Math.min(expiryX, effectiveChartWidth - resultW / 2);
      const resultY = orderY - 40;

      // Only draw if it fits within chart bounds
      if (
        resultX + resultW / 2 < effectiveChartWidth &&
        resultX - resultW / 2 > 0
      ) {
        // Add glow effect
        ctx.shadowColor = resultColor;
        ctx.shadowBlur = 20 * resultFlashIntensity;

        // Draw futuristic result indicator - SAFELY
        try {
          if (
            isValidNumber(resultX - resultW / 2) &&
            isValidNumber(resultY - 15) &&
            isValidNumber(resultW) &&
            isValidNumber(30)
          ) {
            drawFuturisticResult(
              ctx,
              resultX - resultW / 2,
              resultY - 15,
              resultW,
              30,
              resultColor,
              resultSecondary,
              resultFlashIntensity,
              currentTimeMs
            );
          }
        } catch (error) {
          console.warn("Error drawing futuristic result:", error);
        }

        // Reset shadow
        ctx.shadowBlur = 0;

        // Result text with glow
        ctx.fillStyle = "#ffffff";
        ctx.shadowColor = resultColor;
        ctx.shadowBlur = 8 * resultFlashIntensity;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(resultText, resultX, resultY);
        ctx.shadowBlur = 0;

        // Add particles for win
        if (order.result === "WIN" && Math.random() > 0.7) {
          drawParticles(
            ctx,
            resultX,
            resultY,
            resultColor,
            resultFlashIntensity,
            currentTimeMs
          );
        }
      }
    }
  });
}

// Helper function to draw a hexagon
function drawHexagon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number
) {
  if (!isValidNumber(x) || !isValidNumber(y) || !isValidNumber(radius)) {
    return;
  }

  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i;
    const pointX = x + radius * Math.cos(angle);
    const pointY = y + radius * Math.sin(angle);
    if (i === 0) {
      ctx.moveTo(pointX, pointY);
    } else {
      ctx.lineTo(pointX, pointY);
    }
  }
  ctx.closePath();
}

// Helper function to draw a diamond
function drawDiamond(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) {
  if (!isValidNumber(x) || !isValidNumber(y) || !isValidNumber(size)) {
    return;
  }

  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.lineTo(x + size, y);
  ctx.lineTo(x, y + size);
  ctx.lineTo(x - size, y);
  ctx.closePath();
}

// Helper function to draw futuristic box with angled corners
function drawFuturisticBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  color1: string,
  color2: string,
  pulseValue: number
) {
  // Validate all parameters
  if (
    !isValidNumber(x) ||
    !isValidNumber(y) ||
    !isValidNumber(width) ||
    !isValidNumber(height)
  ) {
    return;
  }

  const cornerSize = 6;

  // Create gradient background - SAFELY
  try {
    const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
    gradient.addColorStop(0, color1);
    gradient.addColorStop(1, color2);

    // Draw background
    ctx.fillStyle = "#131722";
    ctx.beginPath();
    ctx.moveTo(x + cornerSize, y);
    ctx.lineTo(x + width - cornerSize, y);
    ctx.lineTo(x + width, y + cornerSize);
    ctx.lineTo(x + width, y + height - cornerSize);
    ctx.lineTo(x + width - cornerSize, y + height);
    ctx.lineTo(x + cornerSize, y + height);
    ctx.lineTo(x, y + height - cornerSize);
    ctx.lineTo(x, y + cornerSize);
    ctx.closePath();
    ctx.fill();

    // Draw border
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + cornerSize, y);
    ctx.lineTo(x + width - cornerSize, y);
    ctx.lineTo(x + width, y + cornerSize);
    ctx.lineTo(x + width, y + height - cornerSize);
    ctx.lineTo(x + width - cornerSize, y + height);
    ctx.lineTo(x + cornerSize, y + height);
    ctx.lineTo(x, y + height - cornerSize);
    ctx.lineTo(x, y + cornerSize);
    ctx.closePath();
    ctx.stroke();

    // Add accent lines
    ctx.strokeStyle = color1;
    ctx.lineWidth = 1;

    // Top accent
    ctx.beginPath();
    ctx.moveTo(x + width * 0.2, y);
    ctx.lineTo(x + width * 0.4, y);
    ctx.stroke();

    // Bottom accent
    ctx.beginPath();
    ctx.moveTo(x + width * 0.6, y + height);
    ctx.lineTo(x + width * 0.8, y + height);
    ctx.stroke();
  } catch (error) {
    console.warn("Error creating gradient in drawFuturisticBox:", error);
  }
}

// Helper function to draw futuristic result indicator
function drawFuturisticResult(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  color1: string,
  color2: string,
  intensity: number,
  currentTimeMs: number
) {
  // Validate all parameters
  if (
    !isValidNumber(x) ||
    !isValidNumber(y) ||
    !isValidNumber(width) ||
    !isValidNumber(height)
  ) {
    return;
  }

  const cornerRadius = 15;

  // Create gradient background - SAFELY
  try {
    const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
    gradient.addColorStop(0, color1);
    gradient.addColorStop(1, color2);

    // Draw background
    ctx.fillStyle = "#131722";
    roundRect(ctx, x, y, width, height, cornerRadius);
    ctx.fill();

    // Draw border with animation
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2;
    roundRect(ctx, x, y, width, height, cornerRadius);
    ctx.stroke();

    // Add animated accent lines
    const time = currentTimeMs / 1000;
    const animOffset = Math.sin(time * 5) * 10;

    // Top accent
    ctx.beginPath();
    ctx.strokeStyle = color1;
    ctx.lineWidth = 2;
    ctx.moveTo(x + 5, y + 5);
    ctx.lineTo(x + 15 + animOffset, y + 5);
    ctx.stroke();

    // Bottom accent
    ctx.beginPath();
    ctx.moveTo(x + width - 5, y + height - 5);
    ctx.lineTo(x + width - 15 - animOffset, y + height - 5);
    ctx.stroke();

    // Add glowing dots at corners
    const dotRadius = 2 + intensity * 2;

    // Top left dot
    ctx.beginPath();
    ctx.fillStyle = color1;
    ctx.arc(x + 5, y + 5, dotRadius, 0, Math.PI * 2);
    ctx.fill();

    // Bottom right dot
    ctx.beginPath();
    ctx.fillStyle = color2;
    ctx.arc(x + width - 5, y + height - 5, dotRadius, 0, Math.PI * 2);
    ctx.fill();
  } catch (error) {
    console.warn("Error creating gradient in drawFuturisticResult:", error);
  }
}

// Helper function to draw particles
function drawParticles(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  intensity: number,
  currentTimeMs: number
) {
  // Validate parameters
  if (!isValidNumber(x) || !isValidNumber(y)) {
    return;
  }

  const particleCount = 5;
  const maxRadius = 3;

  for (let i = 0; i < particleCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = 20 + Math.random() * 30;
    const size = 1 + Math.random() * maxRadius * intensity;

    const particleX = x + Math.cos(angle) * distance;
    const particleY = y + Math.sin(angle) * distance;

    // Only draw if coordinates are valid
    if (
      isValidNumber(particleX) &&
      isValidNumber(particleY) &&
      isValidNumber(size)
    ) {
      ctx.beginPath();
      ctx.fillStyle = color;
      ctx.arc(particleX, particleY, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// Helper function to format time remaining
function formatTimeRemaining(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  } else {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }
}

// Helper function to draw time remaining indicator
function drawTimeRemainingIndicator(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  color1: string,
  color2: string,
  timeRemaining: number,
  warningThreshold: number,
  pulseValue: number
) {
  // Validate parameters
  if (
    !isValidNumber(x) ||
    !isValidNumber(y) ||
    !isValidNumber(width) ||
    !isValidNumber(height)
  ) {
    return;
  }

  const cornerRadius = 4;

  // Create gradient background - SAFELY
  try {
    const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
    gradient.addColorStop(0, color1);
    gradient.addColorStop(1, color2);

    // Draw background
    ctx.fillStyle = "#131722";
    roundRect(ctx, x, y, width, height, cornerRadius);
    ctx.fill();

    // Draw border
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 1;
    roundRect(ctx, x, y, width, height, cornerRadius);
    ctx.stroke();

    // Draw progress bar
    const progress = Math.min(1, timeRemaining / warningThreshold);
    const progressWidth = (width - 4) * progress;

    if (progressWidth > 0) {
      ctx.fillStyle = gradient;
      roundRect(ctx, x + 2, y + height - 4, progressWidth, 2, 1);
      ctx.fill();
    }
  } catch (error) {
    console.warn(
      "Error creating gradient in drawTimeRemainingIndicator:",
      error
    );
  }
}
