import { models } from "@b/db";
import { Op } from "sequelize";
import { unauthorizedResponse, serverErrorResponse } from "@b/utils/query";
import {
  getFiatPriceInUSD,
  getSpotPriceInUSD,
  getEcoPriceInUSD,
} from "@b/api/finance/currency/utils";

export const metadata = {
  summary: "Get P2P Dashboard Stats",
  description:
    "Retrieves various trade counts and stats for the authenticated user.",
  operationId: "getP2PDashboardStats",
  tags: ["P2P", "Dashboard"],
  responses: {
    200: { description: "Dashboard stats retrieved successfully." },
    401: unauthorizedResponse,
    500: serverErrorResponse,
  },
  requiresAuth: true,
};

export default async (data: { user?: any }) => {
  const { user } = data;
  if (!user?.id) {
    return {
      statusCode: 401,
      message: "Unauthorized",
    };
  }

  try {
    // Check if P2P models exist
    if (!models.p2pTrade) {
      return {
        statusCode: 500,
        message: "P2P extension is not properly installed or configured",
      };
    }

    let totalTrades = 0;
    let activeTrades = 0;
    let completedTrades = 0;
    let wallets: any[] = [];

    try {
      totalTrades = await models.p2pTrade.count({
        where: {
          [Op.or]: [{ buyerId: user.id }, { sellerId: user.id }],
        },
      });
    } catch (error) {
      console.error("Error fetching total trades:", error);
    }

    try {
      activeTrades = await models.p2pTrade.count({
        where: {
          status: "PENDING",
          [Op.or]: [{ buyerId: user.id }, { sellerId: user.id }],
        },
      });
    } catch (error) {
      console.error("Error fetching active trades:", error);
    }

    try {
      completedTrades = await models.p2pTrade.count({
        where: {
          status: "COMPLETED",
          [Op.or]: [{ buyerId: user.id }, { sellerId: user.id }],
        },
      });
    } catch (error) {
      console.error("Error fetching completed trades:", error);
    }

    // Fetch user wallets for P2P trading
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
    } catch (error) {
      console.error("Error fetching user wallets:", error);
      wallets = [];
    }

    // Calculate total balance across all wallets (converted to USD)
    let totalBalance = 0;
    for (const wallet of wallets) {
      try {
        const availableBalance = parseFloat(wallet.balance || 0) - parseFloat(wallet.inOrder || 0);
        if (availableBalance <= 0) continue;

        let priceInUSD = 1; // Default for USD

        // Skip conversion if currency is USD
        if (wallet.currency === "USD") {
          totalBalance += availableBalance;
          continue;
        }

        // Get price in USD based on wallet type
        try {
          switch (wallet.type) {
            case "FIAT":
              priceInUSD = await getFiatPriceInUSD(wallet.currency);
              break;
            case "SPOT":
              priceInUSD = await getSpotPriceInUSD(wallet.currency);
              break;
            case "ECO":
              priceInUSD = await getEcoPriceInUSD(wallet.currency);
              break;
          }
        } catch (priceError) {
          console.error(`Error getting price for ${wallet.type} ${wallet.currency}:`, priceError);
          // Skip this wallet if we can't get the price
          continue;
        }

        totalBalance += availableBalance * priceInUSD;
      } catch (error) {
        console.error(`Error processing wallet ${wallet.id}:`, error);
      }
    }

    // Calculate success rate
    const successRate = totalTrades > 0
      ? Math.round((completedTrades / totalTrades) * 100)
      : 0;

    // Format stats for frontend display
    const stats = [
      {
        title: "Total Balance",
        value: `$${totalBalance.toFixed(2)}`,
        change: `${wallets.length} wallet${wallets.length !== 1 ? 's' : ''} available`,
        changeType: "neutral",
        icon: "wallet",
        gradient: "from-blue-500 to-blue-700",
      },
      {
        title: "Trading Volume",
        value: `$${totalBalance.toFixed(2)}`,
        change: `${totalTrades} total trade${totalTrades !== 1 ? 's' : ''}`,
        changeType: totalTrades > 0 ? "positive" : "neutral",
        icon: "trending-up",
        gradient: "from-green-500 to-green-700",
      },
      {
        title: "Active Trades",
        value: activeTrades.toString(),
        change: `${activeTrades} pending completion`,
        changeType: activeTrades > 0 ? "positive" : "neutral",
        icon: "bar-chart",
        gradient: "from-violet-500 to-violet-700",
      },
      {
        title: "Success Rate",
        value: `${successRate}%`,
        change: `Based on ${totalTrades} trade${totalTrades !== 1 ? 's' : ''}`,
        changeType: successRate >= 80 ? "positive" : successRate >= 50 ? "neutral" : "negative",
        icon: "shield-check",
        gradient: "from-amber-500 to-amber-700",
      },
    ];

    return {
      stats,
      totalTrades,
      activeTrades,
      completedTrades,
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
    console.error("P2P Dashboard Stats API Error:", err);
    return {
      statusCode: 500,
      message: "Internal Server Error: " + err.message,
    };
  }
};
