export type ChartProvider = "tradingview" | "chart_engine";
export type LayoutMode = "pro" | "lite";
export type OrderType = "market" | "limit" | "stop_market" | "stop_limit";

export interface TPSettings {
  // Chart
  chartProvider: ChartProvider;
  defaultTimeframe: string;
  defaultChartType: string;

  // Layout
  layoutMode: LayoutMode;
  activeLayoutId?: string;

  // Trading
  oneClickTrading: boolean;
  orderConfirmation: boolean;
  defaultOrderType: OrderType;
  defaultLeverage: number;

  // Sound
  soundEnabled: boolean;
  soundOrderPlaced: boolean;
  soundOrderFilled: boolean;
  soundVolume: number;

  // Display
  showPnlInCurrency: boolean;
  showPnlPercentage: boolean;
  decimalPlacesPrice: number;
  decimalPlacesAmount: number;

  // Hotkeys
  hotkeysEnabled: boolean;
  customHotkeys: Record<string, string>;
}
