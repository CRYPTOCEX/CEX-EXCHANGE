import { models } from "@b/db";
import { pnlReportSchema } from "../../utils";
import {
  unauthorizedResponse,
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { createError } from "@b/utils/error";
import { Op } from "sequelize";

export const metadata: OperationObject = {
  summary: "Get P&L report for an AI Market Maker",
  operationId: "getAiMarketMakerPnL",
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
  ],
  responses: {
    200: {
      description: "P&L report with daily, weekly, monthly, and all-time data",
      content: {
        "application/json": {
          schema: pnlReportSchema,
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("AI Market Maker"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  logModule: "ADMIN_AI",
  logTitle: "Get Market Maker PnL",
  permission: "view.ai.market-maker.analytics",
};

export default async (data: Handler) => {
  const { params, ctx } = data;

  ctx?.step("Get Market Maker PnL");

  const marketMaker = await models.aiMarketMaker.findByPk(params.marketId, {
    include: [
      { model: models.aiMarketMakerPool, as: "pool" },
      { model: models.ecosystemMarket, as: "market" },
    ],
  });

  if (!marketMaker) {
    throw createError(404, "AI Market Maker not found");
  }

  const pool = marketMaker.pool as any;
  if (!pool) {
    throw createError(404, "Pool not found for this market maker");
  }

  // Get time boundaries
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Get trade history grouped by day
  const trades = await models.aiMarketMakerHistory.findAll({
    where: {
      marketMakerId: params.marketId,
      action: "TRADE",
    },
    order: [["createdAt", "ASC"]],
  });

  // Calculate P&L by period
  let dailyPnL = 0;
  let weeklyPnL = 0;
  let monthlyPnL = 0;
  let allTimePnL = 0;

  // Group by day for history
  const pnlByDay: Record<string, number> = {};

  for (const trade of trades) {
    const tradeDate = new Date((trade as any).createdAt);
    const dayKey = tradeDate.toISOString().slice(0, 10);
    const tradePnL = (trade as any).details?.pnl || 0;

    // Add to daily aggregation
    pnlByDay[dayKey] = (pnlByDay[dayKey] || 0) + tradePnL;

    // Add to period totals
    allTimePnL += tradePnL;

    if (tradeDate >= oneDayAgo) {
      dailyPnL += tradePnL;
    }
    if (tradeDate >= oneWeekAgo) {
      weeklyPnL += tradePnL;
    }
    if (tradeDate >= oneMonthAgo) {
      monthlyPnL += tradePnL;
    }
  }

  // Build history array with cumulative P&L
  const sortedDays = Object.keys(pnlByDay).sort();
  let cumulativePnL = 0;
  const history = sortedDays.map((day) => {
    cumulativePnL += pnlByDay[day];
    return {
      date: day,
      pnl: pnlByDay[day],
      cumulativePnl: cumulativePnL,
    };
  });

  // Get current unrealized P&L from pool
  const unrealizedPnL = Number(pool.unrealizedPnL) || 0;
  const realizedPnL = Number(pool.realizedPnL) || 0;

  // Calculate initial investment for ROI
  const initialInvestment =
    Number(pool.initialBaseBalance) * Number(marketMaker.targetPrice) +
    Number(pool.initialQuoteBalance);

  const totalPnL = unrealizedPnL + realizedPnL;
  const roi = initialInvestment > 0 ? (totalPnL / initialInvestment) * 100 : 0;

  ctx?.success("Get Market Maker PnL retrieved successfully");
  return {
    marketId: params.marketId,
    market: (marketMaker as any).market,
    summary: {
      daily: dailyPnL,
      weekly: weeklyPnL,
      monthly: monthlyPnL,
      allTime: allTimePnL,
      unrealized: unrealizedPnL,
      realized: realizedPnL,
      total: totalPnL,
    },
    roi: {
      percent: roi.toFixed(2),
      initialInvestment,
      currentValue: Number(pool.totalValueLocked),
    },
    history,
    breakdown: {
      tradeCount: trades.length,
      winningTrades: trades.filter((t: any) => (t.details?.pnl || 0) > 0).length,
      losingTrades: trades.filter((t: any) => (t.details?.pnl || 0) < 0).length,
      avgWin:
        trades.filter((t: any) => (t.details?.pnl || 0) > 0).length > 0
          ? trades
              .filter((t: any) => (t.details?.pnl || 0) > 0)
              .reduce((sum: number, t: any) => sum + (t.details?.pnl || 0), 0) /
            trades.filter((t: any) => (t.details?.pnl || 0) > 0).length
          : 0,
      avgLoss:
        trades.filter((t: any) => (t.details?.pnl || 0) < 0).length > 0
          ? trades
              .filter((t: any) => (t.details?.pnl || 0) < 0)
              .reduce((sum: number, t: any) => sum + (t.details?.pnl || 0), 0) /
            trades.filter((t: any) => (t.details?.pnl || 0) < 0).length
          : 0,
    },
    lastUpdated: new Date().toISOString(),
  };
};
