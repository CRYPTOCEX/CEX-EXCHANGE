import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { serverErrorResponse } from "@b/utils/query";
import { fn, col, Op } from "sequelize";

export const metadata: OperationObject = {
  summary: "Retrieves gateway statistics",
  description:
    "Fetches public statistics for the payment gateway including total merchants, transactions, volume, and success rate.",
  operationId: "getGatewayStats",
  tags: ["Gateway", "Stats"],
  logModule: "GATEWAY",
  logTitle: "Get Public Stats",
  responses: {
    200: {
      description: "Gateway stats retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              totalMerchants: {
                type: "number",
                description: "Total number of registered merchants",
              },
              totalTransactions: {
                type: "number",
                description: "Total number of completed transactions",
              },
              totalVolume: {
                type: "number",
                description: "Total volume processed in millions",
              },
              successRate: {
                type: "number",
                description: "Success rate percentage",
              },
            },
            required: ["totalMerchants", "totalTransactions", "totalVolume", "successRate"],
          },
        },
      },
    },
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { ctx } = data;

  ctx?.step("Fetching Gateway Stats");

  try {
    // Fetch all stats in parallel
    const [
      totalMerchantsCount,
      totalTransactionsCount,
      successfulTransactionsCount,
      totalVolumeResult,
    ] = await Promise.all([
      // Count total merchants
      models.gatewayMerchant.count(),
      // Total number of transactions
      models.gatewayPayment.count(),
      // Number of successful transactions
      models.gatewayPayment.count({
        where: { status: "COMPLETED" },
      }),
      // Sum of all transaction volumes
      models.gatewayPayment.findOne({
        attributes: [[fn("SUM", col("amount")), "total"]],
        where: { status: "COMPLETED" },
        raw: true,
      }),
    ]);

    // Calculate stats
    const totalVolume = parseFloat(totalVolumeResult?.total) || 0;
    const successRate =
      totalTransactionsCount > 0
        ? Math.round((successfulTransactionsCount / totalTransactionsCount) * 100)
        : 0;

    const stats = {
      totalMerchants: totalMerchantsCount,
      totalTransactions: totalTransactionsCount,
      totalVolume: Math.round(totalVolume / 1000000 * 100) / 100, // Convert to millions with 2 decimals
      successRate,
    };

    ctx?.success(
      `Stats fetched: ${stats.totalMerchants} merchants, ${stats.totalTransactions} transactions`
    );

    return stats;
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: `Error retrieving gateway stats: ${error.message}`,
    });
  }
};
