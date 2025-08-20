import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { Op } from "sequelize";

export const metadata = {
  summary: "Get User's Staking Positions",
  description: "Retrieves all staking positions for the authenticated user with pagination support.",
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
    {
      index: 2,
      name: "page",
      in: "query",
      required: false,
      schema: { type: "integer", minimum: 1, default: 1 },
      description: "Page number for pagination",
    },
    {
      index: 3,
      name: "limit",
      in: "query",
      required: false,
      schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
      description: "Number of items per page",
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
              data: {
                type: "array",
                items: {
                  type: "object",
                },
              },
              pagination: {
                type: "object",
                properties: {
                  page: { type: "integer" },
                  limit: { type: "integer" },
                  total: { type: "integer" },
                  totalPages: { type: "integer" },
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

  // Parse pagination parameters
  const page = parseInt(query.page as string) || 1;
  const limit = Math.min(parseInt(query.limit as string) || 20, 100);
  const offset = (page - 1) * limit;

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

  // Get total count for pagination
  const totalCount = await models.stakingPosition.count({
    where: whereClause,
  });

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
    limit,
    offset,
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

  return {
    data: enhancedPositions,
    pagination: {
      page,
      limit,
      total: totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
  };
};
