"use client";

/**
 * Pattern Library Component
 *
 * Visual guide to common chart patterns for binary trading.
 * Displays patterns with descriptions, examples, and trading tips.
 * Now implemented as an overlay instead of a dialog.
 */

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Repeat,
  Triangle,
  ArrowUpDown,
  Search,
  BookOpen,
  Target,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";

// ============================================================================
// TYPES
// ============================================================================

// Candlestick data for pattern visualization
export interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface ChartPattern {
  id: string;
  name: string;
  category: "reversal" | "continuation" | "bilateral";
  direction: "bullish" | "bearish" | "neutral";
  description: string;
  identification: string[];
  tradingTips: string[];
  successRate: number; // Estimated success rate percentage
  timeframes: string[];
  candles: Candle[]; // Candlestick data for pattern visualization
}

export interface PatternLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  onPatternSelect?: (pattern: ChartPattern) => void;
  /** When true, disables enter/exit animations for instant overlay switching on mobile */
  isMobile?: boolean;
}

// ============================================================================
// PATTERN DATA
// ============================================================================

const CHART_PATTERNS: ChartPattern[] = [
  // ============================================================================
  // BULLISH REVERSAL PATTERNS
  // ============================================================================
  {
    id: "double-bottom",
    name: "Double Bottom",
    category: "reversal",
    direction: "bullish",
    description:
      "A bullish reversal pattern that forms after a downtrend. Two consecutive lows at approximately the same price level, with a moderate peak between them.",
    identification: [
      "Two distinct lows at similar price levels",
      "Moderate peak between the lows (neckline)",
      "Volume typically decreases on second bottom",
      "Breakout above neckline confirms pattern",
    ],
    tradingTips: [
      "Enter RISE when price breaks above the neckline",
      "Set expiry after the expected move duration",
      "More reliable on higher timeframes (15m+)",
      "Look for volume confirmation on breakout",
    ],
    successRate: 78,
    timeframes: ["15m", "1h", "4h"],
    candles: [
      { open: 70, high: 72, low: 65, close: 66 },
      { open: 66, high: 68, low: 58, close: 60 },
      { open: 60, high: 62, low: 50, close: 52 },
      { open: 52, high: 55, low: 30, close: 32 },
      { open: 32, high: 50, low: 30, close: 48 },
      { open: 48, high: 58, low: 46, close: 55 },
      { open: 55, high: 56, low: 45, close: 46 },
      { open: 46, high: 48, low: 32, close: 34 },
      { open: 34, high: 52, low: 32, close: 50 },
      { open: 50, high: 62, low: 48, close: 60 },
      { open: 60, high: 75, low: 58, close: 72 },
    ],
  },
  {
    id: "triple-bottom",
    name: "Triple Bottom",
    category: "reversal",
    direction: "bullish",
    description:
      "A bullish reversal pattern with three consecutive lows at approximately the same price level. Stronger than double bottom as it shows multiple failed attempts to break support.",
    identification: [
      "Three distinct lows at similar price levels",
      "Two moderate peaks between the lows",
      "Volume typically decreases with each bottom",
      "Breakout above resistance confirms pattern",
    ],
    tradingTips: [
      "Enter RISE on breakout above resistance line",
      "Target equals pattern height from breakout",
      "More reliable than double bottom pattern",
      "Watch for increasing volume on breakout",
    ],
    successRate: 82,
    timeframes: ["1h", "4h", "1d"],
    candles: [
      { open: 65, high: 67, low: 60, close: 62 },
      { open: 62, high: 64, low: 32, close: 34 },
      { open: 34, high: 50, low: 32, close: 48 },
      { open: 48, high: 52, low: 44, close: 46 },
      { open: 46, high: 48, low: 33, close: 35 },
      { open: 35, high: 52, low: 33, close: 50 },
      { open: 50, high: 54, low: 46, close: 48 },
      { open: 48, high: 50, low: 32, close: 36 },
      { open: 36, high: 58, low: 34, close: 56 },
      { open: 56, high: 70, low: 54, close: 68 },
    ],
  },
  {
    id: "hammer",
    name: "Hammer",
    category: "reversal",
    direction: "bullish",
    description:
      "A single-candle bullish reversal pattern with a small body at the top and a long lower shadow. Signals potential trend reversal when appearing at the bottom of a downtrend.",
    identification: [
      "Small real body at the upper end of range",
      "Lower shadow at least 2x the body length",
      "Little or no upper shadow",
      "Appears at the bottom of a downtrend",
    ],
    tradingTips: [
      "Enter RISE on confirmation candle close",
      "More reliable at key support levels",
      "Color of body is less important than shape",
      "Combine with oversold RSI for stronger signal",
    ],
    successRate: 70,
    timeframes: ["5m", "15m", "1h"],
    candles: [
      { open: 70, high: 72, low: 66, close: 67 },
      { open: 67, high: 68, low: 58, close: 60 },
      { open: 60, high: 62, low: 50, close: 52 },
      { open: 52, high: 54, low: 42, close: 44 },
      { open: 44, high: 46, low: 30, close: 45 }, // Hammer
      { open: 45, high: 55, low: 43, close: 53 },
      { open: 53, high: 62, low: 51, close: 60 },
    ],
  },
  {
    id: "inverted-hammer",
    name: "Inverted Hammer",
    category: "reversal",
    direction: "bullish",
    description:
      "A single-candle pattern with a small body at the bottom and a long upper shadow. Found at the bottom of downtrends, signals potential bullish reversal.",
    identification: [
      "Small real body at the lower end of range",
      "Upper shadow at least 2x the body length",
      "Little or no lower shadow",
      "Appears after a downtrend",
    ],
    tradingTips: [
      "Wait for bullish confirmation candle",
      "Enter RISE after confirmation closes",
      "Best at significant support levels",
      "Volume increase on confirmation adds reliability",
    ],
    successRate: 65,
    timeframes: ["5m", "15m", "1h"],
    candles: [
      { open: 70, high: 72, low: 65, close: 66 },
      { open: 66, high: 68, low: 55, close: 56 },
      { open: 56, high: 58, low: 45, close: 46 },
      { open: 46, high: 48, low: 35, close: 36 },
      { open: 36, high: 52, low: 34, close: 38 }, // Inverted Hammer
      { open: 38, high: 50, low: 36, close: 48 },
      { open: 48, high: 58, low: 46, close: 56 },
    ],
  },
  {
    id: "three-white-soldiers",
    name: "Three White Soldiers",
    category: "reversal",
    direction: "bullish",
    description:
      "A strong bullish reversal pattern consisting of three consecutive long-bodied bullish candles, each opening within the previous candle's body and closing higher.",
    identification: [
      "Three consecutive bullish candles",
      "Each candle has a long body",
      "Each opens within previous body",
      "Each closes near its high",
    ],
    tradingTips: [
      "Enter RISE after third candle closes",
      "Very strong reversal signal",
      "Watch for decreasing candle sizes (exhaustion)",
      "Best after extended downtrend",
    ],
    successRate: 80,
    timeframes: ["15m", "1h", "4h"],
    candles: [
      { open: 60, high: 62, low: 50, close: 52 },
      { open: 52, high: 54, low: 42, close: 44 },
      { open: 44, high: 46, low: 32, close: 34 },
      { open: 36, high: 50, low: 34, close: 48 }, // First soldier
      { open: 46, high: 60, low: 44, close: 58 }, // Second soldier
      { open: 56, high: 72, low: 54, close: 70 }, // Third soldier
      { open: 70, high: 80, low: 68, close: 78 },
    ],
  },
  {
    id: "piercing-line",
    name: "Piercing Line",
    category: "reversal",
    direction: "bullish",
    description:
      "A two-candle bullish reversal pattern where a bullish candle opens below the prior bearish candle's low and closes above its midpoint.",
    identification: [
      "First candle is bearish with long body",
      "Second candle opens below first's low",
      "Second candle closes above first's midpoint",
      "Appears at the bottom of a downtrend",
    ],
    tradingTips: [
      "Enter RISE on confirmation above second candle high",
      "Stronger when second candle closes above 50% of first",
      "Most effective at support levels",
      "Combine with volume analysis",
    ],
    successRate: 68,
    timeframes: ["15m", "1h", "4h"],
    candles: [
      { open: 70, high: 72, low: 62, close: 64 },
      { open: 64, high: 66, low: 52, close: 54 },
      { open: 54, high: 56, low: 40, close: 42 },
      { open: 42, high: 44, low: 28, close: 30 }, // Long bearish
      { open: 26, high: 48, low: 24, close: 46 }, // Piercing line
      { open: 46, high: 58, low: 44, close: 56 },
      { open: 56, high: 68, low: 54, close: 65 },
    ],
  },
  {
    id: "bullish-harami",
    name: "Bullish Harami",
    category: "reversal",
    direction: "bullish",
    description:
      "A two-candle pattern where a small bullish candle is completely contained within the body of the previous large bearish candle. Signals potential reversal.",
    identification: [
      "Large bearish candle followed by small bullish",
      "Second candle body within first candle body",
      "Shadows may extend beyond first candle",
      "Appears in a downtrend",
    ],
    tradingTips: [
      "Wait for confirmation before entering RISE",
      "Small candle shows indecision/loss of momentum",
      "More reliable with volume decrease on second candle",
      "Best at key support levels",
    ],
    successRate: 62,
    timeframes: ["5m", "15m", "1h"],
    candles: [
      { open: 70, high: 72, low: 64, close: 65 },
      { open: 65, high: 67, low: 55, close: 56 },
      { open: 56, high: 58, low: 45, close: 46 },
      { open: 46, high: 48, low: 30, close: 32 }, // Large bearish
      { open: 35, high: 42, low: 34, close: 40 }, // Small bullish inside
      { open: 40, high: 52, low: 38, close: 50 },
      { open: 50, high: 60, low: 48, close: 58 },
    ],
  },
  {
    id: "tweezer-bottom",
    name: "Tweezer Bottom",
    category: "reversal",
    direction: "bullish",
    description:
      "A two-candle pattern with matching lows, where the first is bearish and the second is bullish. Shows strong support at a price level.",
    identification: [
      "Two candles with nearly identical lows",
      "First candle is bearish",
      "Second candle is bullish",
      "Occurs at the end of a downtrend",
    ],
    tradingTips: [
      "Enter RISE after second candle closes",
      "Matching lows show strong support",
      "More reliable on higher timeframes",
      "Combine with support level analysis",
    ],
    successRate: 67,
    timeframes: ["15m", "1h", "4h"],
    candles: [
      { open: 65, high: 67, low: 58, close: 60 },
      { open: 60, high: 62, low: 50, close: 52 },
      { open: 52, high: 54, low: 42, close: 44 },
      { open: 44, high: 46, low: 32, close: 34 }, // First - bearish
      { open: 34, high: 48, low: 32, close: 46 }, // Second - bullish, same low
      { open: 46, high: 58, low: 44, close: 56 },
      { open: 56, high: 66, low: 54, close: 64 },
    ],
  },
  {
    id: "bullish-abandoned-baby",
    name: "Bullish Abandoned Baby",
    category: "reversal",
    direction: "bullish",
    description:
      "A rare and strong three-candle reversal pattern. A doji gaps below a bearish candle, then a bullish candle gaps up above the doji.",
    identification: [
      "Large bearish candle in downtrend",
      "Doji that gaps below the first candle",
      "Bullish candle that gaps above the doji",
      "Gaps on both sides of the doji are key",
    ],
    tradingTips: [
      "Very strong reversal signal - enter RISE immediately",
      "Gaps are essential for pattern validity",
      "Rare pattern with high reliability",
      "Set expiry based on expected reversal duration",
    ],
    successRate: 85,
    timeframes: ["1h", "4h", "1d"],
    candles: [
      { open: 70, high: 72, low: 62, close: 64 },
      { open: 64, high: 66, low: 48, close: 50 }, // Large bearish
      { open: 42, high: 44, low: 40, close: 42 }, // Doji with gap
      { open: 50, high: 65, low: 48, close: 62 }, // Bullish with gap
      { open: 62, high: 75, low: 60, close: 72 },
    ],
  },
  {
    id: "inverse-head-shoulders",
    name: "Inverse Head & Shoulders",
    category: "reversal",
    direction: "bullish",
    description:
      "A bullish reversal pattern with three troughs - the middle one (head) deeper than the two shoulders. Signals the end of a downtrend.",
    identification: [
      "Left shoulder: First trough followed by a rise",
      "Head: Deeper trough below left shoulder",
      "Right shoulder: Higher trough than head",
      "Neckline connects the peaks between troughs",
    ],
    tradingTips: [
      "Enter RISE on breakout above neckline",
      "Right shoulder should have decreasing volume",
      "Target equals head-to-neckline distance",
      "Wait for confirmation candle close above neckline",
    ],
    successRate: 83,
    timeframes: ["1h", "4h", "1d"],
    // Left shoulder -> head (lowest) -> right shoulder -> breakout
    candles: [
      { open: 60, high: 62, low: 55, close: 56 },
      { open: 56, high: 58, low: 40, close: 42 }, // Left shoulder low
      { open: 42, high: 58, low: 40, close: 55 }, // Recovery
      { open: 55, high: 56, low: 48, close: 50 },
      { open: 50, high: 52, low: 25, close: 28 }, // Head (lowest)
      { open: 28, high: 55, low: 26, close: 52 }, // Recovery
      { open: 52, high: 54, low: 45, close: 48 },
      { open: 48, high: 50, low: 38, close: 40 }, // Right shoulder
      { open: 40, high: 58, low: 38, close: 56 }, // Neckline test
      { open: 56, high: 72, low: 54, close: 70 }, // Breakout
      { open: 70, high: 80, low: 68, close: 78 },
    ],
  },
  {
    id: "bullish-engulfing",
    name: "Bullish Engulfing",
    category: "reversal",
    direction: "bullish",
    description:
      "A two-candle reversal pattern where a large bullish candle completely engulfs the previous bearish candle. Strong signal when appearing at support levels.",
    identification: [
      "Occurs in a downtrend or at support",
      "First candle is bearish (red)",
      "Second candle is bullish (green) and larger",
      "Second candle body completely covers first",
    ],
    tradingTips: [
      "Enter RISE on the next candle open",
      "More reliable at key support levels",
      "Works best with 5m-15m expiry",
      "Confirm with higher timeframe trend",
    ],
    successRate: 72,
    timeframes: ["5m", "15m", "1h"],
    // Downtrend -> small bearish -> large bullish engulfing -> continuation up
    candles: [
      { open: 70, high: 72, low: 66, close: 68 },
      { open: 68, high: 69, low: 60, close: 62 },
      { open: 62, high: 64, low: 54, close: 56 },
      { open: 56, high: 58, low: 48, close: 50 },
      { open: 50, high: 52, low: 42, close: 44 }, // Small bearish candle
      { open: 40, high: 60, low: 38, close: 58 }, // Large bullish engulfing!
      { open: 58, high: 68, low: 56, close: 66 },
      { open: 66, high: 75, low: 64, close: 72 },
    ],
  },
  {
    id: "morning-star",
    name: "Morning Star",
    category: "reversal",
    direction: "bullish",
    description:
      "A three-candle bullish reversal pattern consisting of a long bearish candle, a small-bodied candle, and a long bullish candle.",
    identification: [
      "First candle: Long bearish body",
      "Second candle: Small body (doji or spinning top)",
      "Third candle: Long bullish body",
      "Gap between first and second candle (ideal)",
    ],
    tradingTips: [
      "Enter RISE after third candle closes",
      "Stronger when second candle gaps down",
      "Volume should increase on third candle",
      "Best at major support levels",
    ],
    successRate: 75,
    timeframes: ["15m", "1h", "4h"],
    // Downtrend -> long bearish -> small doji -> long bullish
    candles: [
      { open: 75, high: 77, low: 68, close: 70 },
      { open: 70, high: 72, low: 62, close: 64 },
      { open: 64, high: 66, low: 40, close: 42 }, // Long bearish
      { open: 40, high: 44, low: 38, close: 41 }, // Small doji/spinning top
      { open: 42, high: 68, low: 40, close: 66 }, // Long bullish
      { open: 66, high: 78, low: 64, close: 75 },
      { open: 75, high: 82, low: 73, close: 80 },
    ],
  },

  // Bearish Reversal Patterns
  {
    id: "double-top",
    name: "Double Top",
    category: "reversal",
    direction: "bearish",
    description:
      "A bearish reversal pattern that forms after an uptrend. Two consecutive peaks at approximately the same price level with a trough between them.",
    identification: [
      "Two distinct peaks at similar price levels",
      "Trough between peaks forms neckline",
      "Volume usually decreases on second top",
      "Breakdown below neckline confirms pattern",
    ],
    tradingTips: [
      "Enter FALL when price breaks below neckline",
      "Second peak often slightly lower (exhaustion)",
      "More reliable with RSI divergence",
      "Set expiry based on expected move",
    ],
    successRate: 76,
    timeframes: ["15m", "1h", "4h"],
    // Uptrend -> first top -> pullback -> second top -> breakdown
    candles: [
      { open: 30, high: 35, low: 28, close: 34 },
      { open: 34, high: 42, low: 32, close: 40 },
      { open: 40, high: 50, low: 38, close: 48 },
      { open: 48, high: 70, low: 46, close: 68 }, // First top
      { open: 68, high: 70, low: 52, close: 55 }, // Pullback
      { open: 55, high: 58, low: 45, close: 48 }, // Neckline area
      { open: 48, high: 68, low: 46, close: 66 }, // Second top
      { open: 66, high: 68, low: 50, close: 52 },
      { open: 52, high: 54, low: 40, close: 42 }, // Breakdown
      { open: 42, high: 44, low: 30, close: 32 },
    ],
  },
  {
    id: "head-shoulders",
    name: "Head & Shoulders",
    category: "reversal",
    direction: "bearish",
    description:
      "A bearish reversal pattern with three peaks - the middle one (head) higher than the two shoulders. Signals the end of an uptrend.",
    identification: [
      "Left shoulder: First peak followed by decline",
      "Head: Higher peak above left shoulder",
      "Right shoulder: Lower peak than head",
      "Neckline connects the troughs",
    ],
    tradingTips: [
      "Enter FALL on breakdown below neckline",
      "Volume typically decreases throughout pattern",
      "Target equals head-to-neckline distance",
      "Right shoulder often has lower volume",
    ],
    successRate: 81,
    timeframes: ["1h", "4h", "1d"],
    // Left shoulder -> head (highest) -> right shoulder -> breakdown
    candles: [
      { open: 40, high: 45, low: 38, close: 44 },
      { open: 44, high: 60, low: 42, close: 58 }, // Left shoulder peak
      { open: 58, high: 60, low: 45, close: 48 }, // Pullback
      { open: 48, high: 50, low: 42, close: 45 },
      { open: 45, high: 75, low: 43, close: 72 }, // Head (highest)
      { open: 72, high: 74, low: 48, close: 50 }, // Pullback
      { open: 50, high: 52, low: 44, close: 46 },
      { open: 46, high: 62, low: 44, close: 60 }, // Right shoulder
      { open: 60, high: 62, low: 42, close: 44 }, // Neckline break
      { open: 44, high: 46, low: 30, close: 32 }, // Breakdown
      { open: 32, high: 34, low: 22, close: 25 },
    ],
  },
  {
    id: "bearish-engulfing",
    name: "Bearish Engulfing",
    category: "reversal",
    direction: "bearish",
    description:
      "A two-candle reversal pattern where a large bearish candle completely engulfs the previous bullish candle. Strong signal at resistance levels.",
    identification: [
      "Occurs in an uptrend or at resistance",
      "First candle is bullish (green)",
      "Second candle is bearish (red) and larger",
      "Second candle body completely covers first",
    ],
    tradingTips: [
      "Enter FALL on the next candle open",
      "More reliable at key resistance levels",
      "Works best with 5m-15m expiry",
      "Confirm with overbought RSI",
    ],
    successRate: 71,
    timeframes: ["5m", "15m", "1h"],
    // Uptrend -> small bullish -> large bearish engulfing -> continuation down
    candles: [
      { open: 30, high: 35, low: 28, close: 34 },
      { open: 34, high: 42, low: 32, close: 40 },
      { open: 40, high: 48, low: 38, close: 46 },
      { open: 46, high: 55, low: 44, close: 52 },
      { open: 52, high: 60, low: 50, close: 58 }, // Small bullish candle
      { open: 62, high: 64, low: 42, close: 44 }, // Large bearish engulfing!
      { open: 44, high: 46, low: 34, close: 36 },
      { open: 36, high: 38, low: 26, close: 28 },
    ],
  },
  {
    id: "evening-star",
    name: "Evening Star",
    category: "reversal",
    direction: "bearish",
    description:
      "A three-candle bearish reversal pattern consisting of a long bullish candle, a small-bodied candle, and a long bearish candle.",
    identification: [
      "First candle: Long bullish body",
      "Second candle: Small body (doji or spinning top)",
      "Third candle: Long bearish body",
      "Gap between first and second candle (ideal)",
    ],
    tradingTips: [
      "Enter FALL after third candle closes",
      "Stronger when second candle gaps up",
      "Volume should increase on third candle",
      "Best at major resistance levels",
    ],
    successRate: 74,
    timeframes: ["15m", "1h", "4h"],
    // Uptrend -> long bullish -> small doji -> long bearish
    candles: [
      { open: 25, high: 32, low: 23, close: 30 },
      { open: 30, high: 40, low: 28, close: 38 },
      { open: 38, high: 60, low: 36, close: 58 }, // Long bullish
      { open: 60, high: 64, low: 58, close: 61 }, // Small doji/spinning top
      { open: 60, high: 62, low: 35, close: 38 }, // Long bearish
      { open: 38, high: 40, low: 25, close: 28 },
      { open: 28, high: 30, low: 18, close: 20 },
    ],
  },
  {
    id: "triple-top",
    name: "Triple Top",
    category: "reversal",
    direction: "bearish",
    description:
      "A bearish reversal pattern with three consecutive peaks at approximately the same price level. Stronger than double top as it shows multiple failed attempts to break resistance.",
    identification: [
      "Three distinct peaks at similar price levels",
      "Two moderate troughs between the peaks",
      "Volume typically decreases with each peak",
      "Breakdown below support confirms pattern",
    ],
    tradingTips: [
      "Enter FALL on breakdown below support line",
      "Target equals pattern height from breakdown",
      "More reliable than double top pattern",
      "Watch for increasing volume on breakdown",
    ],
    successRate: 80,
    timeframes: ["1h", "4h", "1d"],
    candles: [
      { open: 35, high: 40, low: 33, close: 38 },
      { open: 38, high: 68, low: 36, close: 66 },
      { open: 66, high: 68, low: 52, close: 54 },
      { open: 54, high: 56, low: 48, close: 50 },
      { open: 50, high: 67, low: 48, close: 65 },
      { open: 65, high: 67, low: 50, close: 52 },
      { open: 52, high: 54, low: 46, close: 48 },
      { open: 48, high: 68, low: 46, close: 64 },
      { open: 64, high: 66, low: 42, close: 44 },
      { open: 44, high: 46, low: 30, close: 32 },
    ],
  },
  {
    id: "shooting-star",
    name: "Shooting Star",
    category: "reversal",
    direction: "bearish",
    description:
      "A single-candle bearish reversal pattern with a small body at the bottom and a long upper shadow. Signals potential reversal when appearing at the top of an uptrend.",
    identification: [
      "Small real body at the lower end of range",
      "Upper shadow at least 2x the body length",
      "Little or no lower shadow",
      "Appears at the top of an uptrend",
    ],
    tradingTips: [
      "Enter FALL on confirmation candle close",
      "More reliable at key resistance levels",
      "Shows rejection of higher prices",
      "Combine with overbought RSI for stronger signal",
    ],
    successRate: 69,
    timeframes: ["5m", "15m", "1h"],
    candles: [
      { open: 30, high: 35, low: 28, close: 34 },
      { open: 34, high: 42, low: 32, close: 40 },
      { open: 40, high: 50, low: 38, close: 48 },
      { open: 48, high: 58, low: 46, close: 56 },
      { open: 56, high: 78, low: 54, close: 58 }, // Shooting star
      { open: 58, high: 60, low: 48, close: 50 },
      { open: 50, high: 52, low: 40, close: 42 },
    ],
  },
  {
    id: "hanging-man",
    name: "Hanging Man",
    category: "reversal",
    direction: "bearish",
    description:
      "A single-candle bearish reversal pattern that looks like a hammer but appears at the top of an uptrend. Small body at top with long lower shadow.",
    identification: [
      "Small real body at the upper end of range",
      "Lower shadow at least 2x the body length",
      "Little or no upper shadow",
      "Appears at the top of an uptrend",
    ],
    tradingTips: [
      "Wait for bearish confirmation candle",
      "Enter FALL after confirmation closes",
      "Best at significant resistance levels",
      "Color of body doesn't matter much",
    ],
    successRate: 66,
    timeframes: ["5m", "15m", "1h"],
    candles: [
      { open: 30, high: 35, low: 28, close: 34 },
      { open: 34, high: 42, low: 32, close: 40 },
      { open: 40, high: 50, low: 38, close: 48 },
      { open: 48, high: 60, low: 46, close: 58 },
      { open: 58, high: 62, low: 42, close: 60 }, // Hanging man
      { open: 60, high: 62, low: 50, close: 52 },
      { open: 52, high: 54, low: 42, close: 44 },
    ],
  },
  {
    id: "three-black-crows",
    name: "Three Black Crows",
    category: "reversal",
    direction: "bearish",
    description:
      "A strong bearish reversal pattern consisting of three consecutive long-bodied bearish candles, each opening within the previous candle's body and closing lower.",
    identification: [
      "Three consecutive bearish candles",
      "Each candle has a long body",
      "Each opens within previous body",
      "Each closes near its low",
    ],
    tradingTips: [
      "Enter FALL after third candle closes",
      "Very strong reversal signal",
      "Watch for decreasing candle sizes (exhaustion)",
      "Best after extended uptrend",
    ],
    successRate: 79,
    timeframes: ["15m", "1h", "4h"],
    candles: [
      { open: 40, high: 48, low: 38, close: 46 },
      { open: 46, high: 56, low: 44, close: 54 },
      { open: 54, high: 68, low: 52, close: 66 },
      { open: 64, high: 66, low: 50, close: 52 }, // First crow
      { open: 54, high: 56, low: 38, close: 40 }, // Second crow
      { open: 42, high: 44, low: 26, close: 28 }, // Third crow
      { open: 28, high: 30, low: 18, close: 20 },
    ],
  },
  {
    id: "dark-cloud-cover",
    name: "Dark Cloud Cover",
    category: "reversal",
    direction: "bearish",
    description:
      "A two-candle bearish reversal pattern where a bearish candle opens above the prior bullish candle's high and closes below its midpoint.",
    identification: [
      "First candle is bullish with long body",
      "Second candle opens above first's high",
      "Second candle closes below first's midpoint",
      "Appears at the top of an uptrend",
    ],
    tradingTips: [
      "Enter FALL on confirmation below second candle low",
      "Stronger when second candle closes below 50% of first",
      "Most effective at resistance levels",
      "Combine with volume analysis",
    ],
    successRate: 67,
    timeframes: ["15m", "1h", "4h"],
    candles: [
      { open: 30, high: 35, low: 28, close: 34 },
      { open: 34, high: 42, low: 32, close: 40 },
      { open: 40, high: 48, low: 38, close: 46 },
      { open: 46, high: 68, low: 44, close: 66 }, // Long bullish
      { open: 70, high: 72, low: 52, close: 54 }, // Dark cloud cover
      { open: 54, high: 56, low: 42, close: 44 },
      { open: 44, high: 46, low: 32, close: 34 },
    ],
  },
  {
    id: "bearish-harami",
    name: "Bearish Harami",
    category: "reversal",
    direction: "bearish",
    description:
      "A two-candle pattern where a small bearish candle is completely contained within the body of the previous large bullish candle. Signals potential reversal.",
    identification: [
      "Large bullish candle followed by small bearish",
      "Second candle body within first candle body",
      "Shadows may extend beyond first candle",
      "Appears in an uptrend",
    ],
    tradingTips: [
      "Wait for confirmation before entering FALL",
      "Small candle shows indecision/loss of momentum",
      "More reliable with volume decrease on second candle",
      "Best at key resistance levels",
    ],
    successRate: 61,
    timeframes: ["5m", "15m", "1h"],
    candles: [
      { open: 30, high: 34, low: 28, close: 32 },
      { open: 32, high: 40, low: 30, close: 38 },
      { open: 38, high: 48, low: 36, close: 46 },
      { open: 46, high: 68, low: 44, close: 66 }, // Large bullish
      { open: 62, high: 64, low: 56, close: 58 }, // Small bearish inside
      { open: 58, high: 60, low: 48, close: 50 },
      { open: 50, high: 52, low: 40, close: 42 },
    ],
  },
  {
    id: "tweezer-top",
    name: "Tweezer Top",
    category: "reversal",
    direction: "bearish",
    description:
      "A two-candle pattern with matching highs, where the first is bullish and the second is bearish. Shows strong resistance at a price level.",
    identification: [
      "Two candles with nearly identical highs",
      "First candle is bullish",
      "Second candle is bearish",
      "Occurs at the end of an uptrend",
    ],
    tradingTips: [
      "Enter FALL after second candle closes",
      "Matching highs show strong resistance",
      "More reliable on higher timeframes",
      "Combine with resistance level analysis",
    ],
    successRate: 66,
    timeframes: ["15m", "1h", "4h"],
    candles: [
      { open: 35, high: 40, low: 33, close: 38 },
      { open: 38, high: 48, low: 36, close: 46 },
      { open: 46, high: 56, low: 44, close: 54 },
      { open: 54, high: 68, low: 52, close: 66 }, // First - bullish
      { open: 66, high: 68, low: 52, close: 54 }, // Second - bearish, same high
      { open: 54, high: 56, low: 44, close: 46 },
      { open: 46, high: 48, low: 36, close: 38 },
    ],
  },
  {
    id: "bearish-abandoned-baby",
    name: "Bearish Abandoned Baby",
    category: "reversal",
    direction: "bearish",
    description:
      "A rare and strong three-candle reversal pattern. A doji gaps above a bullish candle, then a bearish candle gaps down below the doji.",
    identification: [
      "Large bullish candle in uptrend",
      "Doji that gaps above the first candle",
      "Bearish candle that gaps below the doji",
      "Gaps on both sides of the doji are key",
    ],
    tradingTips: [
      "Very strong reversal signal - enter FALL immediately",
      "Gaps are essential for pattern validity",
      "Rare pattern with high reliability",
      "Set expiry based on expected reversal duration",
    ],
    successRate: 84,
    timeframes: ["1h", "4h", "1d"],
    candles: [
      { open: 30, high: 38, low: 28, close: 36 },
      { open: 36, high: 52, low: 34, close: 50 }, // Large bullish
      { open: 58, high: 60, low: 56, close: 58 }, // Doji with gap
      { open: 50, high: 52, low: 35, close: 38 }, // Bearish with gap
      { open: 38, high: 40, low: 25, close: 28 },
    ],
  },

  // ============================================================================
  // CONTINUATION PATTERNS
  // ============================================================================
  {
    id: "bull-flag",
    name: "Bull Flag",
    category: "continuation",
    direction: "bullish",
    description:
      "A bullish continuation pattern with a strong upward move (pole) followed by a consolidating channel that slopes slightly downward (flag).",
    identification: [
      "Strong upward price movement (pole)",
      "Consolidation in parallel downward channel",
      "Volume decreases during flag formation",
      "Breakout occurs to the upside",
    ],
    tradingTips: [
      "Enter RISE on breakout above flag resistance",
      "Target equals pole length from breakout",
      "Tighter flags often more reliable",
      "Confirm with volume spike on breakout",
    ],
    successRate: 67,
    timeframes: ["5m", "15m", "1h"],
    // Strong up move (pole) -> consolidation down (flag) -> breakout up
    candles: [
      { open: 25, high: 35, low: 24, close: 34 }, // Pole start
      { open: 34, high: 48, low: 32, close: 46 },
      { open: 46, high: 62, low: 44, close: 60 }, // Pole end
      { open: 60, high: 62, low: 54, close: 56 }, // Flag start (down)
      { open: 56, high: 58, low: 50, close: 52 },
      { open: 52, high: 55, low: 48, close: 50 }, // Flag end
      { open: 50, high: 68, low: 48, close: 66 }, // Breakout!
      { open: 66, high: 80, low: 64, close: 78 },
    ],
  },
  {
    id: "bear-flag",
    name: "Bear Flag",
    category: "continuation",
    direction: "bearish",
    description:
      "A bearish continuation pattern with a strong downward move (pole) followed by a consolidating channel that slopes slightly upward (flag).",
    identification: [
      "Strong downward price movement (pole)",
      "Consolidation in parallel upward channel",
      "Volume decreases during flag formation",
      "Breakdown occurs to the downside",
    ],
    tradingTips: [
      "Enter FALL on breakdown below flag support",
      "Target equals pole length from breakdown",
      "Tighter flags often more reliable",
      "Confirm with volume spike on breakdown",
    ],
    successRate: 65,
    timeframes: ["5m", "15m", "1h"],
    // Strong down move (pole) -> consolidation up (flag) -> breakdown
    candles: [
      { open: 75, high: 77, low: 65, close: 66 }, // Pole start
      { open: 66, high: 68, low: 52, close: 54 },
      { open: 54, high: 56, low: 40, close: 42 }, // Pole end
      { open: 42, high: 48, low: 40, close: 46 }, // Flag start (up)
      { open: 46, high: 52, low: 44, close: 50 },
      { open: 50, high: 54, low: 48, close: 52 }, // Flag end
      { open: 52, high: 54, low: 35, close: 36 }, // Breakdown!
      { open: 36, high: 38, low: 22, close: 24 },
    ],
  },
  {
    id: "ascending-triangle",
    name: "Ascending Triangle",
    category: "continuation",
    direction: "bullish",
    description:
      "A bullish pattern with a flat upper resistance and rising lower support. Often signals a breakout to the upside in an existing uptrend.",
    identification: [
      "Flat horizontal resistance line",
      "Rising support line (higher lows)",
      "Price range narrows over time",
      "Volume typically decreases before breakout",
    ],
    tradingTips: [
      "Enter RISE on breakout above resistance",
      "Target equals triangle height from breakout",
      "More reliable in existing uptrends",
      "Wait for candle close above resistance",
    ],
    successRate: 73,
    timeframes: ["15m", "1h", "4h"],
    // Higher lows with flat resistance at ~65 -> breakout
    candles: [
      { open: 35, high: 50, low: 33, close: 48 },
      { open: 48, high: 65, low: 46, close: 55 }, // Hit resistance
      { open: 55, high: 58, low: 42, close: 44 }, // Higher low 1
      { open: 44, high: 65, low: 42, close: 60 }, // Hit resistance
      { open: 60, high: 62, low: 50, close: 52 }, // Higher low 2
      { open: 52, high: 66, low: 50, close: 64 }, // Hit resistance
      { open: 64, high: 66, low: 56, close: 58 }, // Higher low 3
      { open: 58, high: 80, low: 56, close: 78 }, // Breakout!
      { open: 78, high: 88, low: 76, close: 85 },
    ],
  },
  {
    id: "descending-triangle",
    name: "Descending Triangle",
    category: "continuation",
    direction: "bearish",
    description:
      "A bearish pattern with a flat lower support and falling upper resistance. Often signals a breakdown in an existing downtrend.",
    identification: [
      "Flat horizontal support line",
      "Falling resistance line (lower highs)",
      "Price range narrows over time",
      "Volume typically decreases before breakdown",
    ],
    tradingTips: [
      "Enter FALL on breakdown below support",
      "Target equals triangle height from breakdown",
      "More reliable in existing downtrends",
      "Wait for candle close below support",
    ],
    successRate: 72,
    timeframes: ["15m", "1h", "4h"],
    // Lower highs with flat support at ~35 -> breakdown
    candles: [
      { open: 65, high: 68, low: 50, close: 52 },
      { open: 52, high: 54, low: 35, close: 45 }, // Hit support
      { open: 45, high: 60, low: 43, close: 58 }, // Lower high 1
      { open: 58, high: 60, low: 36, close: 38 }, // Hit support
      { open: 38, high: 52, low: 36, close: 50 }, // Lower high 2
      { open: 50, high: 52, low: 35, close: 40 }, // Hit support
      { open: 40, high: 45, low: 38, close: 43 }, // Lower high 3
      { open: 43, high: 44, low: 22, close: 24 }, // Breakdown!
      { open: 24, high: 26, low: 12, close: 15 },
    ],
  },
  {
    id: "bull-pennant",
    name: "Bull Pennant",
    category: "continuation",
    direction: "bullish",
    description:
      "A bullish continuation pattern similar to a flag but with converging trendlines instead of parallel. Forms after a strong upward move with price consolidating in a symmetrical triangle.",
    identification: [
      "Strong upward price movement (pole)",
      "Consolidation with converging trendlines",
      "Lower volume during pennant formation",
      "Breakout to the upside continues the trend",
    ],
    tradingTips: [
      "Enter RISE on breakout above upper trendline",
      "Target equals pole length from breakout",
      "Pattern should complete within 1-3 weeks",
      "Volume expansion confirms breakout",
    ],
    successRate: 70,
    timeframes: ["15m", "1h", "4h"],
    candles: [
      { open: 25, high: 35, low: 24, close: 34 },
      { open: 34, high: 50, low: 32, close: 48 },
      { open: 48, high: 65, low: 46, close: 62 }, // Pole
      { open: 62, high: 64, low: 56, close: 58 },
      { open: 58, high: 62, low: 54, close: 60 },
      { open: 60, high: 61, low: 55, close: 57 },
      { open: 57, high: 60, low: 56, close: 58 }, // Pennant apex
      { open: 58, high: 78, low: 56, close: 76 }, // Breakout
      { open: 76, high: 88, low: 74, close: 85 },
    ],
  },
  {
    id: "bear-pennant",
    name: "Bear Pennant",
    category: "continuation",
    direction: "bearish",
    description:
      "A bearish continuation pattern with converging trendlines forming after a strong downward move. Signals continuation of the downtrend.",
    identification: [
      "Strong downward price movement (pole)",
      "Consolidation with converging trendlines",
      "Lower volume during pennant formation",
      "Breakdown to the downside continues the trend",
    ],
    tradingTips: [
      "Enter FALL on breakdown below lower trendline",
      "Target equals pole length from breakdown",
      "Pattern should complete within 1-3 weeks",
      "Volume expansion confirms breakdown",
    ],
    successRate: 68,
    timeframes: ["15m", "1h", "4h"],
    candles: [
      { open: 75, high: 77, low: 65, close: 66 },
      { open: 66, high: 68, low: 50, close: 52 },
      { open: 52, high: 54, low: 38, close: 40 }, // Pole
      { open: 40, high: 46, low: 38, close: 44 },
      { open: 44, high: 48, low: 40, close: 42 },
      { open: 42, high: 45, low: 41, close: 44 },
      { open: 44, high: 46, low: 42, close: 43 }, // Pennant apex
      { open: 43, high: 44, low: 25, close: 26 }, // Breakdown
      { open: 26, high: 28, low: 15, close: 18 },
    ],
  },
  {
    id: "rectangle-bullish",
    name: "Rectangle (Bullish)",
    category: "continuation",
    direction: "bullish",
    description:
      "A consolidation pattern where price bounces between horizontal support and resistance levels in an uptrend. Breakout typically continues the prior trend.",
    identification: [
      "Horizontal support and resistance lines",
      "Price bounces between both levels",
      "At least two touches on each level",
      "Breakout above resistance is bullish",
    ],
    tradingTips: [
      "Enter RISE on breakout above resistance",
      "Target equals rectangle height from breakout",
      "Volume should decrease during consolidation",
      "Longer rectangles often produce stronger moves",
    ],
    successRate: 69,
    timeframes: ["15m", "1h", "4h"],
    candles: [
      { open: 35, high: 50, low: 33, close: 48 },
      { open: 48, high: 65, low: 46, close: 55 }, // Resistance
      { open: 55, high: 58, low: 38, close: 40 }, // Support
      { open: 40, high: 64, low: 38, close: 62 }, // Resistance
      { open: 62, high: 64, low: 42, close: 44 }, // Support
      { open: 44, high: 65, low: 42, close: 60 }, // Resistance
      { open: 60, high: 62, low: 40, close: 42 }, // Support
      { open: 42, high: 78, low: 40, close: 76 }, // Breakout
      { open: 76, high: 88, low: 74, close: 85 },
    ],
  },
  {
    id: "rectangle-bearish",
    name: "Rectangle (Bearish)",
    category: "continuation",
    direction: "bearish",
    description:
      "A consolidation pattern in a downtrend where price bounces between horizontal levels. Breakdown typically continues the prior downtrend.",
    identification: [
      "Horizontal support and resistance lines",
      "Price bounces between both levels",
      "At least two touches on each level",
      "Breakdown below support is bearish",
    ],
    tradingTips: [
      "Enter FALL on breakdown below support",
      "Target equals rectangle height from breakdown",
      "Volume should decrease during consolidation",
      "Longer rectangles often produce stronger moves",
    ],
    successRate: 67,
    timeframes: ["15m", "1h", "4h"],
    candles: [
      { open: 65, high: 68, low: 50, close: 52 },
      { open: 52, high: 68, low: 50, close: 66 }, // Resistance
      { open: 66, high: 68, low: 52, close: 54 }, // Support
      { open: 54, high: 66, low: 52, close: 64 }, // Resistance
      { open: 64, high: 66, low: 54, close: 56 }, // Support
      { open: 56, high: 68, low: 54, close: 62 }, // Resistance
      { open: 62, high: 64, low: 32, close: 34 }, // Breakdown
      { open: 34, high: 36, low: 20, close: 22 },
    ],
  },
  {
    id: "cup-and-handle",
    name: "Cup and Handle",
    category: "continuation",
    direction: "bullish",
    description:
      "A bullish continuation pattern resembling a tea cup. The cup is a U-shaped recovery from a downtrend, and the handle is a small downward drift before breakout.",
    identification: [
      "U-shaped cup with relatively equal highs",
      "Cup depth typically 12-33% of prior advance",
      "Handle forms in upper half of cup",
      "Handle drift should be less than cup depth",
    ],
    tradingTips: [
      "Enter RISE on breakout above handle high",
      "Target equals cup depth from breakout",
      "Handle volume should be lighter than cup",
      "Pattern takes weeks to months to form",
    ],
    successRate: 75,
    timeframes: ["1h", "4h", "1d"],
    candles: [
      { open: 65, high: 68, low: 62, close: 64 }, // Cup left rim
      { open: 64, high: 66, low: 50, close: 52 },
      { open: 52, high: 54, low: 38, close: 40 }, // Cup bottom
      { open: 40, high: 55, low: 38, close: 52 },
      { open: 52, high: 66, low: 50, close: 64 }, // Cup right rim
      { open: 64, high: 66, low: 58, close: 60 }, // Handle start
      { open: 60, high: 62, low: 56, close: 58 }, // Handle bottom
      { open: 58, high: 78, low: 56, close: 76 }, // Breakout
      { open: 76, high: 88, low: 74, close: 85 },
    ],
  },
  {
    id: "inverse-cup-handle",
    name: "Inverse Cup and Handle",
    category: "continuation",
    direction: "bearish",
    description:
      "A bearish continuation pattern that's the inverse of cup and handle. An inverted U-shaped top followed by a small upward handle before breakdown.",
    identification: [
      "Inverted U-shaped cup (dome top)",
      "Handle forms in lower half of pattern",
      "Handle shows small upward drift",
      "Breakdown below handle confirms pattern",
    ],
    tradingTips: [
      "Enter FALL on breakdown below handle low",
      "Target equals cup depth from breakdown",
      "Handle volume should be lighter",
      "Less common than bullish cup and handle",
    ],
    successRate: 70,
    timeframes: ["1h", "4h", "1d"],
    candles: [
      { open: 35, high: 40, low: 33, close: 38 }, // Cup left base
      { open: 38, high: 55, low: 36, close: 52 },
      { open: 52, high: 68, low: 50, close: 65 }, // Cup top
      { open: 65, high: 67, low: 50, close: 52 },
      { open: 52, high: 54, low: 36, close: 38 }, // Cup right base
      { open: 38, high: 46, low: 36, close: 44 }, // Handle
      { open: 44, high: 46, low: 40, close: 42 },
      { open: 42, high: 44, low: 24, close: 26 }, // Breakdown
      { open: 26, high: 28, low: 15, close: 18 },
    ],
  },
  {
    id: "channel-up",
    name: "Ascending Channel",
    category: "continuation",
    direction: "bullish",
    description:
      "A bullish continuation pattern where price trends upward within two parallel lines. Offers multiple trading opportunities as price bounces between support and resistance.",
    identification: [
      "Two parallel upward-sloping trendlines",
      "Price bounces between channel boundaries",
      "Higher highs and higher lows within channel",
      "Breakout above channel is very bullish",
    ],
    tradingTips: [
      "Enter RISE at channel support bounces",
      "Enter RISE on breakout above channel",
      "Channel breakdown may signal reversal",
      "Target equals channel width on breakout",
    ],
    successRate: 71,
    timeframes: ["15m", "1h", "4h"],
    candles: [
      { open: 30, high: 38, low: 28, close: 36 },
      { open: 36, high: 50, low: 34, close: 42 },
      { open: 42, high: 55, low: 40, close: 52 },
      { open: 52, high: 58, low: 46, close: 48 },
      { open: 48, high: 60, low: 46, close: 58 },
      { open: 58, high: 68, low: 54, close: 56 },
      { open: 56, high: 72, low: 54, close: 70 },
      { open: 70, high: 80, low: 66, close: 78 },
    ],
  },
  {
    id: "channel-down",
    name: "Descending Channel",
    category: "continuation",
    direction: "bearish",
    description:
      "A bearish continuation pattern where price trends downward within two parallel lines. Price bounces between declining support and resistance.",
    identification: [
      "Two parallel downward-sloping trendlines",
      "Price bounces between channel boundaries",
      "Lower highs and lower lows within channel",
      "Breakdown below channel is very bearish",
    ],
    tradingTips: [
      "Enter FALL at channel resistance bounces",
      "Enter FALL on breakdown below channel",
      "Channel breakout may signal reversal",
      "Target equals channel width on breakdown",
    ],
    successRate: 69,
    timeframes: ["15m", "1h", "4h"],
    candles: [
      { open: 70, high: 72, low: 62, close: 64 },
      { open: 64, high: 68, low: 56, close: 58 },
      { open: 58, high: 64, low: 50, close: 52 },
      { open: 52, high: 58, low: 44, close: 54 },
      { open: 54, high: 56, low: 42, close: 44 },
      { open: 44, high: 50, low: 36, close: 48 },
      { open: 48, high: 50, low: 32, close: 34 },
      { open: 34, high: 38, low: 24, close: 26 },
    ],
  },
  {
    id: "rounding-bottom",
    name: "Rounding Bottom",
    category: "continuation",
    direction: "bullish",
    description:
      "A long-term bullish reversal pattern that shows a gradual shift from a downtrend to an uptrend. The rounded bottom looks like a saucer or bowl shape.",
    identification: [
      "Gradual decline followed by gradual rise",
      "U-shaped or saucer-like appearance",
      "Volume typically decreases then increases",
      "Takes weeks to months to complete",
    ],
    tradingTips: [
      "Enter RISE on breakout above left rim high",
      "Patient pattern - long formation time",
      "Volume confirmation important on breakout",
      "Target equals depth of pattern",
    ],
    successRate: 76,
    timeframes: ["4h", "1d", "1w"],
    candles: [
      { open: 65, high: 68, low: 62, close: 64 }, // Left rim
      { open: 64, high: 66, low: 55, close: 58 },
      { open: 58, high: 60, low: 48, close: 50 },
      { open: 50, high: 52, low: 42, close: 44 }, // Bottom
      { open: 44, high: 50, low: 42, close: 48 },
      { open: 48, high: 56, low: 46, close: 54 },
      { open: 54, high: 64, low: 52, close: 62 },
      { open: 62, high: 78, low: 60, close: 76 }, // Breakout
    ],
  },
  {
    id: "rounding-top",
    name: "Rounding Top",
    category: "continuation",
    direction: "bearish",
    description:
      "A long-term bearish reversal pattern showing a gradual shift from uptrend to downtrend. The rounded top looks like an inverted saucer or dome.",
    identification: [
      "Gradual rise followed by gradual decline",
      "Inverted U-shaped or dome appearance",
      "Volume typically increases then decreases",
      "Takes weeks to months to complete",
    ],
    tradingTips: [
      "Enter FALL on breakdown below left rim low",
      "Patient pattern - long formation time",
      "Volume often lighter during topping",
      "Target equals height of pattern",
    ],
    successRate: 74,
    timeframes: ["4h", "1d", "1w"],
    candles: [
      { open: 35, high: 38, low: 32, close: 36 }, // Left base
      { open: 36, high: 44, low: 34, close: 42 },
      { open: 42, high: 52, low: 40, close: 50 },
      { open: 50, high: 58, low: 48, close: 56 }, // Top
      { open: 56, high: 58, low: 48, close: 50 },
      { open: 50, high: 52, low: 42, close: 44 },
      { open: 44, high: 46, low: 36, close: 38 },
      { open: 38, high: 40, low: 22, close: 24 }, // Breakdown
    ],
  },

  // ============================================================================
  // BILATERAL PATTERNS
  // ============================================================================
  {
    id: "symmetrical-triangle",
    name: "Symmetrical Triangle",
    category: "bilateral",
    direction: "neutral",
    description:
      "A neutral pattern where price converges with lower highs and higher lows. Can break in either direction, typically continuing the prior trend.",
    identification: [
      "Converging trendlines (lower highs, higher lows)",
      "Price range narrows symmetrically",
      "At least two touches on each trendline",
      "Volume decreases as pattern forms",
    ],
    tradingTips: [
      "Wait for breakout before entering",
      "Trade in direction of breakout",
      "Target equals widest part of triangle",
      "Prior trend direction often determines breakout",
    ],
    successRate: 68,
    timeframes: ["15m", "1h", "4h"],
    // Converging price action with lower highs and higher lows
    candles: [
      { open: 50, high: 75, low: 48, close: 72 }, // Wide range
      { open: 72, high: 74, low: 30, close: 32 }, // Wide range
      { open: 32, high: 65, low: 30, close: 62 }, // Lower high
      { open: 62, high: 64, low: 38, close: 40 }, // Higher low
      { open: 40, high: 58, low: 38, close: 55 }, // Lower high
      { open: 55, high: 57, low: 44, close: 46 }, // Higher low
      { open: 46, high: 54, low: 44, close: 52 }, // Converging
      { open: 52, high: 75, low: 50, close: 72 }, // Breakout up
      { open: 72, high: 85, low: 70, close: 82 },
    ],
  },
  {
    id: "wedge",
    name: "Rising/Falling Wedge",
    category: "bilateral",
    direction: "neutral",
    description:
      "A pattern where price moves between converging trendlines that both slope in the same direction. Rising wedges are bearish, falling wedges are bullish.",
    identification: [
      "Both trendlines slope in same direction",
      "Rising wedge: Both lines slope up (bearish)",
      "Falling wedge: Both lines slope down (bullish)",
      "Price narrows as pattern develops",
    ],
    tradingTips: [
      "Rising wedge: Enter FALL on breakdown",
      "Falling wedge: Enter RISE on breakout",
      "Best after extended trends",
      "Target equals wedge height from breakout",
    ],
    successRate: 70,
    timeframes: ["15m", "1h", "4h"],
    // Falling wedge pattern (both lines slope down, bullish breakout)
    candles: [
      { open: 70, high: 72, low: 55, close: 58 },
      { open: 58, high: 65, low: 50, close: 62 },
      { open: 62, high: 64, low: 48, close: 52 },
      { open: 52, high: 58, low: 42, close: 55 },
      { open: 55, high: 56, low: 40, close: 44 },
      { open: 44, high: 50, low: 38, close: 48 },
      { open: 48, high: 52, low: 36, close: 40 }, // Wedge apex
      { open: 40, high: 62, low: 38, close: 60 }, // Bullish breakout
      { open: 60, high: 75, low: 58, close: 72 },
    ],
  },
  {
    id: "rising-wedge",
    name: "Rising Wedge",
    category: "bilateral",
    direction: "bearish",
    description:
      "A bearish pattern where both support and resistance lines slope upward but converge. Despite the upward slope, this pattern typically breaks down.",
    identification: [
      "Both trendlines slope upward",
      "Upper line (resistance) has less slope",
      "Price makes higher highs and higher lows",
      "Lines converge as pattern develops",
    ],
    tradingTips: [
      "Enter FALL on breakdown below support",
      "Target equals widest part of wedge",
      "Watch for volume decrease during formation",
      "Breakdown often sharp and decisive",
    ],
    successRate: 72,
    timeframes: ["15m", "1h", "4h"],
    candles: [
      { open: 30, high: 38, low: 28, close: 36 },
      { open: 36, high: 45, low: 34, close: 42 },
      { open: 42, high: 52, low: 38, close: 48 },
      { open: 48, high: 56, low: 44, close: 52 },
      { open: 52, high: 58, low: 48, close: 54 },
      { open: 54, high: 60, low: 50, close: 56 },
      { open: 56, high: 62, low: 52, close: 58 }, // Apex
      { open: 58, high: 60, low: 38, close: 40 }, // Breakdown
      { open: 40, high: 42, low: 28, close: 30 },
    ],
  },
  {
    id: "falling-wedge",
    name: "Falling Wedge",
    category: "bilateral",
    direction: "bullish",
    description:
      "A bullish pattern where both support and resistance lines slope downward but converge. Despite the downward slope, this pattern typically breaks upward.",
    identification: [
      "Both trendlines slope downward",
      "Lower line (support) has less slope",
      "Price makes lower highs and lower lows",
      "Lines converge as pattern develops",
    ],
    tradingTips: [
      "Enter RISE on breakout above resistance",
      "Target equals widest part of wedge",
      "Watch for volume decrease during formation",
      "Breakout often sharp and decisive",
    ],
    successRate: 74,
    timeframes: ["15m", "1h", "4h"],
    candles: [
      { open: 70, high: 72, low: 62, close: 64 },
      { open: 64, high: 68, low: 56, close: 58 },
      { open: 58, high: 62, low: 50, close: 52 },
      { open: 52, high: 56, low: 46, close: 48 },
      { open: 48, high: 52, low: 42, close: 44 },
      { open: 44, high: 48, low: 40, close: 42 },
      { open: 42, high: 46, low: 38, close: 40 }, // Apex
      { open: 40, high: 62, low: 38, close: 60 }, // Breakout
      { open: 60, high: 75, low: 58, close: 72 },
    ],
  },
  {
    id: "broadening-formation",
    name: "Broadening Formation",
    category: "bilateral",
    direction: "neutral",
    description:
      "A pattern where price makes higher highs and lower lows, creating expanding trendlines. Also known as megaphone pattern. Indicates increasing volatility and uncertainty.",
    identification: [
      "Higher highs and lower lows (expanding)",
      "Trendlines diverge rather than converge",
      "Increased volatility as pattern develops",
      "Can break in either direction",
    ],
    tradingTips: [
      "Trade breakouts from the pattern boundaries",
      "More reliable when forms after uptrend",
      "Use tight stops due to volatility",
      "Often occurs at market tops",
    ],
    successRate: 60,
    timeframes: ["1h", "4h", "1d"],
    candles: [
      { open: 50, high: 58, low: 45, close: 55 },
      { open: 55, high: 62, low: 42, close: 45 },
      { open: 45, high: 68, low: 38, close: 65 },
      { open: 65, high: 70, low: 35, close: 38 },
      { open: 38, high: 75, low: 32, close: 72 },
      { open: 72, high: 78, low: 28, close: 30 },
      { open: 30, high: 82, low: 25, close: 78 }, // Breakout up
    ],
  },
  {
    id: "diamond-top",
    name: "Diamond Top",
    category: "bilateral",
    direction: "bearish",
    description:
      "A rare reversal pattern that looks like a diamond shape. Combines a broadening formation followed by a symmetrical triangle. Signals major trend reversal.",
    identification: [
      "First half: Expanding price range",
      "Second half: Contracting price range",
      "Forms a diamond shape on chart",
      "Usually forms at market tops",
    ],
    tradingTips: [
      "Enter FALL on breakdown below lower right side",
      "Target equals diamond height from breakdown",
      "Rare but highly reliable pattern",
      "Volume typically decreases in second half",
    ],
    successRate: 78,
    timeframes: ["4h", "1d", "1w"],
    candles: [
      { open: 50, high: 58, low: 48, close: 55 }, // Start
      { open: 55, high: 65, low: 45, close: 48 }, // Expanding
      { open: 48, high: 72, low: 40, close: 68 }, // Widest
      { open: 68, high: 75, low: 38, close: 42 }, // Widest
      { open: 42, high: 68, low: 40, close: 62 }, // Contracting
      { open: 62, high: 65, low: 48, close: 52 }, // Contracting
      { open: 52, high: 56, low: 35, close: 38 }, // Breakdown
      { open: 38, high: 40, low: 25, close: 28 },
    ],
  },
  {
    id: "diamond-bottom",
    name: "Diamond Bottom",
    category: "bilateral",
    direction: "bullish",
    description:
      "A rare bullish reversal pattern forming a diamond shape at market bottoms. Combines a broadening formation followed by a symmetrical triangle.",
    identification: [
      "First half: Expanding price range",
      "Second half: Contracting price range",
      "Forms a diamond shape on chart",
      "Usually forms at market bottoms",
    ],
    tradingTips: [
      "Enter RISE on breakout above upper right side",
      "Target equals diamond height from breakout",
      "Rare but highly reliable pattern",
      "Volume typically increases on breakout",
    ],
    successRate: 77,
    timeframes: ["4h", "1d", "1w"],
    candles: [
      { open: 50, high: 52, low: 42, close: 45 }, // Start
      { open: 45, high: 55, low: 35, close: 52 }, // Expanding
      { open: 52, high: 60, low: 28, close: 32 }, // Widest
      { open: 32, high: 62, low: 25, close: 58 }, // Widest
      { open: 58, high: 60, low: 32, close: 38 }, // Contracting
      { open: 38, high: 52, low: 35, close: 48 }, // Contracting
      { open: 48, high: 65, low: 45, close: 62 }, // Breakout
      { open: 62, high: 78, low: 60, close: 75 },
    ],
  },

  // ============================================================================
  // CANDLESTICK SINGLE PATTERNS (Doji variants, etc.)
  // ============================================================================
  {
    id: "doji",
    name: "Doji",
    category: "reversal",
    direction: "neutral",
    description:
      "A single-candle pattern where open and close are nearly equal, creating a cross or plus sign shape. Signals indecision and potential trend reversal.",
    identification: [
      "Open and close at nearly same price",
      "Can have long or short shadows",
      "Body is very small or nonexistent",
      "Context determines significance",
    ],
    tradingTips: [
      "Wait for confirmation candle before trading",
      "Bullish at support, bearish at resistance",
      "More significant after extended trends",
      "Combine with other indicators for entry",
    ],
    successRate: 55,
    timeframes: ["5m", "15m", "1h"],
    candles: [
      { open: 50, high: 55, low: 48, close: 52 },
      { open: 52, high: 58, low: 50, close: 55 },
      { open: 55, high: 62, low: 53, close: 60 },
      { open: 60, high: 68, low: 52, close: 60 }, // Doji
      { open: 60, high: 62, low: 50, close: 52 },
      { open: 52, high: 54, low: 42, close: 44 },
    ],
  },
  {
    id: "dragonfly-doji",
    name: "Dragonfly Doji",
    category: "reversal",
    direction: "bullish",
    description:
      "A doji with a long lower shadow and no upper shadow. Open, high, and close are at the same level. Strong bullish signal at the bottom of downtrends.",
    identification: [
      "Open, high, and close at same level",
      "Long lower shadow (tail)",
      "No or tiny upper shadow",
      "T-shaped appearance",
    ],
    tradingTips: [
      "Enter RISE after bullish confirmation",
      "Very strong at support levels",
      "Shows rejection of lower prices",
      "More reliable after extended downtrend",
    ],
    successRate: 72,
    timeframes: ["15m", "1h", "4h"],
    candles: [
      { open: 60, high: 62, low: 55, close: 56 },
      { open: 56, high: 58, low: 48, close: 50 },
      { open: 50, high: 52, low: 40, close: 42 },
      { open: 42, high: 42, low: 25, close: 42 }, // Dragonfly doji
      { open: 42, high: 52, low: 40, close: 50 },
      { open: 50, high: 60, low: 48, close: 58 },
    ],
  },
  {
    id: "gravestone-doji",
    name: "Gravestone Doji",
    category: "reversal",
    direction: "bearish",
    description:
      "A doji with a long upper shadow and no lower shadow. Open, low, and close are at the same level. Strong bearish signal at the top of uptrends.",
    identification: [
      "Open, low, and close at same level",
      "Long upper shadow (wick)",
      "No or tiny lower shadow",
      "Inverted T-shaped appearance",
    ],
    tradingTips: [
      "Enter FALL after bearish confirmation",
      "Very strong at resistance levels",
      "Shows rejection of higher prices",
      "More reliable after extended uptrend",
    ],
    successRate: 71,
    timeframes: ["15m", "1h", "4h"],
    candles: [
      { open: 40, high: 45, low: 38, close: 43 },
      { open: 43, high: 52, low: 41, close: 50 },
      { open: 50, high: 60, low: 48, close: 58 },
      { open: 58, high: 75, low: 58, close: 58 }, // Gravestone doji
      { open: 58, high: 60, low: 48, close: 50 },
      { open: 50, high: 52, low: 40, close: 42 },
    ],
  },
  {
    id: "long-legged-doji",
    name: "Long-Legged Doji",
    category: "reversal",
    direction: "neutral",
    description:
      "A doji with long upper and lower shadows, showing extreme indecision. Open and close in the middle of the range. Signals major turning points.",
    identification: [
      "Open and close near the middle of range",
      "Long upper and lower shadows",
      "Shows extreme market indecision",
      "Large trading range with no direction",
    ],
    tradingTips: [
      "Very significant pattern - wait for direction",
      "Often precedes major moves",
      "Trade in direction of next candle",
      "Best at key support/resistance levels",
    ],
    successRate: 58,
    timeframes: ["15m", "1h", "4h"],
    candles: [
      { open: 50, high: 55, low: 48, close: 52 },
      { open: 52, high: 58, low: 46, close: 55 },
      { open: 55, high: 75, low: 35, close: 54 }, // Long-legged doji
      { open: 54, high: 68, low: 52, close: 66 },
      { open: 66, high: 78, low: 64, close: 75 },
    ],
  },
  {
    id: "marubozu-bullish",
    name: "Bullish Marubozu",
    category: "continuation",
    direction: "bullish",
    description:
      "A powerful single-candle pattern with no shadows - opens at low and closes at high. Shows complete buyer dominance and strong bullish momentum.",
    identification: [
      "Long bullish body with no shadows",
      "Open equals the low",
      "Close equals the high",
      "Shows complete buying pressure",
    ],
    tradingTips: [
      "Enter RISE after pattern forms",
      "Strong continuation signal in uptrends",
      "Can signal reversal at support",
      "Watch for follow-through on next candle",
    ],
    successRate: 73,
    timeframes: ["5m", "15m", "1h"],
    candles: [
      { open: 40, high: 45, low: 38, close: 44 },
      { open: 44, high: 48, low: 42, close: 46 },
      { open: 46, high: 65, low: 46, close: 65 }, // Bullish marubozu
      { open: 65, high: 75, low: 63, close: 72 },
      { open: 72, high: 80, low: 70, close: 78 },
    ],
  },
  {
    id: "marubozu-bearish",
    name: "Bearish Marubozu",
    category: "continuation",
    direction: "bearish",
    description:
      "A powerful single-candle pattern with no shadows - opens at high and closes at low. Shows complete seller dominance and strong bearish momentum.",
    identification: [
      "Long bearish body with no shadows",
      "Open equals the high",
      "Close equals the low",
      "Shows complete selling pressure",
    ],
    tradingTips: [
      "Enter FALL after pattern forms",
      "Strong continuation signal in downtrends",
      "Can signal reversal at resistance",
      "Watch for follow-through on next candle",
    ],
    successRate: 72,
    timeframes: ["5m", "15m", "1h"],
    candles: [
      { open: 60, high: 65, low: 58, close: 62 },
      { open: 62, high: 66, low: 60, close: 64 },
      { open: 64, high: 64, low: 40, close: 40 }, // Bearish marubozu
      { open: 40, high: 42, low: 32, close: 34 },
      { open: 34, high: 36, low: 26, close: 28 },
    ],
  },
  {
    id: "spinning-top",
    name: "Spinning Top",
    category: "reversal",
    direction: "neutral",
    description:
      "A single-candle pattern with a small body and long upper and lower shadows. Similar to doji but with a visible body. Shows indecision.",
    identification: [
      "Small body (but visible unlike doji)",
      "Long upper and lower shadows",
      "Body can be bullish or bearish",
      "Shadows longer than the body",
    ],
    tradingTips: [
      "Wait for next candle confirmation",
      "Shows market indecision like doji",
      "Trade break of spinning top range",
      "More significant after extended moves",
    ],
    successRate: 52,
    timeframes: ["5m", "15m", "1h"],
    candles: [
      { open: 50, high: 55, low: 48, close: 52 },
      { open: 52, high: 60, low: 48, close: 56 },
      { open: 56, high: 72, low: 42, close: 58 }, // Spinning top
      { open: 58, high: 68, low: 56, close: 65 },
      { open: 65, high: 75, low: 63, close: 72 },
    ],
  },

  // ============================================================================
  // HARMONIC PATTERNS
  // ============================================================================
  {
    id: "gartley-bullish",
    name: "Bullish Gartley",
    category: "reversal",
    direction: "bullish",
    description:
      "A harmonic pattern forming an 'M' shape with specific Fibonacci ratios. Named after H.M. Gartley. Point D completion signals bullish reversal opportunity.",
    identification: [
      "XA leg followed by AB retracement (61.8%)",
      "BC retracement of AB (38.2%-88.6%)",
      "CD extension of BC (127.2%-161.8%)",
      "D point at 78.6% XA retracement",
    ],
    tradingTips: [
      "Enter RISE at D point completion",
      "Stop loss below X point",
      "Target 38.2% and 61.8% of AD leg",
      "Verify with Fibonacci ratios",
    ],
    successRate: 70,
    timeframes: ["1h", "4h", "1d"],
    candles: [
      { open: 30, high: 35, low: 28, close: 34 }, // X
      { open: 34, high: 60, low: 32, close: 58 }, // A (XA leg up)
      { open: 58, high: 60, low: 42, close: 45 }, // B (61.8% retrace)
      { open: 45, high: 55, low: 43, close: 52 }, // C (BC leg up)
      { open: 52, high: 54, low: 35, close: 38 }, // D (78.6% XA)
      { open: 38, high: 55, low: 36, close: 52 }, // Reversal up
      { open: 52, high: 65, low: 50, close: 62 },
    ],
  },
  {
    id: "gartley-bearish",
    name: "Bearish Gartley",
    category: "reversal",
    direction: "bearish",
    description:
      "A harmonic pattern forming a 'W' shape with specific Fibonacci ratios. Point D completion signals bearish reversal opportunity.",
    identification: [
      "XA leg down followed by AB retracement",
      "BC retracement of AB (38.2%-88.6%)",
      "CD extension of BC",
      "D point at 78.6% XA retracement",
    ],
    tradingTips: [
      "Enter FALL at D point completion",
      "Stop loss above X point",
      "Target 38.2% and 61.8% of AD leg",
      "Verify with Fibonacci ratios",
    ],
    successRate: 69,
    timeframes: ["1h", "4h", "1d"],
    candles: [
      { open: 70, high: 72, low: 65, close: 68 }, // X
      { open: 68, high: 70, low: 40, close: 42 }, // A (XA leg down)
      { open: 42, high: 58, low: 40, close: 55 }, // B (61.8% retrace)
      { open: 55, high: 57, low: 45, close: 48 }, // C (BC leg down)
      { open: 48, high: 65, low: 46, close: 62 }, // D (78.6% XA)
      { open: 62, high: 64, low: 45, close: 48 }, // Reversal down
      { open: 48, high: 50, low: 35, close: 38 },
    ],
  },
  {
    id: "butterfly-bullish",
    name: "Bullish Butterfly",
    category: "reversal",
    direction: "bullish",
    description:
      "A harmonic pattern where D extends beyond X (127.2% XA extension). Forms a butterfly wing shape. D point offers high reward-to-risk entries.",
    identification: [
      "AB retraces 78.6% of XA",
      "BC retraces 38.2%-88.6% of AB",
      "D extends to 127.2%-161.8% of XA",
      "D is beyond X point",
    ],
    tradingTips: [
      "Enter RISE at D completion zone",
      "D beyond X creates extended move potential",
      "Stop loss just below D completion",
      "Higher risk but higher reward pattern",
    ],
    successRate: 68,
    timeframes: ["1h", "4h", "1d"],
    candles: [
      { open: 40, high: 45, low: 38, close: 42 }, // X
      { open: 42, high: 65, low: 40, close: 62 }, // A
      { open: 62, high: 64, low: 45, close: 48 }, // B (78.6%)
      { open: 48, high: 58, low: 46, close: 55 }, // C
      { open: 55, high: 58, low: 30, close: 32 }, // D (below X)
      { open: 32, high: 50, low: 30, close: 48 }, // Reversal
      { open: 48, high: 62, low: 46, close: 60 },
    ],
  },
  {
    id: "butterfly-bearish",
    name: "Bearish Butterfly",
    category: "reversal",
    direction: "bearish",
    description:
      "A bearish harmonic pattern where D extends beyond X. D point above X creates potential for significant downside move.",
    identification: [
      "AB retraces 78.6% of XA",
      "BC retraces 38.2%-88.6% of AB",
      "D extends to 127.2%-161.8% of XA",
      "D is beyond X point (above)",
    ],
    tradingTips: [
      "Enter FALL at D completion zone",
      "D beyond X creates extended move potential",
      "Stop loss just above D completion",
      "Higher risk but higher reward pattern",
    ],
    successRate: 67,
    timeframes: ["1h", "4h", "1d"],
    candles: [
      { open: 60, high: 62, low: 55, close: 58 }, // X
      { open: 58, high: 60, low: 35, close: 38 }, // A
      { open: 38, high: 55, low: 36, close: 52 }, // B (78.6%)
      { open: 52, high: 54, low: 42, close: 45 }, // C
      { open: 45, high: 72, low: 43, close: 70 }, // D (above X)
      { open: 70, high: 72, low: 50, close: 52 }, // Reversal
      { open: 52, high: 54, low: 38, close: 40 },
    ],
  },
  {
    id: "bat-bullish",
    name: "Bullish Bat",
    category: "reversal",
    direction: "bullish",
    description:
      "A harmonic pattern with deeper retracements than Gartley. D completes at 88.6% of XA, creating a bat wing appearance. Precise Fibonacci ratios required.",
    identification: [
      "AB retraces 38.2%-50% of XA",
      "BC retraces 38.2%-88.6% of AB",
      "D completes at 88.6% of XA",
      "CD is 161.8%-261.8% of BC",
    ],
    tradingTips: [
      "Enter RISE at 88.6% XA level",
      "Tighter stop than Gartley (closer D to X)",
      "High accuracy when ratios align",
      "Look for RSI divergence at D",
    ],
    successRate: 72,
    timeframes: ["1h", "4h", "1d"],
    candles: [
      { open: 30, high: 35, low: 28, close: 32 }, // X
      { open: 32, high: 62, low: 30, close: 60 }, // A
      { open: 60, high: 62, low: 48, close: 50 }, // B (38-50%)
      { open: 50, high: 58, low: 48, close: 55 }, // C
      { open: 55, high: 58, low: 34, close: 36 }, // D (88.6%)
      { open: 36, high: 52, low: 34, close: 50 }, // Reversal
      { open: 50, high: 65, low: 48, close: 62 },
    ],
  },
  {
    id: "bat-bearish",
    name: "Bearish Bat",
    category: "reversal",
    direction: "bearish",
    description:
      "A bearish harmonic pattern with D completing at 88.6% XA retracement. Offers precise entry with tight stop loss potential.",
    identification: [
      "AB retraces 38.2%-50% of XA",
      "BC retraces 38.2%-88.6% of AB",
      "D completes at 88.6% of XA",
      "CD is 161.8%-261.8% of BC",
    ],
    tradingTips: [
      "Enter FALL at 88.6% XA level",
      "Tighter stop than Gartley",
      "High accuracy when ratios align",
      "Look for RSI divergence at D",
    ],
    successRate: 71,
    timeframes: ["1h", "4h", "1d"],
    candles: [
      { open: 70, high: 72, low: 65, close: 68 }, // X
      { open: 68, high: 70, low: 38, close: 40 }, // A
      { open: 40, high: 52, low: 38, close: 50 }, // B (38-50%)
      { open: 50, high: 52, low: 42, close: 45 }, // C
      { open: 45, high: 66, low: 43, close: 64 }, // D (88.6%)
      { open: 64, high: 66, low: 48, close: 50 }, // Reversal
      { open: 50, high: 52, low: 35, close: 38 },
    ],
  },
  {
    id: "crab-bullish",
    name: "Bullish Crab",
    category: "reversal",
    direction: "bullish",
    description:
      "The most extended harmonic pattern with D at 161.8% XA extension. Offers exceptional reward-to-risk when D completes in the Potential Reversal Zone.",
    identification: [
      "AB retraces 38.2%-61.8% of XA",
      "BC retraces 38.2%-88.6% of AB",
      "D extends to 161.8% of XA",
      "Most extreme harmonic pattern",
    ],
    tradingTips: [
      "Enter RISE at 161.8% XA extension",
      "Excellent risk/reward ratio",
      "D far from X = tight stop possible",
      "Patience required for completion",
    ],
    successRate: 65,
    timeframes: ["1h", "4h", "1d"],
    candles: [
      { open: 50, high: 55, low: 48, close: 52 }, // X
      { open: 52, high: 72, low: 50, close: 70 }, // A
      { open: 70, high: 72, low: 55, close: 58 }, // B
      { open: 58, high: 68, low: 56, close: 65 }, // C
      { open: 65, high: 68, low: 22, close: 25 }, // D (161.8% below X)
      { open: 25, high: 45, low: 22, close: 42 }, // Reversal
      { open: 42, high: 58, low: 40, close: 55 },
    ],
  },
  {
    id: "crab-bearish",
    name: "Bearish Crab",
    category: "reversal",
    direction: "bearish",
    description:
      "A bearish harmonic with D extending to 161.8% of XA. The most extreme harmonic pattern, offering exceptional entries when properly identified.",
    identification: [
      "AB retraces 38.2%-61.8% of XA",
      "BC retraces 38.2%-88.6% of AB",
      "D extends to 161.8% of XA",
      "Most extreme harmonic pattern",
    ],
    tradingTips: [
      "Enter FALL at 161.8% XA extension",
      "Excellent risk/reward ratio",
      "D far from X = tight stop possible",
      "Patience required for completion",
    ],
    successRate: 64,
    timeframes: ["1h", "4h", "1d"],
    candles: [
      { open: 50, high: 52, low: 45, close: 48 }, // X
      { open: 48, high: 50, low: 28, close: 30 }, // A
      { open: 30, high: 45, low: 28, close: 42 }, // B
      { open: 42, high: 44, low: 32, close: 35 }, // C
      { open: 35, high: 78, low: 33, close: 75 }, // D (161.8% above X)
      { open: 75, high: 78, low: 55, close: 58 }, // Reversal
      { open: 58, high: 60, low: 42, close: 45 },
    ],
  },
  {
    id: "cypher-bullish",
    name: "Bullish Cypher",
    category: "reversal",
    direction: "bullish",
    description:
      "A newer harmonic pattern discovered by Darren Oglesbee. Features a unique structure with C extending beyond A. High win rate when properly identified.",
    identification: [
      "AB retraces 38.2%-61.8% of XA",
      "C extends to 127.2%-141.4% of XA",
      "D retraces 78.6% of XC",
      "C point extends beyond A",
    ],
    tradingTips: [
      "Enter RISE at 78.6% XC level",
      "One of the highest win rate harmonics",
      "Stop loss below X point",
      "Target 38.2% and 61.8% of CD",
    ],
    successRate: 75,
    timeframes: ["1h", "4h", "1d"],
    candles: [
      { open: 35, high: 40, low: 33, close: 38 }, // X
      { open: 38, high: 58, low: 36, close: 55 }, // A
      { open: 55, high: 58, low: 45, close: 48 }, // B
      { open: 48, high: 68, low: 46, close: 65 }, // C (beyond A)
      { open: 65, high: 68, low: 40, close: 42 }, // D (78.6% XC)
      { open: 42, high: 58, low: 40, close: 55 }, // Reversal
      { open: 55, high: 68, low: 53, close: 65 },
    ],
  },
  {
    id: "cypher-bearish",
    name: "Bearish Cypher",
    category: "reversal",
    direction: "bearish",
    description:
      "A bearish harmonic cypher pattern with C extending beyond A. Offers high probability entries at the D completion zone.",
    identification: [
      "AB retraces 38.2%-61.8% of XA",
      "C extends to 127.2%-141.4% of XA",
      "D retraces 78.6% of XC",
      "C point extends beyond A",
    ],
    tradingTips: [
      "Enter FALL at 78.6% XC level",
      "One of the highest win rate harmonics",
      "Stop loss above X point",
      "Target 38.2% and 61.8% of CD",
    ],
    successRate: 74,
    timeframes: ["1h", "4h", "1d"],
    candles: [
      { open: 65, high: 68, low: 60, close: 62 }, // X
      { open: 62, high: 65, low: 42, close: 45 }, // A
      { open: 45, high: 55, low: 43, close: 52 }, // B
      { open: 52, high: 55, low: 32, close: 35 }, // C (beyond A)
      { open: 35, high: 58, low: 33, close: 55 }, // D (78.6% XC)
      { open: 55, high: 58, low: 40, close: 42 }, // Reversal
      { open: 42, high: 45, low: 30, close: 32 },
    ],
  },
];

// ============================================================================
// CATEGORY ICONS
// ============================================================================

const CategoryIcon = ({ category }: { category: string }) => {
  switch (category) {
    case "reversal":
      return <Repeat className="w-4 h-4" />;
    case "continuation":
      return <TrendingUp className="w-4 h-4" />;
    case "bilateral":
      return <ArrowUpDown className="w-4 h-4" />;
    default:
      return <Triangle className="w-4 h-4" />;
  }
};

// ============================================================================
// CANDLESTICK CHART COMPONENT
// ============================================================================

interface CandlestickChartProps {
  candles: Candle[];
  height?: number;
  className?: string;
}

function CandlestickChart({ candles, height = 70, className = "" }: CandlestickChartProps) {
  // Calculate min and max for scaling
  const allValues = candles.flatMap(c => [c.high, c.low]);
  const minPrice = Math.min(...allValues);
  const maxPrice = Math.max(...allValues);
  const priceRange = maxPrice - minPrice || 1;

  // Add padding to price range
  const padding = priceRange * 0.1;
  const adjustedMin = minPrice - padding;
  const adjustedMax = maxPrice + padding;
  const adjustedRange = adjustedMax - adjustedMin;

  // Calculate dimensions
  const candleCount = candles.length;
  const viewBoxWidth = 100;
  const candleWidth = viewBoxWidth / candleCount;
  const bodyWidth = candleWidth * 0.6;
  const wickWidth = 1;

  // Scale price to Y coordinate (inverted because SVG Y increases downward)
  const scaleY = (price: number) => {
    return height - ((price - adjustedMin) / adjustedRange) * height;
  };

  return (
    <svg viewBox={`0 0 ${viewBoxWidth} ${height}`} className={className} preserveAspectRatio="xMidYMid meet">
      {candles.map((candle, index) => {
        const isBullish = candle.close > candle.open;
        const color = isBullish ? "#22c55e" : "#ef4444";

        const x = index * candleWidth + candleWidth / 2;
        const bodyTop = scaleY(Math.max(candle.open, candle.close));
        const bodyBottom = scaleY(Math.min(candle.open, candle.close));
        const bodyHeight = Math.max(bodyBottom - bodyTop, 1);

        const wickTop = scaleY(candle.high);
        const wickBottom = scaleY(candle.low);

        return (
          <g key={index}>
            {/* Wick (high to low) */}
            <line
              x1={x}
              y1={wickTop}
              x2={x}
              y2={wickBottom}
              stroke={color}
              strokeWidth={wickWidth}
            />
            {/* Body */}
            <rect
              x={x - bodyWidth / 2}
              y={bodyTop}
              width={bodyWidth}
              height={bodyHeight}
              fill={isBullish ? color : color}
              stroke={color}
              strokeWidth={0.5}
            />
          </g>
        );
      })}
    </svg>
  );
}

// ============================================================================
// PATTERN CARD
// ============================================================================

interface PatternCardProps {
  pattern: ChartPattern;
  isSelected: boolean;
  onClick: () => void;
  isDark: boolean;
}

function PatternCard({ pattern, isSelected, onClick, isDark }: PatternCardProps) {
  const directionColor =
    pattern.direction === "bullish"
      ? "text-green-500"
      : pattern.direction === "bearish"
      ? "text-red-500"
      : "text-blue-500";

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg transition-all ${
        isSelected
          ? isDark
            ? "bg-zinc-800 border-2 border-[#F7941D]"
            : "bg-gray-100 border-2 border-[#F7941D]"
          : isDark
          ? "bg-zinc-800 hover:bg-zinc-700 border border-zinc-700"
          : "bg-white hover:bg-gray-50 border border-gray-200"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
          {pattern.name}
        </span>
        {pattern.direction === "bullish" ? (
          <TrendingUp className={`w-4 h-4 ${directionColor}`} />
        ) : pattern.direction === "bearish" ? (
          <TrendingDown className={`w-4 h-4 ${directionColor}`} />
        ) : (
          <ArrowUpDown className={`w-4 h-4 ${directionColor}`} />
        )}
      </div>

      {/* Pattern Candlestick Preview */}
      <div
        className={`h-12 mb-2 rounded ${
          isDark ? "bg-zinc-900" : "bg-gray-100"
        } flex items-center justify-center overflow-hidden`}
      >
        <CandlestickChart candles={pattern.candles} height={48} className="w-full h-full p-1" />
      </div>

      <div className="flex items-center justify-between">
        <span
          className={`text-xs px-2 py-0.5 rounded ${
            isDark ? "bg-zinc-800 text-zinc-400" : "bg-gray-200 text-gray-600"
          }`}
        >
          {pattern.category}
        </span>
        <span
          className={`text-xs ${isDark ? "text-zinc-500" : "text-gray-500"}`}
        >
          {pattern.successRate}% success
        </span>
      </div>
    </button>
  );
}

// ============================================================================
// PATTERN DETAIL
// ============================================================================

interface PatternDetailProps {
  pattern: ChartPattern;
  isDark: boolean;
}

function PatternDetail({ pattern, isDark }: PatternDetailProps) {
  const t = useTranslations("binary_components");
  const tCommon = useTranslations("common");
  const directionColor =
    pattern.direction === "bullish"
      ? isDark
        ? "text-green-400"
        : "text-green-600"
      : pattern.direction === "bearish"
      ? isDark
        ? "text-red-400"
        : "text-red-600"
      : isDark
      ? "text-blue-400"
      : "text-blue-600";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <h3
            className={`text-xl font-bold ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            {pattern.name}
          </h3>
          <span className={`text-sm font-medium ${directionColor}`}>
            {pattern.direction.charAt(0).toUpperCase() +
              pattern.direction.slice(1)}
          </span>
        </div>
        <p className={`text-sm ${isDark ? "text-zinc-400" : "text-gray-600"}`}>
          {pattern.description}
        </p>
      </div>

      {/* Pattern Visualization */}
      <div
        className={`p-4 rounded-lg ${
          isDark ? "bg-zinc-800" : "bg-gray-100"
        }`}
      >
        <CandlestickChart candles={pattern.candles} height={100} className="w-full h-32" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div
          className={`p-3 rounded-lg ${
            isDark ? "bg-zinc-800" : "bg-gray-100"
          }`}
        >
          <div
            className={`text-xs mb-1 ${
              isDark ? "text-zinc-500" : "text-gray-500"
            }`}
          >
            {tCommon("success_rate")}
          </div>
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-[#F7941D]" />
            <span
              className={`text-lg font-bold ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              {pattern.successRate}%
            </span>
          </div>
        </div>
        <div
          className={`p-3 rounded-lg ${
            isDark ? "bg-zinc-800" : "bg-gray-100"
          }`}
        >
          <div
            className={`text-xs mb-1 ${
              isDark ? "text-zinc-500" : "text-gray-500"
            }`}
          >
            {t("best_timeframes")}
          </div>
          <div className="flex flex-wrap gap-1">
            {pattern.timeframes.map((tf) => (
              <span
                key={tf}
                className={`text-xs px-1.5 py-0.5 rounded ${
                  isDark
                    ? "bg-zinc-800 text-zinc-300"
                    : "bg-gray-200 text-gray-700"
                }`}
              >
                {tf}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Identification */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <BookOpen
            className={`w-4 h-4 ${isDark ? "text-zinc-400" : "text-gray-500"}`}
          />
          <h4
            className={`text-sm font-medium ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            {t("how_to_identify")}
          </h4>
        </div>
        <ul className="space-y-1.5">
          {pattern.identification.map((point, i) => (
            <li key={i} className="flex items-start gap-2">
              <CheckCircle2
                className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${
                  isDark ? "text-green-500" : "text-green-600"
                }`}
              />
              <span
                className={`text-sm ${
                  isDark ? "text-zinc-400" : "text-gray-600"
                }`}
              >
                {point}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Trading Tips */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle
            className={`w-4 h-4 ${isDark ? "text-zinc-400" : "text-gray-500"}`}
          />
          <h4
            className={`text-sm font-medium ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            {t("trading_tips")}
          </h4>
        </div>
        <ul className="space-y-1.5">
          {pattern.tradingTips.map((tip, i) => (
            <li key={i} className="flex items-start gap-2">
              <ChevronRight
                className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${
                  isDark ? "text-[#F7941D]" : "text-orange-500"
                }`}
              />
              <span
                className={`text-sm ${
                  isDark ? "text-zinc-400" : "text-gray-600"
                }`}
              >
                {tip}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function PatternLibrary({
  isOpen,
  onClose,
  onPatternSelect,
  isMobile = false,
}: PatternLibraryProps) {
  const t = useTranslations("binary_components");
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [selectedPatternId, setSelectedPatternId] = useState<string | null>(
    CHART_PATTERNS[0]?.id || null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const filteredPatterns = useMemo(() => {
    return CHART_PATTERNS.filter((pattern) => {
      const matchesSearch =
        pattern.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pattern.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === "all" || pattern.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  const selectedPattern = useMemo(() => {
    return CHART_PATTERNS.find((p) => p.id === selectedPatternId) || null;
  }, [selectedPatternId]);

  const handlePatternClick = (pattern: ChartPattern) => {
    setSelectedPatternId(pattern.id);
    onPatternSelect?.(pattern);
  };

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Theme classes matching overlay-theme.ts for consistency
  const borderClass = isDark ? "border-zinc-800/50" : "border-gray-200/50";
  const subtitleClass = isDark ? "text-zinc-400" : "text-gray-500";

  // On mobile, skip animations for instant overlay switching
  if (!isOpen) return null;

  // Wrapper components - use div on mobile (no animation), motion.div on desktop
  const Wrapper = isMobile ? 'div' : motion.div;
  const wrapperProps = isMobile ? {} : {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.2 },
  };

  const BackdropWrapper = isMobile ? 'div' : motion.div;
  const backdropProps = isMobile ? {} : {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  };

  const PanelWrapper = isMobile ? 'div' : motion.div;
  const panelProps = isMobile ? {} : {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.15 },
  };

  const content = (
    <Wrapper
      {...wrapperProps}
      className="absolute inset-0 z-50 flex"
    >
      {/* Backdrop */}
      <BackdropWrapper
        {...backdropProps}
        className={`absolute inset-0 ${isDark ? "bg-black/70" : "bg-black/40"} backdrop-blur-sm`}
        onClick={onClose}
      />

      {/* Pattern Library Panel - Full width overlay */}
      <PanelWrapper
        {...panelProps}
        className={`relative h-full w-full flex flex-col ${
          isDark ? "bg-zinc-900" : "bg-white"
        } shadow-2xl`}
      >
            {/* Header */}
            <div className={`flex items-center justify-between px-6 py-4 border-b ${borderClass}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${isDark ? "bg-orange-500/10" : "bg-orange-50"}`}>
                  <BookOpen size={20} className="text-[#F7941D]" />
                </div>
                <div>
                  <h2 className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                    {t("pattern_library")}
                  </h2>
                  <p className={`text-xs ${isDark ? "text-zinc-500" : "text-gray-500"}`}>
                    {t("visual_guide_to_chart_patterns")}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className={`hidden md:flex p-2 rounded-lg transition-colors ${
                  isDark ? "hover:bg-zinc-700/50 text-zinc-400" : "hover:bg-gray-100 text-gray-500"
                }`}
              >
                <X size={20} />
              </button>
            </div>

            {/* Stats bar */}
            <div className={`px-6 py-2.5 border-b ${borderClass} ${isDark ? "bg-zinc-800/50" : "bg-gray-50"}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-5 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <BookOpen size={12} className="text-[#F7941D]" />
                    <span className={subtitleClass}>{CHART_PATTERNS.length} Patterns</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <TrendingUp size={12} className="text-emerald-500" />
                    <span className={subtitleClass}>{CHART_PATTERNS.filter(p => p.direction === "bullish").length} Bullish</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <TrendingDown size={12} className="text-red-500" />
                    <span className={subtitleClass}>{CHART_PATTERNS.filter(p => p.direction === "bearish").length} Bearish</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Search and Filters */}
            <div className={`px-6 py-3 border-b ${borderClass}`}>
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Search */}
                <div className="relative flex-1">
                  <Search
                    className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
                      isDark ? "text-zinc-500" : "text-gray-400"
                    }`}
                  />
                  <input
                    type="text"
                    placeholder={t("search_patterns_ellipsis")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`w-full pl-9 pr-4 py-2 text-sm rounded-lg ${
                      isDark
                        ? "bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                        : "bg-gray-100 border-gray-200 text-gray-900 placeholder:text-gray-500"
                    } border focus:outline-none focus:ring-2 focus:ring-[#F7941D]/50`}
                  />
                </div>

                {/* Category Filter */}
                <div className="flex gap-1">
                  {["all", "reversal", "continuation", "bilateral"].map(
                    (category) => (
                      <button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors capitalize ${
                          selectedCategory === category
                            ? "bg-[#F7941D] text-white"
                            : isDark
                            ? "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {category}
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex flex-1 overflow-hidden">
              {/* Pattern List - full width on mobile when no pattern selected, hidden when pattern selected */}
              <div
                className={`${selectedPatternId ? 'hidden md:block' : 'w-full md:w-72'} md:w-72 shrink-0 md:border-r overflow-y-auto p-3 space-y-2 ${borderClass}`}
              >
                {filteredPatterns.length === 0 ? (
                  <div
                    className={`text-center py-8 ${
                      isDark ? "text-zinc-500" : "text-gray-500"
                    }`}
                  >
                    {t("no_patterns_found")}
                  </div>
                ) : (
                  filteredPatterns.map((pattern) => (
                    <PatternCard
                      key={pattern.id}
                      pattern={pattern}
                      isSelected={selectedPatternId === pattern.id}
                      onClick={() => handlePatternClick(pattern)}
                      isDark={isDark}
                    />
                  ))
                )}
              </div>

              {/* Pattern Detail - hidden on mobile when no pattern selected */}
              <div className={`${selectedPatternId ? 'flex' : 'hidden md:flex'} flex-1 flex-col overflow-y-auto p-4 md:p-6`}>
                {/* Mobile back button */}
                {selectedPattern && (
                  <button
                    onClick={() => setSelectedPatternId(null)}
                    className={`md:hidden flex items-center gap-2 mb-3 px-3 py-2 rounded-lg text-sm font-medium ${
                      isDark ? "bg-zinc-800 text-zinc-300" : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    <ChevronRight className="w-4 h-4 rotate-180" />
                    {t("back_to_patterns")}
                  </button>
                )}
                <AnimatePresence mode="wait">
                  {selectedPattern && (
                    <motion.div
                      key={selectedPattern.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                    >
                      <PatternDetail pattern={selectedPattern} isDark={isDark} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
      </PanelWrapper>
    </Wrapper>
  );

  // On mobile, skip AnimatePresence to avoid exit animation delay
  if (isMobile) {
    return content;
  }

  return (
    <AnimatePresence>
      {isOpen && content}
    </AnimatePresence>
  );
}
