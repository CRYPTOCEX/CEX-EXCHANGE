import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { serverErrorResponse } from "@b/utils/query";
import { fn, col, Op } from "sequelize";

export const metadata: OperationObject = {
  summary: "Retrieves affiliate program statistics",
  description:
    "Fetches public statistics for the affiliate program including total affiliates, total paid out, average monthly earnings, and success rate.",
  operationId: "getAffiliateStats",
  tags: ["Affiliate", "Stats"],
  logModule: "AFFILIATE",
  logTitle: "Get Public Stats",
  responses: {
    200: {
      description: "Affiliate stats retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              totalAffiliates: {
                type: "number",
                description: "Total number of affiliates with referrals",
              },
              totalPaidOut: {
                type: "number",
                description: "Total amount paid out in rewards",
              },
              avgMonthlyEarnings: {
                type: "number",
                description: "Average monthly earnings per affiliate",
              },
              successRate: {
                type: "number",
                description: "Success rate percentage (active referrals / total referrals)",
              },
            },
            required: ["totalAffiliates", "totalPaidOut", "avgMonthlyEarnings", "successRate"],
          },
        },
      },
    },
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { ctx } = data;

  ctx?.step("Fetching Affiliate Program Stats");

  try {
    // Fetch all stats in parallel
    const [
      totalAffiliatesCount,
      totalPaidOutResult,
      totalReferralsCount,
      activeReferralsCount,
      avgEarningsResult,
    ] = await Promise.all([
      // Count unique affiliates who have made referrals
      models.mlmReferral.count({
        distinct: true,
        col: "referrerId",
      }),
      // Sum of all rewards paid out
      models.mlmReferralReward.findOne({
        attributes: [[fn("SUM", col("reward")), "total"]],
        raw: true,
      }),
      // Total number of referrals
      models.mlmReferral.count(),
      // Number of active referrals
      models.mlmReferral.count({
        where: { status: "ACTIVE" },
      }),
      // Average monthly earnings per affiliate (last 30 days)
      models.mlmReferralReward.findOne({
        attributes: [[fn("AVG", col("reward")), "avgReward"]],
        where: {
          createdAt: {
            [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
        raw: true,
      }),
    ]);

    // Calculate stats
    const totalPaidOut = parseFloat(totalPaidOutResult?.total) || 0;
    const avgMonthlyEarnings = parseFloat(avgEarningsResult?.avgReward) || 0;
    const successRate =
      totalReferralsCount > 0
        ? Math.round((activeReferralsCount / totalReferralsCount) * 100)
        : 0;

    const stats = {
      totalAffiliates: totalAffiliatesCount,
      totalPaidOut: Math.round(totalPaidOut * 100) / 100, // Round to 2 decimals
      avgMonthlyEarnings: Math.round(avgMonthlyEarnings * 100) / 100,
      successRate,
    };

    ctx?.success(
      `Stats fetched: ${stats.totalAffiliates} affiliates, $${stats.totalPaidOut} paid out`
    );

    return stats;
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: `Error retrieving affiliate stats: ${error.message}`,
    });
  }
};
