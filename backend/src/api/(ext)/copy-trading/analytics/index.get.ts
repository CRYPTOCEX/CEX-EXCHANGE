// Get user's copy trading analytics
import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { Op } from "sequelize";
import { getEcoPriceInUSD } from "@b/api/finance/currency/utils";

export const metadata = {
  summary: "Get My Copy Trading Analytics",
  description:
    "Retrieves comprehensive analytics for the user's copy trading activities.",
  operationId: "getMyCopyTradingAnalytics",
  tags: ["Copy Trading", "Analytics"],
  requiresAuth: true,
  logModule: "COPY",
  logTitle: "Get analytics",
  parameters: [
    {
      name: "period",
      in: "query",
      required: false,
      schema: { type: "string", enum: ["24h", "7d", "30d", "90d", "1y", "all"] },
      description: "Time period for analytics",
    },
  ],
  responses: {
    200: {
      description: "Analytics retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              summary: {
                type: "object",
                properties: {
                  totalAllocated: { type: "number" },
                  totalProfit: { type: "number" },
                  overallROI: { type: "number" },
                  activeSubscriptions: { type: "number" },
                  totalTrades: { type: "number" },
                  winRate: { type: "number" },
                },
              },
              byLeader: { type: "array" },
              profitChart: { type: "array" },
              tradeDistribution: { type: "object" },
            },
          },
        },
      },
    },
    401: { description: "Unauthorized" },
    500: { description: "Internal Server Error" },
  },
};

function getPeriodDate(period: string): Date | null {
  const now = new Date();
  switch (period) {
    case "24h":
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case "7d":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "30d":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case "90d":
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    case "1y":
      return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    case "all":
    default:
      return null;
  }
}

export default async (data: Handler) => {
  const { user, query, ctx } = data;

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const period = query.period || "30d";
  const periodDate = getPeriodDate(period);

  ctx?.step("Fetching user subscriptions");
  // Get user's subscriptions with allocations
  const subscriptions = await models.copyTradingFollower.findAll({
    where: { userId: user.id },
    include: [
      {
        model: models.copyTradingLeader,
        as: "leader",
        include: [
          {
            model: models.user,
            as: "user",
            attributes: ["id", "firstName", "lastName", "avatar"],
          },
        ],
      },
      {
        model: models.copyTradingFollowerAllocation,
        as: "allocations",
        where: { isActive: true },
        required: false,
      },
    ],
  });

  const followerIds = subscriptions.map((s: any) => s.id);
  const activeSubscriptions = subscriptions.filter((s: any) => s.status === "ACTIVE").length;

  // If user has no subscriptions, return empty analytics
  if (followerIds.length === 0) {
    ctx?.success("No subscriptions found");
    return {
      summary: {
        totalAllocated: 0,
        totalProfit: 0,
        overallROI: 0,
        activeSubscriptions: 0,
        totalTrades: 0,
        winRate: 0,
      },
      byLeader: [],
      profitChart: [],
      tradeDistribution: {
        bySymbol: [],
        bySide: {
          buy: { count: 0, profit: 0 },
          sell: { count: 0, profit: 0 },
        },
      },
    };
  }

  ctx?.step("Fetching trades");
  // Build trade where clause
  const tradeWhere: any = {
    followerId: { [Op.in]: followerIds },
    status: "CLOSED",
  };
  if (periodDate) {
    tradeWhere.createdAt = { [Op.gte]: periodDate };
  }

  // Get trades in period
  const trades = await models.copyTradingTrade.findAll({
    where: tradeWhere,
    include: [
      {
        model: models.copyTradingLeader,
        as: "leader",
        attributes: ["id", "displayName"],
      },
    ],
  });

  ctx?.step("Calculating analytics");
  // Calculate summary stats
  const totalTrades = trades.length;
  const winningTrades = trades.filter((t: any) => (t.profit || 0) > 0).length;
  const totalProfit = trades.reduce((sum: number, t: any) => sum + (t.profit || 0), 0);
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

  // Calculate total allocated in USDT from all active allocations
  // Convert both base and quote amounts to USDT using ECO prices
  let totalAllocated = 0;
  for (const sub of subscriptions as any[]) {
    if (!sub.allocations) continue;

    for (const alloc of sub.allocations) {
      try {
        // Extract base and quote currencies from symbol (e.g., "BTC/USDT" -> ["BTC", "USDT"])
        const [baseCurrency, quoteCurrency] = alloc.symbol.split("/");

        // Get base currency price in USDT
        const basePrice = await getEcoPriceInUSD(baseCurrency);
        const baseInUSDT = parseFloat(alloc.baseAmount || 0) * basePrice;

        // Quote currency is usually USDT, but still convert to handle other cases
        const quotePrice = await getEcoPriceInUSD(quoteCurrency);
        const quoteInUSDT = parseFloat(alloc.quoteAmount || 0) * quotePrice;

        totalAllocated += baseInUSDT + quoteInUSDT;
      } catch (error) {
        // If price fetch fails, log and continue (allocation won't be counted)
        console.error(`Failed to get price for ${alloc.symbol}:`, error);
      }
    }
  }

  // Calculate ROI: (total profit / total allocated) * 100
  const overallROI = totalAllocated > 0 ? (totalProfit / totalAllocated) * 100 : 0;

  // Group by leader
  const byLeaderMap: Record<string, any> = {};
  trades.forEach((trade: any) => {
    const leaderId = trade.leaderId;
    if (!byLeaderMap[leaderId]) {
      const sub = subscriptions.find((s: any) => s.leaderId === leaderId);
      byLeaderMap[leaderId] = {
        leader: trade.leader?.toJSON() || { id: leaderId },
        subscription: sub ? { id: sub.id, status: sub.status } : null,
        trades: 0,
        wins: 0,
        profit: 0,
        volume: 0,
      };
    }
    byLeaderMap[leaderId].trades++;
    if ((trade.profit || 0) > 0) byLeaderMap[leaderId].wins++;
    byLeaderMap[leaderId].profit += trade.profit || 0;
    byLeaderMap[leaderId].volume += trade.cost || 0;
  });

  const byLeader = Object.values(byLeaderMap).map((item: any) => ({
    ...item,
    winRate: item.trades > 0 ? (item.wins / item.trades) * 100 : 0,
    roi: 0, // ROI calculation needs allocation data
    profit: Math.round(item.profit * 100) / 100,
    volume: Math.round(item.volume * 100) / 100,
  }));

  // Build profit chart data (daily aggregation)
  const profitByDate: Record<string, number> = {};
  trades.forEach((trade: any) => {
    const date = new Date(trade.createdAt).toISOString().split("T")[0];
    profitByDate[date] = (profitByDate[date] || 0) + (trade.profit || 0);
  });

  // Sort and create cumulative chart
  const sortedDates = Object.keys(profitByDate).sort();
  let cumulative = 0;
  const profitChart = sortedDates.map((date) => {
    cumulative += profitByDate[date];
    return {
      date,
      dailyProfit: Math.round(profitByDate[date] * 100) / 100,
      cumulativeProfit: Math.round(cumulative * 100) / 100,
    };
  });

  // Trade distribution by symbol
  const symbolDistribution: Record<string, { count: number; profit: number }> = {};
  trades.forEach((trade: any) => {
    const symbol = trade.symbol || "UNKNOWN";
    if (!symbolDistribution[symbol]) {
      symbolDistribution[symbol] = { count: 0, profit: 0 };
    }
    symbolDistribution[symbol].count++;
    symbolDistribution[symbol].profit += trade.profit || 0;
  });

  // Trade distribution by side
  const buyTrades = trades.filter((t: any) => t.side === "BUY");
  const sellTrades = trades.filter((t: any) => t.side === "SELL");

  ctx?.success("Analytics retrieved successfully");
  return {
    summary: {
      totalAllocated: Math.round(totalAllocated * 100) / 100,
      totalProfit: Math.round(totalProfit * 100) / 100,
      overallROI: Math.round(overallROI * 100) / 100,
      activeSubscriptions,
      totalTrades,
      winRate: Math.round(winRate * 100) / 100,
    },
    byLeader,
    profitChart,
    tradeDistribution: {
      bySymbol: Object.entries(symbolDistribution).map(([symbol, data]) => ({
        symbol,
        ...data,
        profit: Math.round(data.profit * 100) / 100,
      })),
      bySide: {
        buy: { count: buyTrades.length, profit: buyTrades.reduce((s: number, t: any) => s + (t.profit || 0), 0) },
        sell: { count: sellTrades.length, profit: sellTrades.reduce((s: number, t: any) => s + (t.profit || 0), 0) },
      },
    },
  };
};
