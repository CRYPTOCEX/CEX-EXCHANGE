import { models } from "@b/db";
import { Op } from "sequelize";
import { unauthorizedResponse, serverErrorResponse } from "@b/utils/query";

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

    return {
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
