import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { Op } from "sequelize";

export const metadata = {
  summary: "Get User's Staking Positions",
  description: "Retrieves all staking positions for the authenticated user.",
  operationId: "getUserStakingPositions",
  tags: ["Staking", "Positions"],
  requiresAuth: true,
  parameters: [
    {
      index: 0,
      name: "status",
      in: "query",
      required: false,
      schema: {
        type: "string",
        enum: ["ACTIVE", "LOCKED", "PENDING_WITHDRAWAL", "COMPLETED"],
      },
      description: "Filter by position status",
    },
    {
      index: 1,
      name: "poolId",
      in: "query",
      required: false,
      schema: { type: "string" },
      description: "Filter by pool ID",
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
              positions: {
                type: "array",
                items: {
                  type: "object",
                },
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

  // Build filter conditions
  const whereClause: any = { userId: user.id };

  if (query.status) {
    // Map "LOCKED" to active positions with a future endDate
    if (query.status === "LOCKED") {
      whereClause.status = "ACTIVE";
      whereClause.endDate = { [Op.gt]: new Date() };
    } else {
      whereClause.status = query.status;
    }
  }

  if (query.poolId) {
    whereClause.poolId = query.poolId;
  }

  // Fetch user's staking positions along with their pool data.
  // NOTE: The token include has been removed as the "token" model is not defined.
  const positions = await models.stakingPosition.findAll({
    where: whereClause,
    include: [
      {
        model: models.stakingPool,
        as: "pool",
      },
    ],
    order: [["createdAt", "DESC"]],
  });

  // Enhance positions with earnings and time remaining calculations.
  const enhancedPositions = await Promise.all(
    positions.map(async (position) => {
      // Sum all earnings for this position
      const totalEarnings = await models.stakingEarningRecord.sum("amount", {
        where: { positionId: position.id },
      });

      // Sum unclaimed earnings (using the correct field "isClaimed")
      const unclaimedEarnings = await models.stakingEarningRecord.sum(
        "amount",
        {
          where: {
            positionId: position.id,
            isClaimed: false,
          },
        }
      );

      // Calculate time remaining based on the position's endDate
      let timeRemaining: number | null = null;
      if (
        position.status === "ACTIVE" &&
        position.endDate &&
        new Date(position.endDate) > new Date()
      ) {
        const now = new Date();
        const endDate = new Date(position.endDate);
        timeRemaining = Math.floor(
          (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
      }

      return {
        ...position.toJSON(),
        earnings: {
          total: totalEarnings || 0,
          unclaimed: unclaimedEarnings || 0,
        },
        timeRemaining,
      };
    })
  );

  return enhancedPositions;
};
