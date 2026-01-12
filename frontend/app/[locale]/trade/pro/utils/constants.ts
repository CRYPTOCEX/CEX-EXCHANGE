// Trading Constants

// API Endpoints
export const API_ENDPOINTS = {
  STATUS: "/api/exchange/trading/status",
  ANALYTICS: "/api/exchange/trading/analytics",
} as const;

// Default timeframes
export const TIMEFRAMES = [
  { value: "1m", label: "1m" },
  { value: "5m", label: "5m" },
  { value: "15m", label: "15m" },
  { value: "30m", label: "30m" },
  { value: "1h", label: "1H" },
  { value: "4h", label: "4H" },
  { value: "1d", label: "1D" },
  { value: "1w", label: "1W" },
  { value: "1M", label: "1M" },
] as const;

// Order types
export const ORDER_TYPES = [
  { value: "market", label: "Market" },
  { value: "limit", label: "Limit" },
  { value: "stop_market", label: "Stop Market" },
  { value: "stop_limit", label: "Stop Limit" },
] as const;

// Panel IDs
export const PANEL_IDS = {
  MARKETS: "markets",
  CHART: "chart",
  ORDERBOOK: "orderbook",
  TRADING: "trading",
  ORDERS: "orders",
  POSITIONS: "positions",
} as const;

// Default hotkeys
export const DEFAULT_HOTKEYS = {
  // Navigation
  "mod+k": "openCommandPalette",
  "mod+1": "layout1",
  "mod+2": "layout2",
  "mod+3": "layout3",
  tab: "cycleFocus",
  escape: "closeModal",

  // Trading
  b: "setBuyMode",
  s: "setSellMode",
  l: "setLimitOrder",
  m: "setMarketOrder",
  enter: "submitOrder",
  "mod+enter": "submitOrderBypass",

  // Order management
  c: "cancelLastOrder",
  "mod+shift+c": "cancelAllOrders",
  p: "togglePositionsPanel",

  // Chart
  "+": "zoomIn",
  "-": "zoomOut",
  "1": "timeframe1m",
  "5": "timeframe5m",
  h: "timeframe1h",
  d: "timeframe1d",
  f: "toggleFullscreen",

  // Quick actions
  o: "focusOrderbook",
  t: "focusTradingForm",
} as const;

// Sound files
export const SOUNDS = {
  ORDER_PLACED: "/sounds/order-placed.mp3",
  ORDER_FILLED: "/sounds/order-filled.mp3",
} as const;
