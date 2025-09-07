import { models, sequelize } from "@b/db";
import { unauthorizedResponse, serverErrorResponse } from "@b/utils/query";
import { Op } from "sequelize";

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
      // Dashboard stats: count total trades
      statsResult = await models.p2pTrade.findOne({
        attributes: [
          [
            sequelize.fn("COUNT", sequelize.col("id")),
            "tradeCount",
          ],
        ],
        where: {
          [Op.or]: [{ buyerId: user.id }, { sellerId: user.id }],
        },
        raw: true,
      });
    } catch (statsError) {
      console.error("Error fetching stats data:", statsError);
      statsResult = { tradeCount: 0 };
    }

    try {
      // Trading Activity: recent activity logs
      activity = await models.p2pActivityLog.findAll({
        where: { userId: user.id },
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
      stats: statsResult || { tradeCount: 0 },
      tradingActivity: activity || [],
      transactions: transactions || [],
    };
  } catch (err: any) {
    throw new Error("Internal Server Error: " + err.message);
  }
};
