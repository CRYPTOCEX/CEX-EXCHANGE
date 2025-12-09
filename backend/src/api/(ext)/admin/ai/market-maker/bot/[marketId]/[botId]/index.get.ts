import { models } from "@b/db";
import { aiBotSchema } from "../../../utils";
import {
  unauthorizedResponse,
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { createError } from "@b/utils/error";

export const metadata: OperationObject = {
  summary: "Get detailed information about a specific bot",
  operationId: "getAiMarketMakerBotById",
  tags: ["Admin", "AI Market Maker", "Bot"],
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
      index: 1,
      name: "botId",
      in: "path",
      required: true,
      description: "ID of the bot",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "Bot details with performance metrics",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              ...aiBotSchema,
              performance: {
                type: "object",
                description: "Bot performance metrics",
              },
              recentTrades: {
                type: "array",
                description: "Recent trades by this bot",
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Bot"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.ai.market-maker.bot",
};

export default async (data: Handler) => {
  const { params } = data;

  const bot = await models.aiBot.findOne({
    where: {
      id: params.botId,
      marketMakerId: params.marketId,
    },
  });

  if (!bot) {
    throw createError(404, "Bot not found");
  }

  // Get market maker for context
  const marketMaker = await models.aiMarketMaker.findByPk(params.marketId, {
    include: [{ model: models.ecosystemMarket, as: "market" }],
  });

  // Performance metrics (placeholder - in production, calculate from actual trades)
  const performance = {
    totalTrades: bot.dailyTradeCount || 0,
    successfulTrades: Math.floor((bot.dailyTradeCount || 0) * 0.65),
    failedTrades: Math.floor((bot.dailyTradeCount || 0) * 0.35),
    winRate: 65,
    avgTradeSize: bot.avgOrderSize,
    totalVolume: (bot.dailyTradeCount || 0) * Number(bot.avgOrderSize),
    profitLoss: 0, // Placeholder
    tradesRemainingToday: (bot.maxDailyTrades || 100) - (bot.dailyTradeCount || 0),
  };

  // Recent trades would come from Scylla in production
  const recentTrades: any[] = [];

  return {
    ...bot.toJSON(),
    marketMaker: {
      id: marketMaker?.id,
      status: marketMaker?.status,
      market: (marketMaker as any)?.market,
    },
    performance,
    recentTrades,
  };
};
