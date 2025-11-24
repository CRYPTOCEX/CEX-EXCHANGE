// Merged types from chart-types.ts, drawing-types.ts, and indicator-types.ts

// Chart Types
export interface CandleData {
  time: number; // Store timestamp in milliseconds consistently
  timestamp: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  color: string;
}

export interface ChartState {
  visibleRange: { start: number; end: number };
  scale: number;
  offsetX: number;
  isDragging: boolean;
  dragStart: { x: number; y: number };
  mousePosition: MousePosition | null;
  priceRange: { min: number; max: number };
  volumeRange: { min: number; max: number };
}

export interface MousePosition {
  x: number;
  y: number;
}

export type ChartType = "candlestick" | "line" | "bar" | "area";

// Line Style Type
export type LineStyle = "solid" | "dashed" | "dotted";

// Indicator Types
export interface Indicator {
  id: string;
  type: "sma" | "rsi";
  params: {
    period?: number;
    source?: "close" | "open" | "high" | "low" | "hl2" | "hlc3" | "ohlc4";
  };
  visible: boolean;
  color: string;
  data: number[];
  // New property to determine if indicator should be in a separate panel
  separatePanel?: boolean;
  // Line style property
  lineStyle?: LineStyle;
}

// Price Alert Type
export interface PriceAlert {
  id: string;
  price: number;
  type: "above" | "below";
  active: boolean;
}

export type TimeFrame =
  | "1m"
  | "3m"
  | "5m"
  | "15m"
  | "30m"
  | "1h"
  | "2h"
  | "4h"
  | "6h"
  | "8h"
  | "12h"
  | "1d"
  | "3d"
  | "1w"
  | "1M";
