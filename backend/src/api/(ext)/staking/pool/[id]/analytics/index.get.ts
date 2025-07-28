import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { Op, fn, col } from "sequelize";

export const metadata = {
  summary: "Get Staking Pool Analytics",
  description: "Retrieves detailed analytics for a specific staking pool.",
  operationId: "getStakingPoolAnalytics",
  tags: ["Staking", "Pools", "Analytics"],
  requiresAuth: true,
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      schema: { type: "string" },
      description: "Pool ID",
    },
    {
      index: 1,
      name: "timeframe",
      in: "query",
      required: false,
      schema: { type: "string", enum: ["week", "month", "year", "all"] },
      description: "Timeframe for analytics data",
    },
  ],
  responses: {
    200: {
      description: "Pool analytics retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              analytics: { type: "object" },
            },
          },
        },
      },
    },
    401: { description: "Unauthorized" },
    404: { description: "Pool not found" },
    500: { description: "Internal Server Error" },
  },
};

export default async (data: Handler) => {
  const { user, params, query } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const { id } = params;
  const timeframe = query.timeframe || "month";

  // Verify pool exists
  const pool = await models.stakingPool.findOne({
    where: { id },
  });

  if (!pool) {
    throw createError({ statusCode: 404, message: "Pool not found" });
  }

  // Calculate date range based on timeframe
  const now = new Date();
  let startDate: Date;
  switch (timeframe) {
    case "week":
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      break;
    case "month":
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 1);
      break;
    case "year":
      startDate = new Date(now);
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    case "all":
      startDate = new Date(0);
      break;
    default:
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 1);
  }

  // Compute total staked amount using valid statuses ("ACTIVE", "COMPLETED")
  const totalStaked = await models.stakingPosition.sum("amount", {
    where: {
      poolId: pool.id,
      status: { [Op.in]: ["ACTIVE", "COMPLETED"] },
    },
  });

  // Compute total stakers count using valid statuses ("ACTIVE", "COMPLETED")
  const totalStakers = await models.stakingPosition.count({
    where: {
      poolId: pool.id,
      status: { [Op.in]: ["ACTIVE", "COMPLETED"] },
    },
    distinct: true,
    col: "userId",
  });

  // Compute total earnings generated within the timeframe
  const totalEarnings = await models.stakingEarningRecord.sum("amount", {
    where: {
      poolId: pool.id,
      createdAt: { [Op.gte]: startDate },
    },
  });

  // Fetch performance history (records after startDate)
  const performanceHistory =
    await models.stakingExternalPoolPerformance.findAll({
      where: {
        poolId: pool.id,
        date: { [Op.gte]: startDate },
      },
      order: [["date", "ASC"]],
    });

  // Calculate staking growth over time (new positions by day)
  const stakingGrowth = await models.stakingPosition.findAll({
    attributes: [
      [fn("DATE", col("createdAt")), "date"],
      [fn("SUM", col("amount")), "totalAmount"],
      [fn("COUNT", col("id")), "count"],
    ],
    where: {
      poolId: pool.id,
      createdAt: { [Op.gte]: startDate },
    },
    group: [fn("DATE", col("createdAt"))],
    order: [[fn("DATE", col("createdAt")), "ASC"]],
    raw: true,
  });

  // Calculate withdrawal data from positions with "COMPLETED" status
  const withdrawals = await models.stakingPosition.findAll({
    attributes: [
      [fn("DATE", col("updatedAt")), "date"],
      [fn("SUM", col("amount")), "totalAmount"],
      [fn("COUNT", col("id")), "count"],
    ],
    where: {
      poolId: pool.id,
      status: "COMPLETED",
      updatedAt: { [Op.gte]: startDate },
    },
    group: [fn("DATE", col("updatedAt"))],
    order: [[fn("DATE", col("updatedAt")), "ASC"]],
    raw: true,
  });

  return {
    analytics: {
      poolId: pool.id,
      poolName: pool.name,
      tokenSymbol: pool.symbol,
      apr: pool.apr,
      totalStaked: totalStaked || 0,
      totalStakers: totalStakers || 0,
      totalEarnings: totalEarnings || 0,
      performanceHistory,
      stakingGrowth,
      withdrawals,
      timeframe,
    },
  };
};
