/**
 * Algo trading strategy catalogue.
 *
 * This is the single source of truth the in-trade Algo panel uses to render
 * parameter forms, seed sensible defaults from the live price, and project the
 * economics of a bot before it is created.
 *
 * The shapes here mirror the backend schema exactly — see
 * `backend/src/api/(ext)/trading-bot/utils/strategies/StrategyFactory.ts`
 * (`getConfigSchema` / `validate`). Anything sent as `strategyConfig` must
 * satisfy that schema or the POST is rejected, so `validateConfig()` below is a
 * deliberate client-side mirror of the backend's `required` lists.
 */
import {
  Grid3X3,
  DollarSign,
  Activity,
  Target,
  Workflow,
  type LucideIcon,
} from "lucide-react";

export type AlgoStrategyType =
  | "GRID"
  | "DCA"
  | "INDICATOR"
  | "TRAILING_STOP"
  | "CUSTOM";

export type AlgoMode = "LIVE" | "PAPER";

export type RiskPreset = "conservative" | "balanced" | "aggressive";

export interface StrategyMeta {
  type: AlgoStrategyType;
  label: string;
  /** Fits the narrow strategy chip in the panel header. */
  shortLabel: string;
  tagline: string;
  icon: LucideIcon;
  /**
   * Accent for the selected chip. Must reference an `--algo-*` token: those are
   * defined on `.algo-panel` in every shell, whereas `--tp-*` only exists inside
   * the Pro workspace.
   */
  accent: string;
  bestFor: string;
}

export const STRATEGIES: StrategyMeta[] = [
  {
    type: "GRID",
    label: "Grid Trading",
    shortLabel: "Grid",
    tagline: "Buy low and sell high automatically across a price range.",
    icon: Grid3X3,
    accent: "var(--algo-blue)",
    bestFor: "Ranging / sideways markets",
  },
  {
    type: "DCA",
    label: "DCA",
    shortLabel: "DCA",
    tagline: "Accumulate a position with fixed buys on a schedule.",
    icon: DollarSign,
    accent: "var(--algo-green)",
    bestFor: "Long-term accumulation",
  },
  {
    type: "INDICATOR",
    label: "Signals",
    shortLabel: "Signals",
    tagline: "Trade RSI, MACD, Bollinger and moving-average crossovers.",
    icon: Activity,
    accent: "var(--algo-purple)",
    bestFor: "Trending markets",
  },
  {
    type: "TRAILING_STOP",
    label: "Trailing Stop",
    shortLabel: "Trailing",
    tagline: "Ride a move and lock profit with a stop that follows price.",
    icon: Target,
    accent: "var(--algo-orange)",
    bestFor: "Momentum breakouts",
  },
  {
    type: "CUSTOM",
    label: "Custom Flow",
    shortLabel: "Custom",
    tagline: "Run a strategy you designed in the visual builder.",
    icon: Workflow,
    accent: "var(--algo-yellow)",
    bestFor: "Advanced users",
  },
];

export const STRATEGY_BY_TYPE: Record<AlgoStrategyType, StrategyMeta> =
  STRATEGIES.reduce(
    (acc, s) => {
      acc[s.type] = s;
      return acc;
    },
    {} as Record<AlgoStrategyType, StrategyMeta>
  );

/* ------------------------------------------------------------------ */
/* Defaults                                                            */
/* ------------------------------------------------------------------ */

/**
 * Per-preset knobs. Grid range is expressed as a ± percentage around the live
 * price: a *wider* band is more conservative because price is less likely to
 * escape the grid, while more levels means smaller (but more frequent) profit
 * per fill.
 */
const PRESET_TUNING: Record<
  RiskPreset,
  {
    gridBandPercent: number;
    gridCount: number;
    trailPercent: number;
    activationPercent: number;
    dcaInterval: string;
    indicatorTimeframe: string;
    signalMode: "any" | "all";
  }
> = {
  conservative: {
    gridBandPercent: 20,
    gridCount: 15,
    trailPercent: 8,
    activationPercent: 3,
    dcaInterval: "weekly",
    indicatorTimeframe: "4h",
    signalMode: "all",
  },
  balanced: {
    gridBandPercent: 10,
    gridCount: 25,
    trailPercent: 5,
    activationPercent: 1.5,
    dcaInterval: "daily",
    indicatorTimeframe: "1h",
    signalMode: "all",
  },
  aggressive: {
    gridBandPercent: 5,
    gridCount: 40,
    trailPercent: 2.5,
    activationPercent: 0.5,
    dcaInterval: "hourly",
    indicatorTimeframe: "15m",
    signalMode: "any",
  },
};

/** Round a price to a sane number of decimals for its magnitude. */
export function roundPrice(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  const decimals = value >= 1000 ? 2 : value >= 1 ? 4 : 8;
  return Number(value.toFixed(decimals));
}

/**
 * Seed a strategy config from the live price. Every strategy gets values that
 * are immediately valid, so the user can create a working bot without editing
 * anything.
 */
export function buildDefaults(
  type: AlgoStrategyType,
  price: number,
  preset: RiskPreset = "balanced"
): Record<string, any> {
  const tuning = PRESET_TUNING[preset];
  const p = price > 0 ? price : 0;
  const band = tuning.gridBandPercent / 100;

  switch (type) {
    case "GRID":
      return {
        lowerPrice: roundPrice(p * (1 - band)),
        upperPrice: roundPrice(p * (1 + band)),
        gridCount: tuning.gridCount,
        amountPerGrid: 10,
        gridType: "arithmetic",
        initialBuy: false,
        sellAllOnStop: false,
      };

    case "DCA":
      return {
        interval: tuning.dcaInterval,
        intervalHours: 4,
        amount: 25,
        amountType: "fixed",
        maxBuys: 20,
        priceCondition: { enabled: false, type: "below_ma", value: 0 },
      };

    case "INDICATOR":
      return {
        timeframe: tuning.indicatorTimeframe,
        indicators: {
          rsi: { enabled: true, period: 14, overbought: 70, oversold: 30 },
          macd: {
            enabled: false,
            fastPeriod: 12,
            slowPeriod: 26,
            signalPeriod: 9,
          },
          bollingerBands: { enabled: false, period: 20, stdDev: 2 },
          ma: {
            enabled: false,
            type: "EMA",
            period: 50,
            crossType: "price_cross",
            secondPeriod: 200,
          },
        },
        signalMode: tuning.signalMode,
        entryAmount: 100,
        exitMode: "both",
      };

    case "TRAILING_STOP":
      return {
        trailPercent: tuning.trailPercent,
        activationPercent: tuning.activationPercent,
        entryMode: "market",
        entryAmount: 100,
        entryCondition: { type: "immediate", value: 0 },
      };

    case "CUSTOM":
      return {
        nodes: [],
        connections: [],
        entryAmount: 100,
        version: "1.0",
      };

    default:
      return {};
  }
}

/** Risk-management defaults shared by every strategy. */
export function buildRiskDefaults(preset: RiskPreset = "balanced") {
  switch (preset) {
    case "conservative":
      return {
        stopLossPercent: 5,
        takeProfitPercent: 10,
        dailyLossLimitPercent: 5,
        maxDrawdownPercent: 10,
        maxConcurrentTrades: 2,
        cooldownSeconds: 300,
      };
    case "aggressive":
      return {
        stopLossPercent: 15,
        takeProfitPercent: 30,
        dailyLossLimitPercent: 20,
        maxDrawdownPercent: 30,
        maxConcurrentTrades: 10,
        cooldownSeconds: 30,
      };
    case "balanced":
    default:
      return {
        stopLossPercent: 10,
        takeProfitPercent: 20,
        dailyLossLimitPercent: 10,
        maxDrawdownPercent: 20,
        maxConcurrentTrades: 5,
        cooldownSeconds: 60,
      };
  }
}

/* ------------------------------------------------------------------ */
/* Validation — mirrors StrategyFactory.validate on the backend        */
/* ------------------------------------------------------------------ */

const REQUIRED_FIELDS: Record<AlgoStrategyType, string[]> = {
  GRID: [
    "upperPrice",
    "lowerPrice",
    "gridCount",
    "amountPerGrid",
    "gridType",
  ],
  DCA: ["interval", "amount", "amountType"],
  INDICATOR: ["timeframe", "indicators", "signalMode", "entryAmount"],
  TRAILING_STOP: ["trailPercent", "entryMode", "entryAmount"],
  CUSTOM: ["nodes", "connections", "entryAmount"],
};

/**
 * Client-side mirror of the backend validator, plus the semantic checks the
 * backend's JSON-schema pass cannot express (upper > lower, grid fits budget).
 * Returns a list of human-readable errors; empty means safe to submit.
 */
export function validateConfig(
  type: AlgoStrategyType,
  config: Record<string, any>,
  allocatedAmount: number
): string[] {
  const errors: string[] = [];

  for (const field of REQUIRED_FIELDS[type] ?? []) {
    const value = config?.[field];
    if (value === undefined || value === null || value === "") {
      errors.push(`${field} is required`);
    }
  }

  if (type === "GRID") {
    const lower = Number(config.lowerPrice);
    const upper = Number(config.upperPrice);
    const count = Number(config.gridCount);
    const perGrid = Number(config.amountPerGrid);

    if (lower > 0 && upper > 0 && upper <= lower) {
      errors.push("Upper price must be greater than lower price");
    }
    if (count < 2 || count > 100) {
      errors.push("Grid levels must be between 2 and 100");
    }
    if (perGrid <= 0) {
      errors.push("Amount per grid must be greater than 0");
    }
    const required = perGrid * count;
    if (allocatedAmount > 0 && required > allocatedAmount) {
      errors.push(
        `Grid needs ${required.toFixed(2)} but only ${allocatedAmount.toFixed(2)} is allocated`
      );
    }
  }

  if (type === "DCA") {
    if (Number(config.amount) <= 0) {
      errors.push("Buy amount must be greater than 0");
    }
    if (config.interval === "hourly" && Number(config.intervalHours) <= 0) {
      errors.push("Interval hours must be greater than 0");
    }
  }

  if (type === "INDICATOR") {
    const indicators = config.indicators ?? {};
    const anyEnabled = Object.values(indicators).some(
      (i: any) => i?.enabled === true
    );
    if (!anyEnabled) {
      errors.push("Enable at least one indicator");
    }
    if (Number(config.entryAmount) <= 0) {
      errors.push("Entry amount must be greater than 0");
    }
  }

  if (type === "TRAILING_STOP") {
    const trail = Number(config.trailPercent);
    if (trail < 0.1 || trail > 50) {
      errors.push("Trail percent must be between 0.1 and 50");
    }
    if (Number(config.entryAmount) <= 0) {
      errors.push("Entry amount must be greater than 0");
    }
  }

  if (type === "CUSTOM") {
    if (!Array.isArray(config.nodes) || config.nodes.length === 0) {
      errors.push("Build and select a strategy in the visual builder first");
    }
  }

  if (allocatedAmount <= 0) {
    errors.push("Allocate an amount to fund the bot");
  }

  return errors;
}

/* ------------------------------------------------------------------ */
/* Projections                                                         */
/* ------------------------------------------------------------------ */

export interface ProjectionRow {
  label: string;
  value: string;
  /** Drives colour: neutral by default, positive/negative for P&L-like rows. */
  tone?: "neutral" | "positive" | "negative" | "warning";
  hint?: string;
}

const fmt = (value: number, decimals = 2): string => {
  if (!Number.isFinite(value)) return "—";
  return value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

/**
 * Grid geometry. `arithmetic` spaces levels by a constant price step,
 * `geometric` by a constant ratio — the ratio form gives every level the same
 * percentage profit, which is why the two are reported differently.
 */
export function gridLevels(
  lower: number,
  upper: number,
  count: number,
  gridType: string
): number[] {
  if (!(lower > 0) || !(upper > lower) || count < 2) return [];
  const levels: number[] = [];
  if (gridType === "geometric") {
    const ratio = Math.pow(upper / lower, 1 / (count - 1));
    for (let i = 0; i < count; i++) levels.push(lower * Math.pow(ratio, i));
  } else {
    const step = (upper - lower) / (count - 1);
    for (let i = 0; i < count; i++) levels.push(lower + step * i);
  }
  return levels;
}

/**
 * Pre-trade economics for the selected strategy. `feePercent` is the round-trip
 * taker fee per side, so a grid fill pays it twice (buy + sell) — netting it out
 * here is what stops a 40-level grid on a tight band from looking profitable
 * when it is actually fee-negative.
 */
export function computeProjection(
  type: AlgoStrategyType,
  config: Record<string, any>,
  price: number,
  quote: string,
  feePercent = 0.1
): ProjectionRow[] {
  switch (type) {
    case "GRID": {
      const lower = Number(config.lowerPrice) || 0;
      const upper = Number(config.upperPrice) || 0;
      const count = Number(config.gridCount) || 0;
      const perGrid = Number(config.amountPerGrid) || 0;
      const levels = gridLevels(lower, upper, count, config.gridType);
      if (levels.length < 2) {
        return [{ label: "Grid", value: "Set a valid price range", tone: "warning" }];
      }

      // Percentage profit captured by one buy→sell round trip between levels.
      const grossPerGrid =
        config.gridType === "geometric"
          ? (Math.pow(upper / lower, 1 / (count - 1)) - 1) * 100
          : ((upper - lower) / (count - 1) / price) * 100;
      const netPerGrid = grossPerGrid - feePercent * 2;
      const investment = perGrid * count;
      const profitPerFill = (perGrid * netPerGrid) / 100;

      return [
        {
          label: "Grid spacing",
          value: `${fmt(grossPerGrid, 3)}%`,
          hint: "Price distance between adjacent levels",
        },
        {
          label: "Profit / grid",
          value: `${fmt(netPerGrid, 3)}%`,
          tone: netPerGrid > 0 ? "positive" : "negative",
          hint: `Net of ${fmt(feePercent * 2, 2)}% round-trip fees`,
        },
        {
          label: "Profit per fill",
          value: `${fmt(profitPerFill, 4)} ${quote}`,
          tone: profitPerFill > 0 ? "positive" : "negative",
        },
        {
          label: "Total investment",
          value: `${fmt(investment)} ${quote}`,
        },
        {
          label: "Range",
          value: `${fmt(((upper - lower) / price) * 100, 1)}% wide`,
          hint: "Bot pauses if price leaves this band",
        },
      ];
    }

    case "DCA": {
      const amount = Number(config.amount) || 0;
      const maxBuys = Number(config.maxBuys) || 0;
      const commitment = amount * maxBuys;
      const perYear = buysPerYear(config.interval, Number(config.intervalHours));

      return [
        {
          label: "Per buy",
          value: `${fmt(amount)} ${quote}`,
        },
        {
          label: "Frequency",
          value: describeInterval(config.interval, Number(config.intervalHours)),
        },
        {
          label: "Total commitment",
          value: maxBuys > 0 ? `${fmt(commitment)} ${quote}` : "Unlimited",
          tone: "warning",
          hint: "Amount per buy × max buys",
        },
        {
          label: "Annual outlay",
          value: `${fmt(amount * perYear)} ${quote}`,
          hint: "If the bot runs for a full year",
        },
      ];
    }

    case "INDICATOR": {
      const entry = Number(config.entryAmount) || 0;
      const enabled = Object.entries(config.indicators ?? {})
        .filter(([, v]: [string, any]) => v?.enabled)
        .map(([k]) => k.toUpperCase());

      return [
        { label: "Entry size", value: `${fmt(entry)} ${quote}` },
        {
          label: "Active signals",
          value: enabled.length ? enabled.join(", ") : "None",
          tone: enabled.length ? "neutral" : "warning",
        },
        {
          label: "Trigger",
          value:
            config.signalMode === "all"
              ? "All must agree"
              : "Any one fires",
          hint:
            config.signalMode === "all"
              ? "Fewer, higher-conviction entries"
              : "More frequent entries",
        },
        { label: "Timeframe", value: String(config.timeframe ?? "—") },
      ];
    }

    case "TRAILING_STOP": {
      const entry = Number(config.entryAmount) || 0;
      const trail = Number(config.trailPercent) || 0;
      const activation = Number(config.activationPercent) || 0;
      const riskAmount = (entry * trail) / 100;

      return [
        { label: "Entry size", value: `${fmt(entry)} ${quote}` },
        {
          label: "Trail distance",
          value: `${fmt(trail, 2)}%`,
          hint: "How far price can retrace before exit",
        },
        {
          label: "Activates at",
          value: activation > 0 ? `+${fmt(activation, 2)}% profit` : "Immediately",
        },
        {
          label: "Give-back per exit",
          value: `≈ ${fmt(riskAmount)} ${quote}`,
          tone: "warning",
          hint: "Profit surrendered from peak when the stop triggers",
        },
      ];
    }

    case "CUSTOM": {
      const nodes = Array.isArray(config.nodes) ? config.nodes.length : 0;
      return [
        { label: "Entry size", value: `${fmt(Number(config.entryAmount) || 0)} ${quote}` },
        {
          label: "Blocks",
          value: nodes > 0 ? `${nodes} nodes` : "Not configured",
          tone: nodes > 0 ? "neutral" : "warning",
        },
      ];
    }

    default:
      return [];
  }
}

function buysPerYear(interval: string, intervalHours: number): number {
  switch (interval) {
    case "hourly":
      return intervalHours > 0 ? (365 * 24) / intervalHours : 365 * 24;
    case "daily":
      return 365;
    case "weekly":
      return 52;
    case "biweekly":
      return 26;
    case "monthly":
      return 12;
    default:
      return 365;
  }
}

function describeInterval(interval: string, intervalHours: number): string {
  if (interval === "hourly") {
    return intervalHours > 1 ? `Every ${intervalHours}h` : "Every hour";
  }
  return interval ? interval.charAt(0).toUpperCase() + interval.slice(1) : "—";
}

/** Suggest a bot name so the user never has to think about one. */
export function suggestBotName(
  type: AlgoStrategyType,
  symbol: string
): string {
  const meta = STRATEGY_BY_TYPE[type];
  const base = symbol.split("/")[0] || symbol;
  return `${base} ${meta?.shortLabel ?? "Algo"}`;
}
