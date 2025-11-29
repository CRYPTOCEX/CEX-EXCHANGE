import { models, sequelize } from "@b/db";
import { unauthorizedResponse, serverErrorResponse } from "@b/utils/query";
import { Op } from "sequelize";
import {
  getFiatPriceInUSD,
  getSpotPriceInUSD,
  getEcoPriceInUSD,
} from "@b/api/finance/currency/utils";

export const metadata = {
  summary: "Get P2P Dashboard Data",
  description:
    "Retrieves dashboard data including notifications, portfolio, stats, trading activity, and transactions for the authenticated user.",
  operationId: "getP2PDashboardData",
  tags: ["P2P", "Dashboard"],
  responses: {
    200: { description: "Dashboard data retrieved successfully." },
    401: unauthorizedResponse,
    500: serverErrorResponse,
  },
  requiresAuth: true,
};

export default async (data: { user?: any }) => {
  const { user } = data;
  if (!user?.id) {
    throw new Error("Unauthorized");
  }
  
  try {
    // For example purposes, many of these fields are placeholders or basic aggregates.
    const notifications = 0; // Replace with your notification logic if available

    // Initialize default values
    let portfolioResult: any = null;
    let statsResult: any = null;
    let activity: any[] = [];
    let transactions: any[] = [];

    // Fetch user wallets for P2P trading first (needed for stats calculation)
    let wallets: any[] = [];
    try {
      wallets = await models.wallet.findAll({
        where: {
          userId: user.id,
          type: { [Op.in]: ["FIAT", "SPOT", "ECO"] },
        },
        attributes: [
          "id",
          "type",
          "currency",
          "balance",
          "inOrder",
          "status",
        ],
        raw: true,
      });
    } catch (walletsError) {
      console.error("Error fetching user wallets:", walletsError);
      wallets = [];
    }

    try {
      // Portfolio: aggregate total value of completed trades (user is buyer or seller)
      portfolioResult = await models.p2pTrade.findOne({
        attributes: [
          [
            sequelize.fn("SUM", sequelize.col("total")),
            "totalValue",
          ],
        ],
        where: {
          status: "COMPLETED",
          [Op.or]: [{ buyerId: user.id }, { sellerId: user.id }],
        },
        raw: true,
      });
    } catch (portfolioError) {
      console.error("Error fetching portfolio data:", portfolioError);
      portfolioResult = { totalValue: 0 };
    }

    try {
      // Dashboard stats: count total trades and calculate stats
      const tradeStats = await models.p2pTrade.findOne({
        attributes: [
          [sequelize.fn("COUNT", sequelize.col("id")), "tradeCount"],
          [
            sequelize.fn("COUNT", sequelize.literal("CASE WHEN status = 'COMPLETED' THEN 1 END")),
            "completedCount"
          ],
        ],
        where: {
          [Op.or]: [{ buyerId: user.id }, { sellerId: user.id }],
        },
        raw: true,
      });

      const totalTrades = parseInt(tradeStats?.tradeCount || "0");
      const completedTrades = parseInt(tradeStats?.completedCount || "0");
      const successRate = totalTrades > 0 ? ((completedTrades / totalTrades) * 100).toFixed(1) : "0";

      // Calculate total balance from wallets in USD
      let totalBalance = 0;
      for (const wallet of wallets) {
        const balance = parseFloat(wallet.balance || 0);
        const type = wallet.type || 'SPOT';

        // Get price for USD conversion
        let price = 0;
        try {
          if (type === 'FIAT') {
            price = await getFiatPriceInUSD(wallet.currency);
          } else if (type === 'SPOT' || type === 'FUTURES') {
            price = await getSpotPriceInUSD(wallet.currency);
          } else if (type === 'ECO') {
            price = await getEcoPriceInUSD(wallet.currency);
          }
        } catch (error) {
          console.warn(`Failed to fetch price for ${wallet.currency} (${type}): ${error.message}`);
          price = 0;
        }

        totalBalance += balance * price;
      }

      // Format stats as array for frontend
      statsResult = [
        {
          title: "Total Balance",
          value: `$${totalBalance.toFixed(2)}`,
          change: "+0.0% from last month",
          changeType: "neutral",
          icon: "wallet",
          gradient: "from-blue-500 to-blue-700",
        },
        {
          title: "Trading Volume",
          value: `$${(portfolioResult?.totalValue || 0)}`,
          change: "+0.0% from last month",
          changeType: "neutral",
          icon: "trending-up",
          gradient: "from-green-500 to-green-700",
        },
        {
          title: "Active Trades",
          value: totalTrades.toString(),
          change: `${completedTrades} completed`,
          changeType: "neutral",
          icon: "bar-chart",
          gradient: "from-violet-500 to-violet-700",
        },
        {
          title: "Success Rate",
          value: `${successRate}%`,
          change: `Based on ${totalTrades} trades`,
          changeType: "neutral",
          icon: "shield-check",
          gradient: "from-amber-500 to-amber-700",
        },
      ];
    } catch (statsError) {
      console.error("Error fetching stats data:", statsError);
      statsResult = [];
    }

    try {
      // Trading Activity: recent activity logs (only trade-related)
      activity = await models.p2pActivityLog.findAll({
        where: {
          userId: user.id,
          relatedEntity: "TRADE" // Only fetch trade-related activities, not offer activities
        },
        order: [["createdAt", "DESC"]],
        limit: 10,
        raw: true,
      });
    } catch (activityError) {
      console.error("Error fetching activity data:", activityError);
      activity = [];
    }

    try {
      // Transactions: recent trades for the user
      transactions = await models.p2pTrade.findAll({
        where: {
          [Op.or]: [{ buyerId: user.id }, { sellerId: user.id }],
        },
        order: [["createdAt", "DESC"]],
        limit: 10,
        raw: true,
      });
    } catch (transactionsError) {
      console.error("Error fetching transactions data:", transactionsError);
      transactions = [];
    }

    return {
      notifications,
      portfolio: portfolioResult || { totalValue: 0 },
      stats: statsResult || [],
      tradingActivity: activity || [],
      transactions: transactions || [],
      wallets: wallets.map((wallet: any) => ({
        id: wallet.id,
        type: wallet.type,
        currency: wallet.currency,
        balance: parseFloat(wallet.balance || 0),
        inOrder: parseFloat(wallet.inOrder || 0),
        availableBalance: parseFloat(wallet.balance || 0) - parseFloat(wallet.inOrder || 0),
        status: wallet.status,
      })),
    };
  } catch (err: any) {
    throw new Error("Internal Server Error: " + err.message);
  }
};
