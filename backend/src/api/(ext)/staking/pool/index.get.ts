import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { col, fn, Op } from "sequelize";

export const metadata = {
  summary: "Get Available Staking Pools",
  description:
    "Retrieves all active staking pools available for users to stake in.",
  operationId: "getStakingPools",
  tags: ["Staking", "Pools"],
  requiresAuth: true,
  parameters: [
    {
      index: 0,
      name: "token",
      in: "query",
      required: false,
      schema: { type: "string" },
      description: "Filter pools by token name",
    },
    {
      index: 1,
      name: "minApr",
      in: "query",
      required: false,
      schema: { type: "number" },
      description: "Minimum APR filter",
    },
    {
      index: 2,
      name: "maxApr",
      in: "query",
      required: false,
      schema: { type: "number" },
      description: "Maximum APR filter",
    },
    {
      index: 3,
      name: "minLockPeriod",
      in: "query",
      required: false,
      schema: { type: "number" },
      description: "Minimum staking duration in days",
    },
  ],
  responses: {
    200: {
      description: "Staking pools retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              pools: {
                type: "array",
                items: { type: "object" },
              },
            },
          },
        },
      },
    },
    401: { description: "Unauthorized" },
    500: { description: "Internal Server Error" },
  },
};

export default async (data: Handler) => {
  const { user, query } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  // Build filter conditions for staking pools
  const whereClause: any = { status: "ACTIVE" };

  if (query.token) {
    whereClause.token = query.token;
  }

  if (query.minApr) {
    whereClause.apr = {
      ...(whereClause.apr || {}),
      [Op.gte]: Number.parseFloat(query.minApr),
    };
  }

  if (query.maxApr) {
    whereClause.apr = {
      ...(whereClause.apr || {}),
      [Op.lte]: Number.parseFloat(query.maxApr),
    };
  }

  if (query.minLockPeriod) {
    whereClause.lockPeriod = { [Op.gte]: Number.parseInt(query.minLockPeriod) };
  }

  // Retrieve all active pools with filters applied
  const pools = await models.stakingPool.findAll({
    where: whereClause,
    order: [["order", "ASC"]],
  });

  const poolIds = pools.map((pool) => pool.id);
  if (poolIds.length === 0) {
    return [];
  }

  // Aggregated analytics from staking positions (overall analytics)
  const overallAnalytics = await models.stakingPosition.findAll({
    attributes: [
      "poolId",
      [fn("SUM", col("amount")), "totalStaked"],
      [fn("COUNT", fn("DISTINCT", col("userId"))), "totalStakers"],
    ],
    where: {
      poolId: poolIds,
      status: { [Op.in]: ["ACTIVE", "COMPLETED"] },
    },
    group: ["poolId"],
    raw: true,
  });

  // Create a lookup map (using string keys) for overall analytics by poolId
  const analyticsMap: Record<string, any> = overallAnalytics.reduce(
    (acc: Record<string, any>, item: any) => {
      acc[item.poolId] = {
        totalStaked: parseFloat(item.totalStaked) || 0,
        totalStakers: parseInt(item.totalStakers) || 0,
      };
      return acc;
    },
    {}
  );

  // Aggregated user-specific positions across all pools
  const userAnalytics = await models.stakingPosition.findAll({
    attributes: [
      "poolId",
      [fn("SUM", col("amount")), "userTotalStaked"],
      [fn("COUNT", col("id")), "userPositionsCount"],
    ],
    where: {
      poolId: poolIds,
      userId: user.id,
      status: { [Op.in]: ["ACTIVE", "COMPLETED"] },
    },
    group: ["poolId"],
    raw: true,
  });

  // Create a lookup map for user-specific analytics by poolId
  const userAnalyticsMap: Record<string, any> = userAnalytics.reduce(
    (acc: Record<string, any>, item: any) => {
      acc[item.poolId] = {
        userTotalStaked: parseFloat(item.userTotalStaked) || 0,
        userPositionsCount: parseInt(item.userPositionsCount) || 0,
      };
      return acc;
    },
    {}
  );

  // Merge the calculated analytics into each pool object
  const enhancedPools = pools.map((pool) => {
    const poolAnalytics = analyticsMap[pool.id] || {
      totalStaked: 0,
      totalStakers: 0,
    };
    const userPoolAnalytics = userAnalyticsMap[pool.id] || {
      userTotalStaked: 0,
      userPositionsCount: 0,
    };

    return {
      ...pool.toJSON(),
      totalStaked: poolAnalytics.totalStaked,
      analytics: {
        totalStakers: poolAnalytics.totalStakers,
        userTotalStaked: userPoolAnalytics.userTotalStaked,
        userPositionsCount: userPoolAnalytics.userPositionsCount,
      },
    };
  });

  return enhancedPools;
};
