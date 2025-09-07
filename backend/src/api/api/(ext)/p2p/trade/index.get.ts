import { models } from "@b/db";
import { unauthorizedResponse, serverErrorResponse } from "@b/utils/query";
import { Op } from "sequelize";

export const metadata = {
  summary: "Get Trade Dashboard Data",
  description: "Retrieves aggregated trade data for the authenticated user.",
  operationId: "getP2PTradeDashboardData",
  tags: ["P2P", "Trade"],
  responses: {
    200: { description: "Trade dashboard data retrieved successfully." },
    401: unauthorizedResponse,
    500: serverErrorResponse,
  },
  requiresAuth: true,
};

export default async (data: { user?: any }) => {
  const { user } = data;
  if (!user?.id) throw new Error("Unauthorized");
  try {
    // ------ 1. TRADE STATS ------
    const [
      totalTrades,
      completedTrades,
      disputedTrades,
      activeTrades,
      pendingTrades,
      trades,
      recentActivity,
    ] = await Promise.all([
      models.p2pTrade.count({
        where: { [Op.or]: [{ buyerId: user.id }, { sellerId: user.id }] },
      }),
      models.p2pTrade.count({
        where: {
          status: "COMPLETED",
          [Op.or]: [{ buyerId: user.id }, { sellerId: user.id }],
        },
      }),
      models.p2pTrade.findAll({
        where: {
          status: "DISPUTED",
          [Op.or]: [{ buyerId: user.id }, { sellerId: user.id }],
        },
        limit: 7,
        order: [["updatedAt", "DESC"]],
        raw: true,
      }),
      models.p2pTrade.findAll({
        where: {
          status: { [Op.in]: ["IN_PROGRESS", "PENDING", "PAYMENT_SENT"] },
          [Op.or]: [{ buyerId: user.id }, { sellerId: user.id }],
        },
        order: [["updatedAt", "DESC"]],
        raw: true,
      }),
      models.p2pTrade.findAll({
        where: {
          status: "PENDING",
          [Op.or]: [{ buyerId: user.id }, { sellerId: user.id }],
        },
        order: [["createdAt", "DESC"]],
        raw: true,
      }),
      // For calculating stats and volume
      models.p2pTrade.findAll({
        where: { [Op.or]: [{ buyerId: user.id }, { sellerId: user.id }] },
        raw: true,
      }),
      models.p2pActivityLog.findAll({
        where: { userId: user.id },
        order: [["createdAt", "DESC"]],
        limit: 5,
        raw: true,
      }),
    ]);

    // ------ 2. Calculations ------
    const totalVolume = trades.reduce((sum, t) => sum + (t.fiatAmount || 0), 0);

    const avgCompletionTime = (() => {
      const completed = trades.filter(
        (t) => t.status === "COMPLETED" && t.completedAt && t.createdAt
      );
      if (!completed.length) return null;
      const totalMs = completed.reduce(
        (sum, t) =>
          sum +
          (new Date(t.completedAt).getTime() - new Date(t.createdAt).getTime()),
        0
      );
      const avgMs = totalMs / completed.length;
      // Format to h:mm:ss or similar
      const hours = Math.floor(avgMs / 3600000);
      const minutes = Math.floor((avgMs % 3600000) / 60000);
      return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
    })();

    const successRate = totalTrades
      ? Math.round((completedTrades / totalTrades) * 100)
      : 0;

    // ------ 3. Helper for getting counterparty ------
    const getCounterparty = (trade) => {
      return trade.buyerId === user.id
        ? trade.sellerName || `User #${trade.sellerId}`
        : trade.buyerName || `User #${trade.buyerId}`;
    };

    // ------ 4. Format trades for frontend ------
    function formatTrade(trade) {
      return {
        id: trade.id,
        type: trade.buyerId === user.id ? "BUY" : "SELL",
        coin: trade.coin || trade.crypto || "N/A",
        amount: trade.amount,
        fiatAmount: trade.fiatAmount,
        price: trade.price,
        counterparty: getCounterparty(trade),
        status: trade.status,
        date: trade.updatedAt || trade.createdAt,
        paymentMethod: trade.paymentMethod || null,
      };
    }

    // ------ 5. Format activity log ------
    function formatActivity(act) {
      return {
        id: act.id,
        type: act.type || act.activityType,
        tradeId: act.tradeId,
        message: act.message || act.details,
        time: act.createdAt,
      };
    }

    // ------ 6. Prepare response ------
    return {
      tradeStats: {
        activeCount: activeTrades.length,
        completedCount: completedTrades,
        totalVolume,
        avgCompletionTime,
        successRate,
      },
      recentActivity: recentActivity.map(formatActivity),
      activeTrades: activeTrades.map(formatTrade),
      pendingTrades: pendingTrades.map(formatTrade),
      completedTrades: trades
        .filter((t) => t.status === "COMPLETED")
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )
        .slice(0, 7)
        .map(formatTrade),
      disputedTrades: disputedTrades.map(formatTrade),
    };
  } catch (err) {
    throw new Error("Internal Server Error: " + err.message);
  }
};
