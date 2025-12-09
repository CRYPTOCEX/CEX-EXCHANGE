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
        try {
          const balance = parseFloat(wallet.balance || "0") || 0;
          const type = wallet.type || 'SPOT';

          // Skip if balance is zero
          if (balance <= 0) continue;

          // Get price for USD conversion
          let price = 1; // Default to 1 for USD or unknown
          try {
            if (wallet.currency === 'USD') {
              price = 1;
            } else if (type === 'FIAT') {
              price = await getFiatPriceInUSD(wallet.currency) || 1;
            } else if (type === 'SPOT' || type === 'FUTURES') {
              price = await getSpotPriceInUSD(wallet.currency) || 0;
            } else if (type === 'ECO') {
              price = await getEcoPriceInUSD(wallet.currency) || 0;
            }
          } catch (priceError: any) {
            console.warn(`Failed to fetch price for ${wallet.currency} (${type}): ${priceError.message || priceError}`);
            price = wallet.currency === 'USD' ? 1 : 0;
          }

          totalBalance += balance * price;
        } catch (walletCalcError: any) {
          console.warn(`Error calculating wallet balance: ${walletCalcError.message || walletCalcError}`);
        }
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
      // Trading Activity: recent trades for the user (not activity logs which may be empty)
      const trades = await models.p2pTrade.findAll({
        where: {
          [Op.or]: [{ buyerId: user.id }, { sellerId: user.id }],
        },
        include: [
          {
            model: models.p2pOffer,
            as: "offer",
            attributes: ["currency"],
          },
          {
            model: models.p2pPaymentMethod,
            as: "paymentMethodDetails",
            attributes: ["name"],
          },
          {
            model: models.user,
            as: "buyer",
            attributes: ["id", "firstName", "lastName", "avatar"],
          },
          {
            model: models.user,
            as: "seller",
            attributes: ["id", "firstName", "lastName", "avatar"],
          },
        ],
        order: [["updatedAt", "DESC"]],
        limit: 10,
      });

      // Transform trades into activity format
      activity = await Promise.all(trades.map(async (trade: any) => {
        const tradeData = trade.get({ plain: true });
        const isBuyer = tradeData.buyerId === user.id;
        const actionType = isBuyer ? "BUY" : "SELL";
        const counterparty = isBuyer ? tradeData.seller : tradeData.buyer;

        // Get counterparty's average rating from reviews
        let avgRating = 0;
        try {
          const reviews = await models.p2pReview.findAll({
            where: { reviewedId: counterparty?.id },
            attributes: ["rating"],
            raw: true,
          });
          if (reviews.length > 0) {
            const totalRating = reviews.reduce((sum: number, r: any) => sum + (r.rating || 0), 0);
            avgRating = Math.round((totalRating / reviews.length) * 10) / 10;
          }
        } catch (e) {
          // If reviews fetch fails, keep avgRating at 0
        }

        return {
          id: tradeData.id,
          type: actionType,
          status: tradeData.status,
          amount: tradeData.amount,
          currency: tradeData.currency || tradeData.offer?.currency || "Unknown",
          total: tradeData.total,
          paymentMethodName: tradeData.paymentMethodDetails?.name || "Unknown",
          counterpartyId: counterparty?.id,
          counterpartyName: counterparty ? `${counterparty.firstName || ""} ${counterparty.lastName || ""}`.trim() || "Unknown" : "Unknown",
          counterpartyAvatar: counterparty?.avatar,
          counterpartyRating: avgRating,
          timestamp: tradeData.updatedAt,
          createdAt: tradeData.createdAt,
        };
      }));
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
