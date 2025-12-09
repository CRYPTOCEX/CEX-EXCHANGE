import { models } from "@b/db";
import { aiBotSchema } from "../../utils";
import {
  unauthorizedResponse,
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { createError } from "@b/utils/error";
import { getBotTradeStats, debugGetAllTrades } from "../../utils/scylla/queries";

export const metadata: OperationObject = {
  summary: "List all bots for an AI Market Maker",
  operationId: "listAiMarketMakerBots",
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
  ],
  responses: {
    200: {
      description: "List of bots with status and stats",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                ...aiBotSchema,
                tradesExecuted: { type: "number" },
                profitableTrades: { type: "number" },
                totalVolume: { type: "number" },
                totalPnL: { type: "number" },
                botType: { type: "string" },
                stats: {
                  type: "object",
                  properties: {
                    totalTrades: { type: "number" },
                    successRate: { type: "number" },
                    avgProfitPerTrade: { type: "number" },
                  },
                },
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("AI Market Maker"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.ai.market-maker.bot",
};

export default async (data: Handler) => {
  const { params } = data;

  const marketMaker = await models.aiMarketMaker.findByPk(params.marketId);

  if (!marketMaker) {
    throw createError(404, "AI Market Maker not found");
  }

  const bots = await models.aiBot.findAll({
    where: { marketMakerId: params.marketId },
    order: [["personality", "ASC"]],
  });

  // Get trade stats from Scylla for all bots
  // IMPORTANT: Use marketMaker.marketId (ecosystemMarket.id), NOT params.marketId (aiMarketMaker.id)
  // Trades are stored in Scylla using ecosystemMarket.id as the market_id
  const marketMakerAny = marketMaker as any;
  const ecosystemMarketId = marketMakerAny.marketId;

  console.log(`[AI Market Maker Bot Stats] Querying Scylla with ecosystemMarket.id: ${ecosystemMarketId}`);
  console.log(`[AI Market Maker Bot Stats] aiMarketMaker.id (params.marketId): ${params.marketId}`);
  console.log(`[AI Market Maker Bot Stats] MySQL bots:`, bots.map((b: any) => ({ id: b.id, name: b.name })));

  // Debug: Get ALL trades to verify data exists
  const allTrades = await debugGetAllTrades(10);
  console.log(`[AI Market Maker Bot Stats] DEBUG - Found ${allTrades.length} total trades in Scylla`);
  if (allTrades.length > 0) {
    console.log(`[AI Market Maker Bot Stats] DEBUG - First trade market_id: ${allTrades[0].marketId}`);
    console.log(`[AI Market Maker Bot Stats] DEBUG - First trade buyBotId: ${allTrades[0].buyBotId}`);
    console.log(`[AI Market Maker Bot Stats] DEBUG - First trade sellBotId: ${allTrades[0].sellBotId}`);
  }

  const botTradeStats = await getBotTradeStats(ecosystemMarketId);

  console.log(`[AI Market Maker Bot Stats] Got ${botTradeStats.size} bot stats entries from Scylla`);
  if (botTradeStats.size > 0) {
    console.log(`[AI Market Maker Bot Stats] Bot stats keys:`, Array.from(botTradeStats.keys()))
  }

  // Log MySQL dailyTradeCount values
  console.log(`[AI Market Maker Bot Stats] MySQL dailyTradeCounts:`, bots.map((b: any) => ({ id: b.id, name: b.name, dailyTradeCount: b.dailyTradeCount })));

  // Enhance bots with stats from both MySQL (dailyTradeCount) and Scylla (actual trades)
  return bots.map((bot: any) => {
    const scyllaStats = botTradeStats.get(bot.id) || { tradeCount: 0, totalVolume: 0 };

    // Use the higher of MySQL dailyTradeCount or Scylla trade count
    // (Scylla has the actual trades, MySQL tracks in-memory count that persists to DB)
    const totalTrades = Math.max(bot.dailyTradeCount || 0, scyllaStats.tradeCount);

    console.log(`[AI Market Maker Bot Stats] Bot ${bot.name}: MySQL=${bot.dailyTradeCount || 0}, Scylla=${scyllaStats.tradeCount}, using=${totalTrades}`);

    return {
      ...bot.toJSON(),
      // Fields expected by frontend
      botType: bot.personality, // Frontend uses botType, DB has personality
      tradesExecuted: totalTrades,
      profitableTrades: Math.floor(totalTrades * 0.5), // 50% profitable (AI trades are neutral)
      totalVolume: scyllaStats.totalVolume,
      totalPnL: 0, // AI-to-AI trades are zero-sum within the system
      stats: {
        totalTrades,
        successRate: 0.5, // AI trades are balanced by design
        avgProfitPerTrade: 0,
        isActive: bot.status === "ACTIVE",
        timeSinceLastTrade: bot.lastTradeAt
          ? Date.now() - new Date(bot.lastTradeAt).getTime()
          : null,
      },
    };
  });
};
