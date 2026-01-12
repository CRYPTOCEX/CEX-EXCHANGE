/**
 * Binary Settings Page Configuration
 *
 * Defines tabs, fields, colors, and defaults for the binary settings admin page.
 */

import {
  Settings,
  Layers,
  Target,
  Clock,
  Shield,
  Bookmark,
  XCircle,
  Calculator,
  LineChart,
} from "lucide-react";
import type { BinarySettings, BinaryOrderType } from "./types";
import {
  RiseFallIcon,
  HigherLowerIcon,
  TouchNoTouchIcon,
  CallPutIcon,
  TurboIcon,
} from "@/app/[locale]/binary/components/order/order-type-icons";

// ============================================================================
// TAB DEFINITIONS
// ============================================================================

export interface TabDefinition {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
}

export const BINARY_TABS: TabDefinition[] = [
  {
    id: "global",
    label: "Global Settings",
    icon: Settings,
    description: "Master controls and general trading limits",
  },
  {
    id: "display",
    label: "Chart & Display",
    icon: LineChart,
    description: "Configure chart engine and display settings",
  },
  {
    id: "orderTypes",
    label: "Order Types",
    icon: Layers,
    description: "Configure each trading type (Rise/Fall, Higher/Lower, etc.)",
  },
  {
    id: "barriers",
    label: "Barrier Levels",
    icon: Target,
    description: "Define barrier/strike price levels and their profit percentages",
  },
  {
    id: "durations",
    label: "Durations",
    icon: Clock,
    description: "Configure available expiry durations",
  },
  {
    id: "cancellation",
    label: "Cancellation",
    icon: XCircle,
    description: "Configure early cancellation rules and penalties",
  },
  {
    id: "risk",
    label: "Risk Management",
    icon: Shield,
    description: "Set exposure limits and loss controls",
  },
  {
    id: "optimizer",
    label: "Payout Optimizer",
    icon: Calculator,
    description: "Analyze and optimize payout settings for profitability",
  },
  {
    id: "presets",
    label: "Presets",
    icon: Bookmark,
    description: "Apply pre-configured settings templates",
  },
];

// ============================================================================
// TAB COLORS
// ============================================================================

export interface TabColors {
  bg: string;
  text: string;
  border: string;
  gradient: string;
  glow: string;
  iconBg: string;
}

export const BINARY_TAB_COLORS: Record<string, TabColors> = {
  global: {
    bg: "bg-blue-500/10",
    text: "text-blue-500",
    border: "border-blue-500/20",
    gradient: "from-blue-500/20 to-blue-600/5",
    glow: "shadow-blue-500/20",
    iconBg: "bg-blue-500/20",
  },
  display: {
    bg: "bg-teal-500/10",
    text: "text-teal-500",
    border: "border-teal-500/20",
    gradient: "from-teal-500/20 to-teal-600/5",
    glow: "shadow-teal-500/20",
    iconBg: "bg-teal-500/20",
  },
  orderTypes: {
    bg: "bg-purple-500/10",
    text: "text-purple-500",
    border: "border-purple-500/20",
    gradient: "from-purple-500/20 to-purple-600/5",
    glow: "shadow-purple-500/20",
    iconBg: "bg-purple-500/20",
  },
  barriers: {
    bg: "bg-amber-500/10",
    text: "text-amber-500",
    border: "border-amber-500/20",
    gradient: "from-amber-500/20 to-amber-600/5",
    glow: "shadow-amber-500/20",
    iconBg: "bg-amber-500/20",
  },
  durations: {
    bg: "bg-cyan-500/10",
    text: "text-cyan-500",
    border: "border-cyan-500/20",
    gradient: "from-cyan-500/20 to-cyan-600/5",
    glow: "shadow-cyan-500/20",
    iconBg: "bg-cyan-500/20",
  },
  cancellation: {
    bg: "bg-orange-500/10",
    text: "text-orange-500",
    border: "border-orange-500/20",
    gradient: "from-orange-500/20 to-orange-600/5",
    glow: "shadow-orange-500/20",
    iconBg: "bg-orange-500/20",
  },
  risk: {
    bg: "bg-red-500/10",
    text: "text-red-500",
    border: "border-red-500/20",
    gradient: "from-red-500/20 to-red-600/5",
    glow: "shadow-red-500/20",
    iconBg: "bg-red-500/20",
  },
  optimizer: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-500",
    border: "border-emerald-500/20",
    gradient: "from-emerald-500/20 to-emerald-600/5",
    glow: "shadow-emerald-500/20",
    iconBg: "bg-emerald-500/20",
  },
  presets: {
    bg: "bg-indigo-500/10",
    text: "text-indigo-500",
    border: "border-indigo-500/20",
    gradient: "from-indigo-500/20 to-indigo-600/5",
    glow: "shadow-indigo-500/20",
    iconBg: "bg-indigo-500/20",
  },
};

// ============================================================================
// ORDER TYPE ICONS
// ============================================================================

export const ORDER_TYPE_ICONS: Record<BinaryOrderType, React.ComponentType<{ className?: string; size?: number }>> = {
  RISE_FALL: RiseFallIcon,
  HIGHER_LOWER: HigherLowerIcon,
  TOUCH_NO_TOUCH: TouchNoTouchIcon,
  CALL_PUT: CallPutIcon,
  TURBO: TurboIcon,
};

// ============================================================================
// ORDER TYPE CONFIGURATION
// ============================================================================

export const ORDER_TYPE_CONFIG: Record<BinaryOrderType, {
  label: string;
  color: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  description: string;
}> = {
  RISE_FALL: {
    label: "Rise/Fall",
    color: "#22c55e", // green-500
    icon: RiseFallIcon,
    description: "Predict if the price will rise or fall from entry price",
  },
  HIGHER_LOWER: {
    label: "Higher/Lower",
    color: "#3b82f6", // blue-500
    icon: HigherLowerIcon,
    description: "Predict if the price will be higher or lower than a barrier",
  },
  TOUCH_NO_TOUCH: {
    label: "Touch/No Touch",
    color: "#f59e0b", // amber-500
    icon: TouchNoTouchIcon,
    description: "Predict if the price will touch or not touch a barrier",
  },
  CALL_PUT: {
    label: "Call/Put",
    color: "#8b5cf6", // purple-500
    icon: CallPutIcon,
    description: "Similar to traditional options with strike price",
  },
  TURBO: {
    label: "Turbo",
    color: "#ef4444", // red-500
    icon: TurboIcon,
    description: "High-risk, high-reward short-term trades with barrier knockout",
  },
};

// ============================================================================
// DEFAULT BARRIER LEVELS
// ============================================================================

export const DEFAULT_HIGHER_LOWER_BARRIERS = [
  { id: "hl_close", label: "Close (0.1%)", distancePercent: 0.1, profitPercent: 85, enabled: true },
  { id: "hl_near", label: "Near (0.25%)", distancePercent: 0.25, profitPercent: 75, enabled: true },
  { id: "hl_medium", label: "Medium (0.5%)", distancePercent: 0.5, profitPercent: 65, enabled: true },
  { id: "hl_far", label: "Far (1%)", distancePercent: 1.0, profitPercent: 50, enabled: false },
];

export const DEFAULT_TOUCH_BARRIERS = [
  { id: "tn_close", label: "Close (0.2%)", distancePercent: 0.2, profitPercent: 150, enabled: true },
  { id: "tn_near", label: "Near (0.5%)", distancePercent: 0.5, profitPercent: 200, enabled: true },
  { id: "tn_medium", label: "Medium (1%)", distancePercent: 1.0, profitPercent: 300, enabled: true },
];

export const DEFAULT_CALL_PUT_STRIKES = [
  { id: "cp_atm", label: "At The Money (0.1%)", distancePercent: 0.1, profitPercent: 85, enabled: true },
  { id: "cp_near", label: "Near (0.5%)", distancePercent: 0.5, profitPercent: 75, enabled: true },
  { id: "cp_otm", label: "Out of Money (1%)", distancePercent: 1.0, profitPercent: 60, enabled: true },
];

export const DEFAULT_TURBO_BARRIERS = [
  { id: "turbo_tight", label: "Tight (0.05%)", distancePercent: 0.05, profitPercent: 70, enabled: true },
  { id: "turbo_normal", label: "Normal (0.1%)", distancePercent: 0.1, profitPercent: 60, enabled: true },
  { id: "turbo_wide", label: "Wide (0.2%)", distancePercent: 0.2, profitPercent: 50, enabled: true },
];

// ============================================================================
// DEFAULT DURATIONS
// ============================================================================

export const DEFAULT_DURATIONS = [
  { id: "d_1m", minutes: 1, enabled: true },
  { id: "d_3m", minutes: 3, enabled: true },
  { id: "d_5m", minutes: 5, enabled: true },
  { id: "d_15m", minutes: 15, enabled: true },
  { id: "d_30m", minutes: 30, enabled: true },
  { id: "d_1h", minutes: 60, enabled: true },
];

// ============================================================================
// DEFAULT CANCELLATION SETTINGS
// ============================================================================

export const DEFAULT_CANCELLATION_SETTINGS = {
  enabled: true,
  rules: {
    RISE_FALL: {
      enabled: true,
      minTimeBeforeExpirySeconds: 30,
      penaltyPercentage: 10,
      penaltyByTimeRemaining: {
        above60Seconds: 5,
        above30Seconds: 10,
        below30Seconds: 20,
      },
    },
    HIGHER_LOWER: {
      enabled: true,
      minTimeBeforeExpirySeconds: 30,
      penaltyPercentage: 15,
      penaltyByTimeRemaining: {
        above60Seconds: 10,
        above30Seconds: 15,
        below30Seconds: 25,
      },
    },
    TOUCH_NO_TOUCH: {
      enabled: false,
      minTimeBeforeExpirySeconds: 60,
      penaltyPercentage: 20,
    },
    CALL_PUT: {
      enabled: true,
      minTimeBeforeExpirySeconds: 60,
      penaltyPercentage: 15,
      penaltyByTimeRemaining: {
        above60Seconds: 10,
        above30Seconds: 15,
        below30Seconds: 25,
      },
    },
    TURBO: {
      enabled: false,
      minTimeBeforeExpirySeconds: 0,
      penaltyPercentage: 0,
    },
  },
};

// ============================================================================
// DEFAULT SETTINGS
// ============================================================================

export const DEFAULT_BINARY_SETTINGS: BinarySettings = {
  global: {
    enabled: true,
    practiceEnabled: true,
    maxConcurrentOrders: 10,
    maxDailyOrders: 100,
    cooldownSeconds: 0,
    orderExpirationBuffer: 30,
    cancelExpirationBuffer: 60,
  },

  display: {
    chartType: "CHART_ENGINE",
  },

  cancellation: DEFAULT_CANCELLATION_SETTINGS,

  orderTypes: {
    RISE_FALL: {
      enabled: true,
      profitPercentage: 85,
      tradingModes: { demo: true, live: true },
    },
    HIGHER_LOWER: {
      enabled: false,
      profitPercentage: 80,
      barrierLevels: DEFAULT_HIGHER_LOWER_BARRIERS,
      tradingModes: { demo: true, live: true },
    },
    TOUCH_NO_TOUCH: {
      enabled: false,
      profitPercentage: 200,
      barrierLevels: DEFAULT_TOUCH_BARRIERS,
      touchProfitMultiplier: 1.0,
      noTouchProfitMultiplier: 0.8,
      tradingModes: { demo: true, live: true },
    },
    CALL_PUT: {
      enabled: false,
      profitPercentage: 85,
      strikeLevels: DEFAULT_CALL_PUT_STRIKES,
      tradingModes: { demo: true, live: true },
    },
    TURBO: {
      enabled: false,
      profitPercentage: 70,
      barrierLevels: DEFAULT_TURBO_BARRIERS,
      payoutPerPointRange: { min: 0.1, max: 10 },
      maxDuration: 5,
      allowTicksBased: true,
      tradingModes: { demo: true, live: true },
    },
  },

  durations: DEFAULT_DURATIONS,

  riskManagement: {
    dailyLossLimit: 0,
    winRateAlert: 70,
  },

  _preset: "balanced",
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format duration for display
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${mins}m`;
}

/**
 * Get color class based on profit percentage
 */
export function getProfitColor(profit: number): string {
  if (profit >= 90) return "#22c55e"; // green-500
  if (profit >= 70) return "#10b981"; // emerald-500
  if (profit >= 50) return "#eab308"; // yellow-500
  return "#f97316"; // orange-500
}

/**
 * Get color class based on profit percentage (Tailwind class version)
 */
export function getProfitColorClass(profit: number): string {
  if (profit >= 90) return "text-green-500";
  if (profit >= 70) return "text-emerald-500";
  if (profit >= 50) return "text-yellow-500";
  return "text-orange-500";
}

/**
 * Get risk level color
 */
export function getRiskLevelColor(level: "low" | "medium" | "high"): string {
  switch (level) {
    case "low":
      return "text-green-500 bg-green-500/10";
    case "medium":
      return "text-yellow-500 bg-yellow-500/10";
    case "high":
      return "text-red-500 bg-red-500/10";
  }
}

/**
 * Get warning level color
 */
export function getWarningLevelColor(level: "info" | "warning" | "danger"): string {
  switch (level) {
    case "info":
      return "text-blue-500 bg-blue-500/10 border-blue-500/20";
    case "warning":
      return "text-yellow-500 bg-yellow-500/10 border-yellow-500/20";
    case "danger":
      return "text-red-500 bg-red-500/10 border-red-500/20";
  }
}

/**
 * Deep clone settings object
 */
export function cloneSettings(settings: BinarySettings): BinarySettings {
  return JSON.parse(JSON.stringify(settings));
}

/**
 * Check if settings have changed
 */
export function settingsChanged(
  original: BinarySettings,
  current: BinarySettings
): boolean {
  return JSON.stringify(original) !== JSON.stringify(current);
}
