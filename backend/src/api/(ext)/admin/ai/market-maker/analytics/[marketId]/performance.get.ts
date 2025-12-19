import { models } from "@b/db";
import { marketPerformanceSchema } from "../../utils";
import {
  unauthorizedResponse,
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { createError } from "@b/utils/error";
import { Op } from "sequelize";

export const metadata: OperationObject = {
  summary: "Get market performance analytics",
  operationId: "getAiMarketMakerPerformance",
  tags: ["Admin", "AI Market Maker", "Analytics"],
  parameters: [
    {
      index: 0,
      name: "marketId",
      in: "path",
      required: true,
      description: "ID of the AI Market Maker",
      schema: { type: "string" },
    },
    {
      name: "period",
      in: "query",
      required: false,
      description: "Time period (1h, 24h, 7d, 30d)",
      schema: { type: "string", default: "24h" },
    },
  ],
  responses: {
    200: {
      description: "Market performance data",
      content: {
        "application/json": {
          schema: marketPerformanceSchema,
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("AI Market Maker"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  logModule: "ADMIN_AI",
  logTitle: "Get Market Maker Performance",
  permission: "view.ai.market-maker.analytics",
};

export default async (data: Handler) => {
  const { params, query, ctx } = data;
  const period = query.period || "24h";

  ctx?.step("Get Market Maker Performance");

  const marketMaker = await models.aiMarketMaker.findByPk(params.marketId, {
    include: [
      { model: models.aiMarketMakerPool, as: "pool" },
      { model: models.ecosystemMarket, as: "market" },
    ],
  });

  if (!marketMaker) {
    throw createError(404, "AI Market Maker not found");
  }

  // Calculate time range
  const periodMs: Record<string, number> = {
    "1h": 60 * 60 * 1000,
    "24h": 24 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
    "30d": 30 * 24 * 60 * 60 * 1000,
  };

  const startTime = new Date(Date.now() - (periodMs[period] || periodMs["24h"]));

  // Get history for the period
  const history = await models.aiMarketMakerHistory.findAll({
    where: {
      marketMakerId: params.marketId,
      createdAt: { [Op.gte]: startTime },
    },
    order: [["createdAt", "ASC"]],
  });

  // Build price history from TARGET_CHANGE events and TRADE events
  // Filter out START events with price 0 as they don't have meaningful price data
  const priceHistory = history
    .filter((h: any) => {
      // Include TARGET_CHANGE events
      if (h.action === "TARGET_CHANGE") return true;
      // Include TRADE events (they have actual price data)
      if (h.action === "TRADE" && Number(h.priceAtAction) > 0) return true;
      // Include START events only if they have a valid price
      if (h.action === "START" && Number(h.priceAtAction) > 0) return true;
      return false;
    })
    .map((h: any) => ({
      timestamp: h.createdAt,
      price: Number(h.priceAtAction),
      targetPrice: Number(h.priceAtAction),
    }));

  // Add current state
  priceHistory.push({
    timestamp: new Date(),
    price: Number(marketMaker.targetPrice),
    targetPrice: Number(marketMaker.targetPrice),
  });

  // Build volume history from TRADE events
  const tradeHistory = history.filter((h: any) => h.action === "TRADE");

  // Group trades by hour
  // Note: TradeExecutor stores 'amount' in details, not 'volume'
  const volumeByHour: Record<string, number> = {};
  for (const trade of tradeHistory) {
    const hour = new Date((trade as any).createdAt).toISOString().slice(0, 13);
    const tradeAmount = (trade as any).details?.amount || (trade as any).details?.volume || 0;
    volumeByHour[hour] = (volumeByHour[hour] || 0) + tradeAmount;
  }

  const volumeHistory = Object.entries(volumeByHour).map(([hour, volume]) => ({
    timestamp: new Date(hour + ":00:00Z"),
    volume,
  }));

  // Calculate target achievement rate
  // (How often actual price is within X% of target - placeholder logic)
  const targetAchievementRate = 85; // Placeholder

  // Calculate additional metrics
  const pool = marketMaker.pool as any;
  const totalTrades = tradeHistory.length;
  // Note: TradeExecutor stores 'amount' in details, not 'size'
  const avgTradeSize =
    totalTrades > 0
      ? tradeHistory.reduce((sum: number, t: any) => sum + (t.details?.amount || t.details?.size || 0), 0) /
        totalTrades
      : 0;

  ctx?.success("Get Market Maker Performance retrieved successfully");
  return {
    marketId: params.marketId,
    period,
    market: (marketMaker as any).market,
    currentPrice: marketMaker.targetPrice,
    priceHistory,
    volumeHistory,
    targetAchievementRate,
    metrics: {
      totalTrades,
      avgTradeSize,
      totalVolume: Number(marketMaker.currentDailyVolume),
      tvl: pool?.totalValueLocked || 0,
      unrealizedPnL: pool?.unrealizedPnL || 0,
      realizedPnL: pool?.realizedPnL || 0,
    },
    status: marketMaker.status,
  };
};
