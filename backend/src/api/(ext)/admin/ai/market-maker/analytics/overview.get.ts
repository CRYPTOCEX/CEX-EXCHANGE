import { models } from "@b/db";
import { analyticsOverviewSchema } from "../utils";
import {
  unauthorizedResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { Op } from "sequelize";

export const metadata: OperationObject = {
  summary: "Get global AI Market Maker analytics overview",
  operationId: "getAiMarketMakerAnalyticsOverview",
  tags: ["Admin", "AI Market Maker", "Analytics"],
  responses: {
    200: {
      description: "Global analytics overview",
      content: {
        "application/json": {
          schema: analyticsOverviewSchema,
        },
      },
    },
    401: unauthorizedResponse,
    500: serverErrorResponse,
  },
  requiresAuth: true,
  logModule: "ADMIN_AI",
  logTitle: "Get Market Maker Overview",
  permission: "view.ai.market-maker.analytics",
};

export default async (data: Handler) => {
  const { ctx } = data;
  // Get all market makers with pools and market info
  ctx?.step("Get Market Maker Overview");

  const marketMakers = await models.aiMarketMaker.findAll({
    include: [
      {
        model: models.aiMarketMakerPool,
        as: "pool",
      },
      {
        model: models.ecosystemMarket,
        as: "market",
      },
    ],
  });

  // Get all bots
  const bots = await models.aiBot.findAll();

  // Calculate totals
  let totalTVL = 0;
  let totalPnL = 0;
  let total24hVolume = 0;
  let activeMarkets = 0;

  for (const maker of marketMakers) {
    const pool = (maker as any).pool;
    if (pool) {
      totalTVL += Number(pool.totalValueLocked) || 0;
      totalPnL +=
        (Number(pool.unrealizedPnL) || 0) + (Number(pool.realizedPnL) || 0);
    }

    if (maker.status === "ACTIVE") {
      activeMarkets++;
      total24hVolume += Number(maker.currentDailyVolume) || 0;
    }
  }

  const totalBots = bots.length;
  const activeBots = bots.filter((b: any) => b.status === "ACTIVE").length;

  // Get recent activity count (last 24h)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentActivity = await models.aiMarketMakerHistory.count({
    where: {
      createdAt: { [Op.gte]: oneDayAgo },
      action: "TRADE",
    },
  });

  // Get markets by status
  const marketsByStatus = {
    active: marketMakers.filter((m: any) => m.status === "ACTIVE").length,
    paused: marketMakers.filter((m: any) => m.status === "PAUSED").length,
    stopped: marketMakers.filter((m: any) => m.status === "STOPPED").length,
  };

  // Build markets list for dashboard display
  const markets = marketMakers.map((maker: any) => ({
    id: maker.id,
    status: maker.status,
    targetPrice: maker.targetPrice || 0,
    currentDailyVolume: maker.currentDailyVolume || 0,
    updatedAt: maker.updatedAt,
    activeBots: bots.filter((b: any) => b.marketMakerId === maker.id && b.status === "ACTIVE").length,
    pool: maker.pool
      ? {
          totalValueLocked: maker.pool.totalValueLocked || 0,
          realizedPnL: maker.pool.realizedPnL || 0,
          unrealizedPnL: maker.pool.unrealizedPnL || 0,
        }
      : null,
    market: maker.market
      ? {
          id: maker.market.id,
          symbol: `${maker.market.currency}/${maker.market.pair}`,
          currency: maker.market.currency,
          pair: maker.market.pair,
        }
      : null,
  }));

  ctx?.success("Get Market Maker Overview retrieved successfully");
  return {
    totalTVL,
    total24hVolume,
    totalPnL,
    pnlPercent: totalTVL > 0 ? (totalPnL / totalTVL) * 100 : 0,
    activeMarkets,
    totalMarkets: marketMakers.length,
    totalBots,
    activeBots,
    recentTradeCount: recentActivity,
    marketsByStatus,
    markets,
    lastUpdated: new Date().toISOString(),
  };
};
