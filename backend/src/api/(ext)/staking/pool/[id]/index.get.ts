import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { col, fn, Op } from "sequelize";

export const metadata = {
  summary: "Get Staking Pool Details",
  description: "Retrieves detailed information about a specific staking pool.",
  operationId: "getStakingPoolById",
  tags: ["Staking", "Pools"],
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
  ],
  responses: {
    200: {
      description: "Pool details retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              pool: { type: "object" },
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
  const { user, params } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const { id } = params;

  // Fetch the pool along with its associated token data
  const pool = await models.stakingPool.findOne({
    where: { id },
  });

  if (!pool) {
    throw createError({ statusCode: 404, message: "Pool not found" });
  }

  // Aggregated analytics for total staked and total stakers using valid statuses ("ACTIVE", "COMPLETED")
  const analytics = await models.stakingPosition.findOne({
    attributes: [
      [fn("SUM", col("amount")), "totalStaked"],
      [fn("COUNT", fn("DISTINCT", col("userId"))), "totalStakers"],
    ],
    where: {
      poolId: pool.id,
      status: { [Op.in]: ["ACTIVE", "COMPLETED"] },
    },
    raw: true,
  });

  const totalStaked = analytics?.totalStaked
    ? parseFloat(analytics.totalStaked)
    : 0;
  const totalStakers = analytics?.totalStakers
    ? parseInt(analytics.totalStakers)
    : 0;

  // Fetch user's positions in this pool using valid statuses ("ACTIVE", "COMPLETED", "PENDING_WITHDRAWAL")
  const userPositions = await models.stakingPosition.findAll({
    where: {
      poolId: pool.id,
      userId: user.id,
      status: { [Op.in]: ["ACTIVE", "COMPLETED", "PENDING_WITHDRAWAL"] },
    },
  });

  const userTotalStaked = userPositions.reduce(
    (sum, pos) => sum + pos.amount,
    0
  );

  // Fetch performance history for the pool (limit to last 30 records)
  const performanceHistory =
    await models.stakingExternalPoolPerformance.findAll({
      where: { poolId: pool.id },
      order: [["date", "DESC"]],
      limit: 30,
    });

  // Construct enhanced pool details response
  const enhancedPool = {
    ...pool.toJSON(),
    totalStaked,
    analytics: {
      totalStakers,
      userTotalStaked,
      userPositionsCount: userPositions.length,
      performanceHistory,
    },
    userPositions,
  };

  // Return the result wrapped inside a "pool" property
  return enhancedPool;
};
