import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Get Staking Position Details",
  description:
    "Retrieves detailed information about a specific staking position.",
  operationId: "getStakingPositionById",
  tags: ["Staking", "Positions"],
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
  ],
  responses: {
    200: {
      description: "Position details retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              position: { type: "object" },
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
  const { user, params } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const { id } = params;

  // Get the position with related data
  const position = await models.stakingPosition.findOne({
    where: { id },
    include: [
      {
        model: models.stakingPool,
        as: "pool",
        attributes: ["id", "name", "symbol", "icon", "apr", "lockPeriod", "walletType", "walletChain"],
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

  // Get earnings for this position
  const earnings = await models.stakingEarningRecord.findAll({
    where: { positionId: position.id },
    order: [["createdAt", "DESC"]],
  });

  // Calculate total and unclaimed earnings
  const totalEarnings = earnings.reduce(
    (sum, record) => sum + record.amount,
    0
  );
  const unclaimedEarnings = earnings
    .filter((record) => !record.isClaimed)
    .reduce((sum, record) => sum + record.amount, 0);

  // Calculate time remaining for locked positions
  let timeRemaining: number | null = null;
  if (position.status === "LOCKED" && position.lockEndDate) {
    const now = new Date();
    const endDate = new Date(position.lockEndDate);
    timeRemaining = Math.max(
      0,
      Math.floor((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    );
  }

  // Enhance position with earnings data
  const enhancedPosition = {
    ...position.toJSON(),
    earnings: {
      records: earnings,
      total: totalEarnings,
      unclaimed: unclaimedEarnings,
    },
    timeRemaining,
  };

  return { position: enhancedPosition };
};
