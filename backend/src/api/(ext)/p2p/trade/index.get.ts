import { models } from "@b/db";
import { unauthorizedResponse, serverErrorResponse } from "@b/utils/query";
import { Op } from "sequelize";

// Map timeline events to activity types
function mapEventToActivityType(event: string): string {
  const eventUpper = (event || '').toUpperCase().replace(/\s+/g, '_');
  if (eventUpper.includes('INITIATED') || eventUpper.includes('CREATED') || eventUpper.includes('STARTED')) {
    return 'TRADE_CREATED';
  }
  if (eventUpper.includes('PAYMENT') && eventUpper.includes('SENT')) {
    return 'PAYMENT_CONFIRMED';
  }
  if (eventUpper.includes('COMPLETED') || eventUpper.includes('RELEASED')) {
    return 'TRADE_COMPLETED';
  }
  if (eventUpper.includes('DISPUTED')) {
    return 'TRADE_DISPUTED';
  }
  if (eventUpper.includes('CANCELLED')) {
    return 'TRADE_CANCELLED';
  }
  return 'TRADE_UPDATE';
}

// Format activity message
function formatActivityMessage(event: string, currency: string, amount: number): string {
  const eventUpper = (event || '').toUpperCase().replace(/\s+/g, '_');
  const amountStr = `${amount || 0} ${currency || 'N/A'}`;

  if (eventUpper.includes('INITIATED') || eventUpper.includes('CREATED') || eventUpper.includes('STARTED')) {
    return `Trade initiated for ${amountStr}`;
  }
  if (eventUpper.includes('PAYMENT') && eventUpper.includes('SENT')) {
    return `Payment confirmed for ${amountStr}`;
  }
  if (eventUpper.includes('COMPLETED')) {
    return `Trade completed for ${amountStr}`;
  }
  if (eventUpper.includes('RELEASED')) {
    return `Funds released for ${amountStr}`;
  }
  if (eventUpper.includes('DISPUTED')) {
    return `Trade disputed for ${amountStr}`;
  }
  if (eventUpper.includes('CANCELLED')) {
    return `Trade cancelled for ${amountStr}`;
  }
  // Format event name nicely as fallback
  const formattedEvent = event.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
  return `${formattedEvent} - ${amountStr}`;
}

export const metadata = {
  summary: "Get Trade Dashboard Data",
  description: "Retrieves aggregated trade data for the authenticated user.",
  operationId: "getP2PTradeDashboardData",
  tags: ["P2P", "Trade"],
  logModule: "P2P",
  logTitle: "Get trade dashboard",
  responses: {
    200: { description: "Trade dashboard data retrieved successfully." },
    401: unauthorizedResponse,
    500: serverErrorResponse,
  },
  requiresAuth: true,
};

export default async (data: { user?: any; ctx?: any }) => {
  const { user, ctx } = data;
  if (!user?.id) throw new Error("Unauthorized");

  ctx?.step("Fetching trade statistics and activity");
  try {
    // ------ 1. TRADE STATS ------
    const [
      totalTrades,
      completedTrades,
      disputedTrades,
      activeTrades,
      pendingTrades,
      trades,
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
          status: {
            [Op.in]: ["IN_PROGRESS", "PENDING", "PAYMENT_SENT", "ESCROW_RELEASED"],
          },
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
        order: [["updatedAt", "DESC"]],
      }),
    ]);

    // ------ Generate recent activity from trade timelines ------
    const recentActivity: any[] = [];

    // Get recent trades for activity extraction
    const recentTrades = trades.slice(0, 10);

    for (const trade of recentTrades) {
      const tradeData = trade.toJSON ? trade.toJSON() : trade;
      let timeline = tradeData.timeline || [];

      // Parse timeline if it's a string
      if (typeof timeline === 'string') {
        try {
          timeline = JSON.parse(timeline);
        } catch (e) {
          timeline = [];
        }
      }

      if (!Array.isArray(timeline)) timeline = [];

      // Extract recent events from timeline (skip MESSAGE events)
      for (const event of timeline) {
        if (event.event === 'MESSAGE') continue;

        const eventTime = event.timestamp || event.createdAt || event.time;
        if (!eventTime) continue;

        recentActivity.push({
          id: `${tradeData.id}-${eventTime}`,
          tradeId: tradeData.id,
          type: mapEventToActivityType(event.event),
          message: formatActivityMessage(event.event, tradeData.currency, tradeData.amount),
          time: eventTime,
          createdAt: new Date(eventTime),
        });
      }
    }

    // Sort by time and take most recent 5
    recentActivity.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const limitedActivity = recentActivity.slice(0, 5);

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

    // ------ 5. Get available currencies from trades ------
    const availableCurrencies = [...new Set(
      trades
        .map((t) => t.currency)
        .filter((c) => c)
    )].sort();

    // ------ 6. Prepare response ------
    ctx?.success(`Trade dashboard retrieved (${totalTrades} total trades, ${completedTrades} completed)`);
    return {
      tradeStats: {
        activeCount: activeTrades.length,
        completedCount: completedTrades,
        totalVolume,
        avgCompletionTime,
        successRate,
      },
      recentActivity: limitedActivity,
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
      availableCurrencies,
    };
  } catch (err) {
    ctx?.fail(err.message || "Failed to retrieve trade dashboard");
    throw new Error("Internal Server Error: " + err.message);
  }
};
