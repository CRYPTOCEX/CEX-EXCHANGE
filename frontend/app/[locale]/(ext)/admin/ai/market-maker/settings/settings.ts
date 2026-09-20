import {
  TrendingUp,
  Bot,
  Shield,
  AlertTriangle,
} from "lucide-react";
import {
  FieldDefinition,
  SettingsPageConfig,
  TabDefinition,
  TabColors,
} from "@/components/admin/settings";
import EmergencyActionsField from "./components/EmergencyActions";

// Tab definitions for AI Market Maker settings
export const AI_MARKET_MAKER_TABS: TabDefinition[] = [
  {
    id: "trading",
    label: "Trading",
    icon: TrendingUp,
    description: "Core trading configuration",
  },
  {
    id: "bots",
    label: "Bots",
    icon: Bot,
    description: "Bot limits and configuration",
  },
  {
    id: "risk",
    label: "Risk",
    icon: Shield,
    description: "Risk management settings",
  },
  {
    id: "emergency",
    label: "Emergency",
    icon: AlertTriangle,
    description: "Emergency controls and actions",
  },
];

// Tab colors for AI Market Maker settings
export const AI_MARKET_MAKER_TAB_COLORS: Record<string, TabColors> = {
  trading: {
    bg: "bg-chart-1/10",
    text: "text-chart-1",
    border: "border-chart-1/20",
    iconBg: "bg-chart-1",
  },
  bots: {
    bg: "bg-chart-2/10",
    text: "text-chart-2",
    border: "border-chart-2/20",
    iconBg: "bg-chart-2",
  },
  risk: {
    bg: "bg-chart-3/10",
    text: "text-chart-3",
    border: "border-chart-3/20",
    iconBg: "bg-chart-3",
  },
  emergency: {
    bg: "bg-chart-4/10",
    text: "text-chart-4",
    border: "border-chart-4/20",
    iconBg: "bg-chart-4",
  },
};

// Field definitions for AI Market Maker settings
export const AI_MARKET_MAKER_FIELD_DEFINITIONS: FieldDefinition[] = [
  // Trading Settings
  {
    key: "aiMarketMakerEnabled",
    label: "Enable AI Trading",
    type: "switch",
    description: "Master switch to enable or disable AI trading system",
    category: "trading",
    subcategory: "Status",
  },
  {
    /*
      THE MOBILE INTERLOCK.

      An order book that shows depth nobody will honour is "functionally
      deceptive" under Google Play's Deceptive Behavior policy and Apple
      3.1.2(a) — and unlike most findings it is not a rejection, it is the kind
      that removes an app that was already approved, from the OPERATOR's own
      developer account.

      So the two are mutually exclusive by construction rather than by
      guidance. Declaring that you ship a mobile app makes the market maker
      REFUSE TO START, asserted at boot in `MarketMakerEngine.initialize()`.
      There is no ordering of switches that produces both, and no admin who can
      turn the assertion off.

      Ships FALSE, which is the safe direction for the operator who has not
      thought about it: an install with no mobile app keeps its market maker
      exactly as before, and only an explicit "yes, I ship one" trades it away.
    */
    key: "mobileAppEnabled",
    label: "This platform ships a mobile app",
    type: "switch",
    description:
      "Turn this on if you publish the iOS or Android app. It permanently disables the AI market maker: an app store treats synthetic order-book depth as deceptive, and that finding removes a live app rather than rejecting a new one. You cannot run both.",
    category: "trading",
    subcategory: "Status",
  },
  {
    key: "aiMarketMakerGlobalPauseEnabled",
    label: "Global Pause",
    type: "switch",
    description: "Temporarily pause all trading activities",
    category: "trading",
    subcategory: "Status",
  },
  {
    key: "aiMarketMakerMaintenanceMode",
    label: "Maintenance Mode",
    type: "switch",
    description: "Enable maintenance mode (disables trading)",
    category: "trading",
    subcategory: "Status",
  },

  // Bot Settings
  {
    key: "aiMarketMakerMaxConcurrentBots",
    label: "Max Concurrent Bots",
    type: "number",
    description: "Maximum number of bots that can run simultaneously",
    category: "bots",
    subcategory: "Limits",
    min: 1,
    max: 500,
    step: 1,
  },

  // Risk Settings
  {
    key: "aiMarketMakerMinLiquidity",
    label: "Minimum Liquidity",
    type: "number",
    description: "Minimum liquidity required for trading",
    category: "risk",
    subcategory: "Liquidity",
    min: 0,
    step: 1,
  },
  {
    key: "aiMarketMakerMaxDailyLossPercent",
    label: "Max Daily Loss",
    type: "range",
    description: "Maximum allowed daily loss percentage",
    category: "risk",
    subcategory: "Loss Limits",
    min: 0,
    max: 25,
    step: 1,
    suffix: "%",
  },
  {
    key: "aiMarketMakerDefaultVolatilityThreshold",
    label: "Volatility Threshold",
    type: "range",
    description: "Default volatility threshold for trading decisions",
    category: "risk",
    subcategory: "Volatility",
    min: 0,
    max: 50,
    step: 1,
    suffix: "%",
  },
  {
    key: "aiMarketMakerStopLossEnabled",
    label: "Enable Stop Loss",
    type: "switch",
    description: "Enable automatic stop-loss for all trades",
    category: "risk",
    subcategory: "Protection",
  },

  // Storage
  {
    key: "aiMarketMakerHistoryRetentionDays",
    label: "Trade History Retention",
    type: "number",
    description:
      "Days of per-trade AI history to keep. A MODERATE market writes ~3,500 rows a day and an AGGRESSIVE one ~9,000, so this table is the addon's largest. Daily summaries and lifecycle audit rows are never pruned. 0 keeps everything; anything below 2 is treated as 2, because the daily summariser reads yesterday's trades.",
    category: "trading",
    subcategory: "Storage",
    min: 0,
    max: 3650,
    step: 1,
    suffix: " days",
  },

  // Emergency Settings (Custom Component)
  {
    key: "aiMarketMakerEmergencyActions",
    label: "Emergency Actions",
    type: "custom",
    description: "Execute emergency controls for the AI trading system",
    category: "emergency",
    subcategory: "Actions",
    fullWidth: true,
    customRender: EmergencyActionsField,
  },
];

// Default settings values
export const AI_MARKET_MAKER_DEFAULT_SETTINGS: Record<string, any> = {
  aiMarketMakerEnabled: true,
  // FALSE by default — see the note on the field definition. An operator who
  // has not opted into shipping an app keeps the market maker untouched.
  mobileAppEnabled: false,
  aiMarketMakerGlobalPauseEnabled: false,
  aiMarketMakerMaintenanceMode: false,
  aiMarketMakerMaxConcurrentBots: 50,
  aiMarketMakerMinLiquidity: 100,
  aiMarketMakerMaxDailyLossPercent: 5,
  aiMarketMakerDefaultVolatilityThreshold: 10,
  aiMarketMakerStopLossEnabled: true,
  aiMarketMakerHistoryRetentionDays: 90,
};

/**
 * The page config — ONE object, TWO consumers.
 *
 * `client.tsx` passes this to `SettingsPage` and `loading.tsx` passes the same
 * object to `SettingsPageSkeleton`. It lives here, in the route's plain data
 * module, because both of those files need it and neither can import from the
 * other: `client.tsx` is a `"use client"` module, so anything defined there is a
 * client-reference proxy rather than a value.
 *
 * Before this, `title`, `description` and `backUrl` were typed out in both
 * files, with nothing keeping the two copies in step — rename the page and the
 * pending state keeps announcing the old name until first paint. One object
 * makes that disagreement unrepresentable. That matters more here than
 * anywhere: this route's old skeleton was a byte-identical copy of the
 * binary-engine one next door.
 *
 * Keep this a PLAIN DATA OBJECT. Callbacks (`onBeforeSave`/`onAfterSave`) and
 * anything closing over client state stay in `client.tsx` and spread on top —
 * the skeleton never invokes them, and a function here would be one more thing
 * that has to survive being imported by a file whose whole job is to render
 * before any of it runs.
 */
export const AI_MARKET_MAKER_SETTINGS_CONFIG: SettingsPageConfig = {
  title: "AI Market Maker Settings",
  description: "Configure your AI market maker settings and preferences",
  backUrl: "/admin/ai/market-maker",
  apiEndpoint: "/api/admin/system/settings",
  tabs: AI_MARKET_MAKER_TABS,
  fields: AI_MARKET_MAKER_FIELD_DEFINITIONS,
  tabColors: AI_MARKET_MAKER_TAB_COLORS,
  defaultValues: AI_MARKET_MAKER_DEFAULT_SETTINGS,
};
