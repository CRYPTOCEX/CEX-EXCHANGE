import { models, sequelize } from "@b/db";
import {
  aiMarketMakerCreateSchema,
  aiMarketMakerStoreSchema,
} from "../utils";
import {
  unauthorizedResponse,
  serverErrorResponse,
} from "@b/utils/schema/errors";
import { createError } from "@b/utils/error";

export const metadata: OperationObject = {
  summary: "Create AI Market Maker market",
  operationId: "createAiMarketMakerMarket",
  tags: ["Admin", "AI Market Maker", "Market"],
  description:
    "Creates a new AI Market Maker for an ecosystem market with specified configuration parameters. Automatically generates a liquidity pool, default bots based on aggression level, and initializes all necessary tracking structures. The market maker starts in STOPPED status and requires manual activation after initial funding.",
  logModule: "ADMIN_MM",
  logTitle: "Create AI Market Maker",
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: aiMarketMakerCreateSchema,
      },
    },
  },
  responses: {
    201: aiMarketMakerStoreSchema,
    401: unauthorizedResponse,
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "create.ai.market-maker.market",
};

export default async (data: Handler) => {
  const { body, ctx } = data;
  const {
    marketId,
    targetPrice,
    priceRangeLow,
    priceRangeHigh,
    aggressionLevel = "MODERATE",
    maxDailyVolume = 1000000,
    volatilityThreshold = 5,
    pauseOnHighVolatility = true,
    realLiquidityPercent = 20,
  } = body;

  ctx?.step("Validate ecosystem market exists");
  // Validate ecosystem market exists
  const ecosystemMarket = await models.ecosystemMarket.findByPk(marketId);
  if (!ecosystemMarket) {
    throw createError(404, "Ecosystem market not found");
  }

  // Check if AI market maker already exists for this market
  const existingMaker = await models.aiMarketMaker.findOne({
    where: { marketId },
  });
  if (existingMaker) {
    throw createError(400, "AI Market Maker already exists for this market");
  }

  ctx?.step("Validate price parameters");
  // Validate price values are positive
  if (targetPrice <= 0) {
    throw createError(400, "Target price must be greater than 0");
  }
  if (priceRangeLow <= 0) {
    throw createError(400, "Price range low must be greater than 0");
  }
  if (priceRangeHigh <= 0) {
    throw createError(400, "Price range high must be greater than 0");
  }

  // Validate price range
  if (priceRangeLow >= priceRangeHigh) {
    throw createError(400, "Price range low must be less than price range high");
  }

  if (targetPrice < priceRangeLow || targetPrice > priceRangeHigh) {
    throw createError(400, "Target price must be within the price range");
  }

  // Validate price range is not too wide (max 50% deviation from target)
  const maxDeviation = 0.5; // 50%
  const lowDeviation = (targetPrice - priceRangeLow) / targetPrice;
  const highDeviation = (priceRangeHigh - targetPrice) / targetPrice;

  if (lowDeviation > maxDeviation || highDeviation > maxDeviation) {
    throw createError(
      400,
      `Price range deviation from target must be within ${maxDeviation * 100}%. ` +
      `Current: low=${(lowDeviation * 100).toFixed(1)}%, high=${(highDeviation * 100).toFixed(1)}%`
    );
  }

  // Validate price values are not unreasonably small (prevents precision issues)
  const minPriceValue = 1e-8; // 8 decimal places minimum
  if (priceRangeLow < minPriceValue || priceRangeHigh < minPriceValue || targetPrice < minPriceValue) {
    throw createError(400, "Price values must be at least 0.00000001 (8 decimal places)");
  }

  // Validate real liquidity percent
  if (realLiquidityPercent < 0 || realLiquidityPercent > 100) {
    throw createError(400, "Real liquidity percent must be between 0 and 100");
  }

  ctx?.step("Initialize database transaction");
  const transaction = await sequelize.transaction();

  try {
    ctx?.step("Create AI Market Maker");
    // Create AI Market Maker
    const marketMaker = await models.aiMarketMaker.create(
      {
        marketId,
        status: "STOPPED",
        targetPrice,
        priceRangeLow,
        priceRangeHigh,
        aggressionLevel,
        maxDailyVolume,
        currentDailyVolume: 0,
        volatilityThreshold,
        pauseOnHighVolatility,
        realLiquidityPercent,
      },
      { transaction }
    );

    ctx?.step("Create market maker pool");
    // Create associated pool with zero balances
    await models.aiMarketMakerPool.create(
      {
        marketMakerId: marketMaker.id,
        baseCurrencyBalance: 0,
        quoteCurrencyBalance: 0,
        initialBaseBalance: 0,
        initialQuoteBalance: 0,
        totalValueLocked: 0,
        unrealizedPnL: 0,
        realizedPnL: 0,
      },
      { transaction }
    );

    ctx?.step("Create default bots");
    // Create default bots based on aggression level
    const botConfigs = getDefaultBotConfigs(aggressionLevel);
    for (const config of botConfigs) {
      await models.aiBot.create(
        {
          marketMakerId: marketMaker.id,
          ...config,
          status: "PAUSED",
          dailyTradeCount: 0,
        },
        { transaction }
      );
    }

    ctx?.step("Create history record");
    // Log creation
    await models.aiMarketMakerHistory.create(
      {
        marketMakerId: marketMaker.id,
        action: "START",
        details: {
          targetPrice,
          priceRangeLow,
          priceRangeHigh,
          aggressionLevel,
          realLiquidityPercent,
        },
        priceAtAction: targetPrice,
        poolValueAtAction: 0,
      },
      { transaction }
    );

    ctx?.step("Commit transaction");
    await transaction.commit();

    ctx?.success("AI Market Maker created successfully");
    // Return with pool and market
    return models.aiMarketMaker.findByPk(marketMaker.id, {
      include: [
        { model: models.aiMarketMakerPool, as: "pool" },
        { model: models.ecosystemMarket, as: "market" },
        { model: models.aiBot, as: "bots" },
      ],
    });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

/**
 * Get default bot configurations based on aggression level
 */
function getDefaultBotConfigs(
  aggressionLevel: "CONSERVATIVE" | "MODERATE" | "AGGRESSIVE"
): Array<{
  name: string;
  personality: string;
  riskTolerance: number;
  tradeFrequency: string;
  avgOrderSize: number;
  orderSizeVariance: number;
  preferredSpread: number;
  maxDailyTrades: number;
}> {
  const baseConfigs = [
    {
      name: "Scalper Alpha",
      personality: "SCALPER",
      tradeFrequency: "HIGH",
      preferredSpread: 0.001,
    },
    {
      name: "Scalper Beta",
      personality: "SCALPER",
      tradeFrequency: "HIGH",
      preferredSpread: 0.0015,
    },
    {
      name: "Swing Trader",
      personality: "SWING",
      tradeFrequency: "MEDIUM",
      preferredSpread: 0.003,
    },
    {
      name: "Accumulator",
      personality: "ACCUMULATOR",
      tradeFrequency: "LOW",
      preferredSpread: 0.002,
    },
    {
      name: "Distributor",
      personality: "DISTRIBUTOR",
      tradeFrequency: "LOW",
      preferredSpread: 0.002,
    },
    {
      name: "Market Maker",
      personality: "MARKET_MAKER",
      tradeFrequency: "HIGH",
      preferredSpread: 0.001,
    },
  ];

  const aggressionMultipliers = {
    CONSERVATIVE: { risk: 0.3, size: 0.5, trades: 50 },
    MODERATE: { risk: 0.5, size: 1.0, trades: 100 },
    AGGRESSIVE: { risk: 0.8, size: 2.0, trades: 200 },
  };

  const multiplier = aggressionMultipliers[aggressionLevel];

  return baseConfigs.map((config) => ({
    ...config,
    riskTolerance: multiplier.risk,
    avgOrderSize: 100 * multiplier.size,
    orderSizeVariance: 0.2,
    maxDailyTrades: multiplier.trades,
  }));
}
