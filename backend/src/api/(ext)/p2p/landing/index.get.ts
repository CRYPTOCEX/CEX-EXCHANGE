import { models } from "@b/db";
import { fn, col, Op, literal } from "sequelize";
import { safeParse } from "../utils/json-safe";

export const metadata: OperationObject = {
  summary: "Get P2P Landing Page Data",
  description:
    "Retrieves comprehensive data for the P2P landing page including stats, top cryptos, featured offers, top traders, and payment methods.",
  operationId: "getP2PLandingData",
  tags: ["P2P", "Landing"],
  requiresAuth: false,
  responses: {
    200: {
      description: "P2P landing data retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              stats: { type: "object" },
              topCryptos: { type: "array" },
              featuredOffers: { type: "object" },
              topTraders: { type: "array" },
              popularPaymentMethods: { type: "array" },
              recentActivity: { type: "array" },
              trustMetrics: { type: "object" },
            },
          },
        },
      },
    },
  },
};

export default async (data: Handler) => {
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const [
    tradeStats,
    topCryptos,
    buyOffers,
    sellOffers,
    topTraderReviews,
    popularPaymentMethods,
    recentTrades,
    disputeStats,
    activeOffersCount,
    uniqueCountries,
  ] = await Promise.all([
    // 1. Trade Statistics
    models.p2pTrade.findOne({
      attributes: [
        [fn("COUNT", col("id")), "totalTrades"],
        [
          fn(
            "SUM",
            literal("CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END")
          ),
          "completedTrades",
        ],
        [
          fn(
            "SUM",
            literal("CASE WHEN status = 'COMPLETED' THEN total ELSE 0 END")
          ),
          "totalVolume",
        ],
        [
          fn(
            "AVG",
            literal("CASE WHEN status = 'COMPLETED' THEN total ELSE NULL END")
          ),
          "avgTradeSize",
        ],
        [fn("COUNT", literal("DISTINCT buyerId")), "uniqueBuyers"],
        [fn("COUNT", literal("DISTINCT sellerId")), "uniqueSellers"],
        [
          fn(
            "SUM",
            literal(
              `CASE WHEN status = 'COMPLETED' AND createdAt >= '${currentMonthStart.toISOString()}' THEN total ELSE 0 END`
            )
          ),
          "currentVolume",
        ],
        [
          fn(
            "SUM",
            literal(
              `CASE WHEN status = 'COMPLETED' AND createdAt BETWEEN '${previousMonthStart.toISOString()}' AND '${previousMonthEnd.toISOString()}' THEN total ELSE 0 END`
            )
          ),
          "previousVolume",
        ],
      ],
      raw: true,
    }),

    // 2. Top Cryptocurrencies by volume
    models.p2pTrade.findAll({
      attributes: [
        "currency",
        [fn("SUM", col("total")), "totalVolume"],
        [fn("COUNT", col("id")), "tradeCount"],
        [fn("AVG", col("price")), "avgPrice"],
      ],
      where: { status: "COMPLETED" },
      group: ["currency"],
      order: [[literal("totalVolume"), "DESC"]],
      limit: 6,
      raw: true,
    }),

    // 3. Best Buy Offers (SELL type = user wants to sell, buyer buys)
    models.p2pOffer.findAll({
      where: { type: "SELL", status: "ACTIVE" },
      include: [
        {
          model: models.user,
          as: "user",
          attributes: ["id", "firstName", "lastName", "avatar"],
        },
        {
          model: models.p2pPaymentMethod,
          as: "paymentMethods",
          attributes: ["id", "name", "icon"],
          through: { attributes: [] },
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: 4,
    }),

    // 4. Best Sell Offers (BUY type = user wants to buy, seller sells)
    models.p2pOffer.findAll({
      where: { type: "BUY", status: "ACTIVE" },
      include: [
        {
          model: models.user,
          as: "user",
          attributes: ["id", "firstName", "lastName", "avatar"],
        },
        {
          model: models.p2pPaymentMethod,
          as: "paymentMethods",
          attributes: ["id", "name", "icon"],
          through: { attributes: [] },
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: 4,
    }),

    // 5. Top Traders by reviews
    models.p2pReview.findAll({
      attributes: [
        "revieweeId",
        [fn("COUNT", col("id")), "reviewCount"],
        [
          fn(
            "AVG",
            literal("(communicationRating + speedRating + trustRating) / 3")
          ),
          "avgRating",
        ],
        [fn("AVG", col("communicationRating")), "avgCommunicationRating"],
        [fn("AVG", col("speedRating")), "avgSpeedRating"],
        [fn("AVG", col("trustRating")), "avgTrustRating"],
      ],
      group: ["revieweeId"],
      having: literal("COUNT(id) >= 3"),
      order: [[literal("avgRating"), "DESC"]],
      limit: 6,
      raw: true,
    }),

    // 6. Popular Payment Methods
    models.p2pPaymentMethod.findAll({
      where: { isGlobal: true, available: true },
      attributes: ["id", "name", "icon", "processingTime"],
      order: [["popularityRank", "DESC"]],
      limit: 8,
    }),

    // 7. Recent Trades (for activity feed)
    models.p2pTrade.findAll({
      where: { status: "COMPLETED" },
      attributes: ["currency", "amount", "total", "createdAt"],
      order: [["createdAt", "DESC"]],
      limit: 10,
      raw: true,
    }),

    // 8. Dispute Statistics
    models.p2pDispute.findOne({
      attributes: [
        [fn("COUNT", col("id")), "totalDisputes"],
        [
          fn(
            "SUM",
            literal("CASE WHEN status = 'RESOLVED' THEN 1 ELSE 0 END")
          ),
          "resolvedDisputes",
        ],
      ],
      raw: true,
    }),

    // 9. Active offers count
    models.p2pOffer.count({ where: { status: "ACTIVE" } }),

    // 10. Unique countries from offers
    models.p2pOffer.findAll({
      attributes: [
        [
          fn(
            "DISTINCT",
            literal("JSON_EXTRACT(locationSettings, '$.country')")
          ),
          "country",
        ],
      ],
      where: {
        status: "ACTIVE",
        locationSettings: { [Op.ne]: null },
      },
      raw: true,
    }),
  ]);

  // Calculate stats
  const totalTrades = parseInt((tradeStats as any)?.totalTrades) || 0;
  const completedTrades = parseInt((tradeStats as any)?.completedTrades) || 0;
  const totalVolume = parseFloat((tradeStats as any)?.totalVolume) || 0;
  const avgTradeSize = parseFloat((tradeStats as any)?.avgTradeSize) || 0;
  const successRate =
    totalTrades > 0 ? Math.round((completedTrades / totalTrades) * 100) : 0;
  const uniqueBuyers = parseInt((tradeStats as any)?.uniqueBuyers) || 0;
  const uniqueSellers = parseInt((tradeStats as any)?.uniqueSellers) || 0;
  const uniqueTraders = uniqueBuyers + uniqueSellers;

  // Growth calculations
  const currentVolume = parseFloat((tradeStats as any)?.currentVolume) || 0;
  const previousVolume = parseFloat((tradeStats as any)?.previousVolume) || 0;
  const volumeGrowth =
    previousVolume > 0
      ? Math.round(((currentVolume - previousVolume) / previousVolume) * 100)
      : 0;

  // Count countries
  const countriesServed = (uniqueCountries as any[]).filter(
    (c) => c.country && c.country !== "null"
  ).length;

  // Get user details for top traders
  const traderIds = (topTraderReviews as any[]).map((t) => t.revieweeId);
  const traderUsers =
    traderIds.length > 0
      ? await models.user.findAll({
          where: { id: { [Op.in]: traderIds } },
          attributes: ["id", "firstName", "lastName", "avatar", "createdAt"],
        })
      : [];
  const traderUserMap: Record<string, any> = {};
  traderUsers.forEach((u: any) => {
    traderUserMap[u.id] = u;
  });

  // Get trade counts for top traders
  const traderTradeCounts =
    traderIds.length > 0
      ? await models.p2pTrade.findAll({
          attributes: [
            "sellerId",
            [fn("COUNT", col("id")), "tradeCount"],
            [fn("SUM", col("total")), "totalVolume"],
          ],
          where: {
            status: "COMPLETED",
            sellerId: { [Op.in]: traderIds },
          },
          group: ["sellerId"],
          raw: true,
        })
      : [];
  const tradeCountMap: Record<string, any> = {};
  (traderTradeCounts as any[]).forEach((t) => {
    tradeCountMap[t.sellerId] = t;
  });

  // Transform top traders
  const transformedTraders = (topTraderReviews as any[]).map((t) => {
    const user = traderUserMap[t.revieweeId];
    const trades = tradeCountMap[t.revieweeId] || {};
    return {
      id: t.revieweeId,
      firstName: user?.firstName || "Trader",
      lastName: user?.lastName || "",
      avatar: user?.avatar || null,
      completedTrades: parseInt(trades.tradeCount) || 0,
      totalVolume: parseFloat(trades.totalVolume) || 0,
      successRate: 100,
      avgRating: parseFloat(t.avgRating) || 0,
      avgCommunicationRating: parseFloat(t.avgCommunicationRating) || 0,
      avgSpeedRating: parseFloat(t.avgSpeedRating) || 0,
      avgTrustRating: parseFloat(t.avgTrustRating) || 0,
      memberSince: user?.createdAt,
    };
  });

  // Transform offers
  const transformOffer = (offer: any) => {
    // Safely parse JSON fields that may be stored as strings
    const priceConfig = safeParse<any>(offer.priceConfig, {});
    const amountConfig = safeParse<any>(offer.amountConfig, {});
    const tradeSettings = safeParse<any>(offer.tradeSettings, {});

    return {
      id: offer.id,
      currency: offer.currency,
      priceCurrency: offer.priceCurrency || priceConfig?.currency || "USD",
      price: priceConfig?.finalPrice || priceConfig?.fixedPrice || priceConfig?.value || 0,
      priceModel: priceConfig?.model || "FIXED",
      minAmount: amountConfig?.min || 0,
      maxAmount: amountConfig?.max || amountConfig?.total || 0,
      availableAmount: amountConfig?.availableBalance || amountConfig?.total || 0,
      termsOfTrade: tradeSettings?.termsOfTrade || "",
      trader: {
        id: offer.user?.id,
        firstName: offer.user?.firstName || "Trader",
        avatar: offer.user?.avatar,
      },
    };
  };

  // Transform recent activity
  const recentActivity = (recentTrades as any[]).map((trade) => {
    const timeAgo = getTimeAgo(new Date(trade.createdAt));
    return {
      type: "TRADE_COMPLETED",
      currency: trade.currency,
      amount: trade.amount,
      total: trade.total,
      timeAgo,
    };
  });

  // Dispute metrics
  const totalDisputes = parseInt((disputeStats as any)?.totalDisputes) || 0;
  const resolvedDisputes =
    parseInt((disputeStats as any)?.resolvedDisputes) || 0;
  const disputeResolutionRate =
    totalDisputes > 0
      ? Math.round((resolvedDisputes / totalDisputes) * 100)
      : 100;
  const disputeRate =
    completedTrades > 0
      ? Math.round((totalDisputes / completedTrades) * 100 * 10) / 10
      : 0;

  return {
    stats: {
      totalTrades,
      completedTrades,
      totalVolume,
      averageTradeSize: avgTradeSize,
      successRate,
      uniqueTraders,
      activeOffers: activeOffersCount,
      avgCompletionTime: 15,
      disputeResolutionRate,
      countriesServed: countriesServed || 50,
      volumeGrowth,
      tradersGrowth: 0,
      offersGrowth: 0,
    },
    topCryptos: (topCryptos as any[]).map((c) => ({
      currency: c.currency,
      totalVolume: parseFloat(c.totalVolume) || 0,
      tradeCount: parseInt(c.tradeCount) || 0,
      avgPrice: parseFloat(c.avgPrice) || 0,
    })),
    featuredOffers: {
      buy: buyOffers.map(transformOffer),
      sell: sellOffers.map(transformOffer),
    },
    topTraders: transformedTraders,
    popularPaymentMethods: popularPaymentMethods.map((pm: any) => ({
      id: pm.id,
      name: pm.name,
      icon: pm.icon,
      processingTime: pm.processingTime,
    })),
    recentActivity,
    trustMetrics: {
      avgEscrowReleaseTime: 15,
      disputeRate,
      disputeResolutionRate,
      satisfactionRate: 95,
    },
  };
};

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
