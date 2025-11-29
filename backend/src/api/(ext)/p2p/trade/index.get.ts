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
        include: [
          {
            association: "paymentMethodDetails",
            attributes: ["id", "name", "icon"],
            required: false
          },
          {
            association: "offer",
            attributes: ["id", "priceCurrency"],
            required: false
          }
        ],
        limit: 7,
        order: [["updatedAt", "DESC"]],
      }),
      models.p2pTrade.findAll({
        where: {
          status: { [Op.in]: ["IN_PROGRESS", "PENDING", "PAYMENT_SENT"] },
          [Op.or]: [{ buyerId: user.id }, { sellerId: user.id }],
        },
        include: [
          {
            association: "paymentMethodDetails",
            attributes: ["id", "name", "icon"],
            required: false
          },
          {
            association: "offer",
            attributes: ["id", "priceCurrency"],
            required: false
          }
        ],
        order: [["updatedAt", "DESC"]],
      }),
      models.p2pTrade.findAll({
        where: {
          status: "PENDING",
          [Op.or]: [{ buyerId: user.id }, { sellerId: user.id }],
        },
        include: [
          {
            association: "paymentMethodDetails",
            attributes: ["id", "name", "icon"],
            required: false
          },
          {
            association: "offer",
            attributes: ["id", "priceCurrency"],
            required: false
          }
        ],
        order: [["createdAt", "DESC"]],
      }),
      // For calculating stats and volume
      models.p2pTrade.findAll({
        where: { [Op.or]: [{ buyerId: user.id }, { sellerId: user.id }] },
        include: [
          {
            association: "offer",
            attributes: ["id", "priceCurrency"],
            required: false
          }
        ],
      }),
      models.p2pActivityLog.findAll({
        where: {
          userId: user.id,
          relatedEntity: "TRADE" // Only fetch trade-related activities
        },
        order: [["createdAt", "DESC"]],
        limit: 5,
        raw: true,
      }),
    ]);

    // ------ 2. Calculations ------
    const totalVolume = trades.reduce((sum, t) => sum + (t.total || t.fiatAmount || 0), 0);

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
      const tradeData = trade.toJSON ? trade.toJSON() : trade;

      // Real-time expiration check
      let status = tradeData.status;
      if (status === 'PENDING' && tradeData.expiresAt) {
        const now = new Date();
        const expiresAt = new Date(tradeData.expiresAt);
        if (expiresAt < now) {
          status = 'EXPIRED';
        }
      }

      return {
        id: tradeData.id,
        type: tradeData.buyerId === user.id ? "BUY" : "SELL",
        coin: tradeData.currency || tradeData.coin || tradeData.crypto || "N/A",
        amount: tradeData.amount,
        fiatAmount: tradeData.total || tradeData.fiatAmount || 0,
        price: tradeData.price,
        counterparty: getCounterparty(tradeData),
        status: status,
        date: tradeData.updatedAt || tradeData.createdAt,
        paymentMethod: tradeData.paymentMethodDetails?.name || tradeData.paymentMethod || null,
        priceCurrency: tradeData.offer?.priceCurrency || "USD",
      };
    }

    // ------ 5. Format activity log ------
    function formatActivity(act) {
      let message = act.message || act.details;

      // Try to parse JSON message and format it
      if (typeof message === 'string') {
        try {
          const parsed = JSON.parse(message);

          // Format based on the data structure
          if (parsed.offerType && parsed.currency) {
            const action = parsed.statusChange ? `Status changed from ${parsed.statusChange}` : 'Offer updated';
            const updater = parsed.updatedBy || 'System';
            message = `${action} for ${parsed.offerType} ${parsed.currency} by ${updater}`;
          } else if (parsed.action) {
            message = parsed.action;
          } else if (parsed.description) {
            message = parsed.description;
          } else {
            // If we can't format it nicely, use a generic message
            message = 'Activity recorded';
          }
        } catch (e) {
          // If it's not JSON or parsing fails, use the original message
          // But if it starts with { or [, it's likely broken JSON - use generic message
          if (message.trim().startsWith('{') || message.trim().startsWith('[')) {
            message = 'Activity recorded';
          }
        }
      }

      return {
        id: act.id,
        type: act.type || act.activityType,
        tradeId: act.tradeId,
        message: message,
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
