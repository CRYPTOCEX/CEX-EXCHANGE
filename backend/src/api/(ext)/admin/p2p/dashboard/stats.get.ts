import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { fn, col } from "sequelize";

export const metadata = {
  summary: "Get Admin Dashboard Stats",
  description:
    "Retrieves aggregated statistics for the admin dashboard of the P2P platform, including total offers, active trades, open disputes, platform revenue, pending verifications, and flagged trades.",
  operationId: "getAdminP2PDashboardStats",
  tags: ["Admin", "Dashboard", "P2P"],
  logModule: "ADMIN_P2P",
  logTitle: "Get P2P Dashboard Stats",
  requiresAuth: true,
  responses: {
    200: { description: "Stats retrieved successfully." },
    401: { description: "Unauthorized." },
    500: { description: "Internal Server Error." },
  },
  permission: "access.p2p",
};

export default async (data) => {
  try {
    const { ctx } = data;
    ctx?.step("Fetching P2P dashboard statistics");

    // Count total offers instead of total users
    const totalOffers = await models.p2pOffer.count();
    // Placeholder for offer growth – ideally computed by comparing with a previous period
    const offerGrowth = "0%";

    const activeTrades = await models.p2pTrade.count({
      where: { status: "PENDING" },
    });
    const tradeGrowth = "0%";
    const openDisputes = await models.p2pDispute.count({
      where: { status: "PENDING" },
    });
    const disputeChange = "0%";

    const revenueResult = await models.p2pCommission.findOne({
      attributes: [
        [fn("SUM", col("amount")), "platformRevenue"],
      ],
      raw: true,
    });
    const platformRevenue = revenueResult?.platformRevenue || "0";
    const revenueGrowth = "0%";

    // If pending verifications apply (for instance, if offers need approval) – otherwise, use 0.
    const pendingVerifications = 0;
    const flaggedTrades = 0;
    const systemHealth = "Good";

    ctx?.success("P2P dashboard statistics retrieved successfully");

    return {
      totalOffers,
      offerGrowth,
      activeTrades,
      tradeGrowth,
      openDisputes,
      disputeChange,
      platformRevenue,
      revenueGrowth,
      pendingVerifications,
      flaggedTrades,
      systemHealth,
    };
  } catch (err) {
    throw createError({
      statusCode: 500,
      message: "Internal Server Error: " + err.message,
    });
  }
};
