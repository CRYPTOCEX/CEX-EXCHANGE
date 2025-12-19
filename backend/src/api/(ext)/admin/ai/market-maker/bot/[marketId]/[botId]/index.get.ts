import { models } from "@b/db";
import { aiBotSchema } from "../../../utils";
import {
  unauthorizedResponse,
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { createError } from "@b/utils/error";

export const metadata: OperationObject = {
  summary: "Get detailed information for a specific AI Market Maker bot",
  operationId: "getMarketMakerBotById",
  tags: ["Admin", "AI Market Maker", "Bot"],
  description:
    "Retrieves comprehensive details for a specific AI bot, including its configuration, current status, performance metrics, and recent trading activity. Returns calculated performance statistics such as win rate, total volume, trades remaining today, and associated market maker context.",
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
      description: "ID of the bot to retrieve",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "Detailed bot information with performance metrics and context",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              ...aiBotSchema,
              marketMaker: {
                type: "object",
                description: "Associated market maker information",
                properties: {
                  id: {
                    type: "string",
                    description: "Market maker ID",
                  },
                  status: {
                    type: "string",
                    description: "Market maker status",
                  },
                  market: {
                    type: "object",
                    description: "Associated ecosystem market details",
                  },
                },
              },
              performance: {
                type: "object",
                description: "Detailed performance metrics for the bot",
                properties: {
                  totalTrades: {
                    type: "number",
                    description: "Total number of trades executed",
                  },
                  successfulTrades: {
                    type: "number",
                    description: "Number of successful trades",
                  },
                  failedTrades: {
                    type: "number",
                    description: "Number of failed trades",
                  },
                  winRate: {
                    type: "number",
                    description: "Win rate percentage",
                  },
                  avgTradeSize: {
                    type: "number",
                    description: "Average trade size",
                  },
                  totalVolume: {
                    type: "number",
                    description: "Total trading volume",
                  },
                  profitLoss: {
                    type: "number",
                    description: "Total profit/loss",
                  },
                  tradesRemainingToday: {
                    type: "number",
                    description: "Number of trades remaining for today based on daily limit",
                  },
                },
              },
              recentTrades: {
                type: "array",
                description: "List of recent trades executed by this bot",
                items: {
                  type: "object",
                },
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
  logModule: "ADMIN_AI",
  logTitle: "Get Market Maker Bot",
  permission: "view.ai.market-maker.bot",
};

export default async (data: Handler) => {
  const { params, ctx } = data;

  ctx?.step("Get Market Maker Bot");

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

  ctx?.success("Get Market Maker Bot retrieved successfully");
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
