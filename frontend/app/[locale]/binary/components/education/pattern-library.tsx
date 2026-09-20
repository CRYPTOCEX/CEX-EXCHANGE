"use client";

/**
 * Pattern Library Component
 *
 * Visual guide to common chart patterns for binary trading.
 * Displays patterns with descriptions, examples, and trading tips.
 * Now implemented as an overlay instead of a dialog.
 */

import { useState, useMemo, useEffect, useCallback } from "react";
import { m, AnimatePresence, useReducedMotion } from "framer-motion";
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
  AlertCircle,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  FilterChip,
  FullBleedOverlay,
  OverlayHeader,
  OverlayIconButton,
  OverlayStat,
  OverlayStatsBar,
  TONE_INK,
  type BinaryTone,
} from "../binary-ui";

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
  timeframes: string[];
  candles: Candle[]; // Candlestick data for pattern visualization
  /**
   * Indices into `candles` of the bars that MAKE the pattern.
   *
   * The whole series is context - a reversal has to show the trend it
   * reverses - so without this a learner sees twelve candles and no clue which
   * two of them are the pattern. The detail chart reveals the series left to
   * right and then holds these bars lit while the rest recede.
   */
  keyCandles?: number[];
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

export const CHART_PATTERNS: ChartPattern[] = [
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
    timeframes: ["15m", "1h", "4h"],
    keyCandles: [3, 5, 7],
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
    timeframes: ["1h", "4h", "1d"],
    keyCandles: [1, 4, 7],
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
    timeframes: ["5m", "15m", "1h"],
    keyCandles: [4],
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
    timeframes: ["5m", "15m", "1h"],
    keyCandles: [4],
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
    timeframes: ["15m", "1h", "4h"],
    keyCandles: [3, 4, 5],
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
    timeframes: ["15m", "1h", "4h"],
    keyCandles: [3, 4],
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
    timeframes: ["5m", "15m", "1h"],
    keyCandles: [3, 4],
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
    timeframes: ["15m", "1h", "4h"],
    keyCandles: [3, 4],
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
    timeframes: ["1h", "4h", "1d"],
    keyCandles: [1, 2, 3],
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
    timeframes: ["1h", "4h", "1d"],
    // Left shoulder -> head (lowest) -> right shoulder -> breakout
    keyCandles: [1, 4, 7],
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
    timeframes: ["5m", "15m", "1h"],
    // Downtrend -> small bearish -> large bullish engulfing -> continuation up
    keyCandles: [4, 5],
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
    timeframes: ["15m", "1h", "4h"],
    // Downtrend -> long bearish -> small doji -> long bullish
    keyCandles: [2, 3, 4],
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
    timeframes: ["15m", "1h", "4h"],
    // Uptrend -> first top -> pullback -> second top -> breakdown
    keyCandles: [3, 5, 6],
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
    timeframes: ["1h", "4h", "1d"],
    // Left shoulder -> head (highest) -> right shoulder -> breakdown
    keyCandles: [1, 4, 7],
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
    timeframes: ["5m", "15m", "1h"],
    // Uptrend -> small bullish -> large bearish engulfing -> continuation down
    keyCandles: [4, 5],
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
    timeframes: ["15m", "1h", "4h"],
    // Uptrend -> long bullish -> small doji -> long bearish
    keyCandles: [2, 3, 4],
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
    timeframes: ["1h", "4h", "1d"],
    keyCandles: [1, 4, 7],
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
    timeframes: ["5m", "15m", "1h"],
    keyCandles: [4],
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
    timeframes: ["5m", "15m", "1h"],
    keyCandles: [4],
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
    timeframes: ["15m", "1h", "4h"],
    keyCandles: [3, 4, 5],
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
    timeframes: ["15m", "1h", "4h"],
    keyCandles: [3, 4],
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
    timeframes: ["5m", "15m", "1h"],
    keyCandles: [3, 4],
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
    timeframes: ["15m", "1h", "4h"],
    keyCandles: [3, 4],
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
    timeframes: ["1h", "4h", "1d"],
    keyCandles: [1, 2, 3],
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
    timeframes: ["5m", "15m", "1h"],
    // Strong up move (pole) -> consolidation down (flag) -> breakout up
    keyCandles: [2, 3, 5, 6],
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
    timeframes: ["5m", "15m", "1h"],
    // Strong down move (pole) -> consolidation up (flag) -> breakdown
    keyCandles: [2, 3, 5, 6],
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
    timeframes: ["15m", "1h", "4h"],
    // Higher lows with flat resistance at ~65 -> breakout
    keyCandles: [1, 2, 5, 6],
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
    timeframes: ["15m", "1h", "4h"],
    // Lower highs with flat support at ~35 -> breakdown
    keyCandles: [1, 2, 5, 6],
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
    timeframes: ["15m", "1h", "4h"],
    keyCandles: [2, 3, 6, 7],
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
    timeframes: ["15m", "1h", "4h"],
    keyCandles: [2, 3, 6, 7],
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
    timeframes: ["15m", "1h", "4h"],
    keyCandles: [1, 2, 5, 6],
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
    timeframes: ["15m", "1h", "4h"],
    keyCandles: [1, 2, 4, 5],
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
    timeframes: ["1h", "4h", "1d"],
    keyCandles: [0, 2, 4, 6],
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
    timeframes: ["1h", "4h", "1d"],
    keyCandles: [0, 2, 4, 5],
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
    timeframes: ["15m", "1h", "4h"],
    keyCandles: [0, 2, 5, 7],
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
    timeframes: ["15m", "1h", "4h"],
    keyCandles: [0, 2, 4, 6],
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
    timeframes: ["4h", "1d", "1w"],
    keyCandles: [0, 3, 7],
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
    timeframes: ["4h", "1d", "1w"],
    keyCandles: [0, 3, 7],
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
    timeframes: ["15m", "1h", "4h"],
    // Converging price action with lower highs and higher lows
    keyCandles: [0, 1, 4, 5],
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
    timeframes: ["15m", "1h", "4h"],
    // Falling wedge pattern (both lines slope down, bullish breakout)
    keyCandles: [0, 6, 7],
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
    timeframes: ["15m", "1h", "4h"],
    keyCandles: [2, 6, 7],
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
    timeframes: ["15m", "1h", "4h"],
    keyCandles: [0, 6, 7],
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
    timeframes: ["1h", "4h", "1d"],
    keyCandles: [0, 1, 4, 5],
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
    timeframes: ["4h", "1d", "1w"],
    keyCandles: [0, 2, 3, 5],
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
    timeframes: ["4h", "1d", "1w"],
    keyCandles: [0, 2, 3, 5],
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
    timeframes: ["5m", "15m", "1h"],
    keyCandles: [3],
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
    timeframes: ["15m", "1h", "4h"],
    keyCandles: [3],
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
    timeframes: ["15m", "1h", "4h"],
    keyCandles: [3],
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
    timeframes: ["15m", "1h", "4h"],
    keyCandles: [2],
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
    timeframes: ["5m", "15m", "1h"],
    keyCandles: [2],
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
    timeframes: ["5m", "15m", "1h"],
    keyCandles: [2],
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
    timeframes: ["5m", "15m", "1h"],
    keyCandles: [2],
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
    timeframes: ["1h", "4h", "1d"],
    keyCandles: [0, 1, 2, 3, 4],
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
    timeframes: ["1h", "4h", "1d"],
    keyCandles: [0, 1, 2, 3, 4],
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
    timeframes: ["1h", "4h", "1d"],
    keyCandles: [0, 1, 2, 3, 4],
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
    timeframes: ["1h", "4h", "1d"],
    keyCandles: [0, 1, 2, 3, 4],
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
    timeframes: ["1h", "4h", "1d"],
    keyCandles: [0, 1, 2, 3, 4],
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
    timeframes: ["1h", "4h", "1d"],
    keyCandles: [0, 1, 2, 3, 4],
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
    timeframes: ["1h", "4h", "1d"],
    keyCandles: [0, 1, 2, 3, 4],
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
    timeframes: ["1h", "4h", "1d"],
    keyCandles: [0, 1, 2, 3, 4],
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
    timeframes: ["1h", "4h", "1d"],
    keyCandles: [0, 1, 2, 3, 4],
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
    timeframes: ["1h", "4h", "1d"],
    keyCandles: [0, 1, 2, 3, 4],
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

  // ============================================================================
  // EXTENDED LIBRARY
  //
  // Candlestick families the original set did not cover - the three-bar
  // confirmations, the gap and continuation patterns, the one- and two-bar
  // reversals - plus the price-structure patterns and the remaining harmonics.
  //
  // Every entry carries `keyCandles`: the indices of the bars that MAKE the
  // pattern, as opposed to the leading bars that only supply the trend it acts
  // on. The detail view reveals the series left to right and then holds those
  // bars lit while the rest recede, which is the difference between showing a
  // learner twelve candles and showing them the pattern.
  // ============================================================================

  {
    id: "three-inside-up",
    name: "Three Inside Up",
    category: "reversal",
    direction: "bullish",
    description:
      "A confirmed bullish harami: a long bearish candle, a small bullish candle held inside its body, then a third candle that closes above the first candle's open. The third bar is what turns a pause into a reversal signal.",
    identification: [
      "Clear downtrend into a long bearish candle.",
      "Second candle is bullish and its body sits inside the first body.",
      "Third candle is bullish and closes above the first candle's open.",
      "Third candle closes at or near its own high.",
    ],
    tradingTips: [
      "Enter RISE on the close of the third candle once it clears the first candle's open.",
      "Skip it if the third candle closes back inside the harami range.",
      "Invalidation is a close below the low of the three-bar cluster.",
      "Hold RISE about 3-5 candles of the chart timeframe.",
    ],
    timeframes: ["15m", "1h", "4h", "1d"],
    keyCandles: [8, 9, 10],
    candles: [
      { open: 80, high: 81, low: 77.5, close: 78 },
      { open: 78, high: 78.5, low: 74.5, close: 75 },
      { open: 75, high: 76, low: 71, close: 71.5 },
      { open: 71.5, high: 72, low: 68, close: 68.5 },
      { open: 68.5, high: 69, low: 64.5, close: 65 },
      { open: 65, high: 65.5, low: 61, close: 61.5 },
      { open: 61.5, high: 62, low: 58, close: 58.5 },
      { open: 58.5, high: 59, low: 55, close: 55.5 },
      { open: 55.5, high: 56, low: 47, close: 48 },
      { open: 50, high: 53, low: 49.5, close: 52.5 },
      { open: 52.5, high: 58, low: 52, close: 57.5 },
      { open: 57.5, high: 61, low: 57, close: 60.5 },
      { open: 60.5, high: 64, low: 60, close: 63.5 },
    ],
  },
  {
    id: "three-inside-down",
    name: "Three Inside Down",
    category: "reversal",
    direction: "bearish",
    description:
      "A confirmed bearish harami: a long bullish candle, a small bearish candle contained inside it, then a third candle that closes below the first candle's open. The third bar confirms that the uptrend has failed.",
    identification: [
      "Clear uptrend into a long bullish candle.",
      "Second candle is bearish and its body sits inside the first body.",
      "Third candle is bearish and closes below the first candle's open.",
      "Third candle closes at or near its own low.",
    ],
    tradingTips: [
      "Enter FALL on the close of the third candle once it breaks the first candle's open.",
      "No entry while price is still inside the harami range.",
      "Invalidation is a close above the high of the three-bar cluster.",
      "Hold FALL about 3-5 candles of the chart timeframe.",
    ],
    timeframes: ["15m", "1h", "4h", "1d"],
    keyCandles: [8, 9, 10],
    candles: [
      { open: 45, high: 48.5, low: 44.5, close: 48 },
      { open: 48, high: 51.5, low: 47.5, close: 51 },
      { open: 51, high: 54.5, low: 50.5, close: 54 },
      { open: 54, high: 57.5, low: 53.5, close: 57 },
      { open: 57, high: 60.5, low: 56.5, close: 60 },
      { open: 60, high: 63.5, low: 59.5, close: 63 },
      { open: 63, high: 66.5, low: 62.5, close: 66 },
      { open: 66, high: 69, low: 65.5, close: 68.5 },
      { open: 68.5, high: 78.5, low: 68, close: 78 },
      { open: 76, high: 76.5, low: 72, close: 72.5 },
      { open: 72.5, high: 73, low: 66.5, close: 67 },
      { open: 67, high: 67.5, low: 63, close: 63.5 },
      { open: 63.5, high: 64, low: 59.5, close: 60 },
    ],
  },
  {
    id: "three-outside-up",
    name: "Three Outside Up",
    category: "reversal",
    direction: "bullish",
    description:
      "A bullish engulfing candle followed by a third bullish candle that closes higher still. The follow-through candle is what separates a real turn from a one-bar bounce.",
    identification: [
      "Downtrend into a bearish candle.",
      "Second candle is bullish and its body fully covers the first body.",
      "Third candle is bullish and closes above the second candle's close.",
      "All three candles form at or near the swing low.",
    ],
    tradingTips: [
      "Enter RISE on the close of the third candle.",
      "Invalidation is a close back below the engulfing candle's low.",
      "Stronger when the engulfing candle's range is the largest of the recent bars.",
      "Avoid the setup inside a tight range where engulfing bars are meaningless.",
    ],
    timeframes: ["5m", "15m", "1h", "4h"],
    keyCandles: [8, 9, 10],
    candles: [
      { open: 80, high: 81, low: 77.5, close: 78 },
      { open: 78, high: 78.5, low: 74.5, close: 75 },
      { open: 75, high: 76, low: 71.5, close: 72 },
      { open: 72, high: 72.5, low: 68.5, close: 69 },
      { open: 69, high: 69.5, low: 65.5, close: 66 },
      { open: 66, high: 66.5, low: 62.5, close: 63 },
      { open: 63, high: 63.5, low: 59.5, close: 60 },
      { open: 60, high: 60.5, low: 56.5, close: 57 },
      { open: 57, high: 57.5, low: 53, close: 53.5 },
      { open: 52.5, high: 59, low: 52, close: 58.5 },
      { open: 58.5, high: 63, low: 58, close: 62.5 },
      { open: 62.5, high: 66, low: 62, close: 65.5 },
      { open: 65.5, high: 68.5, low: 65, close: 68 },
    ],
  },
  {
    id: "three-outside-down",
    name: "Three Outside Down",
    category: "reversal",
    direction: "bearish",
    description:
      "A bearish engulfing candle followed by a third bearish candle that closes lower still. The third bar confirms that sellers took control rather than just spiking the highs.",
    identification: [
      "Uptrend into a bullish candle.",
      "Second candle is bearish and its body fully covers the first body.",
      "Third candle is bearish and closes below the second candle's close.",
      "All three candles form at or near the swing high.",
    ],
    tradingTips: [
      "Enter FALL on the close of the third candle.",
      "Invalidation is a close back above the engulfing candle's high.",
      "Stronger when the engulfing candle wipes out two or more prior bodies.",
      "Keep expiry short if the engulfing bar formed against a rising moving average.",
    ],
    timeframes: ["5m", "15m", "1h", "4h"],
    keyCandles: [8, 9, 10],
    candles: [
      { open: 45, high: 48.5, low: 44.5, close: 48 },
      { open: 48, high: 51.5, low: 47.5, close: 51 },
      { open: 51, high: 54.5, low: 50.5, close: 54 },
      { open: 54, high: 57.5, low: 53.5, close: 57 },
      { open: 57, high: 60.5, low: 56.5, close: 60 },
      { open: 60, high: 63.5, low: 59.5, close: 63 },
      { open: 63, high: 66.5, low: 62.5, close: 66 },
      { open: 66, high: 69.5, low: 65.5, close: 69 },
      { open: 69, high: 73, low: 68.5, close: 72.5 },
      { open: 73.5, high: 74, low: 67.5, close: 68 },
      { open: 68, high: 68.5, low: 63.5, close: 64 },
      { open: 64, high: 64.5, low: 60, close: 60.5 },
      { open: 60.5, high: 61, low: 56.5, close: 57 },
    ],
  },
  {
    id: "three-stars-in-the-south",
    name: "Three Stars In The South",
    category: "reversal",
    direction: "bullish",
    description:
      "A rare bullish reversal built from three bearish candles that shrink and lose ground: a long first candle with a long lower shadow, a smaller second candle with a higher low, and a small bearish marubozu inside the second candle's range. Every candle is red but selling pressure is visibly fading.",
    identification: [
      "Downtrend with three consecutive bearish candles.",
      "First candle is long with a long lower shadow.",
      "Second candle is smaller and its low is above the first candle's low.",
      "Third is a small bearish marubozu whose range fits inside the second candle.",
    ],
    tradingTips: [
      "Wait for a bullish candle after the third bar before entering RISE.",
      "Rising lows across the three candles are mandatory - no rising lows, no pattern.",
      "A break below the first candle's low cancels the setup outright.",
      "Read it on 4h and 1d; on fast charts the shrinking bodies are just noise.",
    ],
    timeframes: ["4h", "1d"],
    keyCandles: [7, 8, 9],
    candles: [
      { open: 80, high: 81, low: 78, close: 78.5 },
      { open: 78.5, high: 79, low: 75.5, close: 76 },
      { open: 76, high: 76.5, low: 73, close: 73.5 },
      { open: 73.5, high: 74, low: 70.5, close: 71 },
      { open: 71, high: 71.5, low: 68, close: 68.5 },
      { open: 68.5, high: 69, low: 66, close: 66.5 },
      { open: 66.5, high: 67, low: 64, close: 64.5 },
      { open: 64.5, high: 65, low: 50, close: 56 },
      { open: 58, high: 58.5, low: 52, close: 53 },
      { open: 55.5, high: 55.5, low: 54, close: 54 },
      { open: 54, high: 58, low: 53.5, close: 57.5 },
      { open: 57.5, high: 61, low: 57, close: 60.5 },
      { open: 60.5, high: 64, low: 60, close: 63.5 },
    ],
  },
  {
    id: "advance-block",
    name: "Advance Block",
    category: "reversal",
    direction: "bearish",
    description:
      "Three bullish candles in an uptrend whose bodies shrink while their upper shadows lengthen. Buyers still close each bar higher but by less every time, which warns of exhaustion rather than proving a top.",
    identification: [
      "Established uptrend with three consecutive bullish candles.",
      "Each real body is smaller than the one before it.",
      "Upper shadows grow on the second and third candles.",
      "The second and third candles each open inside the previous candle's real body.",
    ],
    tradingTips: [
      "Treat it as a warning: enter FALL only after a bearish candle closes below the third candle's low.",
      "Do not enter RISE just because all three candles are green.",
      "Invalidation is a strong bullish close above the third candle's high.",
      "Check for resistance or a round number where the upper shadows are stalling.",
    ],
    timeframes: ["1h", "4h", "1d"],
    keyCandles: [6, 7, 8],
    candles: [
      { open: 45, high: 48.5, low: 44.5, close: 48 },
      { open: 48, high: 51.5, low: 47.5, close: 51 },
      { open: 51, high: 54.5, low: 50.5, close: 54 },
      { open: 54, high: 57.5, low: 53.5, close: 57 },
      { open: 57, high: 60.5, low: 56.5, close: 60 },
      { open: 60, high: 63.5, low: 59.5, close: 63 },
      { open: 63, high: 71, low: 62.5, close: 70.5 },
      { open: 68, high: 75.5, low: 67.5, close: 74 },
      { open: 73, high: 79.5, low: 72.5, close: 75.5 },
      { open: 75, high: 75.5, low: 71, close: 71.5 },
      { open: 71.5, high: 72, low: 67.5, close: 68 },
      { open: 68, high: 68.5, low: 64, close: 64.5 },
      { open: 64.5, high: 65, low: 60.5, close: 61 },
    ],
  },
  {
    id: "deliberation",
    name: "Deliberation (Stalled Pattern)",
    category: "reversal",
    direction: "bearish",
    description:
      "Two long bullish candles in an uptrend followed by a third small bullish candle that opens at or just above the second's close and goes almost nowhere. The advance stalls at the highs instead of extending.",
    identification: [
      "Uptrend with two long bullish candles making higher closes.",
      "Third candle is bullish but has a very small real body.",
      "Third candle opens at or just above the second candle's close.",
      "The small body sits near the high of the second candle.",
    ],
    tradingTips: [
      "Enter FALL only after a bearish candle closes below the small third body.",
      "Close or avoid RISE positions while the small body sits stalled at the highs.",
      "Invalidation is a strong bullish candle above the third candle's high.",
      "Use 1h and above, where a stalled bar reflects real hesitation.",
    ],
    timeframes: ["1h", "4h", "1d"],
    keyCandles: [5, 6, 7],
    candles: [
      { open: 45, high: 48.5, low: 44.5, close: 48 },
      { open: 48, high: 51.5, low: 47.5, close: 51 },
      { open: 51, high: 54.5, low: 50.5, close: 54 },
      { open: 54, high: 57.5, low: 53.5, close: 57 },
      { open: 57, high: 60, low: 56.5, close: 59.5 },
      { open: 59.5, high: 68, low: 59, close: 67.5 },
      { open: 67, high: 75.5, low: 66.5, close: 75 },
      { open: 76, high: 77.5, low: 75.5, close: 76.5 },
      { open: 76, high: 76.5, low: 72, close: 72.5 },
      { open: 72.5, high: 73, low: 68.5, close: 69 },
      { open: 69, high: 69.5, low: 65, close: 65.5 },
      { open: 65.5, high: 66, low: 61.5, close: 62 },
      { open: 62, high: 62.5, low: 58.5, close: 59 },
    ],
  },
  {
    id: "unique-three-river-bottom",
    name: "Unique Three River Bottom",
    category: "reversal",
    direction: "bullish",
    description:
      "A rare three-candle bottom: a long bearish candle, then a bearish candle that spikes to a new low but closes back inside the first body, then a small bullish candle that stays below it. The new low is rejected and selling dries up.",
    identification: [
      "Downtrend into a long bearish candle.",
      "Second candle is bearish with a long lower shadow and a new low.",
      "Second candle's body sits inside the first candle's body.",
      "Third is a small bullish candle closing below the second candle's open.",
    ],
    tradingTips: [
      "Enter RISE only after a candle closes above the second candle's high.",
      "The second candle's spike low is the invalidation level.",
      "The tiny third body means low conviction - reduce stake size.",
      "Look for it on 4h and 1d; it is almost never clean on fast charts.",
    ],
    timeframes: ["4h", "1d"],
    keyCandles: [6, 7, 8],
    candles: [
      { open: 84, high: 85, low: 81.5, close: 82 },
      { open: 82, high: 82.5, low: 78.5, close: 79 },
      { open: 79, high: 79.5, low: 75.5, close: 76 },
      { open: 76, high: 76.5, low: 72.5, close: 73 },
      { open: 73, high: 73.5, low: 69.5, close: 70 },
      { open: 70, high: 70.5, low: 66, close: 66.5 },
      { open: 66.5, high: 67, low: 55, close: 56 },
      { open: 61, high: 61.5, low: 50, close: 57 },
      { open: 54, high: 57, low: 53.5, close: 56.5 },
      { open: 56.5, high: 60, low: 56, close: 59.5 },
      { open: 59.5, high: 63, low: 59, close: 62.5 },
      { open: 62.5, high: 66, low: 62, close: 65.5 },
    ],
  },
  {
    id: "two-crows",
    name: "Two Crows",
    category: "reversal",
    direction: "bearish",
    description:
      "In an uptrend a long bullish candle is followed by a bearish candle that opens above it, then a second bearish candle that opens inside that body and closes back inside the first candle's body. The higher open is completely sold off.",
    identification: [
      "Uptrend with a long bullish candle.",
      "Second candle is bearish and opens above the first candle's close.",
      "Third candle is bearish and opens inside the second candle's body.",
      "Third candle closes inside the first candle's body.",
    ],
    tradingTips: [
      "Enter FALL on the close of the third candle.",
      "Invalidation is a close back above the second candle's open.",
      "Stronger when the third candle closes below the first candle's midpoint.",
      "True gaps are rare in 24h crypto - accept a clearly higher open instead.",
    ],
    timeframes: ["1h", "4h", "1d"],
    keyCandles: [6, 7, 8],
    candles: [
      { open: 45, high: 48.5, low: 44.5, close: 48 },
      { open: 48, high: 51.5, low: 47.5, close: 51 },
      { open: 51, high: 54.5, low: 50.5, close: 54 },
      { open: 54, high: 57.5, low: 53.5, close: 57 },
      { open: 57, high: 60.5, low: 56.5, close: 60 },
      { open: 60, high: 63.5, low: 59.5, close: 63 },
      { open: 63, high: 72, low: 62.5, close: 71.5 },
      { open: 75, high: 75.5, low: 73, close: 73.5 },
      { open: 74.5, high: 74.5, low: 66.5, close: 67 },
      { open: 67, high: 67.5, low: 63, close: 63.5 },
      { open: 63.5, high: 64, low: 59.5, close: 60 },
      { open: 60, high: 60.5, low: 56, close: 56.5 },
    ],
  },
  {
    id: "upside-gap-two-crows",
    name: "Upside Gap Two Crows",
    category: "reversal",
    direction: "bearish",
    description:
      "An uptrend gaps up into a small bearish candle, then a second bearish candle engulfs it while still closing above the first candle's close, leaving the gap unfilled. Buyers cannot hold the new highs even though the gap has not yet been closed.",
    identification: [
      "Long bullish candle in an uptrend.",
      "Second candle is bearish and gaps fully above the first candle's close.",
      "Third candle is bearish and engulfs the second candle's body.",
      "Third candle still closes above the first candle's close.",
    ],
    tradingTips: [
      "Enter FALL on the close of the third candle, aiming at the gap fill.",
      "The signal fails on a close back above the second candle's open.",
      "Weaker than Two Crows because the gap is still open - keep expiry short.",
      "Best found on 1d charts of markets that actually gap.",
    ],
    timeframes: ["4h", "1d"],
    keyCandles: [6, 7, 8],
    candles: [
      { open: 45, high: 48.5, low: 44.5, close: 48 },
      { open: 48, high: 51.5, low: 47.5, close: 51 },
      { open: 51, high: 54.5, low: 50.5, close: 54 },
      { open: 54, high: 57.5, low: 53.5, close: 57 },
      { open: 57, high: 60.5, low: 56.5, close: 60 },
      { open: 60, high: 63.5, low: 59.5, close: 63 },
      { open: 63, high: 72, low: 62.5, close: 71.5 },
      { open: 76, high: 76.5, low: 74.5, close: 75 },
      { open: 77.5, high: 78, low: 72.5, close: 73 },
      { open: 73, high: 73.5, low: 69, close: 69.5 },
      { open: 69.5, high: 70, low: 65.5, close: 66 },
      { open: 66, high: 66.5, low: 62, close: 62.5 },
    ],
  },
  {
    id: "homing-pigeon",
    name: "Homing Pigeon",
    category: "reversal",
    direction: "bullish",
    description:
      "Two bearish candles in a downtrend: a long one, then a much smaller one whose whole body sits inside it. Selling continues but with far less force, which often marks a short-term bottom.",
    identification: [
      "Clear downtrend into a long bearish candle.",
      "Second candle is also bearish with a much smaller body.",
      "Second candle's open and close both sit inside the first candle's body.",
      "Second candle does not make a new low.",
    ],
    tradingTips: [
      "Enter RISE only after a bullish candle closes above the second candle's high.",
      "A new low under the first candle cancels the setup.",
      "Same shape as a bullish harami but both candles are red - expect a slower turn.",
      "Keep expiry short; this signals a pause more often than a trend change.",
    ],
    timeframes: ["15m", "1h", "4h"],
    keyCandles: [6, 7],
    candles: [
      { open: 80, high: 81, low: 77.5, close: 78 },
      { open: 78, high: 78.5, low: 74.5, close: 75 },
      { open: 75, high: 75.5, low: 71.5, close: 72 },
      { open: 72, high: 72.5, low: 68.5, close: 69 },
      { open: 69, high: 69.5, low: 65.5, close: 66 },
      { open: 66, high: 66.5, low: 62.5, close: 63 },
      { open: 63, high: 63.5, low: 52, close: 53 },
      { open: 59, high: 60, low: 56, close: 57 },
      { open: 57.5, high: 61, low: 57, close: 60.5 },
      { open: 60.5, high: 64, low: 60, close: 63.5 },
      { open: 63.5, high: 67, low: 63, close: 66.5 },
      { open: 66.5, high: 70, low: 66, close: 69.5 },
    ],
  },
  {
    id: "ladder-bottom",
    name: "Ladder Bottom",
    category: "reversal",
    direction: "bullish",
    description:
      "Four bearish candles step a market down, the fourth closing well off its high, then a bullish candle that opens above the fourth candle's body and closes above its high. That gap above the last bearish body is what separates the bottom from another leg down.",
    identification: [
      "Three long bearish candles with successively lower opens and closes.",
      "Fourth candle is bearish but leaves a clear upper shadow.",
      "Fifth candle is bullish and opens above the fourth candle's open.",
      "Fifth candle closes above the fourth candle's high.",
    ],
    tradingTips: [
      "Enter RISE on the close of the fifth candle.",
      "The fourth candle's upper shadow is only a heads-up - do not enter before the gap up.",
      "Invalidation is a close back below the fourth candle's low.",
      "Five bars is a long sequence: use 1h or higher so it means something.",
    ],
    timeframes: ["1h", "4h", "1d"],
    keyCandles: [5, 6, 7, 8, 9],
    candles: [
      { open: 86, high: 87, low: 83.5, close: 84 },
      { open: 84, high: 84.5, low: 80.5, close: 81 },
      { open: 81, high: 81.5, low: 77.5, close: 78 },
      { open: 78, high: 78.5, low: 74.5, close: 75 },
      { open: 75, high: 75.5, low: 71.5, close: 72 },
      { open: 72, high: 72.5, low: 66, close: 66.5 },
      { open: 66.5, high: 67, low: 60.5, close: 61 },
      { open: 61, high: 61.5, low: 55, close: 55.5 },
      { open: 55.5, high: 60, low: 53.5, close: 54 },
      { open: 56.5, high: 62, low: 56, close: 61.5 },
      { open: 61.5, high: 65, low: 61, close: 64.5 },
      { open: 64.5, high: 68, low: 64, close: 67.5 },
      { open: 67.5, high: 71, low: 67, close: 70.5 },
    ],
  },
  {
    id: "concealing-baby-swallow",
    name: "Concealing Baby Swallow",
    category: "reversal",
    direction: "bullish",
    description:
      "A rare four-candle bullish signal in a steep decline: two bearish marubozu, then a bearish candle that opens lower but rallies back into the previous body, then a bearish candle that swallows that whole bar including its shadows. Every candle is red, yet the last two show buyers pushing back hard.",
    identification: [
      "Downtrend with two bearish marubozu candles that have almost no shadows.",
      "Third candle opens below the second candle's close and has a long upper shadow into it.",
      "Fourth candle opens above the third candle's high.",
      "Fourth candle closes below the third candle's low, covering it entirely.",
    ],
    tradingTips: [
      "Do not enter FALL on the fourth candle even though it is a big red bar.",
      "Enter RISE only after the next candle closes above the fourth candle's open.",
      "All four candles must close below their opens - one bullish close voids the pattern.",
      "Read it on 4h and 1d where marubozu bodies actually carry information.",
    ],
    timeframes: ["4h", "1d"],
    keyCandles: [4, 5, 6, 7],
    candles: [
      { open: 80, high: 80.5, low: 77.5, close: 78 },
      { open: 78, high: 78.5, low: 75, close: 75.5 },
      { open: 75.5, high: 76, low: 72.5, close: 73 },
      { open: 73, high: 73.5, low: 70, close: 70.5 },
      { open: 70.5, high: 70.5, low: 65, close: 65 },
      { open: 65, high: 65, low: 59.5, close: 59.5 },
      { open: 57, high: 62, low: 55.5, close: 56 },
      { open: 63, high: 63.5, low: 54.5, close: 55 },
      { open: 55, high: 58.5, low: 54.5, close: 58 },
      { open: 58, high: 61.5, low: 57.5, close: 61 },
      { open: 61, high: 64.5, low: 60.5, close: 64 },
      { open: 64, high: 67.5, low: 63.5, close: 67 },
    ],
  },
  {
    id: "tri-star-bullish",
    name: "Tri-Star Bullish",
    category: "reversal",
    direction: "bullish",
    description:
      "Three doji in a row at the end of a downtrend, with the middle one gapping below the other two. Selling pressure gives way to complete indecision at the low and price lifts back into the range.",
    identification: [
      "Extended downtrend before the three candles.",
      "Three consecutive candles with open and close almost equal.",
      "Middle doji gaps below the doji on either side of it.",
      "Third doji gaps back up above the middle one.",
    ],
    tradingTips: [
      "Enter RISE once a bullish candle closes above the third doji's high.",
      "The bodies must be genuine doji - a small body is not enough.",
      "Invalidation is a close below the middle doji's low.",
      "Very rare intraday because gaps are needed on both sides of the middle bar.",
    ],
    timeframes: ["1h", "4h", "1d"],
    keyCandles: [7, 8, 9],
    candles: [
      { open: 78, high: 79, low: 75.5, close: 76 },
      { open: 76, high: 76.5, low: 72.5, close: 73 },
      { open: 73, high: 73.5, low: 69.5, close: 70 },
      { open: 70, high: 70.5, low: 66.5, close: 67 },
      { open: 67, high: 67.5, low: 63.5, close: 64 },
      { open: 64, high: 64.5, low: 60.5, close: 61 },
      { open: 61, high: 61.5, low: 57.5, close: 58 },
      { open: 57.5, high: 59, low: 56, close: 57.5 },
      { open: 54, high: 55, low: 52.5, close: 54 },
      { open: 57, high: 58.5, low: 56, close: 57 },
      { open: 57.5, high: 61, low: 57, close: 60.5 },
      { open: 60.5, high: 64, low: 60, close: 63.5 },
      { open: 63.5, high: 67, low: 63, close: 66.5 },
    ],
  },
  {
    id: "tri-star-bearish",
    name: "Tri-Star Bearish",
    category: "reversal",
    direction: "bearish",
    description:
      "Three doji in a row at the end of an uptrend, with the middle one gapping above the other two. Buying pressure turns into pure indecision at the high and price drops back into the range.",
    identification: [
      "Extended uptrend before the three candles.",
      "Three consecutive candles with open and close almost equal.",
      "Middle doji gaps above the doji on either side of it.",
      "Third doji gaps back down below the middle one.",
    ],
    tradingTips: [
      "Enter FALL once a bearish candle closes below the third doji's low.",
      "The bodies must be genuine doji - a small body is not enough.",
      "Invalidation is a close above the middle doji's high.",
      "Confirm with a volume drop across the three bars where volume is available.",
    ],
    timeframes: ["1h", "4h", "1d"],
    keyCandles: [7, 8, 9],
    candles: [
      { open: 46, high: 49.5, low: 45.5, close: 49 },
      { open: 49, high: 52.5, low: 48.5, close: 52 },
      { open: 52, high: 55.5, low: 51.5, close: 55 },
      { open: 55, high: 58.5, low: 54.5, close: 58 },
      { open: 58, high: 61.5, low: 57.5, close: 61 },
      { open: 61, high: 64.5, low: 60.5, close: 64 },
      { open: 64, high: 67.5, low: 63.5, close: 67 },
      { open: 67.5, high: 69, low: 66, close: 67.5 },
      { open: 72, high: 73.5, low: 71, close: 72 },
      { open: 68, high: 69.5, low: 66.5, close: 68 },
      { open: 67.5, high: 68, low: 64, close: 64.5 },
      { open: 64.5, high: 65, low: 61, close: 61.5 },
      { open: 61.5, high: 62, low: 58, close: 58.5 },
    ],
  },
  {
    id: "bullish-belt-hold",
    name: "Bullish Belt Hold",
    category: "reversal",
    direction: "bullish",
    description:
      "A single long white candle that opens at its low after a decline and closes near its high. Sellers never got a price below the open, which hands short-term control to buyers.",
    identification: [
      "Market has been falling for several candles.",
      "White candle opens at its low with no lower shadow.",
      "Body is clearly longer than the recent average.",
      "Close sits in the top quarter of the candle's range.",
    ],
    tradingTips: [
      "Enter RISE once the belt hold closes and the next candle holds above its midpoint.",
      "A close back below the belt hold's low voids the signal.",
      "Strongest when the candle opens with a gap under the previous low.",
      "Keep expiries to 2-3 candles; the edge fades quickly after that.",
    ],
    timeframes: ["15m", "1h", "4h"],
    keyCandles: [9],
    candles: [
      { open: 78, high: 79, low: 76, close: 76.5 },
      { open: 76.5, high: 77, low: 73, close: 73.5 },
      { open: 73.5, high: 74, low: 70, close: 70.5 },
      { open: 70.5, high: 71, low: 66.5, close: 67 },
      { open: 67, high: 67.5, low: 63, close: 63.5 },
      { open: 63.5, high: 64, low: 59.5, close: 60 },
      { open: 60, high: 60.5, low: 55.5, close: 56 },
      { open: 56, high: 56.5, low: 51.5, close: 52 },
      { open: 52, high: 52.5, low: 48, close: 48.5 },
      { open: 44, high: 54.5, low: 44, close: 54 },
      { open: 54, high: 58, low: 53.5, close: 57.5 },
      { open: 57.5, high: 61, low: 57, close: 60.5 },
    ],
  },
  {
    id: "bearish-belt-hold",
    name: "Bearish Belt Hold",
    category: "reversal",
    direction: "bearish",
    description:
      "A single long black candle that opens at its high after a rally and closes near its low. Buyers never got a price above the open, so sellers hold the session from start to finish.",
    identification: [
      "Market has been rising for several candles.",
      "Black candle opens at its high with no upper shadow.",
      "Body is clearly longer than the recent average.",
      "Close sits in the bottom quarter of the candle's range.",
    ],
    tradingTips: [
      "Enter FALL after the belt hold closes, while price stays under its midpoint.",
      "A close back above the candle's high cancels the setup.",
      "Strongest when it opens with a gap above the previous high.",
      "Weak inside a sideways range - require a visible prior uptrend.",
    ],
    timeframes: ["15m", "1h", "4h"],
    keyCandles: [8],
    candles: [
      { open: 44, high: 46, low: 43.5, close: 45.5 },
      { open: 45.5, high: 48.5, low: 45, close: 48 },
      { open: 48, high: 51, low: 47.5, close: 50.5 },
      { open: 50.5, high: 53.5, low: 50, close: 53 },
      { open: 53, high: 56, low: 52.5, close: 55.5 },
      { open: 55.5, high: 59, low: 55, close: 58.5 },
      { open: 58.5, high: 62, low: 58, close: 61.5 },
      { open: 61.5, high: 65, low: 61, close: 64.5 },
      { open: 69, high: 69, low: 58.5, close: 59 },
      { open: 59, high: 59.5, low: 55, close: 55.5 },
      { open: 55.5, high: 56, low: 51.5, close: 52 },
    ],
  },
  {
    id: "bullish-kicking",
    name: "Bullish Kicking",
    category: "reversal",
    direction: "bullish",
    description:
      "A black marubozu followed by a white marubozu that opens above the black candle's open, leaving an unfilled gap between the two bodies. Control switches sides in one step, and the pattern does not need a prior trend to be valid.",
    identification: [
      "First candle is a black marubozu with no meaningful wicks.",
      "Second candle is a white marubozu with no meaningful wicks.",
      "Second candle opens above the first candle's open.",
      "The two bodies do not overlap at any price.",
    ],
    tradingTips: [
      "Enter RISE at the open of the candle after the white marubozu.",
      "The gap must stay open; a candle that fills it removes the signal.",
      "Usually news-driven, so expect a wide, fast range afterwards.",
      "Check the wicks really are tiny - a long-wicked pair is not a kicking.",
    ],
    timeframes: ["15m", "1h", "4h", "1d"],
    keyCandles: [6, 7],
    candles: [
      { open: 70, high: 70.5, low: 67.5, close: 68 },
      { open: 68, high: 68.5, low: 65, close: 65.5 },
      { open: 65.5, high: 66, low: 62.5, close: 63 },
      { open: 63, high: 63.5, low: 59.5, close: 60 },
      { open: 60, high: 60.5, low: 57, close: 57.5 },
      { open: 57.5, high: 58, low: 54, close: 54.5 },
      { open: 54.5, high: 54.5, low: 46, close: 46 },
      { open: 60, high: 72, low: 60, close: 72 },
      { open: 72, high: 75, low: 71.5, close: 74.5 },
      { open: 74.5, high: 78, low: 74, close: 77.5 },
    ],
  },
  {
    id: "bearish-kicking",
    name: "Bearish Kicking",
    category: "reversal",
    direction: "bearish",
    description:
      "A white marubozu followed by a black marubozu that opens below the white candle's open, leaving an unfilled gap between the bodies. Buyers are displaced in a single session, with no prior trend required.",
    identification: [
      "First candle is a white marubozu with no meaningful wicks.",
      "Second candle is a black marubozu with no meaningful wicks.",
      "Second candle opens below the first candle's open.",
      "The two bodies never overlap.",
    ],
    tradingTips: [
      "Enter FALL at the open of the candle after the black marubozu.",
      "If the gap gets filled, treat the signal as dead.",
      "Rare on 24/7 markets, which gap far less than stocks or weekend forex.",
      "Do not chase it late - the move is mostly in the gap itself.",
    ],
    timeframes: ["15m", "1h", "4h", "1d"],
    keyCandles: [5, 6],
    candles: [
      { open: 52, high: 54.5, low: 51.5, close: 54 },
      { open: 54, high: 56.5, low: 53.5, close: 56 },
      { open: 56, high: 58.5, low: 55.5, close: 58 },
      { open: 58, high: 60.5, low: 57.5, close: 60 },
      { open: 60, high: 62.5, low: 59.5, close: 62 },
      { open: 62, high: 72, low: 62, close: 72 },
      { open: 56.5, high: 56.5, low: 45, close: 45 },
      { open: 45, high: 45.5, low: 41, close: 41.5 },
      { open: 41.5, high: 42, low: 38, close: 38.5 },
      { open: 38.5, high: 39, low: 35, close: 35.5 },
    ],
  },
  {
    id: "bullish-counterattack",
    name: "Bullish Counterattack",
    category: "reversal",
    direction: "bullish",
    description:
      "In a downtrend, a long black candle is followed by a candle that gaps lower on the open then rallies to close at the same price as the previous close. The matching closes show sellers lost everything they gained at the open.",
    identification: [
      "Downtrend in place with a long black candle.",
      "Next candle opens with a visible gap below that candle's low.",
      "The second candle is white and closes at the prior close.",
      "The white body stops at the prior close instead of pushing into it.",
    ],
    tradingTips: [
      "Enter RISE only after a third candle closes above the shared close.",
      "Weaker than a piercing line, which cuts into the black body.",
      "Skip it when the second candle's body is short relative to the first.",
      "The gap low is the invalidation level - below it the downtrend is intact.",
    ],
    timeframes: ["15m", "1h", "4h"],
    keyCandles: [6, 7],
    candles: [
      { open: 76, high: 77, low: 73.5, close: 74 },
      { open: 74, high: 74.5, low: 70.5, close: 71 },
      { open: 71, high: 71.5, low: 67, close: 67.5 },
      { open: 67.5, high: 68, low: 63.5, close: 64 },
      { open: 64, high: 64.5, low: 60, close: 60.5 },
      { open: 60.5, high: 61, low: 56.5, close: 57 },
      { open: 57, high: 57.5, low: 49.5, close: 50 },
      { open: 44, high: 50.5, low: 43.5, close: 50 },
      { open: 50, high: 53, low: 49.5, close: 52.5 },
      { open: 52.5, high: 56, low: 52, close: 55.5 },
    ],
  },
  {
    id: "bearish-counterattack",
    name: "Bearish Counterattack",
    category: "reversal",
    direction: "bearish",
    description:
      "In an uptrend, a long white candle is followed by a candle that gaps higher on the open then sells off to close at the previous close. Buyers gave back the entire gap within one session.",
    identification: [
      "Uptrend in place with a long white candle.",
      "Next candle opens with a visible gap above that candle's high.",
      "The second candle is black and closes at the prior close.",
      "The black body does not push down into the white body.",
    ],
    tradingTips: [
      "Enter FALL after a third candle closes below the shared close.",
      "Weaker than dark cloud cover, which eats into the prior body.",
      "Confirm the rally stalled at a level - resistance, round number or prior high.",
      "Keep expiries short; counterattacks stall as often as they reverse.",
    ],
    timeframes: ["15m", "1h", "4h"],
    keyCandles: [6, 7],
    candles: [
      { open: 42, high: 44.5, low: 41.5, close: 44 },
      { open: 44, high: 46.5, low: 43.5, close: 46 },
      { open: 46, high: 49, low: 45.5, close: 48.5 },
      { open: 48.5, high: 51.5, low: 48, close: 51 },
      { open: 51, high: 54, low: 50.5, close: 53.5 },
      { open: 53.5, high: 57, low: 53, close: 56.5 },
      { open: 56.5, high: 66.5, low: 56, close: 66 },
      { open: 72, high: 72.5, low: 65.5, close: 66 },
      { open: 66, high: 66.5, low: 62.5, close: 63 },
      { open: 63, high: 63.5, low: 59, close: 59.5 },
    ],
  },
  {
    id: "matching-low",
    name: "Matching Low",
    category: "reversal",
    direction: "bullish",
    description:
      "Two black candles in a downtrend that close at exactly the same price, the second opening higher and falling back to the first candle's close. The repeated close marks a floor buyers defended twice.",
    identification: [
      "Downtrend with a long black candle closing near its low.",
      "Second candle is also black and opens above the first close.",
      "Both candles close at the same price.",
      "The second candle stops falling exactly where the first did.",
    ],
    tradingTips: [
      "Enter RISE when the next candle closes above the second candle's open.",
      "The shared close is the line in the sand - a close under it voids it.",
      "Both candles are still black, so wait for a bullish confirmation candle.",
      "Best when the shared close lines up with an earlier support level.",
    ],
    timeframes: ["15m", "1h", "4h", "1d"],
    keyCandles: [6, 7],
    candles: [
      { open: 76, high: 77, low: 73.5, close: 74 },
      { open: 74, high: 74.5, low: 70, close: 70.5 },
      { open: 70.5, high: 71, low: 66.5, close: 67 },
      { open: 67, high: 67.5, low: 63, close: 63.5 },
      { open: 63.5, high: 64, low: 59.5, close: 60 },
      { open: 60, high: 60.5, low: 56, close: 56.5 },
      { open: 56.5, high: 57, low: 50, close: 50 },
      { open: 53.5, high: 54, low: 50, close: 50 },
      { open: 50, high: 53.5, low: 49.5, close: 53 },
      { open: 53, high: 57, low: 52.5, close: 56.5 },
      { open: 56.5, high: 60, low: 56, close: 59.5 },
    ],
  },
  {
    id: "matching-high",
    name: "Matching High",
    category: "reversal",
    direction: "bearish",
    description:
      "Two white candles in an uptrend that close at exactly the same price, the second opening lower and rallying back to the first candle's close. The repeated close marks a ceiling buyers failed to clear twice.",
    identification: [
      "Uptrend with a long white candle closing near its high.",
      "Second candle is also white and opens below the first close.",
      "Both candles close at the same price.",
      "The second rally stops exactly where the first one did.",
    ],
    tradingTips: [
      "Enter FALL when the next candle closes below the second candle's open.",
      "A close above the shared price cancels the pattern immediately.",
      "Both candles are still white - do not act before the bearish confirmation.",
      "Most reliable when the matched closes sit at a prior high or round number.",
    ],
    timeframes: ["15m", "1h", "4h", "1d"],
    keyCandles: [5, 6],
    candles: [
      { open: 44, high: 46.5, low: 43.5, close: 46 },
      { open: 46, high: 48.5, low: 45.5, close: 48 },
      { open: 48, high: 51, low: 47.5, close: 50.5 },
      { open: 50.5, high: 53.5, low: 50, close: 53 },
      { open: 53, high: 56.5, low: 52.5, close: 56 },
      { open: 56, high: 66, low: 55.5, close: 66 },
      { open: 62.5, high: 66, low: 62, close: 66 },
      { open: 66, high: 66.5, low: 62, close: 62.5 },
      { open: 62.5, high: 63, low: 58.5, close: 59 },
      { open: 59, high: 59.5, low: 55, close: 55.5 },
    ],
  },
  {
    id: "stick-sandwich",
    name: "Stick Sandwich",
    category: "reversal",
    direction: "bullish",
    description:
      "Three candles in a downtrend: a black candle, a white candle that trades higher, then a black candle that closes at the same price as the first. The two identical closes sandwich the white candle and mark a support level.",
    identification: [
      "Falling market with a black candle closing at some level.",
      "Middle candle is white and closes above the first candle's close.",
      "Third candle is black and closes back at the first candle's close.",
      "The two black closes match within a tick.",
    ],
    tradingTips: [
      "Enter RISE after a fourth candle closes above the third candle's open.",
      "The shared close is support; a close beneath it ends the setup.",
      "A near-match still counts, but the closer the two closes the better.",
      "Skip it when the middle white candle has almost no body.",
    ],
    timeframes: ["1h", "4h", "1d"],
    keyCandles: [5, 6, 7],
    candles: [
      { open: 74, high: 75, low: 71.5, close: 72 },
      { open: 72, high: 72.5, low: 68.5, close: 69 },
      { open: 69, high: 69.5, low: 65, close: 65.5 },
      { open: 65.5, high: 66, low: 61.5, close: 62 },
      { open: 62, high: 62.5, low: 58.5, close: 59 },
      { open: 59, high: 59.5, low: 51.5, close: 52 },
      { open: 53, high: 60, low: 52.5, close: 59.5 },
      { open: 60, high: 60.5, low: 51.5, close: 52 },
      { open: 52.5, high: 56.5, low: 52, close: 56 },
      { open: 56, high: 60, low: 55.5, close: 59.5 },
      { open: 59.5, high: 63, low: 59, close: 62.5 },
    ],
  },
  {
    id: "takuri-line",
    name: "Takuri Line",
    category: "reversal",
    direction: "bullish",
    description:
      "A single candle in a downtrend with a tiny body at the top of its range and a lower shadow at least three times the body - a deeper version of the hammer. Price was driven far below the open and bought all the way back before the close.",
    identification: [
      "Appears after a run of falling candles.",
      "Real body is small and sits at the top of the range.",
      "Lower shadow is at least three times the body length.",
      "Upper shadow is very small or absent.",
    ],
    tradingTips: [
      "Enter RISE on the next candle only if it trades above the takuri's body.",
      "The extreme low is the invalidation point for the setup.",
      "The longer the lower shadow relative to nearby candles, the better.",
      "A wide range or heavy volume on the candle adds weight; a thin spike does not.",
    ],
    timeframes: ["15m", "1h", "4h"],
    keyCandles: [6],
    candles: [
      { open: 74, high: 75, low: 71.5, close: 72 },
      { open: 72, high: 72.5, low: 68, close: 68.5 },
      { open: 68.5, high: 69, low: 64.5, close: 65 },
      { open: 65, high: 65.5, low: 61, close: 61.5 },
      { open: 61.5, high: 62, low: 57.5, close: 58 },
      { open: 58, high: 58.5, low: 54, close: 54.5 },
      { open: 54, high: 55, low: 42, close: 54.5 },
      { open: 55, high: 59, low: 54.5, close: 58.5 },
      { open: 58.5, high: 62.5, low: 58, close: 62 },
      { open: 62, high: 66, low: 61.5, close: 65.5 },
    ],
  },
  {
    id: "high-wave-candle",
    name: "High Wave Candle",
    category: "reversal",
    direction: "neutral",
    description:
      "A candle with a small real body and long upper and lower shadows, showing price ranged far both ways and finished near where it started. It says the prevailing trend has lost its grip, not which way price goes next.",
    identification: [
      "Real body is small relative to the total range.",
      "Both shadows are long - each well over twice the body.",
      "The candle's range is much wider than the recent average.",
      "Body colour does not matter.",
    ],
    tradingTips: [
      "Do not trade the candle itself; wait for the next one to break its high or low.",
      "Enter RISE on a close above the high wave's high, FALL on a close below its low.",
      "Most meaningful after an extended run, least meaningful inside a range.",
      "Allow extra expiry time - the market often chops for several candles first.",
    ],
    timeframes: ["5m", "15m", "1h"],
    keyCandles: [6],
    candles: [
      { open: 48, high: 50.5, low: 47.5, close: 50 },
      { open: 50, high: 52.5, low: 49.5, close: 52 },
      { open: 52, high: 54.5, low: 51.5, close: 54 },
      { open: 54, high: 57, low: 53.5, close: 56.5 },
      { open: 56.5, high: 59, low: 56, close: 58.5 },
      { open: 58.5, high: 61, low: 58, close: 60.5 },
      { open: 61, high: 72, low: 50, close: 60 },
      { open: 60, high: 62.5, low: 58.5, close: 59 },
      { open: 59, high: 61.5, low: 57.5, close: 60.5 },
      { open: 60.5, high: 62, low: 57, close: 58 },
      { open: 58, high: 60.5, low: 56.5, close: 59 },
    ],
  },
  {
    id: "four-price-doji",
    name: "Four Price Doji",
    category: "bilateral",
    direction: "neutral",
    description:
      "A candle whose open, high, low and close are all the same price, drawn as a single horizontal dash. It means effectively no trading took place and it carries no directional information on its own.",
    identification: [
      "Open, high, low and close are the same price.",
      "Draws as a flat line with no body and no shadows.",
      "It opens at the previous candle's close, so the dash sits flush against it.",
      "The candles either side of it have unusually small ranges too.",
    ],
    tradingTips: [
      "Do not enter on this candle; there is nothing in it to read.",
      "Take direction from the first candle afterwards that trades a real range.",
      "Common on illiquid pairs and 1m charts - consider a busier market or timeframe.",
      "If these appear often in your data, check the price feed before blaming the market.",
    ],
    timeframes: ["1m", "5m"],
    keyCandles: [5],
    candles: [
      { open: 47.4, high: 48, low: 47.1, close: 47.8 },
      { open: 47.8, high: 48.1, low: 47.3, close: 47.4 },
      { open: 47.4, high: 47.9, low: 47.2, close: 47.7 },
      { open: 47.7, high: 47.9, low: 47.3, close: 47.4 },
      { open: 47.4, high: 47.7, low: 47.4, close: 47.5 },
      { open: 47.5, high: 47.5, low: 47.5, close: 47.5 },
      { open: 47.5, high: 47.7, low: 47.4, close: 47.6 },
      { open: 47.6, high: 48, low: 47.3, close: 47.4 },
      { open: 47.4, high: 47.8, low: 47.1, close: 47.7 },
      { open: 47.7, high: 48, low: 47.2, close: 47.3 },
      { open: 47.3, high: 47.8, low: 47, close: 47.6 },
    ],
  },
  {
    id: "rickshaw-man",
    name: "Rickshaw Man",
    category: "reversal",
    direction: "neutral",
    description:
      "A long-legged doji whose open and close are effectively equal and sit in the middle of a very wide range. Both sides pushed hard and finished level, so the current trend is in doubt.",
    identification: [
      "Open and close are equal or within a tick of each other.",
      "Upper and lower shadows are both long.",
      "The tiny body sits near the centre of the range.",
      "Total range is noticeably wider than the surrounding candles.",
    ],
    tradingTips: [
      "Wait for the next candle to close outside the doji's range before entering.",
      "Enter RISE above the doji high, FALL below the doji low - never mid-range.",
      "It only means something after a trend; inside a range it is noise.",
      "Several rickshaw men in a row means a directionless market - stay out.",
    ],
    timeframes: ["5m", "15m", "1h"],
    keyCandles: [5],
    candles: [
      { open: 46, high: 48.5, low: 45.5, close: 48 },
      { open: 48, high: 50.5, low: 47.5, close: 50 },
      { open: 50, high: 52.5, low: 49.5, close: 52 },
      { open: 52, high: 54.5, low: 51.5, close: 54 },
      { open: 54, high: 57, low: 53.5, close: 56.5 },
      { open: 57, high: 67, low: 47, close: 57 },
      { open: 57, high: 59, low: 55, close: 56 },
      { open: 56, high: 58, low: 54.5, close: 57.5 },
      { open: 57.5, high: 59, low: 55, close: 55.5 },
      { open: 55.5, high: 57, low: 53.5, close: 56 },
    ],
  },
  {
    id: "bullish-breakaway",
    name: "Bullish Breakaway",
    category: "reversal",
    direction: "bullish",
    description:
      "A five-candle pattern in a downtrend: a long black candle, a black candle that gaps lower, two more candles drifting down, then a long white candle that rallies back into the gap without filling it. The last candle takes back the whole accelerated part of the decline.",
    identification: [
      "Downtrend with a long black first candle.",
      "Second candle gaps below the first and is also black.",
      "Third and fourth candles make lower lows with small bodies.",
      "Fifth candle is a long white candle closing inside the gap.",
    ],
    tradingTips: [
      "Enter RISE at the close of the fifth candle, or on the next candle's open.",
      "The fifth candle must close inside the gap, not above the first candle's close.",
      "No visible gap between candles one and two means no breakaway.",
      "Use longer expiries - the recovery leg usually needs several candles.",
    ],
    timeframes: ["1h", "4h", "1d"],
    keyCandles: [3, 4, 5, 6, 7],
    candles: [
      { open: 76, high: 77, low: 73, close: 73.5 },
      { open: 73.5, high: 74, low: 70, close: 70.5 },
      { open: 70.5, high: 71, low: 67, close: 67.5 },
      { open: 67.5, high: 68, low: 60, close: 60.5 },
      { open: 56.5, high: 57, low: 53.5, close: 54 },
      { open: 54, high: 54.5, low: 51.5, close: 52 },
      { open: 52, high: 52.5, low: 49, close: 49.5 },
      { open: 50, high: 58.5, low: 49.5, close: 58 },
      { open: 58, high: 61.5, low: 57.5, close: 61 },
      { open: 61, high: 64.5, low: 60.5, close: 64 },
    ],
  },
  {
    id: "bearish-breakaway",
    name: "Bearish Breakaway",
    category: "reversal",
    direction: "bearish",
    description:
      "A five-candle pattern in an uptrend: a long white candle, a white candle that gaps higher, two more candles pushing up, then a long black candle that falls back into the gap without closing it. The last candle erases the accelerated part of the rally.",
    identification: [
      "Uptrend with a long white first candle.",
      "Second candle gaps above the first and is also white.",
      "Third and fourth candles make higher highs with small bodies.",
      "Fifth candle is a long black candle closing inside the gap.",
    ],
    tradingTips: [
      "Enter FALL at the close of the fifth candle, or on the next candle's open.",
      "The black candle must close inside the gap, not below the first candle's close.",
      "If the gap was already filled before candle five, the pattern is void.",
      "Use longer expiries; the giveback usually runs for several candles.",
    ],
    timeframes: ["1h", "4h", "1d"],
    keyCandles: [3, 4, 5, 6, 7],
    candles: [
      { open: 44, high: 46, low: 43.5, close: 45.5 },
      { open: 45.5, high: 48, low: 45, close: 47.5 },
      { open: 47.5, high: 50, low: 47, close: 49.5 },
      { open: 49.5, high: 57, low: 49, close: 56.5 },
      { open: 60, high: 63.5, low: 60, close: 63 },
      { open: 63, high: 65.5, low: 62.5, close: 65 },
      { open: 65, high: 67.5, low: 64.5, close: 67 },
      { open: 66.5, high: 67, low: 58, close: 58.5 },
      { open: 58.5, high: 59, low: 55, close: 55.5 },
      { open: 55.5, high: 56, low: 51.5, close: 52 },
    ],
  },
  {
    id: "rising-three-methods",
    name: "Rising Three Methods",
    category: "continuation",
    direction: "bullish",
    description:
      "A long bullish candle in an uptrend is followed by three small bearish candles that stay inside its range, then a second long bullish candle closes above the first one's close. The small candles are a pause, not a reversal.",
    identification: [
      "Uptrend in place before the pattern begins",
      "Long bullish candle, then three small bearish candles",
      "All three small candles stay inside the long candle's high-low range",
      "Fifth candle is bullish and closes above the first candle's close",
    ],
    tradingTips: [
      "Enter RISE on the close of the fifth candle, once it clears candle one's close",
      "Invalid if any pullback candle closes below the first candle's low",
      "Two or four small candles count as long as they hold the range",
      "Expiry of 3-5 candles suits the follow-through this pattern gives",
    ],
    timeframes: ["15m", "1h", "4h", "1d"],
    keyCandles: [4, 8],
    candles: [
      { open: 30, high: 33, low: 29.5, close: 32.5 },
      { open: 32.5, high: 36, low: 32, close: 35.5 },
      { open: 35.5, high: 38.5, low: 35, close: 38 },
      { open: 38, high: 41, low: 37.5, close: 40.5 },
      { open: 41, high: 52, low: 40.5, close: 51 },
      { open: 50, high: 50.5, low: 47.5, close: 48 },
      { open: 48.5, high: 49, low: 46, close: 46.5 },
      { open: 47, high: 47.5, low: 44.5, close: 45 },
      { open: 45.5, high: 55, low: 45, close: 54.5 },
      { open: 54.5, high: 58, low: 54, close: 57.5 },
      { open: 57.5, high: 61, low: 57, close: 60.5 },
    ],
  },
  {
    id: "falling-three-methods",
    name: "Falling Three Methods",
    category: "continuation",
    direction: "bearish",
    description:
      "A long bearish candle in a downtrend is followed by three small bullish candles contained inside its range, then a second long bearish candle closes below the first one's close. The bounce fails and selling resumes.",
    identification: [
      "Downtrend in place before the pattern begins",
      "Long bearish candle, then three small bullish candles",
      "All three small candles stay inside the long candle's high-low range",
      "Fifth candle is bearish and closes below the first candle's close",
    ],
    tradingTips: [
      "Enter FALL on the close of the fifth candle, once it breaks candle one's close",
      "Invalid if any bounce candle closes above the first candle's high",
      "The bounce should be shallow - deep retracements weaken the setup",
      "Expiry of 3-5 candles matches the typical continuation leg",
    ],
    timeframes: ["15m", "1h", "4h", "1d"],
    keyCandles: [4, 8],
    candles: [
      { open: 70, high: 71, low: 67, close: 67.5 },
      { open: 67.5, high: 68, low: 64, close: 64.5 },
      { open: 64.5, high: 65, low: 61, close: 61.5 },
      { open: 61.5, high: 62, low: 58.5, close: 59 },
      { open: 59, high: 59.5, low: 48, close: 49 },
      { open: 50, high: 52.5, low: 49.5, close: 52 },
      { open: 52, high: 54, low: 51.5, close: 53.5 },
      { open: 53.5, high: 55.5, low: 53, close: 55 },
      { open: 54.5, high: 55, low: 45, close: 45.5 },
      { open: 45.5, high: 46, low: 42, close: 42.5 },
      { open: 42.5, high: 43, low: 39, close: 39.5 },
    ],
  },
  {
    id: "mat-hold",
    name: "Mat Hold",
    category: "continuation",
    direction: "bullish",
    description:
      "A long bullish candle is followed by a small candle that gaps up, then two more small candles that drift lower without giving back much ground, and finally a long bullish candle that closes at a new high. The pullback is shallower than in rising three methods.",
    identification: [
      "Long bullish candle inside an existing uptrend",
      "Second candle gaps above the first candle's high and has a small body",
      "Two further small candles drift down but hold above the first candle's midpoint",
      "Final candle is bullish and closes above the highest point of the pattern",
    ],
    tradingTips: [
      "Enter RISE on the close of the final bullish candle",
      "The gap on candle two is required - without it this is only a three methods",
      "Cancel the setup if the drift closes below the first candle's midpoint",
      "One of the more dependable continuation shapes; still wait for the fifth close",
    ],
    timeframes: ["1h", "4h", "1d"],
    keyCandles: [3, 4, 7],
    candles: [
      { open: 30, high: 32, low: 29, close: 31.5 },
      { open: 31.5, high: 34.5, low: 31, close: 34 },
      { open: 34, high: 37, low: 33.5, close: 36.5 },
      { open: 37, high: 48, low: 36.5, close: 47.5 },
      { open: 50, high: 51, low: 48.5, close: 49 },
      { open: 49, high: 49.5, low: 46.5, close: 47 },
      { open: 47, high: 47.5, low: 45, close: 45.5 },
      { open: 46, high: 56, low: 45.5, close: 55.5 },
      { open: 55.5, high: 59, low: 55, close: 58.5 },
      { open: 58.5, high: 62, low: 58, close: 61.5 },
    ],
  },
  {
    id: "upside-tasuki-gap",
    name: "Upside Tasuki Gap",
    category: "continuation",
    direction: "bullish",
    description:
      "In an uptrend a bullish candle gaps above the previous bullish candle, then a bearish candle opens inside that body and closes back into the gap without filling it. The unfilled gap keeps the uptrend intact.",
    identification: [
      "Bullish candle, then a second bullish candle that gaps above its high",
      "Third candle is bearish and opens within the second candle's body",
      "Third candle closes inside the gap, above the first candle's high",
      "The gap is never fully filled during the pattern",
    ],
    tradingTips: [
      "Enter RISE on the next candle while the gap low still holds",
      "If the bearish candle closes the gap the pattern is void, not weak",
      "Weaker than the three methods family - use it with trend confirmation",
      "Short expiry of 2-3 candles; the edge fades quickly",
    ],
    timeframes: ["5m", "15m", "1h", "4h"],
    keyCandles: [3, 4, 5],
    candles: [
      { open: 30, high: 32, low: 29.5, close: 31.5 },
      { open: 31.5, high: 34, low: 31, close: 33.5 },
      { open: 33.5, high: 36, low: 33, close: 35.5 },
      { open: 36, high: 41, low: 35.5, close: 40.5 },
      { open: 43, high: 48, low: 42.5, close: 47.5 },
      { open: 46, high: 46.5, low: 41.5, close: 42 },
      { open: 42.5, high: 47, low: 42, close: 46.5 },
      { open: 46.5, high: 50, low: 46, close: 49.5 },
      { open: 49.5, high: 53, low: 49, close: 52.5 },
    ],
  },
  {
    id: "downside-tasuki-gap",
    name: "Downside Tasuki Gap",
    category: "continuation",
    direction: "bearish",
    description:
      "In a downtrend a bearish candle gaps below the previous bearish candle, then a bullish candle opens inside that body and closes back into the gap without filling it. The gap holds and the decline continues.",
    identification: [
      "Bearish candle, then a second bearish candle that gaps below its low",
      "Third candle is bullish and opens within the second candle's body",
      "Third candle closes inside the gap, below the first candle's low",
      "The gap is never fully filled during the pattern",
    ],
    tradingTips: [
      "Enter FALL on the next candle while the gap high still caps price",
      "A close back above the gap cancels the setup entirely",
      "Reliability is modest - require a clear downtrend before acting",
      "Short expiry of 2-3 candles works best here",
    ],
    timeframes: ["5m", "15m", "1h", "4h"],
    keyCandles: [3, 4, 5],
    candles: [
      { open: 70, high: 71, low: 68, close: 68.5 },
      { open: 68.5, high: 69, low: 66, close: 66.5 },
      { open: 66.5, high: 67, low: 64, close: 64.5 },
      { open: 64.5, high: 65, low: 59.5, close: 60 },
      { open: 57, high: 57.5, low: 52, close: 52.5 },
      { open: 54, high: 58.5, low: 53.5, close: 58 },
      { open: 57.5, high: 58, low: 53.5, close: 54 },
      { open: 54, high: 54.5, low: 50, close: 50.5 },
      { open: 50.5, high: 51, low: 47, close: 47.5 },
    ],
  },
  {
    id: "bullish-separating-lines",
    name: "Bullish Separating Lines",
    category: "continuation",
    direction: "bullish",
    description:
      "During an uptrend a bearish candle appears, then the next candle opens at exactly the same price as that bearish candle's open and closes sharply higher. The pullback is erased in one session.",
    identification: [
      "Uptrend in place, interrupted by one bearish candle",
      "Next candle opens at the same price as the bearish candle's open",
      "That candle is bullish with little or no lower shadow",
      "It closes well above the bearish candle's open",
    ],
    tradingTips: [
      "Enter RISE on the close of the second candle, not on its open",
      "The two opens must match closely - a rough match is a different pattern",
      "Confirm the uptrend was already established, otherwise ignore it",
      "Expiry of 2-4 candles; treat the shared open as your invalidation level",
    ],
    timeframes: ["15m", "1h", "4h", "1d"],
    keyCandles: [4, 5],
    candles: [
      { open: 30, high: 32.5, low: 29.5, close: 32 },
      { open: 32, high: 35, low: 31.5, close: 34.5 },
      { open: 34.5, high: 38, low: 34, close: 37.5 },
      { open: 37.5, high: 41, low: 37, close: 40.5 },
      { open: 43, high: 43.5, low: 38, close: 38.5 },
      { open: 43, high: 50, low: 43, close: 49.5 },
      { open: 49.5, high: 53, low: 49, close: 52.5 },
      { open: 52.5, high: 56, low: 52, close: 55.5 },
      { open: 55.5, high: 59, low: 55, close: 58.5 },
    ],
  },
  {
    id: "bearish-separating-lines",
    name: "Bearish Separating Lines",
    category: "continuation",
    direction: "bearish",
    description:
      "During a downtrend a bullish candle appears, then the next candle opens at exactly the same price as that bullish candle's open and closes sharply lower. The bounce is wiped out in one session.",
    identification: [
      "Downtrend in place, interrupted by one bullish candle",
      "Next candle opens at the same price as the bullish candle's open",
      "That candle is bearish with little or no upper shadow",
      "It closes well below the bullish candle's open",
    ],
    tradingTips: [
      "Enter FALL on the close of the second candle",
      "The shared open is the level to watch - a move above it kills the trade",
      "Only valid inside an existing downtrend, never after a base",
      "Expiry of 2-4 candles suits the follow-through",
    ],
    timeframes: ["15m", "1h", "4h", "1d"],
    keyCandles: [4, 5],
    candles: [
      { open: 70, high: 71, low: 67.5, close: 68 },
      { open: 68, high: 68.5, low: 65, close: 65.5 },
      { open: 65.5, high: 66, low: 62.5, close: 63 },
      { open: 63, high: 63.5, low: 60, close: 60.5 },
      { open: 58, high: 63, low: 57.5, close: 62.5 },
      { open: 58, high: 58, low: 51, close: 51.5 },
      { open: 51.5, high: 52, low: 48, close: 48.5 },
      { open: 48.5, high: 49, low: 45, close: 45.5 },
      { open: 45.5, high: 46, low: 42, close: 42.5 },
    ],
  },
  {
    id: "side-by-side-white-lines",
    name: "Side-by-Side White Lines",
    category: "continuation",
    direction: "bullish",
    description:
      "In an uptrend a bullish candle gaps above the previous one, then a third bullish candle opens at roughly the same price and is roughly the same size as the second. The gap stays open and buyers stay in control.",
    identification: [
      "Bullish candle followed by a bullish candle that gaps above its high",
      "Third candle is also bullish with about the same open as the second",
      "Second and third bodies are of similar length, sitting side by side",
      "Neither of the paired candles closes the gap below them",
    ],
    tradingTips: [
      "Enter RISE on the close of the third candle while the gap is unfilled",
      "The gap low is the invalidation level - a close under it voids the setup",
      "Rare on intraday crypto charts; do not force a loose match",
      "Expiry of 2-4 candles; take the trade only with the trend",
    ],
    timeframes: ["1h", "4h", "1d"],
    keyCandles: [3, 4, 5],
    candles: [
      { open: 30, high: 32, low: 29.5, close: 31.5 },
      { open: 31.5, high: 34, low: 31, close: 33.5 },
      { open: 33.5, high: 36.5, low: 33, close: 36 },
      { open: 36, high: 40, low: 35.5, close: 39.5 },
      { open: 42, high: 47, low: 41.5, close: 46.5 },
      { open: 42, high: 47, low: 41.5, close: 46 },
      { open: 46, high: 50, low: 45.5, close: 49.5 },
      { open: 49.5, high: 53, low: 49, close: 52.5 },
      { open: 52.5, high: 56, low: 52, close: 55.5 },
    ],
  },
  {
    id: "on-neck-line",
    name: "On Neck Line",
    category: "continuation",
    direction: "bearish",
    description:
      "A long bearish candle in a downtrend is followed by a bullish candle that opens below its low and closes right at that low. The rally stalls exactly where the previous selling ended.",
    identification: [
      "Clear downtrend with a long bearish candle",
      "Next candle is bullish and opens below the bearish candle's low",
      "It closes at, or within a tick of, the bearish candle's low",
      "It does not reach into the bearish candle's body",
    ],
    tradingTips: [
      "Enter FALL on the next candle once it trades back below the shared low",
      "A close inside the bearish body turns this into a weaker signal, not this one",
      "Backtests show this pattern fails often - always demand trend context",
      "Keep expiry to 1-3 candles and treat it as a low-conviction entry",
    ],
    timeframes: ["15m", "1h", "4h"],
    keyCandles: [3, 4],
    candles: [
      { open: 72, high: 73, low: 69, close: 69.5 },
      { open: 69.5, high: 70, low: 66, close: 66.5 },
      { open: 66.5, high: 67, low: 63, close: 63.5 },
      { open: 63.5, high: 64, low: 54, close: 54.5 },
      { open: 51, high: 54, low: 50.5, close: 54 },
      { open: 53.5, high: 54, low: 49, close: 49.5 },
      { open: 49.5, high: 50, low: 45.5, close: 46 },
      { open: 46, high: 46.5, low: 42, close: 42.5 },
      { open: 42.5, high: 43, low: 39, close: 39.5 },
    ],
  },
  {
    id: "in-neck-line",
    name: "In Neck Line",
    category: "continuation",
    direction: "bearish",
    description:
      "A long bearish candle in a downtrend is followed by a bullish candle that opens below its low and closes only marginally above its close, barely entering the body. Buyers manage almost no ground.",
    identification: [
      "Clear downtrend with a long bearish candle",
      "Next candle is bullish and opens below the bearish candle's low",
      "It closes just slightly above the bearish candle's close",
      "The close stays far below the bearish candle's midpoint",
    ],
    tradingTips: [
      "Enter FALL when the following candle trades under the bullish candle's close",
      "If the close reaches past the midpoint it is a piercing line - the opposite read",
      "The weakest of the neck-line family; skip it without a strong downtrend",
      "Expiry of 1-3 candles, small stake",
    ],
    timeframes: ["15m", "1h", "4h"],
    keyCandles: [3, 4],
    candles: [
      { open: 72, high: 73, low: 69, close: 69.5 },
      { open: 69.5, high: 70, low: 66, close: 66.5 },
      { open: 66.5, high: 67, low: 63, close: 63.5 },
      { open: 63.5, high: 64, low: 54, close: 55 },
      { open: 52, high: 55.5, low: 51.5, close: 55.5 },
      { open: 55, high: 55.5, low: 51, close: 51.5 },
      { open: 51.5, high: 52, low: 47.5, close: 48 },
      { open: 48, high: 48.5, low: 44, close: 44.5 },
      { open: 44.5, high: 45, low: 41, close: 41.5 },
    ],
  },
  {
    id: "thrusting-line",
    name: "Thrusting Line",
    category: "continuation",
    direction: "bearish",
    description:
      "A long bearish candle in a downtrend is followed by a bullish candle that opens below its low and pushes into the body, but closes below the midpoint. The recovery is real yet incomplete, so the downtrend usually resumes.",
    identification: [
      "Long bearish candle within an established downtrend",
      "Next candle opens below the bearish candle's low",
      "It closes inside the bearish body, above its close",
      "The close stays below the bearish candle's midpoint",
    ],
    tradingTips: [
      "Enter FALL once the next candle breaks the bullish candle's low",
      "Above the midpoint it becomes a piercing line - a bullish reversal instead",
      "Measure the midpoint precisely; the whole read hinges on that line",
      "Expiry of 2-3 candles and skip it in a sideways market",
    ],
    timeframes: ["15m", "1h", "4h", "1d"],
    keyCandles: [3, 4],
    candles: [
      { open: 72, high: 73, low: 69, close: 69.5 },
      { open: 69.5, high: 70, low: 66, close: 66.5 },
      { open: 66.5, high: 67, low: 63, close: 63.5 },
      { open: 63.5, high: 64, low: 52, close: 52.5 },
      { open: 50, high: 57, low: 49.5, close: 56.5 },
      { open: 56, high: 56.5, low: 52, close: 52.5 },
      { open: 52.5, high: 53, low: 48.5, close: 49 },
      { open: 49, high: 49.5, low: 45, close: 45.5 },
      { open: 45.5, high: 46, low: 42, close: 42.5 },
    ],
  },
  {
    id: "upside-gap-three-methods",
    name: "Upside Gap Three Methods",
    category: "continuation",
    direction: "bullish",
    description:
      "Two long bullish candles separated by an upward gap are followed by a bearish candle that opens in the upper body, closes in the lower body and fills the gap. Despite the gap closing, the uptrend normally carries on.",
    identification: [
      "Two long bullish candles with a visible gap between them",
      "Third candle is bearish and opens inside the second candle's body",
      "It closes inside the first candle's body, filling the gap",
      "The pattern appears after an already-rising market",
    ],
    tradingTips: [
      "Enter RISE on the candle after the gap fill, not during it",
      "Void the setup if price closes below the first candle's low",
      "Gap filling here is normal - do not read it as a reversal by itself",
      "Expiry of 2-4 candles; confirmation on the next close improves the odds",
    ],
    timeframes: ["1h", "4h", "1d"],
    keyCandles: [2, 3, 4],
    candles: [
      { open: 30, high: 32, low: 29.5, close: 31.5 },
      { open: 31.5, high: 34.5, low: 31, close: 34 },
      { open: 34, high: 41, low: 33.5, close: 40.5 },
      { open: 43, high: 50, low: 42.5, close: 49.5 },
      { open: 48, high: 48.5, low: 38.5, close: 39 },
      { open: 39.5, high: 44, low: 39, close: 43.5 },
      { open: 43.5, high: 48, low: 43, close: 47.5 },
      { open: 47.5, high: 52, low: 47, close: 51.5 },
      { open: 51.5, high: 56, low: 51, close: 55.5 },
    ],
  },
  {
    id: "downside-gap-three-methods",
    name: "Downside Gap Three Methods",
    category: "continuation",
    direction: "bearish",
    description:
      "Two long bearish candles separated by a downward gap are followed by a bullish candle that opens in the lower body, closes in the upper body and fills the gap. The fill is a pause; the downtrend usually resumes.",
    identification: [
      "Two long bearish candles with a visible gap between them",
      "Third candle is bullish and opens inside the second candle's body",
      "It closes inside the first candle's body, filling the gap",
      "The pattern appears after an already-falling market",
    ],
    tradingTips: [
      "Enter FALL on the candle after the gap fill, once it turns down again",
      "A close above the first candle's high cancels the setup",
      "Do not chase the bullish candle itself - it is the pause, not the signal",
      "Expiry of 2-4 candles with confirmation on the next close",
    ],
    timeframes: ["1h", "4h", "1d"],
    keyCandles: [2, 3, 4],
    candles: [
      { open: 72, high: 73, low: 69.5, close: 70 },
      { open: 70, high: 70.5, low: 66.5, close: 67 },
      { open: 67, high: 67.5, low: 60, close: 60.5 },
      { open: 58, high: 58.5, low: 51, close: 51.5 },
      { open: 53, high: 61.5, low: 52.5, close: 61 },
      { open: 60.5, high: 61, low: 56, close: 56.5 },
      { open: 56.5, high: 57, low: 52, close: 52.5 },
      { open: 52.5, high: 53, low: 48, close: 48.5 },
      { open: 48.5, high: 49, low: 44.5, close: 45 },
    ],
  },
  {
    id: "bullish-hikkake",
    name: "Bullish Hikkake",
    category: "continuation",
    direction: "bullish",
    description:
      "An inside bar is followed by a candle that breaks below it, trapping sellers, and then price turns back up through the inside bar's high within the next three candles. The failed downside break becomes the entry trigger.",
    identification: [
      "One candle's range sits entirely inside the previous candle's range",
      "Next candle makes both a lower high and a lower low than the inside bar",
      "Price then trades back above the inside bar's high within three candles",
      "The break above the inside bar's high confirms the pattern",
    ],
    tradingTips: [
      "Enter RISE the moment price closes above the inside bar's high",
      "The trap candle's low is the invalidation level - abandon it if price returns there",
      "No confirmation within three candles means no trade, not a late trade",
      "Expiry of 2-4 candles; it works best when the larger trend is already up",
    ],
    timeframes: ["5m", "15m", "1h", "4h"],
    keyCandles: [3, 4, 5, 7],
    candles: [
      { open: 30, high: 33, low: 29.5, close: 32.5 },
      { open: 32.5, high: 36, low: 32, close: 35.5 },
      { open: 35.5, high: 39, low: 35, close: 38.5 },
      { open: 39, high: 45, low: 38, close: 44 },
      { open: 43.5, high: 44, low: 40, close: 40.5 },
      { open: 40.5, high: 42.5, low: 37.5, close: 38 },
      { open: 38.5, high: 43, low: 38, close: 42.5 },
      { open: 42.5, high: 47, low: 42, close: 46.5 },
      { open: 46.5, high: 50, low: 46, close: 49.5 },
      { open: 49.5, high: 53, low: 49, close: 52.5 },
    ],
  },
  {
    id: "bearish-hikkake",
    name: "Bearish Hikkake",
    category: "continuation",
    direction: "bearish",
    description:
      "An inside bar is followed by a candle that breaks above it, trapping buyers, and then price falls back through the inside bar's low within the next three candles. The failed upside break becomes the entry trigger.",
    identification: [
      "One candle's range sits entirely inside the previous candle's range",
      "Next candle makes both a higher high and a higher low than the inside bar",
      "Price then trades back below the inside bar's low within three candles",
      "The break below the inside bar's low confirms the pattern",
    ],
    tradingTips: [
      "Enter FALL the moment price closes below the inside bar's low",
      "The trap candle's high is the invalidation level",
      "If three candles pass with no break lower, drop the setup",
      "Expiry of 2-4 candles; strongest when the larger trend is already down",
    ],
    timeframes: ["5m", "15m", "1h", "4h"],
    keyCandles: [3, 4, 5, 7],
    candles: [
      { open: 70, high: 71, low: 67, close: 67.5 },
      { open: 67.5, high: 68, low: 64, close: 64.5 },
      { open: 64.5, high: 65, low: 61.5, close: 62 },
      { open: 62, high: 63, low: 55, close: 56 },
      { open: 57, high: 61, low: 57, close: 60.5 },
      { open: 60.5, high: 63.5, low: 58, close: 62.5 },
      { open: 62, high: 62.5, low: 58, close: 58.5 },
      { open: 58.5, high: 59, low: 53.5, close: 54 },
      { open: 54, high: 54.5, low: 50, close: 50.5 },
      { open: 50.5, high: 51, low: 47, close: 47.5 },
    ],
  },
  {
    id: "island-reversal-top",
    name: "Island Reversal Top",
    category: "reversal",
    direction: "bearish",
    description:
      "An uptrend gaps up into a small cluster of candles, then gaps back down below that cluster, leaving it stranded with empty space on both sides. The two gaps mark buying exhaustion and a change of trend.",
    identification: [
      "Prior uptrend gaps up to a new high",
      "A few candles trade sideways above that gap",
      "Price then gaps down below the cluster's low",
      "Both gaps stay unfilled, isolating the island",
    ],
    tradingTips: [
      "Enter FALL once the second gap opens below the island",
      "The island needs clear air on both sides, no overlap",
      "Islands of one to five candles read most cleanly",
      "Skip it if the down gap fills within a candle or two",
    ],
    timeframes: ["1h", "4h", "1d"],
    keyCandles: [7, 10, 11],
    candles: [
      { open: 40, high: 43, low: 39.5, close: 42.5 },
      { open: 42.5, high: 46, low: 42, close: 45.5 },
      { open: 45.5, high: 48.5, low: 45, close: 48 },
      { open: 48, high: 52, low: 47.5, close: 51.5 },
      { open: 51.5, high: 55, low: 51, close: 54.5 },
      { open: 54.5, high: 58, low: 54, close: 57.5 },
      { open: 57.5, high: 61, low: 57, close: 60.5 },
      { open: 66, high: 69, low: 65.5, close: 68.5 },
      { open: 68.5, high: 71, low: 68, close: 70 },
      { open: 70, high: 71.5, low: 68.5, close: 69 },
      { open: 69, high: 70.5, low: 67, close: 67.5 },
      { open: 60, high: 60.5, low: 57, close: 57.5 },
      { open: 57.5, high: 58, low: 53.5, close: 54 },
      { open: 54, high: 54.5, low: 50, close: 50.5 },
    ],
  },
  {
    id: "island-reversal-bottom",
    name: "Island Reversal Bottom",
    category: "reversal",
    direction: "bullish",
    description:
      "A downtrend gaps down into a small cluster of candles, then gaps back up above that cluster, leaving it isolated below the rest of the chart. The two gaps mark selling exhaustion and a turn higher.",
    identification: [
      "Prior downtrend gaps down to a new low",
      "A few candles trade sideways below that gap",
      "Price then gaps up above the cluster's high",
      "Both gaps stay unfilled, isolating the island",
    ],
    tradingTips: [
      "Enter RISE once the second gap opens above the island",
      "Both gaps must be visible, not just a wide candle",
      "The cluster should be tight, not a new leg down",
      "Cancel the idea if the up gap closes back inside",
    ],
    timeframes: ["1h", "4h", "1d"],
    keyCandles: [7, 10, 11],
    candles: [
      { open: 70, high: 70.5, low: 67, close: 67.5 },
      { open: 67.5, high: 68, low: 64, close: 64.5 },
      { open: 64.5, high: 65, low: 61, close: 61.5 },
      { open: 61.5, high: 62, low: 58, close: 58.5 },
      { open: 58.5, high: 59, low: 55, close: 55.5 },
      { open: 55.5, high: 56, low: 52, close: 52.5 },
      { open: 52.5, high: 53, low: 50, close: 50.5 },
      { open: 45, high: 46, low: 43, close: 43.5 },
      { open: 43.5, high: 45, low: 42.5, close: 44 },
      { open: 44, high: 45.5, low: 43, close: 43.5 },
      { open: 43.5, high: 46, low: 43, close: 45.5 },
      { open: 51, high: 54, low: 50.5, close: 53.5 },
      { open: 53.5, high: 57, low: 53, close: 56.5 },
      { open: 56.5, high: 60, low: 56, close: 59.5 },
    ],
  },
  {
    id: "v-top",
    name: "V-Top (Spike Top)",
    category: "reversal",
    direction: "bearish",
    description:
      "A steep, near-vertical advance ends in a single sharp spike and reverses just as steeply, with no rounding or sideways pause at the high. The turn takes one or two candles.",
    identification: [
      "A steep advance with few or no pullbacks",
      "One candle spikes to the high and closes far below it",
      "The following candle opens lower and sells off",
      "The decline is about as steep as the rise was",
    ],
    tradingTips: [
      "Enter FALL after the candle following the spike closes lower",
      "Do not enter on the spike itself, it can extend",
      "Use the spike high as the invalidation level",
      "Moves are fast, so keep expiries short",
    ],
    timeframes: ["15m", "1h", "4h"],
    keyCandles: [5, 6, 7],
    candles: [
      { open: 45, high: 47, low: 44.5, close: 46.5 },
      { open: 46.5, high: 50, low: 46, close: 49.5 },
      { open: 49.5, high: 54, low: 49, close: 53.5 },
      { open: 53.5, high: 59, low: 53, close: 58.5 },
      { open: 58.5, high: 65, low: 58, close: 64.5 },
      { open: 64.5, high: 72, low: 64, close: 71.5 },
      { open: 71.5, high: 80, low: 71, close: 73 },
      { open: 72.5, high: 74, low: 66, close: 67 },
      { open: 67, high: 68, low: 60, close: 61 },
      { open: 61, high: 62, low: 54, close: 55 },
      { open: 55, high: 56, low: 49, close: 50 },
      { open: 50, high: 51, low: 44, close: 45 },
    ],
  },
  {
    id: "v-bottom",
    name: "V-Bottom (Spike Bottom)",
    category: "reversal",
    direction: "bullish",
    description:
      "A steep, near-vertical decline ends in a single sharp spike down and reverses just as steeply, with no basing at the low. The bottom is made in one or two candles.",
    identification: [
      "A steep decline with few or no bounces",
      "One candle spikes to the low and closes far above it",
      "The lower shadow is at least twice the body",
      "The following candle opens higher and rallies",
    ],
    tradingTips: [
      "Enter RISE after the candle following the spike closes higher",
      "Wait for the confirmation candle, not the spike",
      "Use the spike low as the invalidation level",
      "Expect no basing at the low, a sideways drift there makes it a different pattern",
    ],
    timeframes: ["15m", "1h", "4h"],
    keyCandles: [5, 6, 7],
    candles: [
      { open: 65, high: 66, low: 63, close: 63.5 },
      { open: 63.5, high: 64, low: 58, close: 58.5 },
      { open: 58.5, high: 59, low: 53, close: 53.5 },
      { open: 53.5, high: 54, low: 47, close: 47.5 },
      { open: 47.5, high: 48, low: 41, close: 41.5 },
      { open: 41.5, high: 42, low: 35, close: 36 },
      { open: 36, high: 38, low: 28, close: 37 },
      { open: 37.5, high: 43, low: 36.5, close: 42.5 },
      { open: 42.5, high: 48, low: 42, close: 47.5 },
      { open: 47.5, high: 53, low: 47, close: 52.5 },
      { open: 52.5, high: 58, low: 52, close: 57.5 },
      { open: 57.5, high: 63, low: 57, close: 62.5 },
    ],
  },
  {
    id: "bump-and-run-reversal-top",
    name: "Bump And Run Reversal Top",
    category: "reversal",
    direction: "bearish",
    description:
      "Price rises along a shallow trendline (the lead-in), then accelerates into a steep bump at least twice as tall, and finally breaks back below the lead-in line and runs down. The pattern was catalogued by Thomas Bulkowski.",
    identification: [
      "A lead-in phase rising at a modest, steady slope",
      "A steep bump at least twice the lead-in height",
      "The bump rolls over and price falls back to the lead-in line",
      "Price closes below that lead-in trendline",
    ],
    tradingTips: [
      "Enter FALL on the close below the lead-in trendline",
      "A bump barely taller than the lead-in is not the pattern",
      "The steeper the bump, the faster the run down",
      "Measure the target back to where the lead-in began",
    ],
    timeframes: ["1h", "4h", "1d"],
    keyCandles: [6, 10, 14],
    candles: [
      { open: 40, high: 41.5, low: 39.5, close: 41 },
      { open: 41, high: 42.5, low: 40.5, close: 42 },
      { open: 42, high: 43.5, low: 41.5, close: 43 },
      { open: 43, high: 44.5, low: 42.5, close: 44 },
      { open: 44, high: 46, low: 43.5, close: 45.5 },
      { open: 45.5, high: 47.5, low: 45, close: 47 },
      { open: 47, high: 50, low: 46.5, close: 49.5 },
      { open: 49.5, high: 56, low: 49, close: 55.5 },
      { open: 55.5, high: 63, low: 55, close: 62.5 },
      { open: 62.5, high: 70, low: 62, close: 69.5 },
      { open: 69.5, high: 76, low: 69, close: 75 },
      { open: 75, high: 76, low: 68, close: 68.5 },
      { open: 68.5, high: 69, low: 61, close: 61.5 },
      { open: 61.5, high: 62, low: 54, close: 54.5 },
      { open: 54.5, high: 55, low: 48, close: 48.5 },
      { open: 48.5, high: 49, low: 42, close: 42.5 },
    ],
  },
  {
    id: "bump-and-run-reversal-bottom",
    name: "Bump And Run Reversal Bottom",
    category: "reversal",
    direction: "bullish",
    description:
      "Price falls along a shallow trendline (the lead-in), then accelerates into a steep bump down at least twice as deep, and finally breaks back above the lead-in line and runs up. The mirror of the bump and run reversal top.",
    identification: [
      "A lead-in phase falling at a modest, steady slope",
      "A steep bump down at least twice the lead-in depth",
      "The bump bottoms and price recovers to the lead-in line",
      "Price closes above that lead-in trendline",
    ],
    tradingTips: [
      "Enter RISE on the close above the lead-in trendline",
      "Do not buy inside the bump, it can keep extending",
      "A shallow bump means there is no pattern to trade",
      "Target the level where the lead-in phase started",
    ],
    timeframes: ["1h", "4h", "1d"],
    keyCandles: [6, 10, 14],
    candles: [
      { open: 60, high: 60.5, low: 58.5, close: 59 },
      { open: 59, high: 59.5, low: 57.5, close: 58 },
      { open: 58, high: 58.5, low: 56.5, close: 57 },
      { open: 57, high: 57.5, low: 55.5, close: 56 },
      { open: 56, high: 56.5, low: 54, close: 54.5 },
      { open: 54.5, high: 55, low: 52.5, close: 53 },
      { open: 53, high: 53.5, low: 50, close: 50.5 },
      { open: 50.5, high: 51, low: 44, close: 44.5 },
      { open: 44.5, high: 45, low: 37, close: 37.5 },
      { open: 37.5, high: 38, low: 30, close: 30.5 },
      { open: 30.5, high: 31, low: 24, close: 25 },
      { open: 25, high: 32, low: 24.5, close: 31.5 },
      { open: 31.5, high: 38, low: 31, close: 37.5 },
      { open: 37.5, high: 44, low: 37, close: 43.5 },
      { open: 43.5, high: 50, low: 43, close: 49.5 },
      { open: 49.5, high: 56, low: 49, close: 55.5 },
    ],
  },
  {
    id: "horn-top",
    name: "Horn Top",
    category: "reversal",
    direction: "bearish",
    description:
      "Two tall upward spikes separated by exactly one shorter candle form a horn shape at the end of a rise. Both spikes reach roughly the same level and stand clearly above the candles around them.",
    identification: [
      "The shape forms after a rise, at or near a high",
      "Two long upper spikes with exactly one candle between them",
      "Both spikes top out at a similar price",
      "The candle in between is noticeably shorter",
    ],
    tradingTips: [
      "Enter FALL when price closes below the low of the horn",
      "Spikes of very different height weaken the signal",
      "Best read on 4h and daily candles, not intraday noise",
      "Invalidated if price closes above the spike highs",
    ],
    timeframes: ["4h", "1d"],
    keyCandles: [6, 7, 8],
    candles: [
      { open: 42, high: 44, low: 41.5, close: 43.5 },
      { open: 43.5, high: 46, low: 43, close: 45.5 },
      { open: 45.5, high: 48, low: 45, close: 47.5 },
      { open: 47.5, high: 50, low: 47, close: 49.5 },
      { open: 49.5, high: 52, low: 49, close: 51.5 },
      { open: 51.5, high: 54, low: 51, close: 53.5 },
      { open: 53.5, high: 66, low: 53, close: 56 },
      { open: 56, high: 58, low: 54.5, close: 55.5 },
      { open: 55.5, high: 65.5, low: 55, close: 56.5 },
      { open: 56.5, high: 57, low: 51, close: 51.5 },
      { open: 51.5, high: 52, low: 46, close: 46.5 },
      { open: 46.5, high: 47, low: 41, close: 41.5 },
      { open: 41.5, high: 42, low: 36, close: 36.5 },
    ],
  },
  {
    id: "horn-bottom",
    name: "Horn Bottom",
    category: "reversal",
    direction: "bullish",
    description:
      "Two long downward spikes separated by exactly one shorter candle form a horn shape at the end of a decline. Both spikes reach roughly the same low and stand clearly below the surrounding candles.",
    identification: [
      "The shape forms after a decline, at or near a low",
      "Two long lower spikes with exactly one candle between them",
      "Both spikes bottom at a similar price",
      "The candle in between has a much smaller range",
    ],
    tradingTips: [
      "Enter RISE when price closes above the high of the horn",
      "The two spike lows should be close to level",
      "Give it room, the second spike often undercuts the first",
      "Invalidated if price closes below the spike lows",
    ],
    timeframes: ["4h", "1d"],
    keyCandles: [6, 7, 8],
    candles: [
      { open: 58, high: 58.5, low: 56, close: 56.5 },
      { open: 56.5, high: 57, low: 54, close: 54.5 },
      { open: 54.5, high: 55, low: 52, close: 52.5 },
      { open: 52.5, high: 53, low: 50, close: 50.5 },
      { open: 50.5, high: 51, low: 48, close: 48.5 },
      { open: 48.5, high: 49, low: 46, close: 46.5 },
      { open: 46.5, high: 47, low: 34, close: 44 },
      { open: 44, high: 45.5, low: 42, close: 43 },
      { open: 43, high: 45, low: 34.5, close: 44.5 },
      { open: 44.5, high: 50, low: 44, close: 49.5 },
      { open: 49.5, high: 55, low: 49, close: 54.5 },
      { open: 54.5, high: 60, low: 54, close: 59.5 },
      { open: 59.5, high: 65, low: 59, close: 64.5 },
    ],
  },
  {
    id: "pipe-top",
    name: "Pipe Top",
    category: "reversal",
    direction: "bearish",
    description:
      "Two adjacent candles with long upward spikes of similar height end a rise, standing well above everything around them. Unlike the horn, the two spikes sit side by side with no candle between them.",
    identification: [
      "Two side-by-side candles with long upper spikes",
      "The spikes top out at roughly the same price",
      "Both stand clearly above the surrounding candles",
      "The pattern appears after a measurable advance",
    ],
    tradingTips: [
      "Enter FALL when price closes below both spike lows",
      "Adjacent spikes only, a candle in between makes it a horn",
      "Higher timeframes give the more reliable version",
      "Abandon it if price closes back above the spike tops",
    ],
    timeframes: ["4h", "1d"],
    keyCandles: [6, 7],
    candles: [
      { open: 42, high: 44, low: 41.5, close: 43.5 },
      { open: 43.5, high: 46, low: 43, close: 45.5 },
      { open: 45.5, high: 48, low: 45, close: 47.5 },
      { open: 47.5, high: 50, low: 47, close: 49.5 },
      { open: 49.5, high: 52, low: 49, close: 51.5 },
      { open: 51.5, high: 54, low: 51, close: 53.5 },
      { open: 53.5, high: 66, low: 53, close: 56 },
      { open: 56, high: 66.5, low: 55, close: 56.5 },
      { open: 56.5, high: 57, low: 50, close: 50.5 },
      { open: 50.5, high: 51, low: 45, close: 45.5 },
      { open: 45.5, high: 46, low: 40, close: 40.5 },
      { open: 40.5, high: 41, low: 35, close: 35.5 },
    ],
  },
  {
    id: "pipe-bottom",
    name: "Pipe Bottom",
    category: "reversal",
    direction: "bullish",
    description:
      "Two adjacent candles with long downward spikes of similar depth end a decline, standing well below everything around them. The pair marks a capitulation low with no candle separating the spikes.",
    identification: [
      "Two side-by-side candles with long lower spikes",
      "The spikes bottom at roughly the same price",
      "Both extend well below the surrounding candles",
      "The pattern appears after a clear decline",
    ],
    tradingTips: [
      "Enter RISE when price closes above both spike highs",
      "Adjacent spikes only, a candle in between makes it a horn",
      "Deeper spikes than the neighbouring candles matter most",
      "Give up on it if price closes under the spike lows",
    ],
    timeframes: ["4h", "1d"],
    keyCandles: [6, 7],
    candles: [
      { open: 58, high: 58.5, low: 56, close: 56.5 },
      { open: 56.5, high: 57, low: 54, close: 54.5 },
      { open: 54.5, high: 55, low: 52, close: 52.5 },
      { open: 52.5, high: 53, low: 50, close: 50.5 },
      { open: 50.5, high: 51, low: 48, close: 48.5 },
      { open: 48.5, high: 49, low: 46, close: 46.5 },
      { open: 46.5, high: 47.5, low: 34, close: 44 },
      { open: 44, high: 45.5, low: 33.5, close: 45 },
      { open: 45, high: 51, low: 44.5, close: 50.5 },
      { open: 50.5, high: 56, low: 50, close: 55.5 },
      { open: 55.5, high: 61, low: 55, close: 60.5 },
      { open: 60.5, high: 66, low: 60, close: 65.5 },
    ],
  },
  {
    id: "dead-cat-bounce",
    name: "Dead Cat Bounce",
    category: "continuation",
    direction: "bearish",
    description:
      "A sharp one-off collapse is followed by a partial recovery of roughly a third to a half of the drop, and then the decline resumes to new lows. The bounce is a pause in the selling, not a reversal.",
    identification: [
      "A single large drop or gap down ends a stable phase",
      "Price bounces back part of the way, usually under half",
      "The bounce stalls well below the pre-drop level",
      "Price then rolls over toward the event low",
    ],
    tradingTips: [
      "Enter FALL when the bounce stalls and turns down",
      "Do not enter RISE into the bounce, it usually fails",
      "A recovery above the pre-drop price cancels the setup",
      "Expect a retest of, and break below, the crash low",
    ],
    timeframes: ["1h", "4h", "1d"],
    keyCandles: [5, 9, 10],
    candles: [
      { open: 76, high: 77, low: 74.5, close: 75 },
      { open: 75, high: 76, low: 73.5, close: 74 },
      { open: 74, high: 75, low: 72.5, close: 73.5 },
      { open: 73.5, high: 74.5, low: 72.5, close: 74 },
      { open: 74, high: 75, low: 72, close: 72.5 },
      { open: 52, high: 54, low: 48, close: 49 },
      { open: 49, high: 52, low: 48, close: 51.5 },
      { open: 51.5, high: 55, low: 51, close: 54.5 },
      { open: 54.5, high: 58, low: 54, close: 57.5 },
      { open: 57.5, high: 60, low: 57, close: 59 },
      { open: 59, high: 59.5, low: 55, close: 55.5 },
      { open: 55.5, high: 56, low: 51, close: 51.5 },
      { open: 51.5, high: 52, low: 47, close: 47.5 },
      { open: 47.5, high: 48, low: 43, close: 43.5 },
    ],
  },
  {
    id: "ascending-scallop",
    name: "Ascending Scallop",
    category: "continuation",
    direction: "bullish",
    description:
      "A J-shaped pattern inside an uptrend: price makes a high, drifts down in a rounded curve, then rises again to close above that earlier high. In a strong trend the scallops step higher one after another.",
    identification: [
      "The shape begins after an existing rise",
      "A rounded, saucer-like decline rather than a sharp drop",
      "A gentle rounded low with overlapping candles",
      "The right side rises above the left side's high",
    ],
    tradingTips: [
      "Enter RISE when price closes above the left-side high",
      "The curve must be rounded, a V is a different pattern",
      "Later scallops in a series tend to be weaker",
      "A close below the rounded low voids the setup",
    ],
    timeframes: ["1h", "4h", "1d"],
    keyCandles: [2, 6, 11],
    candles: [
      { open: 40, high: 43, low: 39.5, close: 42.5 },
      { open: 42.5, high: 46, low: 42, close: 45.5 },
      { open: 45.5, high: 50, low: 45, close: 49.5 },
      { open: 49.5, high: 50.5, low: 47, close: 47.5 },
      { open: 47.5, high: 48, low: 45, close: 45.5 },
      { open: 45.5, high: 46, low: 43.5, close: 44 },
      { open: 44, high: 44.5, low: 42.5, close: 43 },
      { open: 43, high: 44, low: 42, close: 43.5 },
      { open: 43.5, high: 45.5, low: 43, close: 45 },
      { open: 45, high: 47.5, low: 44.5, close: 47 },
      { open: 47, high: 50, low: 46.5, close: 49.5 },
      { open: 49.5, high: 53, low: 49, close: 52.5 },
      { open: 52.5, high: 56, low: 52, close: 55.5 },
      { open: 55.5, high: 59, low: 55, close: 58.5 },
    ],
  },
  {
    id: "descending-scallop",
    name: "Descending Scallop",
    category: "continuation",
    direction: "bearish",
    description:
      "The downtrend mirror of the ascending scallop: price makes a low, curves up in a rounded arc, then falls again to a new low beneath that earlier low. Successive scallops step lower.",
    identification: [
      "The shape begins after an existing decline",
      "A rounded rise and rounded top, not a sharp peak",
      "Candles overlap heavily through the arc",
      "The right side falls below the left side's low",
    ],
    tradingTips: [
      "Enter FALL when price closes below the left-side low",
      "The arc should be smooth, with no sharp spike top",
      "Weak in choppy ranges, it needs a real downtrend",
      "A close above the rounded high voids the setup",
    ],
    timeframes: ["1h", "4h", "1d"],
    keyCandles: [2, 6, 11],
    candles: [
      { open: 60, high: 60.5, low: 57, close: 57.5 },
      { open: 57.5, high: 58, low: 54, close: 54.5 },
      { open: 54.5, high: 55, low: 50.5, close: 51 },
      { open: 51, high: 53.5, low: 50.5, close: 53 },
      { open: 53, high: 55, low: 52.5, close: 54.5 },
      { open: 54.5, high: 56.5, low: 54, close: 56 },
      { open: 56, high: 57, low: 55.5, close: 56.5 },
      { open: 56.5, high: 57, low: 55.5, close: 56 },
      { open: 56, high: 56.5, low: 54, close: 54.5 },
      { open: 54.5, high: 55, low: 52, close: 52.5 },
      { open: 52.5, high: 53, low: 49.5, close: 50 },
      { open: 50, high: 50.5, low: 46, close: 46.5 },
      { open: 46.5, high: 47, low: 43, close: 43.5 },
      { open: 43.5, high: 44, low: 40, close: 40.5 },
    ],
  },
  {
    id: "high-and-tight-flag",
    name: "High And Tight Flag",
    category: "continuation",
    direction: "bullish",
    description:
      "Price roughly doubles in a short, near-vertical run, then pauses in a brief and tight consolidation that gives back only a small part of the gain before advancing again. Rare, and defined by how shallow the pause is.",
    identification: [
      "A near-vertical rise of about 90 percent or more",
      "A short pause of only a few candles",
      "The pullback retraces less than a quarter of the run",
      "Price breaks out above the high of the pause",
    ],
    tradingTips: [
      "Enter RISE on the close above the consolidation high",
      "A deep pullback disqualifies it, tightness is the point",
      "Rare, so do not force loose examples into the pattern",
      "The prior run gives a rough size for the next leg",
    ],
    timeframes: ["4h", "1d"],
    keyCandles: [6, 9, 10],
    candles: [
      { open: 30, high: 32, low: 29.5, close: 31.5 },
      { open: 31.5, high: 36, low: 31, close: 35.5 },
      { open: 35.5, high: 41, low: 35, close: 40.5 },
      { open: 40.5, high: 47, low: 40, close: 46.5 },
      { open: 46.5, high: 53, low: 46, close: 52.5 },
      { open: 52.5, high: 59, low: 52, close: 58.5 },
      { open: 58.5, high: 65, low: 58, close: 64.5 },
      { open: 64.5, high: 65.5, low: 61.5, close: 62 },
      { open: 62, high: 63, low: 60.5, close: 61.5 },
      { open: 61.5, high: 62.5, low: 60, close: 61 },
      { open: 61, high: 67, low: 60.5, close: 66.5 },
      { open: 66.5, high: 71, low: 66, close: 70.5 },
      { open: 70.5, high: 76, low: 70, close: 75.5 },
      { open: 75.5, high: 81, low: 75, close: 80.5 },
    ],
  },
  {
    id: "descending-broadening-wedge",
    name: "Descending Broadening Wedge",
    category: "reversal",
    direction: "bullish",
    description:
      "Two down-sloping trendlines that widen apart, with the lower line falling faster than the upper one. Swings get larger as price sinks, and the resolution is usually a break out through the upper line.",
    identification: [
      "Both boundary lines slope down and diverge",
      "At least two touches on each trendline",
      "Each swing high is lower and each swing low is lower still",
      "Price closes above the upper trendline to break out",
    ],
    tradingTips: [
      "Enter RISE on the close above the upper trendline",
      "Only trade it once both lines have two clean touches",
      "Widening swings mean wider stops and shorter expiries",
      "A close below the lower line is a failure, not the setup",
    ],
    timeframes: ["30m", "1h", "4h", "1d"],
    keyCandles: [3, 7, 11, 13],
    candles: [
      { open: 74, high: 75, low: 71.5, close: 72 },
      { open: 72, high: 72.5, low: 68, close: 68.5 },
      { open: 68.5, high: 70, low: 67, close: 69.5 },
      { open: 69.5, high: 70, low: 60, close: 61 },
      { open: 61, high: 64, low: 60.5, close: 63.5 },
      { open: 63.5, high: 66, low: 63, close: 65 },
      { open: 65, high: 65.5, low: 57, close: 57.5 },
      { open: 57.5, high: 58, low: 52, close: 53 },
      { open: 53, high: 57, low: 52.5, close: 56.5 },
      { open: 56.5, high: 61, low: 56, close: 60 },
      { open: 60, high: 60.5, low: 50, close: 50.5 },
      { open: 50.5, high: 51, low: 43, close: 44 },
      { open: 44, high: 50, low: 43.5, close: 49.5 },
      { open: 49.5, high: 57, low: 49, close: 56.5 },
      { open: 56.5, high: 63, low: 56, close: 62.5 },
      { open: 62.5, high: 68, low: 62, close: 67.5 },
    ],
  },
  {
    id: "shark-bullish",
    name: "Shark Bullish",
    category: "reversal",
    direction: "bullish",
    description:
      "A five-point 0-X-A-B-C structure that ends with one steep flush below the starting point. The buy is at C, where that final leg stalls against the 0.886 retracement of the 0-X leg.",
    identification: [
      "Five points 0-X-A-B-C: 0-X up, X-A down, A-B up, B-C down.",
      "AB extends 1.13 to 1.618 of XA, so B prints above X.",
      "BC extends 1.618 to 2.24 of AB in one steep leg.",
      "C completes at 0.886 to 1.13 of the 0-X leg, just under point 0.",
    ],
    tradingTips: [
      "Enter RISE only after a candle closes back up off the C low.",
      "Keep expiry near 3-5 candles; the bounce off C is fast.",
      "First target is the 0.5 retracement of the B-C leg.",
      "Void the setup if price extends past 1.13 of the 0-X leg.",
    ],
    timeframes: ["15m", "1h", "4h"],
    keyCandles: [5, 9, 12],
    candles: [
      { open: 48, high: 48.5, low: 44.5, close: 45 },
      { open: 45, high: 45.5, low: 41.5, close: 42 },
      { open: 42, high: 42.5, low: 39.5, close: 40 },
      { open: 40, high: 48.5, low: 39.5, close: 48 },
      { open: 48, high: 55.5, low: 47.5, close: 55 },
      { open: 55, high: 60.5, low: 54.5, close: 60 },
      { open: 60, high: 60.5, low: 53.5, close: 54 },
      { open: 54, high: 54.5, low: 49.5, close: 50 },
      { open: 50, high: 57.5, low: 49.5, close: 57 },
      { open: 57, high: 63.5, low: 56.5, close: 63 },
      { open: 63, high: 63.5, low: 53.5, close: 54 },
      { open: 54, high: 54.5, low: 44.5, close: 45 },
      { open: 45, high: 45.5, low: 37.5, close: 38 },
      { open: 38, high: 45.5, low: 37.5, close: 45 },
      { open: 45, high: 50.5, low: 44.5, close: 50 },
    ],
  },
  {
    id: "shark-bearish",
    name: "Shark Bearish",
    category: "reversal",
    direction: "bearish",
    description:
      "A five-point 0-X-A-B-C structure that ends with one steep spike above the starting point. The sell is at C, where that final leg stalls against the 0.886 retracement of the 0-X leg.",
    identification: [
      "Five points 0-X-A-B-C: 0-X down, X-A up, A-B down, B-C up.",
      "AB extends 1.13 to 1.618 of XA, so B prints below X.",
      "BC extends 1.618 to 2.24 of AB in one steep leg.",
      "C completes at 0.886 to 1.13 of the 0-X leg, just above point 0.",
    ],
    tradingTips: [
      "Enter FALL only after a candle closes back down off the C high.",
      "Keep expiry near 3-5 candles; the drop off C is fast.",
      "First target is the 0.5 retracement of the B-C leg.",
      "Void the setup if price extends past 1.13 of the 0-X leg.",
    ],
    timeframes: ["15m", "1h", "4h"],
    keyCandles: [5, 9, 12],
    candles: [
      { open: 62, high: 65.5, low: 61.5, close: 65 },
      { open: 65, high: 68.5, low: 64.5, close: 68 },
      { open: 68, high: 70.5, low: 67.5, close: 70 },
      { open: 70, high: 70.5, low: 61.5, close: 62 },
      { open: 62, high: 62.5, low: 54.5, close: 55 },
      { open: 55, high: 55.5, low: 49.5, close: 50 },
      { open: 50, high: 56.5, low: 49.5, close: 56 },
      { open: 56, high: 60.5, low: 55.5, close: 60 },
      { open: 60, high: 60.5, low: 52.5, close: 53 },
      { open: 53, high: 53.5, low: 46.5, close: 47 },
      { open: 47, high: 56.5, low: 46.5, close: 56 },
      { open: 56, high: 65.5, low: 55.5, close: 65 },
      { open: 65, high: 72.5, low: 64.5, close: 72 },
      { open: 72, high: 72.5, low: 64.5, close: 65 },
      { open: 65, high: 65.5, low: 59.5, close: 60 },
    ],
  },
  {
    id: "deep-crab-bullish",
    name: "Deep Crab Bullish",
    category: "reversal",
    direction: "bullish",
    description:
      "A Crab variant where B retraces a deep 0.886 of XA yet D still completes at the 1.618 extension of XA. The long entry is at D, well below the X low.",
    identification: [
      "Five points X-A-B-C-D; X is a low, A a high, D the final low.",
      "B retraces 0.886 of XA - the deep leg that names the pattern.",
      "CD extends 2.24 to 3.618 of the BC leg.",
      "D completes at the 1.618 extension of XA, well below X.",
    ],
    tradingTips: [
      "Enter RISE at D only once a candle closes back above the D low.",
      "Treat 1.618 of XA as a zone, not a price - allow a small overshoot.",
      "First target is the 0.382 retracement of the whole CD leg.",
      "Abandon it if price runs past the 2.0 extension of XA.",
    ],
    timeframes: ["1h", "4h", "1d"],
    keyCandles: [1, 4, 6, 11],
    candles: [
      { open: 55, high: 55.5, low: 50.5, close: 51 },
      { open: 51, high: 51.5, low: 49.5, close: 50 },
      { open: 50, high: 58.5, low: 49.5, close: 58 },
      { open: 58, high: 65.5, low: 57.5, close: 65 },
      { open: 65, high: 70.5, low: 64.5, close: 70 },
      { open: 70, high: 70.5, low: 60.5, close: 61 },
      { open: 61, high: 61.5, low: 52, close: 52.5 },
      { open: 52.5, high: 59.5, low: 52, close: 59 },
      { open: 59, high: 63.5, low: 58.5, close: 63 },
      { open: 63, high: 63.5, low: 54.5, close: 55 },
      { open: 55, high: 55.5, low: 46.5, close: 47 },
      { open: 47, high: 47.5, low: 37.5, close: 38 },
      { open: 38, high: 46.5, low: 37.5, close: 46 },
      { open: 46, high: 53.5, low: 45.5, close: 53 },
      { open: 53, high: 58.5, low: 52.5, close: 58 },
    ],
  },
  {
    id: "deep-crab-bearish",
    name: "Deep Crab Bearish",
    category: "reversal",
    direction: "bearish",
    description:
      "A Crab variant where B retraces a deep 0.886 of XA yet D still completes at the 1.618 extension of XA. The short entry is at D, well above the X high.",
    identification: [
      "Five points X-A-B-C-D; X is a high, A a low, D the final high.",
      "B retraces 0.886 of XA - the deep leg that names the pattern.",
      "CD extends 2.24 to 3.618 of the BC leg.",
      "D completes at the 1.618 extension of XA, well above X.",
    ],
    tradingTips: [
      "Enter FALL at D only once a candle closes back below the D high.",
      "Treat 1.618 of XA as a zone, not a price - allow a small overshoot.",
      "First target is the 0.382 retracement of the whole CD leg.",
      "Abandon it if price runs past the 2.0 extension of XA.",
    ],
    timeframes: ["1h", "4h", "1d"],
    keyCandles: [1, 4, 6, 11],
    candles: [
      { open: 65, high: 69.5, low: 64.5, close: 69 },
      { open: 69, high: 70.5, low: 68.5, close: 70 },
      { open: 70, high: 70.5, low: 62.5, close: 63 },
      { open: 63, high: 63.5, low: 55.5, close: 56 },
      { open: 56, high: 56.5, low: 49.5, close: 50 },
      { open: 50, high: 59.5, low: 49.5, close: 59 },
      { open: 59, high: 68, low: 58.5, close: 67.5 },
      { open: 67.5, high: 68, low: 60.5, close: 61 },
      { open: 61, high: 61.5, low: 56.5, close: 57 },
      { open: 57, high: 65.5, low: 56.5, close: 65 },
      { open: 65, high: 74.5, low: 64.5, close: 74 },
      { open: 74, high: 82.5, low: 73.5, close: 82 },
      { open: 82, high: 82.5, low: 73.5, close: 74 },
      { open: 74, high: 74.5, low: 66.5, close: 67 },
      { open: 67, high: 67.5, low: 61.5, close: 62 },
    ],
  },
  {
    id: "abcd-bullish",
    name: "ABCD Bullish",
    category: "reversal",
    direction: "bullish",
    description:
      "A four-point AB=CD: a decline (AB), a partial rally (BC), then a second decline (CD) of about the same size as the first. D is the buy point.",
    identification: [
      "A is a high, B a low, C a lower high, D the final low.",
      "BC retraces 0.618 to 0.786 of the AB leg.",
      "CD extends 1.272 to 1.618 of the BC leg.",
      "CD is roughly equal to AB in price distance and in bar count.",
    ],
    tradingTips: [
      "Enter RISE when the CD leg stalls at the projected D price.",
      "Check the bar counts: the cleanest AB=CD has both legs taking similar time.",
      "Target the 0.382 then the 0.618 retracement of the CD leg.",
      "Skip it if BC retraces past 0.886 - that is no longer an AB=CD.",
    ],
    timeframes: ["5m", "15m", "1h", "4h"],
    keyCandles: [1, 4, 6, 9],
    candles: [
      { open: 64, high: 68.5, low: 63.5, close: 68 },
      { open: 68, high: 70.5, low: 67.5, close: 70 },
      { open: 70, high: 70.5, low: 61.5, close: 62 },
      { open: 62, high: 62.5, low: 54.5, close: 55 },
      { open: 55, high: 55.5, low: 49.5, close: 50 },
      { open: 50, high: 57.5, low: 49.5, close: 57 },
      { open: 57, high: 63, low: 56.5, close: 62.5 },
      { open: 62.5, high: 63, low: 55.5, close: 56 },
      { open: 56, high: 56.5, low: 48.5, close: 49 },
      { open: 49, high: 49.5, low: 42.5, close: 43 },
      { open: 43, high: 50.5, low: 42.5, close: 50 },
      { open: 50, high: 56.5, low: 49.5, close: 56 },
      { open: 56, high: 61.5, low: 55.5, close: 61 },
    ],
  },
  {
    id: "abcd-bearish",
    name: "ABCD Bearish",
    category: "reversal",
    direction: "bearish",
    description:
      "A four-point AB=CD: a rally (AB), a partial decline (BC), then a second rally (CD) of about the same size as the first. D is the sell point.",
    identification: [
      "A is a low, B a high, C a higher low, D the final high.",
      "BC retraces 0.618 to 0.786 of the AB leg.",
      "CD extends 1.272 to 1.618 of the BC leg.",
      "CD is roughly equal to AB in price distance and in bar count.",
    ],
    tradingTips: [
      "Enter FALL when the CD leg stalls at the projected D price.",
      "Check the bar counts: the cleanest AB=CD has both legs taking similar time.",
      "Target the 0.382 then the 0.618 retracement of the CD leg.",
      "Skip it if BC retraces past 0.886 - that is no longer an AB=CD.",
    ],
    timeframes: ["5m", "15m", "1h", "4h"],
    keyCandles: [1, 4, 6, 9],
    candles: [
      { open: 46, high: 46.5, low: 41.5, close: 42 },
      { open: 42, high: 42.5, low: 39.5, close: 40 },
      { open: 40, high: 48.5, low: 39.5, close: 48 },
      { open: 48, high: 55.5, low: 47.5, close: 55 },
      { open: 55, high: 60.5, low: 54.5, close: 60 },
      { open: 60, high: 60.5, low: 52.5, close: 53 },
      { open: 53, high: 53.5, low: 47, close: 47.5 },
      { open: 47.5, high: 54.5, low: 47, close: 54 },
      { open: 54, high: 61.5, low: 53.5, close: 61 },
      { open: 61, high: 68, low: 60.5, close: 67.5 },
      { open: 67.5, high: 68, low: 59.5, close: 60 },
      { open: 60, high: 60.5, low: 53.5, close: 54 },
      { open: 54, high: 54.5, low: 48.5, close: 49 },
    ],
  },
  {
    id: "alternate-bat-bullish",
    name: "Alternate Bat Bullish",
    category: "reversal",
    direction: "bullish",
    description:
      "A Bat variant with a shallow B point and a completion that overshoots X: B retraces only 0.382 of XA and D lands at the 1.128 extension of XA. The buy is at D.",
    identification: [
      "Five points X-A-B-C-D; X a low, A a high, D the final low.",
      "B retraces no more than 0.382 of XA - the shallow leg is the filter.",
      "CD extends 2.0 to 3.618 of the BC leg.",
      "D completes at the 1.128 extension of XA, just below the X low.",
    ],
    tradingTips: [
      "Enter RISE at the 1.128 of XA once a candle closes back above it.",
      "If B retraces deeper than 0.382 - anywhere out to the 0.500 - it is a standard Bat, not this one.",
      "First target is the 0.382 retracement of the A-to-D leg.",
      "The overshoot below X is small - keep expiry tight and drop it on a deep break.",
    ],
    timeframes: ["15m", "1h", "4h"],
    keyCandles: [5, 7, 9, 13],
    candles: [
      { open: 50, high: 50.5, low: 45.5, close: 46 },
      { open: 46, high: 46.5, low: 44.5, close: 45 },
      { open: 45, high: 53.5, low: 44.5, close: 53 },
      { open: 53, high: 62.5, low: 52.5, close: 62 },
      { open: 62, high: 70.5, low: 61.5, close: 70 },
      { open: 70, high: 75.5, low: 69.5, close: 75 },
      { open: 75, high: 75.5, low: 68.5, close: 69 },
      { open: 69, high: 69.5, low: 63, close: 63.5 },
      { open: 63.5, high: 69.5, low: 63, close: 69 },
      { open: 69, high: 73, low: 68.5, close: 72.5 },
      { open: 72.5, high: 73, low: 63.5, close: 64 },
      { open: 64, high: 64.5, low: 53.5, close: 54 },
      { open: 54, high: 54.5, low: 46.5, close: 47 },
      { open: 47, high: 47.5, low: 41, close: 41.5 },
      { open: 41.5, high: 50.5, low: 41, close: 50 },
      { open: 50, high: 57.5, low: 49.5, close: 57 },
    ],
  },
  {
    id: "alternate-bat-bearish",
    name: "Alternate Bat Bearish",
    category: "reversal",
    direction: "bearish",
    description:
      "A Bat variant with a shallow B point and a completion that overshoots X: B retraces only 0.382 of XA and D lands at the 1.128 extension of XA. The sell is at D.",
    identification: [
      "Five points X-A-B-C-D; X a high, A a low, D the final high.",
      "B retraces no more than 0.382 of XA - the shallow leg is the filter.",
      "CD extends 2.0 to 3.618 of the BC leg.",
      "D completes at the 1.128 extension of XA, just above the X high.",
    ],
    tradingTips: [
      "Enter FALL at the 1.128 of XA once a candle closes back below it.",
      "If B retraces deeper than 0.382 - anywhere out to the 0.500 - it is a standard Bat, not this one.",
      "First target is the 0.382 retracement of the A-to-D leg.",
      "The overshoot above X is small - keep expiry tight and drop it on a deep break.",
    ],
    timeframes: ["15m", "1h", "4h"],
    keyCandles: [5, 7, 9, 13],
    candles: [
      { open: 70, high: 74.5, low: 69.5, close: 74 },
      { open: 74, high: 75.5, low: 73.5, close: 75 },
      { open: 75, high: 75.5, low: 67.5, close: 68 },
      { open: 68, high: 68.5, low: 58.5, close: 59 },
      { open: 59, high: 59.5, low: 50.5, close: 51 },
      { open: 51, high: 51.5, low: 44.5, close: 45 },
      { open: 45, high: 51.5, low: 44.5, close: 51 },
      { open: 51, high: 57, low: 50.5, close: 56.5 },
      { open: 56.5, high: 57, low: 50.5, close: 51 },
      { open: 51, high: 51.5, low: 47, close: 47.5 },
      { open: 47.5, high: 56.5, low: 47, close: 56 },
      { open: 56, high: 66.5, low: 55.5, close: 66 },
      { open: 66, high: 74.5, low: 65.5, close: 74 },
      { open: 74, high: 79, low: 73.5, close: 78.5 },
      { open: 78.5, high: 79, low: 69.5, close: 70 },
      { open: 70, high: 70.5, low: 62.5, close: 63 },
    ],
  },
  {
    id: "five-0-bullish",
    name: "5-0 Pattern Bullish",
    category: "reversal",
    direction: "bullish",
    description:
      "A six-point 0-X-A-B-C-D structure where a failed push lower is followed by a strong rally, then a 50 percent retracement of that rally. D, the 0.500 of the B-C leg, is the buy point.",
    identification: [
      "Points 0-X-A-B-C-D; B breaks below X, then C rallies above A.",
      "AB extends 1.13 to 1.618 of the XA leg.",
      "BC extends 1.618 to 2.24 of the AB leg.",
      "D sits at the 0.500 retracement of BC, with CD roughly equal to AB.",
    ],
    tradingTips: [
      "Enter RISE at the 0.500 of BC - the level itself is the pattern.",
      "Measure CD against AB; a large mismatch means it is not a 5-0.",
      "Target a move back toward the C high.",
      "A decisive close past the 0.618 of BC kills the setup.",
    ],
    timeframes: ["1h", "4h", "1d"],
    keyCandles: [3, 7, 10, 12],
    candles: [
      { open: 64, high: 68.5, low: 63.5, close: 68 },
      { open: 68, high: 70.5, low: 67.5, close: 70 },
      { open: 70, high: 70.5, low: 62.5, close: 63 },
      { open: 63, high: 63.5, low: 55, close: 55.5 },
      { open: 55.5, high: 61.5, low: 55, close: 61 },
      { open: 61, high: 65.5, low: 60.5, close: 65 },
      { open: 65, high: 65.5, low: 58.5, close: 59 },
      { open: 59, high: 59.5, low: 52, close: 52.5 },
      { open: 52.5, high: 61.5, low: 52, close: 61 },
      { open: 61, high: 70.5, low: 60.5, close: 70 },
      { open: 70, high: 77.5, low: 69.5, close: 77 },
      { open: 77, high: 77.5, low: 69.5, close: 70 },
      { open: 70, high: 70.5, low: 64, close: 64.5 },
      { open: 64.5, high: 71.5, low: 64, close: 71 },
      { open: 71, high: 77.5, low: 70.5, close: 77 },
    ],
  },
  {
    id: "five-0-bearish",
    name: "5-0 Pattern Bearish",
    category: "reversal",
    direction: "bearish",
    description:
      "A six-point 0-X-A-B-C-D structure where a failed push higher is followed by a sharp decline, then a 50 percent retracement of that decline. D, the 0.500 of the B-C leg, is the sell point.",
    identification: [
      "Points 0-X-A-B-C-D; B breaks above X, then C falls below A.",
      "AB extends 1.13 to 1.618 of the XA leg.",
      "BC extends 1.618 to 2.24 of the AB leg.",
      "D sits at the 0.500 retracement of BC, with CD roughly equal to AB.",
    ],
    tradingTips: [
      "Enter FALL at the 0.500 of BC - the level itself is the pattern.",
      "Measure CD against AB; a large mismatch means it is not a 5-0.",
      "Target a move back toward the C low.",
      "A decisive close past the 0.618 of BC kills the setup.",
    ],
    timeframes: ["1h", "4h", "1d"],
    keyCandles: [3, 7, 10, 12],
    candles: [
      { open: 56, high: 56.5, low: 51.5, close: 52 },
      { open: 52, high: 52.5, low: 49.5, close: 50 },
      { open: 50, high: 57.5, low: 49.5, close: 57 },
      { open: 57, high: 65.5, low: 56.5, close: 65 },
      { open: 65, high: 65.5, low: 58.5, close: 59 },
      { open: 59, high: 59.5, low: 54.5, close: 55 },
      { open: 55, high: 61.5, low: 54.5, close: 61 },
      { open: 61, high: 68.5, low: 60.5, close: 68 },
      { open: 68, high: 68.5, low: 59.5, close: 60 },
      { open: 60, high: 60.5, low: 50.5, close: 51 },
      { open: 51, high: 51.5, low: 42.5, close: 43 },
      { open: 43, high: 51.5, low: 42.5, close: 51 },
      { open: 51, high: 56, low: 50.5, close: 55.5 },
      { open: 55.5, high: 56, low: 48.5, close: 49 },
      { open: 49, high: 49.5, low: 42.5, close: 43 },
    ],
  },
  {
    id: "three-drives-bullish",
    name: "Three Drives Bullish",
    category: "reversal",
    direction: "bullish",
    description:
      "Three successive lower lows separated by two similar pullbacks, each drive extending 1.272 to 1.618 of the pullback before it. The third drive low is the buy point.",
    identification: [
      "Three distinct lower lows with two pullbacks between them.",
      "Each pullback retraces 0.618 to 0.786 of the drive that preceded it.",
      "Drives two and three extend 1.272 to 1.618 of the preceding pullback.",
      "The three drives take a similar number of candles - symmetry is required.",
    ],
    tradingTips: [
      "Enter RISE on the third drive low, never on the second.",
      "If drive three is far larger than drive two the symmetry is broken - skip it.",
      "Check for momentum divergence into drive three before committing.",
      "First target is the pullback high between drives two and three.",
    ],
    timeframes: ["15m", "1h", "4h", "1d"],
    keyCandles: [3, 7, 11],
    candles: [
      { open: 71, high: 75.5, low: 70.5, close: 75 },
      { open: 75, high: 75.5, low: 66.5, close: 67 },
      { open: 67, high: 67.5, low: 58.5, close: 59 },
      { open: 59, high: 59.5, low: 54.5, close: 55 },
      { open: 55, high: 62.5, low: 54.5, close: 62 },
      { open: 62, high: 68, low: 61.5, close: 67.5 },
      { open: 67.5, high: 68, low: 59.5, close: 60 },
      { open: 60, high: 60.5, low: 51, close: 51.5 },
      { open: 51.5, high: 58.5, low: 51, close: 58 },
      { open: 58, high: 62, low: 57.5, close: 61.5 },
      { open: 61.5, high: 62, low: 54.5, close: 55 },
      { open: 55, high: 55.5, low: 48, close: 48.5 },
      { open: 48.5, high: 55.5, low: 48, close: 55 },
      { open: 55, high: 61.5, low: 54.5, close: 61 },
      { open: 61, high: 66.5, low: 60.5, close: 66 },
    ],
  },
  {
    id: "three-drives-bearish",
    name: "Three Drives Bearish",
    category: "reversal",
    direction: "bearish",
    description:
      "Three successive higher highs separated by two similar pullbacks, each drive extending 1.272 to 1.618 of the pullback before it. The third drive high is the sell point.",
    identification: [
      "Three distinct higher highs with two pullbacks between them.",
      "Each pullback retraces 0.618 to 0.786 of the drive that preceded it.",
      "Drives two and three extend 1.272 to 1.618 of the preceding pullback.",
      "The three drives take a similar number of candles - symmetry is required.",
    ],
    tradingTips: [
      "Enter FALL on the third drive high, never on the second.",
      "If drive three is far larger than drive two the symmetry is broken - skip it.",
      "Check for momentum divergence into drive three before committing.",
      "First target is the pullback low between drives two and three.",
    ],
    timeframes: ["15m", "1h", "4h", "1d"],
    keyCandles: [3, 7, 11],
    candles: [
      { open: 49, high: 49.5, low: 44.5, close: 45 },
      { open: 45, high: 53.5, low: 44.5, close: 53 },
      { open: 53, high: 61.5, low: 52.5, close: 61 },
      { open: 61, high: 65.5, low: 60.5, close: 65 },
      { open: 65, high: 65.5, low: 57.5, close: 58 },
      { open: 58, high: 58.5, low: 52, close: 52.5 },
      { open: 52.5, high: 60.5, low: 52, close: 60 },
      { open: 60, high: 69, low: 59.5, close: 68.5 },
      { open: 68.5, high: 69, low: 61.5, close: 62 },
      { open: 62, high: 62.5, low: 58, close: 58.5 },
      { open: 58.5, high: 65.5, low: 58, close: 65 },
      { open: 65, high: 72, low: 64.5, close: 71.5 },
      { open: 71.5, high: 72, low: 64.5, close: 65 },
      { open: 65, high: 65.5, low: 58.5, close: 59 },
      { open: 59, high: 59.5, low: 53.5, close: 54 },
    ],
  },
  {
    id: "quasimodo-bullish",
    name: "Quasimodo Bullish",
    category: "reversal",
    direction: "bullish",
    description:
      "A head-and-shoulders variant in a downtrend where price breaks above the left shoulder's rally high before pulling back to the left shoulder's low. That right shoulder, level with the left shoulder low, is the buy point.",
    identification: [
      "A downtrend prints a low (left shoulder), a rally high, then a lower low (head).",
      "The rally off the head closes above the left shoulder's rally high.",
      "Price then pulls back to a right shoulder at the left shoulder's low.",
      "The right shoulder low holds above the head low.",
    ],
    tradingTips: [
      "Enter RISE at the left shoulder low level once the pullback stalls there.",
      "The break above the prior high is mandatory - without it this is only a double bottom.",
      "First target is the swing high made just after the head.",
      "A close below the head low cancels the pattern.",
    ],
    timeframes: ["5m", "15m", "1h", "4h"],
    keyCandles: [2, 6, 9, 11],
    candles: [
      { open: 72, high: 72.5, low: 67.5, close: 68 },
      { open: 68, high: 68.5, low: 61.5, close: 62 },
      { open: 62, high: 62.5, low: 54.5, close: 55 },
      { open: 55, high: 60.5, low: 54.5, close: 60 },
      { open: 60, high: 63.5, low: 59.5, close: 63 },
      { open: 63, high: 63.5, low: 55.5, close: 56 },
      { open: 56, high: 56.5, low: 46.5, close: 47 },
      { open: 47, high: 55.5, low: 46.5, close: 55 },
      { open: 55, high: 62.5, low: 54.5, close: 62 },
      { open: 62, high: 68.5, low: 61.5, close: 68 },
      { open: 68, high: 68.5, low: 61.5, close: 62 },
      { open: 62, high: 62.5, low: 54, close: 55 },
      { open: 55, high: 62.5, low: 54, close: 62 },
      { open: 62, high: 69.5, low: 61.5, close: 69 },
      { open: 69, high: 74.5, low: 68.5, close: 74 },
    ],
  },
  {
    id: "quasimodo-bearish",
    name: "Quasimodo Bearish",
    category: "reversal",
    direction: "bearish",
    description:
      "A head-and-shoulders variant in an uptrend where price breaks below the left shoulder's pullback low before rallying back to the left shoulder's high. That right shoulder, level with the left shoulder high, is the sell point.",
    identification: [
      "An uptrend prints a high (left shoulder), a pullback low, then a higher high (head).",
      "The decline off the head closes below the left shoulder's pullback low.",
      "Price then rallies to a right shoulder at the left shoulder's high.",
      "The right shoulder high stays under the head high.",
    ],
    tradingTips: [
      "Enter FALL at the left shoulder high level once the rally stalls there.",
      "The break below the prior low is mandatory - without it this is only a double top.",
      "First target is the swing low made just after the head.",
      "A close above the head high cancels the pattern.",
    ],
    timeframes: ["5m", "15m", "1h", "4h"],
    keyCandles: [2, 6, 9, 11],
    candles: [
      { open: 48, high: 52.5, low: 47.5, close: 52 },
      { open: 52, high: 58.5, low: 51.5, close: 58 },
      { open: 58, high: 65.5, low: 57.5, close: 65 },
      { open: 65, high: 65.5, low: 59.5, close: 60 },
      { open: 60, high: 60.5, low: 56.5, close: 57 },
      { open: 57, high: 64.5, low: 56.5, close: 64 },
      { open: 64, high: 73.5, low: 63.5, close: 73 },
      { open: 73, high: 73.5, low: 64.5, close: 65 },
      { open: 65, high: 65.5, low: 58.5, close: 59 },
      { open: 59, high: 59.5, low: 54.5, close: 55 },
      { open: 55, high: 62.5, low: 54.5, close: 62 },
      { open: 62, high: 66, low: 61.5, close: 65.5 },
      { open: 65.5, high: 66, low: 58.5, close: 59 },
      { open: 59, high: 59.5, low: 51.5, close: 52 },
      { open: 52, high: 52.5, low: 46.5, close: 47 },
    ],
  },
  {
    id: "measured-move-up",
    name: "Measured Move Up",
    category: "continuation",
    direction: "bullish",
    description:
      "An advance in two legs: a first rally, a corrective pullback, then a second rally of roughly the same size. The pattern projects the second leg from the correction low.",
    identification: [
      "A clear first leg up out of a base or an existing uptrend.",
      "A corrective pullback retracing about 0.382 to 0.618 of that leg.",
      "The correction low stays above the start of the first leg.",
      "The second leg resumes up and runs close to the first leg's height.",
    ],
    tradingTips: [
      "Enter RISE when the correction ends and price reclaims its last swing high.",
      "Project the target: correction low plus the height of the first leg.",
      "Set expiry near the number of candles the first leg needed.",
      "If the pullback retraces past 0.618, treat the trend as broken and stand aside.",
    ],
    timeframes: ["15m", "1h", "4h", "1d"],
    keyCandles: [5, 8, 13],
    candles: [
      { open: 37, high: 38.5, low: 36.5, close: 38 },
      { open: 38, high: 42.5, low: 37.5, close: 42 },
      { open: 42, high: 47.5, low: 41.5, close: 47 },
      { open: 47, high: 53.5, low: 46.5, close: 53 },
      { open: 53, high: 57.5, low: 52.5, close: 57 },
      { open: 57, high: 60.5, low: 56.5, close: 60 },
      { open: 60, high: 60.5, low: 55.5, close: 56 },
      { open: 56, high: 56.5, low: 52.5, close: 53 },
      { open: 53, high: 53.5, low: 49.5, close: 50 },
      { open: 50, high: 55.5, low: 49.5, close: 55 },
      { open: 55, high: 60.5, low: 54.5, close: 60 },
      { open: 60, high: 65.5, low: 59.5, close: 65 },
      { open: 65, high: 70.5, low: 64.5, close: 70 },
      { open: 70, high: 72.5, low: 69.5, close: 72 },
    ],
  },
  {
    id: "measured-move-down",
    name: "Measured Move Down",
    category: "continuation",
    direction: "bearish",
    description:
      "A decline in two legs: a first sell-off, a corrective bounce, then a second sell-off of roughly the same size. The pattern projects the second leg from the correction high.",
    identification: [
      "A clear first leg down out of a top or an existing downtrend.",
      "A corrective bounce retracing about 0.382 to 0.618 of that leg.",
      "The correction high stays below the start of the first leg.",
      "The second leg resumes down and runs close to the first leg's depth.",
    ],
    tradingTips: [
      "Enter FALL when the bounce ends and price loses its last swing low.",
      "Project the target: correction high minus the depth of the first leg.",
      "Set expiry near the number of candles the first leg needed.",
      "If the bounce retraces past 0.618, treat the trend as broken and stand aside.",
    ],
    timeframes: ["15m", "1h", "4h"],
    keyCandles: [5, 8, 13],
    candles: [
      { open: 73, high: 73.5, low: 71.5, close: 72 },
      { open: 72, high: 72.5, low: 67.5, close: 68 },
      { open: 68, high: 68.5, low: 62.5, close: 63 },
      { open: 63, high: 63.5, low: 57.5, close: 58 },
      { open: 58, high: 58.5, low: 53.5, close: 54 },
      { open: 54, high: 54.5, low: 49.5, close: 50 },
      { open: 50, high: 54.5, low: 49.5, close: 54 },
      { open: 54, high: 57.5, low: 53.5, close: 57 },
      { open: 57, high: 60.5, low: 56.5, close: 60 },
      { open: 60, high: 60.5, low: 54.5, close: 55 },
      { open: 55, high: 55.5, low: 49.5, close: 50 },
      { open: 50, high: 50.5, low: 44.5, close: 45 },
      { open: 45, high: 45.5, low: 39.5, close: 40 },
      { open: 40, high: 40.5, low: 37.5, close: 38 },
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
  const bodyWidth = candleWidth * 0.44;
  const wickWidth = 1;

  // Scale price to Y coordinate (inverted because SVG Y increases downward)
  const scaleY = (price: number) => {
    return height - ((price - adjustedMin) / adjustedRange) * height;
  };

  return (
    <svg viewBox={`0 0 ${viewBoxWidth} ${height}`} className={className} preserveAspectRatio="xMidYMid meet">
      {candles.map((candle, index) => {
        const isBullish = candle.close > candle.open;
        /* Candle bodies read the direction tokens rather than two hexes, so a
           preview matches the live chart in both themes. A hollow body is the
           non-colour cue for bearish, since --up/--down are not separable
           under deuteranopia. */
        const color = isBullish ? "hsl(var(--up))" : "hsl(var(--down))";

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
              fill={isBullish ? color : "transparent"}
              stroke={color}
              strokeWidth={0.5}
            />
          </g>
        );
      })}
    </svg>
  );
}

/**
 * The same chart, revealed one candle at a time.
 *
 * A still picture of eleven candles tells a learner that a Double Bottom is
 * "some candles". The pattern is a SEQUENCE - price fell, bounced, fell to the
 * same level, and turned - and reading it in the order it happened is the whole
 * skill. So the detail view draws the series left to right at a pace you can
 * follow, then dims everything except the bars that decide the pattern and
 * marks them.
 *
 * The card previews stay still on purpose: sixty of them animating in a
 * scrolling list is noise, not teaching.
 *
 * Honours `prefers-reduced-motion` - the reveal is the point for most people
 * and a problem for some, so with it set everything appears at once and the key
 * bars are simply marked.
 */
interface AnimatedPatternChartProps {
  candles: Candle[];
  keyCandles?: number[];
  height?: number;
  className?: string;
  /** Change this to replay the reveal. */
  playToken?: number;
}

/** Seconds between candles. Slow enough to follow, short enough not to wait. */
const REVEAL_STEP = 0.09;

/*
  THE VIEWBOX IS WIDE, AND THE STROKES ARE MEASURED ACROSS IT.

  The chart used a square-ish viewBox inside a wide panel with
  `preserveAspectRatio="meet"`, so it fitted by HEIGHT and sat as a small island
  with empty space either side - the panel was tall and the candles were tiny.
  A wide viewBox plus `h-auto` lets the width fill and the height follow, which
  is what makes the candles big enough to read.

  Stroke widths are fractions of the 100-unit WIDTH rather than of the height,
  so they stay visually thin whatever height the caller picks.
*/
const WICK_WIDTH = 0.45;
const BODY_STROKE = 0.35;

function AnimatedPatternChart({
  candles,
  keyCandles,
  height = 30,
  className = "",
  playToken = 0,
}: AnimatedPatternChartProps) {
  const reduceMotion = useReducedMotion();

  const allValues = candles.flatMap((c) => [c.high, c.low]);
  const minPrice = Math.min(...allValues);
  const maxPrice = Math.max(...allValues);
  const priceRange = maxPrice - minPrice || 1;
  const padding = priceRange * 0.12;
  const adjustedMin = minPrice - padding;
  const adjustedMax = maxPrice + padding;
  const adjustedRange = adjustedMax - adjustedMin || 1;

  const candleCount = candles.length || 1;
  const viewBoxWidth = 100;
  const candleWidth = viewBoxWidth / candleCount;
  const bodyWidth = candleWidth * 0.44;

  const scaleY = (price: number) =>
    height - ((price - adjustedMin) / adjustedRange) * height;

  const keySet = new Set(keyCandles ?? []);
  const hasKeys = keySet.size > 0;
  /* Everything has landed by here, so the marks wait for it. */
  const settleDelay = reduceMotion ? 0 : candleCount * REVEAL_STEP + 0.15;

  return (
    <svg
      viewBox={`0 0 ${viewBoxWidth} ${height}`}
      className={className}
      preserveAspectRatio="xMidYMid meet"
      role="img"
    >
      {candles.map((candle, index) => {
        const isBullish = candle.close > candle.open;
        /* Direction tokens rather than two hexes, so a preview matches the live
           chart in both themes. A hollow body is the non-colour cue for
           bearish, since --up/--down are not separable under deuteranopia. */
        const color = isBullish ? "hsl(var(--up))" : "hsl(var(--down))";

        const x = index * candleWidth + candleWidth / 2;
        const bodyTop = scaleY(Math.max(candle.open, candle.close));
        const bodyBottom = scaleY(Math.min(candle.open, candle.close));
        /* A doji's body is a LINE, so the floor is thin relative to the box
           rather than a fixed unit - at height 30 a floor of 1 drew every doji
           as a fat rectangle. */
        const bodyHeight = Math.max(bodyBottom - bodyTop, height * 0.012);
        const wickTop = scaleY(candle.high);
        const wickBottom = scaleY(candle.low);

        const isKey = keySet.has(index);
        const delay = reduceMotion ? 0 : index * REVEAL_STEP;
        /* Non-key bars recede once the reveal has finished, so the pattern
           itself is what is left lit. Never to zero - the context still has to
           be readable. */
        const restingOpacity = !hasKeys || isKey ? 1 : 0.32;

        return (
          <m.g
            key={`${playToken}-${index}`}
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: [0, 1, restingOpacity], y: 0 }}
            transition={{
              opacity: {
                duration: reduceMotion ? 0 : 0.5,
                delay,
                times: [0, 0.35, 1],
              },
              y: { duration: reduceMotion ? 0 : 0.28, delay },
            }}
          >
            {isKey && (
              <m.rect
                x={x - candleWidth / 2}
                y={0}
                width={candleWidth}
                height={height}
                fill="hsl(var(--primary))"
                initial={{ opacity: 0 }}
                animate={{ opacity: reduceMotion ? 0.12 : [0, 0.16, 0.08, 0.16] }}
                transition={{
                  duration: reduceMotion ? 0 : 2.4,
                  delay: settleDelay,
                  repeat: reduceMotion ? 0 : Infinity,
                  ease: "easeInOut",
                }}
              />
            )}
            <line
              x1={x}
              y1={wickTop}
              x2={x}
              y2={wickBottom}
              stroke={color}
              strokeWidth={WICK_WIDTH}
            />
            <rect
              x={x - bodyWidth / 2}
              y={bodyTop}
              width={bodyWidth}
              height={bodyHeight}
              fill={isBullish ? color : "transparent"}
              stroke={color}
              strokeWidth={BODY_STROKE}
            />
          </m.g>
        );
      })}
    </svg>
  );
}

// ============================================================================
// DIRECTION
// ============================================================================

/**
 * A pattern's bias. Bullish/bearish take the price-direction tokens; a
 * bilateral pattern is not a direction at all, so it is neutral ink rather
 * than a third hue. Every use pairs the colour with an arrow icon and the
 * written word.
 */
function directionOf(direction: ChartPattern["direction"]): {
  tone: BinaryTone;
  icon: LucideIcon;
} {
  if (direction === "bullish") return { tone: "up", icon: TrendingUp };
  if (direction === "bearish") return { tone: "down", icon: TrendingDown };
  return { tone: "muted", icon: ArrowUpDown };
}

// ============================================================================
// PATTERN CARD
// ============================================================================

interface PatternCardProps {
  pattern: ChartPattern;
  isSelected: boolean;
  onClick: () => void;
}

function PatternCard({ pattern, isSelected, onClick }: PatternCardProps) {
  const { tone, icon: DirectionIcon } = directionOf(pattern.direction);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isSelected}
      /*
        THE BORDER WIDTH NEVER CHANGES.

        Selected was `border-2` and unselected `border`, so picking a pattern
        grew that card by one pixel on every side and shoved the whole list
        down by two - the rows visibly jumped on every click. The border stays
        1px and the selected state is an INSET ring, which paints inside the
        box and cannot move anything. (A plain `ring` paints outside and would
        overlap the neighbouring card instead.)
      */
      className={cn(
        "w-full text-left p-3 rounded-lg transition-colors cursor-pointer bg-surface-3 border border-border",
        isSelected
          ? "ring-2 ring-inset ring-primary bg-primary/10"
          : "hover:border-border-strong"
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-foreground">{pattern.name}</span>
        <DirectionIcon className={cn("w-4 h-4", TONE_INK[tone])} />
      </div>

      {/* Pattern Candlestick Preview */}
      <div className="h-12 mb-2 rounded bg-card flex items-center justify-center overflow-hidden">
        <CandlestickChart candles={pattern.candles} height={48} className="w-full h-full p-1" />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs px-2 py-0.5 rounded bg-card text-muted-foreground inline-flex items-center gap-1">
          <CategoryIcon category={pattern.category} />
          {pattern.category}
        </span>
      </div>
    </button>
  );
}

// ============================================================================
// PATTERN DETAIL
// ============================================================================

function PatternDetail({ pattern }: { pattern: ChartPattern }) {
  const t = useTranslations("binary_components");
  const tCommon = useTranslations("common");
  /* `components` is already loaded on this route - the chart engine embedded in
     the same page uses it throughout - and it carries `replay`, which
     `binary_components` and `common` do not. A key from a namespace the route
     did NOT load would render as the raw key, with no English fallback. */
  const tComponents = useTranslations("components");
  const { tone, icon: DirectionIcon } = directionOf(pattern.direction);

  /* Bumping this remounts the candle groups, which is what restarts the
     reveal - simpler and more reliable than driving an animation controller. */
  const [playToken, setPlayToken] = useState(0);
  const replay = useCallback(() => setPlayToken((n) => n + 1), []);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-xl font-semibold tracking-tight text-foreground">{pattern.name}</h3>
          {/* Icon + word, ink on `foreground`: `text-up` at 14px measures
              3.0:1 in light mode, under the 4.5 floor for small text. */}
          <span className="text-sm font-medium text-foreground inline-flex items-center gap-1.5">
            <DirectionIcon className={cn("w-4 h-4", TONE_INK[tone])} />
            {pattern.direction.charAt(0).toUpperCase() + pattern.direction.slice(1)}
          </span>
        </div>
        {/* A measure cap of its own: the grid below halves the width past
            `xl`, but this sits above it and would otherwise run the full
            1152px. */}
        <p className="max-w-3xl text-sm text-muted-foreground">
          {pattern.description}
        </p>
      </div>

      {/*
        A CONTAINER QUERY, NOT A VIEWPORT ONE.

        This pane is a very different width on the two pages that mount the
        library: on the trade terminal nothing sits to its right and it gets
        about 1600px, while on the binary page the trade panel leaves it around
        950px. A `xl:` breakpoint reads the WINDOW, so at one screen size it
        would split both of them into two columns - and 475px each on the
        binary page is not two columns, it is one column cut in half.

        `@5xl` measures the pane itself, so the split happens when there is
        actually room for it, whatever is beside it.
      */}
      <div className="grid gap-4 @5xl:grid-cols-2 @5xl:gap-6 @5xl:items-start">
      <div className="space-y-4">
      {/* Pattern Visualization */}
      <div className="relative p-4 rounded-lg bg-surface-3">
        <AnimatedPatternChart
          candles={pattern.candles}
          keyCandles={pattern.keyCandles}
          height={30}
          /* `h-auto` lets the width fill and the height follow the viewBox, so
             the candles are big enough to read. The cap stops that becoming
             400px of chart on a 1920 screen, where the panel would scroll the
             identification list off the bottom to show one picture. */
          className="w-full h-auto max-h-52"
          playToken={playToken}
        />
        <button
          type="button"
          onClick={replay}
          aria-label={tComponents("replay")}
          className="absolute top-2 right-2 grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:text-foreground hover:bg-card transition-colors cursor-pointer"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
        {pattern.keyCandles && pattern.keyCandles.length > 0 && (
          /*
            Says what the highlight MEANS. A glowing column with no legend is
            decoration; with one it answers "which bars are the pattern".

            A swatch plus one covered word rather than a sentence: a new string
            here is a 90-catalogue change, and a key missing from a catalogue
            renders as the RAW KEY on that locale.
          */
          <div className="mt-1.5 flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-primary/25 ring-1 ring-inset ring-primary/50" />
            <span className="text-[11px] text-muted-foreground">
              {tCommon("key")}
            </span>
          </div>
        )}
      </div>

      {/* Timeframes */}
      <div className="p-3 rounded-lg bg-surface-3">
        <div className="text-xs font-medium mb-1 text-muted-foreground">
          {t("best_timeframes")}
        </div>
        <div className="flex flex-wrap gap-1">
          {pattern.timeframes.map((tf) => (
            <span
              key={tf}
              className="text-xs px-1.5 py-0.5 rounded bg-card text-foreground"
            >
              {tf}
            </span>
          ))}
        </div>
      </div>

      </div>

      <div className="space-y-4">
      {/* Identification */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="w-4 h-4 text-muted-foreground" />
          <h4 className="text-sm font-medium text-foreground">
            {t("how_to_identify")}
          </h4>
        </div>
        <ul className="space-y-1.5">
          {pattern.identification.map((point, i) => (
            <li key={i} className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0 text-up" />
              <span className="text-sm text-muted-foreground">{point}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Trading Tips */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="w-4 h-4 text-muted-foreground" />
          <h4 className="text-sm font-medium text-foreground">
            {t("trading_tips")}
          </h4>
        </div>
        <ul className="space-y-1.5">
          {pattern.tradingTips.map((tip, i) => (
            <li key={i} className="flex items-start gap-2">
              <ChevronRight className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" />
              <span className="text-sm text-muted-foreground">{tip}</span>
            </li>
          ))}
        </ul>
      </div>
      </div>
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
  const tCommon = useTranslations("common");

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
        // Claim the key. This listener is on `document`, so the same native
        // event goes on to every window-level listener — and the Pro terminal
        // stacks this view over a panel that restores itself from maximize on
        // Escape. Without the claim one keypress closes this AND un-maximizes
        // the panel underneath. Nothing here relies on Escape's default action.
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const bullishCount = CHART_PATTERNS.filter((p) => p.direction === "bullish").length;
  const bearishCount = CHART_PATTERNS.filter((p) => p.direction === "bearish").length;

  return (
    <FullBleedOverlay isOpen={isOpen} isMobile={isMobile} onClose={onClose}>
      {/*
        THE CHROME WAS TALLER THAN IT NEEDED TO BE.

        Three full-width bands stacked before any content: a header, a stats
        bar carrying three short facts, and a search row. On a laptop that is
        around a quarter of the overlay spent before the first pattern, on a
        screen whose entire job is reading pattern detail.

        The counts move into the header, which had a whole row of empty space
        beside its title, and the search band tightens. `OverlayHeader` itself
        is untouched - ten other overlays use it, including files owned by
        another workstream.
      */}
      <OverlayHeader
        icon={BookOpen}
        title={tCommon("pattern_library")}
        subtitle={t("visual_guide_to_chart_patterns")}
        actions={
          <>
            <div className="hidden lg:flex items-center gap-3 mr-1">
              <OverlayStat icon={BookOpen} tone="primary">
                {CHART_PATTERNS.length} Patterns
              </OverlayStat>
              <OverlayStat icon={TrendingUp} tone="up">
                {bullishCount} Bullish
              </OverlayStat>
              <OverlayStat icon={TrendingDown} tone="down">
                {bearishCount} Bearish
              </OverlayStat>
            </div>
            <OverlayIconButton
              icon={X}
              onClick={onClose}
              label="Close"
              className="hidden md:flex"
            />
          </>
        }
      />

      {/*
        SEARCH AND FILTERS LIVE IN THE SIDEBAR, NOT IN A BAND ACROSS THE TOP.

        They only ever act on the list, so putting them above BOTH columns cost
        a full-width band of height and left them a long way from the thing they
        filter. In the sidebar they sit directly over the results, and the
        detail pane gets that height back.
      */}
      <div className="flex flex-1 overflow-hidden">
        {/* Pattern List - full width on mobile until a pattern is chosen */}
        <div
          className={cn(
            selectedPatternId ? "hidden md:flex" : "flex w-full md:w-80",
            "md:w-80 shrink-0 flex-col md:border-r border-border overflow-hidden"
          )}
        >
          <div className="shrink-0 p-3 pb-2 space-y-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder={`${t("search_patterns")}…`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm rounded-lg bg-surface-3 border border-border text-foreground placeholder:text-subtle-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
              />
            </div>

            <div className="flex flex-wrap gap-1">
              {["all", "reversal", "continuation", "bilateral"].map((category) => (
                <FilterChip
                  key={category}
                  active={selectedCategory === category}
                  onClick={() => setSelectedCategory(category)}
                  className="py-1 capitalize"
                >
                  {category}
                </FilterChip>
              ))}
            </div>

            {/* Below `lg` the header has no room for the counts. */}
            <div className="lg:hidden flex flex-wrap items-center gap-3 pt-0.5">
              <OverlayStat icon={BookOpen} tone="primary">
                {CHART_PATTERNS.length} Patterns
              </OverlayStat>
              <OverlayStat icon={TrendingUp} tone="up">
                {bullishCount} Bullish
              </OverlayStat>
              <OverlayStat icon={TrendingDown} tone="down">
                {bearishCount} Bearish
              </OverlayStat>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 pt-2 space-y-2">
            {filteredPatterns.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {t("no_patterns_found")}
              </div>
            ) : (
              filteredPatterns.map((pattern) => (
                <PatternCard
                  key={pattern.id}
                  pattern={pattern}
                  isSelected={selectedPatternId === pattern.id}
                  onClick={() => handlePatternClick(pattern)}
                />
              ))
            )}
          </div>
        </div>

        {/*
          THE DETAIL IS CENTRED AND CAPPED, NOT STRETCHED.

          On the trade page nothing sits to the right of this overlay, so the
          pane was the full width of the monitor: prose ran to 200 characters a
          line and the pattern chart was blown up to 1900px, which makes both
          harder to read rather than easier. On the binary page it looked fine
          only because the trade panel happened to constrain it.

          Width is a design decision, not whatever is left over. The content
          holds a comfortable measure and the surplus becomes margin - and past
          `xl` it becomes a SECOND COLUMN instead, so a wide monitor shows the
          picture and the words side by side rather than one long scroll.
        */}
        <div
          className={cn(
            selectedPatternId ? "flex" : "hidden md:flex",
            "@container flex-1 flex-col overflow-y-auto p-4 md:px-6 md:py-4"
          )}
        >
          {/* Mobile back button */}
          {selectedPattern && (
            <button
              type="button"
              onClick={() => setSelectedPatternId(null)}
              className="md:hidden flex items-center gap-2 mb-3 px-3 py-2 rounded-lg text-sm font-medium cursor-pointer bg-surface-3 text-foreground"
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
              {t("back_to_patterns")}
            </button>
          )}
          {/* Fade only. The horizontal slide moved the text sideways on every
              selection, which reads as the layout shifting even though the box
              itself does not move. */}
          <AnimatePresence mode="wait">
            {selectedPattern && (
              <m.div
                key={selectedPattern.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <PatternDetail pattern={selectedPattern} />
              </m.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </FullBleedOverlay>
  );
}
