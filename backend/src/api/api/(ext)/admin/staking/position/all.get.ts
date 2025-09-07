import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { fn, col } from "sequelize";

export const metadata = {
  summary: "Get Staking Positions",
  description:
    "Retrieves all staking positions with optional filtering by pool ID and status.",
  operationId: "getStakingPositions",
  tags: ["Staking", "Admin", "Positions"],
  requiresAuth: true,
  parameters: [
    {
      index: 0,
      name: "poolId",
      in: "query",
      required: false,
      schema: { type: "string" },
      description: "Filter positions by pool ID",
    },
    {
      index: 1,
      name: "status",
      in: "query",
      required: false,
      schema: {
        type: "string",
        enum: ["ACTIVE", "COMPLETED", "CANCELLED", "PENDING_WITHDRAWAL"],
      },
      description: "Filter positions by status",
    },
  ],
  responses: {
    200: {
      description: "Positions retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              items: {
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
  permission: "view.staking.position",
};

export default async (data: { user?: any; query?: any }) => {
  const { user, query } = data;

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  try {
    // Build filter conditions
    const where: any = {};

    if (query?.poolId) {
      where.poolId = query.poolId;
    }

    if (query?.status) {
      where.status = query.status;
    }

    // Fetch positions with their pool and earning history
    const positions = await models.stakingPosition.findAll({
      where,
      include: [
        {
          model: models.stakingPool,
          as: "pool",
        },
        {
          model: models.stakingEarningRecord,
          as: "earningHistory",
          required: false,
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    // Calculate additional properties for each position
    const positionsWithComputedProps = await Promise.all(
      positions.map(async (position) => {
        // Calculate pending rewards (sum of unclaimed earnings)
        const pendingRewardsResult = await models.stakingEarningRecord.findOne({
          attributes: [[fn("SUM", col("amount")), "pendingRewards"]],
          where: {
            positionId: position.id,
            isClaimed: false,
          },
          raw: true,
        });

        const pendingRewards = pendingRewardsResult?.pendingRewards || 0;

        // Calculate total earnings to date
        const earningsToDateResult = await models.stakingEarningRecord.findOne({
          attributes: [[fn("SUM", col("amount")), "earningsToDate"]],
          where: {
            positionId: position.id,
          },
          raw: true,
        });

        const earningsToDate = earningsToDateResult?.earningsToDate || 0;

        // Get last earning date
        const lastEarningRecord = await models.stakingEarningRecord.findOne({
          attributes: ["createdAt"],
          where: {
            positionId: position.id,
          },
          order: [["createdAt", "DESC"]],
          raw: true,
        });

        const lastEarningDate = lastEarningRecord?.createdAt || null;

        // Return position with computed properties
        return {
          ...position.toJSON(),
          pendingRewards,
          earningsToDate,
          lastEarningDate,
          rewardTokenSymbol: position.pool?.symbol,
          tokenSymbol: position.pool?.symbol,
          poolName: position.pool?.name,
          lockPeriodEnd: position.endDate,
          apr: position.pool?.apr,
        };
      })
    );

    return positionsWithComputedProps;
  } catch (error) {
    console.error("Error fetching staking positions:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to fetch staking positions",
    });
  }
};
