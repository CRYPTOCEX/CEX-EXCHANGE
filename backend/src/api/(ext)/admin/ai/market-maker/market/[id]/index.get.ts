import { models } from "@b/db";
import { aiMarketMakerSchema } from "../../utils";
import {
  unauthorizedResponse,
  serverErrorResponse,
  notFoundResponse,
} from "@b/utils/schema/errors";
import { createError } from "@b/utils/error";
import { getBotTradeStats } from "../../utils/scylla/queries";

export const metadata: OperationObject = {
  summary: "Get AI Market Maker market by ID",
  operationId: "getAiMarketMakerMarketById",
  tags: ["Admin", "AI Market Maker", "Market"],
  description:
    "Retrieves comprehensive details of a specific AI Market Maker market including pool balances, P&L tracking, bot configurations with performance statistics from both MySQL and ScyllaDB, ecosystem market details, and recent activity history (last 50 entries).",
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the AI Market Maker to retrieve",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "AI Market Maker details",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              ...aiMarketMakerSchema,
              pool: {
                type: "object",
                description: "Pool details",
              },
              market: {
                type: "object",
                description: "Ecosystem market details",
              },
              bots: {
                type: "array",
                description: "Bot configurations",
              },
              recentActivity: {
                type: "array",
                description: "Recent activity log",
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundResponse("AI Market Maker Market"),
    500: serverErrorResponse,
  },
  permission: "view.ai.market-maker.market",
  requiresAuth: true,
  logModule: "ADMIN_AI",
  logTitle: "Get Market Maker Market",
};

export default async (data: Handler) => {
  const { params, ctx } = data;

  ctx?.step("Get Market Maker Market");

  const marketMaker = await models.aiMarketMaker.findByPk(params.id, {
    include: [
      {
        model: models.aiMarketMakerPool,
        as: "pool",
      },
      {
        model: models.ecosystemMarket,
        as: "market",
      },
      {
        model: models.aiBot,
        as: "bots",
      },
    ],
  });

  if (!marketMaker) {
    throw createError(404, "AI Market Maker not found");
  }

  // Get recent activity (last 50 entries)
  const recentActivity = await models.aiMarketMakerHistory.findAll({
    where: { marketMakerId: params.id },
    order: [["createdAt", "DESC"]],
    limit: 50,
  });

  // Get bot trade stats from Scylla for enhanced bot data
  const marketMakerAny = marketMaker as any;
  const ecosystemMarketId = marketMakerAny.marketId;
  const botTradeStats = await getBotTradeStats(ecosystemMarketId);

  // Enhance bots with trade stats (combines MySQL dailyTradeCount and Scylla actual trades)
  const enhancedBots = (marketMakerAny.bots || []).map((bot: any) => {
    const scyllaStats = botTradeStats.get(bot.id) || { tradeCount: 0, totalVolume: 0 };
    const totalTrades = Math.max(bot.dailyTradeCount || 0, scyllaStats.tradeCount);
    // Use Scylla volume if MySQL volume is 0, otherwise prefer MySQL as it includes all trades
    const volume = Number(bot.totalVolume || 0) > 0 ? Number(bot.totalVolume) : scyllaStats.totalVolume;

    return {
      ...bot.toJSON(),
      botType: bot.personality, // Alias for frontend
      // Performance tracking (use actual database values)
      dailyTradeCount: totalTrades,
      realTradesExecuted: bot.realTradesExecuted || 0,
      profitableTrades: bot.profitableTrades || 0,
      totalVolume: volume,
      totalRealizedPnL: bot.totalRealizedPnL || 0,
      currentPosition: bot.currentPosition || 0,
      avgEntryPrice: bot.avgEntryPrice || 0,
      // Legacy fields for backwards compatibility
      tradesExecuted: totalTrades,
      totalPnL: bot.totalRealizedPnL || 0,
      stats: {
        totalTrades,
        successRate: bot.realTradesExecuted > 0
          ? (bot.profitableTrades || 0) / bot.realTradesExecuted
          : 0,
        avgProfitPerTrade: bot.realTradesExecuted > 0
          ? (bot.totalRealizedPnL || 0) / bot.realTradesExecuted
          : 0,
        isActive: bot.status === "ACTIVE",
        timeSinceLastTrade: bot.lastTradeAt
          ? Date.now() - new Date(bot.lastTradeAt).getTime()
          : null,
      },
    };
  });

  ctx?.success("Get Market Maker Market retrieved successfully");
  return {
    ...marketMaker.toJSON(),
    bots: enhancedBots,
    recentActivity,
  };
};
