import {
  TrendingUp,
  Bot,
  Shield,
  AlertTriangle,
} from "lucide-react";
import { FieldDefinition, TabDefinition, TabColors } from "@/components/admin/settings";
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
    bg: "bg-cyan-500/10",
    text: "text-cyan-500",
    border: "border-cyan-500/20",
    gradient: "from-cyan-500/20 via-cyan-400/10 to-transparent",
    glow: "shadow-cyan-500/20",
    iconBg: "bg-gradient-to-br from-cyan-500 to-cyan-600",
  },
  bots: {
    bg: "bg-purple-500/10",
    text: "text-purple-500",
    border: "border-purple-500/20",
    gradient: "from-purple-500/20 via-purple-400/10 to-transparent",
    glow: "shadow-purple-500/20",
    iconBg: "bg-gradient-to-br from-purple-500 to-purple-600",
  },
  risk: {
    bg: "bg-amber-500/10",
    text: "text-amber-500",
    border: "border-amber-500/20",
    gradient: "from-amber-500/20 via-amber-400/10 to-transparent",
    glow: "shadow-amber-500/20",
    iconBg: "bg-gradient-to-br from-amber-500 to-amber-600",
  },
  emergency: {
    bg: "bg-red-500/10",
    text: "text-red-500",
    border: "border-red-500/20",
    gradient: "from-red-500/20 via-red-400/10 to-transparent",
    glow: "shadow-red-500/20",
    iconBg: "bg-gradient-to-br from-red-500 to-red-600",
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
  aiMarketMakerGlobalPauseEnabled: false,
  aiMarketMakerMaintenanceMode: false,
  aiMarketMakerMaxConcurrentBots: 50,
  aiMarketMakerMinLiquidity: 100,
  aiMarketMakerMaxDailyLossPercent: 5,
  aiMarketMakerDefaultVolatilityThreshold: 10,
  aiMarketMakerStopLossEnabled: true,
};
