import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Get Staking Position Earnings",
  description:
    "Retrieves all earnings records for a specific staking position.",
  operationId: "getStakingPositionEarnings",
  tags: ["Staking", "Positions", "Earnings"],
  requiresAuth: true,
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      schema: { type: "string" },
      description: "Position ID",
    },
    {
      index: 1,
      name: "claimed",
      in: "query",
      required: false,
      schema: { type: "boolean" },
      description: "Filter by claimed status",
    },
  ],
  responses: {
    200: {
      description: "Earnings retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              earnings: {
                type: "array",
                items: {
                  type: "object",
                },
              },
              summary: {
                type: "object",
                properties: {
                  total: { type: "number" },
                  claimed: { type: "number" },
                  unclaimed: { type: "number" },
                },
              },
            },
          },
        },
      },
    },
    401: { description: "Unauthorized" },
    403: { description: "Forbidden - Not position owner" },
    404: { description: "Position not found" },
    500: { description: "Internal Server Error" },
  },
};

export default async (data: Handler) => {
  const { user, params, query } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const { id } = params;

  // Get the position
  const position = await models.stakingPosition.findOne({
    where: { id },
    include: [
      {
        model: models.stakingPool,
        as: "pool",
      },
    ],
  });

  if (!position) {
    throw createError({ statusCode: 404, message: "Position not found" });
  }

  // Verify ownership
  if (position.userId !== user.id) {
    throw createError({
      statusCode: 403,
      message: "You don't have access to this position",
    });
  }

  // Build filter conditions
  const whereClause: any = {
    positionId: position.id,
  };

  if (query.claimed !== undefined) {
    whereClause.isClaimed = query.claimed === "true";
  }

  // Get earnings records
  const earnings = await models.stakingEarningRecord.findAll({
    where: whereClause,
    order: [["createdAt", "DESC"]],
  });

  // Calculate summary
  const total = earnings.reduce((sum, record) => sum + record.amount, 0);
  const claimed = earnings
    .filter((record) => record.isClaimed)
    .reduce((sum, record) => sum + record.amount, 0);
  const unclaimed = total - claimed;

  return {
    earnings,
    summary: {
      total,
      claimed,
      unclaimed,
      tokenSymbol: position.pool.symbol,
    },
  };
};
