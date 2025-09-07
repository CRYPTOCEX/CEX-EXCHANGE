import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { Op, fn, col, literal } from "sequelize";

export const metadata = {
  summary: "Get User's Staking Summary",
  description:
    "Retrieves a summary of the user's staking activity across all positions.",
  operationId: "getUserStakingSummary",
  tags: ["Staking", "User", "Summary"],
  requiresAuth: true,
  parameters: [],
  responses: {
    200: {
      description: "Summary retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              summary: {
                type: "object",
                properties: {
                  totalStaked: { type: "number" },
                  totalEarnings: { type: "number" },
                  unclaimedEarnings: { type: "number" },
                  activePositions: { type: "number" },
                  byToken: {
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
      },
    },
    401: { description: "Unauthorized" },
    500: { description: "Internal Server Error" },
  },
};

export default async (data: Handler) => {
  const { user } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  // Get user's active positions
  const positions = await models.stakingPosition.findAll({
    where: {
      userId: user.id,
      status: { [Op.in]: ["ACTIVE", "LOCKED"] },
    },
    include: [
      {
        model: models.stakingPool,
        as: "pool",
        attributes: ["id", "name", "symbol", "icon"],
      },
    ],
  });

  // Calculate total staked amount
  const totalStaked = positions.reduce(
    (sum, position) => sum + position.amount,
    0
  );

  // Get position IDs
  const positionIds = positions.map((p) => p.id);

  // Get all positions (including completed) for earnings calculation
  const allPositions = await models.stakingPosition.findAll({
    where: { userId: user.id },
    attributes: ["id"],
  });

  const allPositionIds = allPositions.map((p) => p.id);

  // Calculate total earnings
  const earningsResult = await models.stakingEarningRecord.findAll({
    attributes: [
      [fn("SUM", col("amount")), "total"],
      [
        fn("SUM", literal("CASE WHEN isClaimed = false THEN amount ELSE 0 END")),
        "unclaimed",
      ],
    ],
    where: {
      positionId: { [Op.in]: allPositionIds },
    },
    raw: true,
  });

  const totalEarnings = earningsResult[0].total || 0;
  const unclaimedEarnings = earningsResult[0].unclaimed || 0;

  // Group by token
  const tokenSummary = {};
  positions.forEach((position) => {
    const tokenSymbol = position.pool.symbol;

    if (!tokenSummary[tokenSymbol]) {
      tokenSummary[tokenSymbol] = {
        tokenSymbol,
        tokenIcon: position.pool.icon,
        totalStaked: 0,
        positionCount: 0,
      };
    }

    tokenSummary[tokenSymbol].totalStaked += position.amount;
    tokenSummary[tokenSymbol].positionCount += 1;
  });

  // Get earnings by token
  const earningsByToken = await models.stakingEarningRecord.findAll({
    attributes: [
      [fn("SUM", col("amount")), "total"],
      [
        fn("SUM", literal("CASE WHEN isClaimed = false THEN amount ELSE 0 END")),
        "unclaimed",
      ],
    ],
    include: [
      {
        model: models.stakingPosition,
        as: "position",
        attributes: ["id", "poolId"],
        include: [
          {
            model: models.stakingPool,
            as: "pool",
            attributes: ["id", "symbol"],
          },
        ],
      },
    ],
    where: {
      positionId: { [Op.in]: allPositionIds },
    },
    group: [
      "position.pool.id",
      "position.pool.symbol",
    ],
    raw: false,
  });

  // Merge earnings data into token summary
  earningsByToken.forEach((earning) => {
    const tokenSymbol = earning.position.pool.symbol;

    if (!tokenSummary[tokenSymbol]) {
      tokenSummary[tokenSymbol] = {
        tokenSymbol,
        tokenIcon: null, // Will be filled if there's an active position
        totalStaked: 0,
        positionCount: 0,
      };
    }

    tokenSummary[tokenSymbol].totalEarnings =
      Number.parseFloat(earning.getDataValue("total")) || 0;
    tokenSummary[tokenSymbol].unclaimedEarnings =
      Number.parseFloat(earning.getDataValue("unclaimed")) || 0;
  });

  return {
    summary: {
      totalStaked,
      totalEarnings,
      unclaimedEarnings,
      activePositions: positions.length,
      byToken: Object.values(tokenSummary),
    },
  };
};
