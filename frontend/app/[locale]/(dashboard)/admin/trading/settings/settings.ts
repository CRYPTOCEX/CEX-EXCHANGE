import {
  Settings,
  BarChart3,
  Layout,
  Keyboard,
  Smartphone,
  TrendingUp,
} from "lucide-react";
import { FieldDefinition, TabDefinition, TabColors } from "@/components/admin/settings";

// Tab definitions for Trading settings
//
// There is no "Display" tab. Its five controls — Compact Mode, Show Spread,
// Show Volume, Price Decimals, Amount Decimals — plus Mobile Optimized were
// switches nothing read: `ExtensionStatusProvider` mapped every key into
// context and no component consumed those members. Eight more went with them
// (Default Layout, Allow Custom Layouts, Max Saved Layouts, Analytics, Recent
// Trades, Advanced Orders, Show Order Preview). Whatever an operator set them
// to changed nothing at all, because nothing read them — the booleans among
// them shipped "on", and the rest were layouts, counts and decimal places.
export const TRADING_PRO_TABS: TabDefinition[] = [
  {
    id: "general",
    label: "General",
    icon: Settings,
    description: "Basic trading configuration",
  },
  {
    id: "features",
    label: "Features",
    icon: Layout,
    description: "Enable or disable features",
  },
  {
    id: "trading",
    label: "Trading",
    icon: TrendingUp,
    description: "Trading form and order settings",
  },
];

// Tab colors for Trading settings
export const TRADING_PRO_TAB_COLORS: Record<string, TabColors> = {
  general: {
    bg: "bg-chart-1/10",
    text: "text-chart-1",
    border: "border-chart-1/20",
    iconBg: "bg-chart-1",
  },
  features: {
    bg: "bg-chart-2/10",
    text: "text-chart-2",
    border: "border-chart-2/20",
    iconBg: "bg-chart-2",
  },
  trading: {
    bg: "bg-chart-3/10",
    text: "text-chart-3",
    border: "border-chart-3/20",
    iconBg: "bg-chart-3",
  },
};

// Field definitions for Trading settings
export const TRADING_PRO_FIELD_DEFINITIONS: FieldDefinition[] = [
  // General Settings
  {
    key: "spotWallets",
    label: "Enable Spot Trading",
    type: "switch",
    description: "Enable spot trading functionality on the platform",
    category: "general",
    subcategory: "Features",
  },
  {
    key: "tradingProEnabled",
    label: "Enable New Trading Interface",
    type: "switch",
    description: "Use the new advanced trading interface instead of the classic trading page",
    category: "general",
    subcategory: "Interface",
  },
  {
    key: "marketLinkRoute",
    label: "Market Link Route",
    type: "select",
    description: "Choose where market links redirect to from markets page and home page",
    category: "general",
    subcategory: "Navigation",
    options: [
      { value: "trade", label: "Trading Page" },
      { value: "binary", label: "Binary Trading" },
    ],
  },
  {
    key: "spotChartEngine",
    label: "Chart Provider",
    type: "select",
    description: "Select the chart provider for spot/futures trading pages",
    category: "general",
    subcategory: "Chart",
    options: [
      { value: "TRADINGVIEW", label: "TradingView" },
      { value: "CHART_ENGINE", label: "Chart Engine (Addon)" },
    ],
  },
  {
    key: "tradingProHotkeysEnabled",
    label: "Enable Hotkeys",
    type: "switch",
    description: "Allow users to use keyboard shortcuts",
    category: "general",
    subcategory: "Hotkeys",
  },

  // Features Settings
  {
    key: "tradingProDepthChartEnabled",
    label: "Depth Chart",
    type: "switch",
    description: "Show depth chart visualization",
    category: "features",
    subcategory: "Panels",
  },
  {
    key: "tradingProNewsEnabled",
    label: "Market News",
    type: "switch",
    description:
      "Show the market news tab. The feed fills from the news provider cron; with no provider key configured it still serves operator-authored stories.",
    category: "features",
    subcategory: "Panels",
  },
  {
    key: "tradingProMarketsPanelEnabled",
    label: "Markets Panel",
    type: "switch",
    description: "Show markets/watchlist panel",
    category: "features",
    subcategory: "Panels",
  },
  {
    key: "tradingProOrdersPanelEnabled",
    label: "Orders Panel",
    type: "switch",
    description: "Show orders panel",
    category: "features",
    subcategory: "Panels",
  },
  {
    key: "tradingProPositionsPanelEnabled",
    label: "Positions Panel",
    type: "switch",
    description: "Show positions panel (for futures)",
    category: "features",
    subcategory: "Panels",
  },
  {
    key: "tradingProOneClickTradingEnabled",
    label: "One-Click Trading",
    type: "switch",
    description: "Enable one-click trading without confirmation",
    category: "features",
    subcategory: "Orders",
  },

  // Trading Settings
  {
    key: "tradingProConfirmOrders",
    label: "Order Confirmation",
    type: "switch",
    description: "Show confirmation dialog before placing orders",
    category: "trading",
    subcategory: "Orders",
  },
  {
    key: "tradingProShowEstimatedFees",
    label: "Show Estimated Fees",
    type: "switch",
    description: "Display estimated fees before placing orders",
    category: "trading",
    subcategory: "Orders",
  },
  {
    key: "tradingProDefaultOrderType",
    label: "Default Order Type",
    type: "select",
    description: "The default order type for new orders",
    category: "trading",
    subcategory: "Orders",
    options: [
      { value: "limit", label: "Limit" },
      { value: "market", label: "Market" },
    ],
  },
];

// Default settings values
export const TRADING_PRO_DEFAULT_SETTINGS: Record<string, any> = {
  spotWallets: "true",
  /*
   * The Pro terminal ships ON.
   *
   * It defaulted to false, so every fresh install — and every buyer
   * evaluating the product — landed on the classic page and judged the
   * platform by the weaker of the two terminals we ship. Nothing seeds the
   * `settings` table, so this frontend default IS what an untouched install
   * gets.
   *
   * Safe to default on: trade/page.tsx probes `await import("./pro")` and
   * falls back to the classic interface when the module is not installed, so
   * an install without it is unaffected.
   */
  tradingProEnabled: true,
  marketLinkRoute: "trade",
  spotChartEngine: "TRADINGVIEW",
  tradingProHotkeysEnabled: true,
  tradingProDepthChartEnabled: true,
  tradingProNewsEnabled: true,
  tradingProMarketsPanelEnabled: true,
  tradingProOrdersPanelEnabled: true,
  tradingProPositionsPanelEnabled: true,
  tradingProOneClickTradingEnabled: false,
  tradingProConfirmOrders: true,
  tradingProShowEstimatedFees: true,
  tradingProDefaultOrderType: "limit",
};
