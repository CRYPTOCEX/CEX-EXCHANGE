import {
  baseStringSchema,
  baseBooleanSchema,
  baseNumberSchema,
  baseEnumSchema,
  baseDateTimeSchema,
} from "@b/utils/schema";

// ============================================
// AI Market Maker Schema
// ============================================

const id = baseStringSchema("ID of the AI Market Maker");
const marketId = baseStringSchema("ID of the ecosystem market");
const status = baseEnumSchema("Current status", ["ACTIVE", "PAUSED", "STOPPED"]);
const targetPrice = baseNumberSchema("Target price for the market");
const priceRangeLow = baseNumberSchema("Lower bound of price range");
const priceRangeHigh = baseNumberSchema("Upper bound of price range");
const aggressionLevel = baseEnumSchema("Aggression level", [
  "CONSERVATIVE",
  "MODERATE",
  "AGGRESSIVE",
]);
const maxDailyVolume = baseNumberSchema("Maximum daily trading volume");
const currentDailyVolume = baseNumberSchema("Current daily trading volume");
const volatilityThreshold = baseNumberSchema(
  "Volatility threshold for auto-pause"
);
const pauseOnHighVolatility = baseBooleanSchema(
  "Whether to pause on high volatility"
);
const realLiquidityPercent = baseNumberSchema(
  "Percentage of orders placed as real ecosystem orders (0-100)"
);
const createdAt = baseDateTimeSchema("Creation timestamp");
const updatedAt = baseDateTimeSchema("Last update timestamp");

export const aiMarketMakerSchema = {
  id,
  marketId,
  status,
  targetPrice,
  priceRangeLow,
  priceRangeHigh,
  aggressionLevel,
  maxDailyVolume,
  currentDailyVolume,
  volatilityThreshold,
  pauseOnHighVolatility,
  realLiquidityPercent,
  createdAt,
  updatedAt,
};

export const aiMarketMakerCreateSchema = {
  type: "object",
  properties: {
    marketId: baseStringSchema("ID of the ecosystem market to enable AI for"),
    targetPrice: baseNumberSchema("Initial target price"),
    priceRangeLow: baseNumberSchema("Lower bound of price range"),
    priceRangeHigh: baseNumberSchema("Upper bound of price range"),
    aggressionLevel: baseEnumSchema("Aggression level", [
      "CONSERVATIVE",
      "MODERATE",
      "AGGRESSIVE",
    ]),
    maxDailyVolume: baseNumberSchema("Maximum daily trading volume"),
    volatilityThreshold: baseNumberSchema("Volatility threshold (0-100)"),
    pauseOnHighVolatility: baseBooleanSchema("Pause on high volatility"),
    realLiquidityPercent: baseNumberSchema("Real liquidity percentage (0-100)"),
  },
  required: [
    "marketId",
    "targetPrice",
    "priceRangeLow",
    "priceRangeHigh",
  ],
};

export const aiMarketMakerUpdateSchema = {
  type: "object",
  properties: {
    targetPrice: baseNumberSchema("Target price"),
    priceRangeLow: baseNumberSchema("Lower bound of price range"),
    priceRangeHigh: baseNumberSchema("Upper bound of price range"),
    aggressionLevel: baseEnumSchema("Aggression level", [
      "CONSERVATIVE",
      "MODERATE",
      "AGGRESSIVE",
    ]),
    maxDailyVolume: baseNumberSchema("Maximum daily trading volume"),
    volatilityThreshold: baseNumberSchema("Volatility threshold"),
    pauseOnHighVolatility: baseBooleanSchema("Pause on high volatility"),
    realLiquidityPercent: baseNumberSchema("Real liquidity percentage"),
  },
};

// ============================================
// AI Market Maker Pool Schema
// ============================================

const baseCurrencyBalance = baseNumberSchema("Base currency balance");
const quoteCurrencyBalance = baseNumberSchema("Quote currency balance");
const initialBaseBalance = baseNumberSchema("Initial base currency balance");
const initialQuoteBalance = baseNumberSchema("Initial quote currency balance");
const totalValueLocked = baseNumberSchema("Total value locked in the pool");
const unrealizedPnL = baseNumberSchema("Unrealized profit/loss");
const realizedPnL = baseNumberSchema("Realized profit/loss");
const lastRebalanceAt = baseDateTimeSchema("Last rebalance timestamp");

export const aiMarketMakerPoolSchema = {
  id,
  marketMakerId: baseStringSchema("ID of the market maker"),
  baseCurrencyBalance,
  quoteCurrencyBalance,
  initialBaseBalance,
  initialQuoteBalance,
  totalValueLocked,
  unrealizedPnL,
  realizedPnL,
  lastRebalanceAt,
  createdAt,
  updatedAt,
};

export const poolDepositSchema = {
  type: "object",
  properties: {
    currency: baseEnumSchema("Currency to deposit", ["BASE", "QUOTE"]),
    amount: baseNumberSchema("Amount to deposit"),
  },
  required: ["currency", "amount"],
};

export const poolWithdrawSchema = {
  type: "object",
  properties: {
    currency: baseEnumSchema("Currency to withdraw", ["BASE", "QUOTE"]),
    amount: baseNumberSchema("Amount to withdraw"),
  },
  required: ["currency", "amount"],
};

// ============================================
// AI Bot Schema
// ============================================

const botId = baseStringSchema("ID of the bot");
const botName = baseStringSchema("Name of the bot");
const personality = baseEnumSchema("Bot personality type", [
  "SCALPER",
  "SWING",
  "ACCUMULATOR",
  "DISTRIBUTOR",
  "MARKET_MAKER",
]);
const riskTolerance = baseNumberSchema("Risk tolerance (0-1)");
const tradeFrequency = baseEnumSchema("Trade frequency", [
  "HIGH",
  "MEDIUM",
  "LOW",
]);
const avgOrderSize = baseNumberSchema("Average order size");
const orderSizeVariance = baseNumberSchema("Order size variance (0-1)");
const preferredSpread = baseNumberSchema("Preferred spread");
const botStatus = baseEnumSchema("Bot status", ["ACTIVE", "PAUSED", "COOLDOWN"]);
const lastTradeAt = baseDateTimeSchema("Last trade timestamp");
const dailyTradeCount = baseNumberSchema("Daily trade count");
const maxDailyTrades = baseNumberSchema("Maximum daily trades");

export const aiBotSchema = {
  id: botId,
  marketMakerId: baseStringSchema("ID of the market maker"),
  name: botName,
  personality,
  riskTolerance,
  tradeFrequency,
  avgOrderSize,
  orderSizeVariance,
  preferredSpread,
  status: botStatus,
  lastTradeAt,
  dailyTradeCount,
  maxDailyTrades,
  createdAt,
  updatedAt,
};

export const aiBotUpdateSchema = {
  type: "object",
  properties: {
    riskTolerance: baseNumberSchema("Risk tolerance (0-1)"),
    tradeFrequency: baseEnumSchema("Trade frequency", [
      "HIGH",
      "MEDIUM",
      "LOW",
    ]),
    avgOrderSize: baseNumberSchema("Average order size"),
    orderSizeVariance: baseNumberSchema("Order size variance"),
    preferredSpread: baseNumberSchema("Preferred spread"),
    maxDailyTrades: baseNumberSchema("Maximum daily trades"),
  },
};

// ============================================
// AI Market Maker Settings Schema
// ============================================

const maxConcurrentBots = baseNumberSchema("Maximum concurrent bots");
const globalPauseEnabled = baseBooleanSchema("Global pause enabled");
const maintenanceMode = baseBooleanSchema("Maintenance mode enabled");
const minLiquidity = baseNumberSchema("Minimum liquidity in quote currency");
const maxDailyLossPercent = baseNumberSchema("Maximum daily loss percentage");
const defaultVolatilityThreshold = baseNumberSchema(
  "Default volatility threshold"
);
const tradingEnabled = baseBooleanSchema("Global trading enabled");
const stopLossEnabled = baseBooleanSchema("Stop loss protection enabled");

export const aiMarketMakerSettingsSchema = {
  id,
  maxConcurrentBots,
  globalPauseEnabled,
  maintenanceMode,
  minLiquidity,
  maxDailyLossPercent,
  defaultVolatilityThreshold,
  tradingEnabled,
  stopLossEnabled,
  createdAt,
  updatedAt,
};

export const aiMarketMakerSettingsUpdateSchema = {
  type: "object",
  properties: {
    maxConcurrentBots,
    globalPauseEnabled,
    maintenanceMode,
    minLiquidity,
    maxDailyLossPercent,
    defaultVolatilityThreshold,
    tradingEnabled,
    stopLossEnabled,
  },
};

// ============================================
// AI Market Maker History Schema
// ============================================

const action = baseEnumSchema("Action type", [
  "TRADE",
  "PAUSE",
  "RESUME",
  "REBALANCE",
  "TARGET_CHANGE",
  "DEPOSIT",
  "WITHDRAW",
  "START",
  "STOP",
  "CONFIG_CHANGE",
  "EMERGENCY_STOP",
  "AUTO_PAUSE",
]);
const details = {
  type: "object",
  description: "Action details",
};
const priceAtAction = baseNumberSchema("Price at the time of action");
const poolValueAtAction = baseNumberSchema("Pool value at the time of action");

export const aiMarketMakerHistorySchema = {
  id,
  marketMakerId: baseStringSchema("ID of the market maker"),
  action,
  details,
  priceAtAction,
  poolValueAtAction,
  createdAt,
};

// ============================================
// Analytics Schemas
// ============================================

export const analyticsOverviewSchema = {
  type: "object",
  properties: {
    totalTVL: baseNumberSchema("Total value locked across all pools"),
    total24hVolume: baseNumberSchema("Total 24-hour trading volume"),
    totalPnL: baseNumberSchema("Total profit/loss"),
    activeMarkets: baseNumberSchema("Number of active markets"),
    totalBots: baseNumberSchema("Total number of bots"),
    activeBots: baseNumberSchema("Number of active bots"),
  },
};

export const marketPerformanceSchema = {
  type: "object",
  properties: {
    priceHistory: {
      type: "array",
      items: {
        type: "object",
        properties: {
          timestamp: baseDateTimeSchema("Timestamp"),
          price: baseNumberSchema("Price"),
          targetPrice: baseNumberSchema("Target price"),
        },
      },
    },
    volumeHistory: {
      type: "array",
      items: {
        type: "object",
        properties: {
          timestamp: baseDateTimeSchema("Timestamp"),
          volume: baseNumberSchema("Volume"),
        },
      },
    },
    targetAchievementRate: baseNumberSchema("Target achievement rate (0-100)"),
  },
};

export const pnlReportSchema = {
  type: "object",
  properties: {
    daily: baseNumberSchema("Daily P&L"),
    weekly: baseNumberSchema("Weekly P&L"),
    monthly: baseNumberSchema("Monthly P&L"),
    allTime: baseNumberSchema("All-time P&L"),
    history: {
      type: "array",
      items: {
        type: "object",
        properties: {
          date: baseDateTimeSchema("Date"),
          pnl: baseNumberSchema("P&L for the day"),
          cumulativePnl: baseNumberSchema("Cumulative P&L"),
        },
      },
    },
  },
};

// ============================================
// Response Schemas
// ============================================

export const aiMarketMakerStoreSchema = {
  description: "AI Market Maker created or updated successfully",
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: aiMarketMakerSchema,
      },
    },
  },
};

export const aiMarketMakerPoolStoreSchema = {
  description: "AI Market Maker Pool updated successfully",
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: aiMarketMakerPoolSchema,
      },
    },
  },
};

// ============================================
// Status Change Schema
// ============================================

export const statusChangeSchema = {
  type: "object",
  properties: {
    action: baseEnumSchema("Status action", ["START", "PAUSE", "STOP", "RESUME"]),
  },
  required: ["action"],
};

export const targetPriceUpdateSchema = {
  type: "object",
  properties: {
    targetPrice: baseNumberSchema("New target price"),
  },
  required: ["targetPrice"],
};
