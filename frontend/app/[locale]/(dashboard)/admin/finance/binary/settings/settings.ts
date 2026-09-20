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
import type { BadgeTone } from "@/components/ui/badge";
import { statusTone } from "@/lib/status-tone";
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
  iconBg: string;
}

export const BINARY_TAB_COLORS: Record<string, TabColors> = {
  global: {
    bg: "bg-primary/10",
    text: "text-primary",
    border: "border-primary/20",
    iconBg: "bg-primary",
  },
  display: {
    bg: "bg-primary/10",
    text: "text-primary",
    border: "border-primary/20",
    iconBg: "bg-primary",
  },
  orderTypes: {
    bg: "bg-primary/10",
    text: "text-primary",
    border: "border-primary/20",
    iconBg: "bg-primary",
  },
  barriers: {
    bg: "bg-primary/10",
    text: "text-primary",
    border: "border-primary/20",
    iconBg: "bg-primary",
  },
  durations: {
    bg: "bg-primary/10",
    text: "text-primary",
    border: "border-primary/20",
    iconBg: "bg-primary",
  },
  cancellation: {
    bg: "bg-primary/10",
    text: "text-primary",
    border: "border-primary/20",
    iconBg: "bg-primary",
  },
  risk: {
    bg: "bg-primary/10",
    text: "text-primary",
    border: "border-primary/20",
    iconBg: "bg-primary",
  },
  optimizer: {
    bg: "bg-primary/10",
    text: "text-primary",
    border: "border-primary/20",
    iconBg: "bg-primary",
  },
  presets: {
    bg: "bg-primary/10",
    text: "text-primary",
    border: "border-primary/20",
    iconBg: "bg-primary",
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

/**
 * Order-type identity.
 *
 * The five hues were green/blue/amber/purple/red, which made Rise/Fall read as
 * a SUCCESS and Turbo as an ERROR — status meaning attached to what is really a
 * categorical list. They take positional ramp slots instead.
 *
 * `colorSoft` exists because the tint behind each icon used to be built as
 * `` `${config.color}20` `` — appending hex alpha, which silently produces a
 * non-colour the moment `color` stops being a six-digit hex. The alpha now
 * lives in the token itself, and the two must be changed together.
 */
export const ORDER_TYPE_CONFIG: Record<BinaryOrderType, {
  label: string;
  color: string;
  colorSoft: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  description: string;
}> = {
  RISE_FALL: {
    label: "Rise/Fall",
    color: "hsl(var(--chart-1))",
    colorSoft: "hsl(var(--chart-1) / 0.12)",
    icon: RiseFallIcon,
    description: "Predict if the price will rise or fall from entry price",
  },
  HIGHER_LOWER: {
    label: "Higher/Lower",
    color: "hsl(var(--chart-2))",
    colorSoft: "hsl(var(--chart-2) / 0.12)",
    icon: HigherLowerIcon,
    description: "Predict if the price will be higher or lower than a barrier",
  },
  TOUCH_NO_TOUCH: {
    label: "Touch/No Touch",
    color: "hsl(var(--chart-3))",
    colorSoft: "hsl(var(--chart-3) / 0.12)",
    icon: TouchNoTouchIcon,
    description: "Predict if the price will touch or not touch a barrier",
  },
  CALL_PUT: {
    label: "Call/Put",
    color: "hsl(var(--chart-4))",
    colorSoft: "hsl(var(--chart-4) / 0.12)",
    icon: CallPutIcon,
    description: "Similar to traditional options with strike price",
  },
  TURBO: {
    label: "Turbo",
    color: "hsl(var(--chart-5))",
    colorSoft: "hsl(var(--chart-5) / 0.12)",
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
 * Colour for a payout percentage, as a CSS value for inline `style`.
 *
 * This is a graded QUALITY band, not price direction — a 95% payout is not
 * "the price went up" — so it takes the status tokens, not `--up`/`--down`.
 *
 * The old scale had four steps (green / emerald / yellow / orange), but the two
 * top steps were a green and a near-identical green: at a glance nobody read
 * them as different bands. Three bands is what the scale actually communicated,
 * and the exact figure is always rendered beside it.
 */
export function getProfitColor(profit: number): string {
  if (profit >= 70) return "hsl(var(--success))";
  if (profit >= 50) return "hsl(var(--warning))";
  return "hsl(var(--destructive))";
}

/** Tailwind-class version of {@link getProfitColor}. */
export function getProfitColorClass(profit: number): string {
  if (profit >= 70) return "text-success";
  if (profit >= 50) return "text-warning";
  return "text-destructive";
}

/**
 * How a tone is painted as an ink-on-tint chip. Tailwind cannot see class names
 * assembled at runtime, so the recipes have to be spelled out per tone.
 */
const TONE_INK_ON_TINT: Record<BadgeTone, string> = {
  primary: "text-primary-ink bg-primary/10",
  secondary: "text-secondary-foreground bg-secondary",
  success: "text-success-ink bg-success/10",
  warning: "text-warning-ink bg-warning/10",
  destructive: "text-destructive-ink bg-destructive/10",
  info: "text-info-ink bg-info/10",
  neutral: "text-muted-foreground bg-muted",
};

/**
 * Get risk level color. LOW/MEDIUM/HIGH is a severity scale, so which hue each
 * level gets is decided by the canonical `statusTone()` table, not here.
 */
export function getRiskLevelColor(level: "low" | "medium" | "high"): string {
  return TONE_INK_ON_TINT[statusTone(level)];
}

/**
 * Get warning level color. `info` uses the `--info` token, which as of Phase 4
 * is a distinct cyan rather than an alias of the brand accent — so an
 * informational band no longer looks like a button.
 */
export function getWarningLevelColor(level: "info" | "warning" | "danger"): string {
  switch (level) {
    case "info":
      return "text-info-ink bg-info/10 border-info/20";
    case "warning":
      return "text-warning-ink bg-warning/10 border-warning/20";
    case "danger":
      return "text-destructive-ink bg-destructive/10 border-destructive/20";
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
