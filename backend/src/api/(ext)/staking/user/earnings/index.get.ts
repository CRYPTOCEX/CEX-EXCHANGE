import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { Op, fn, col } from "sequelize";

export const metadata = {
  summary: "Get User's Staking Earnings",
  description:
    "Retrieves all staking earnings for the authenticated user across all positions.",
  operationId: "getUserStakingEarnings",
  tags: ["Staking", "User", "Earnings"],
  requiresAuth: true,
  parameters: [
    {
      index: 0,
      name: "claimed",
      in: "query",
      required: false,
      schema: { type: "boolean" },
      description: "Filter by claimed status",
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
      name: "timeframe",
      in: "query",
      required: false,
      schema: { type: "string", enum: ["week", "month", "year", "all"] },
      description: "Timeframe for earnings data",
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
                  byToken: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        tokenSymbol: { type: "string" },
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

  // Calculate date range based on timeframe
  const now = new Date();
  let startDate;

  switch (query.timeframe) {
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
    default:
      startDate = new Date(0); // Beginning of time
      break;
  }

  // Get user's positions
  const positions = await models.stakingPosition.findAll({
    where: { userId: user.id },
    attributes: ["id"],
  });

  const positionIds = positions.map((p) => p.id);

  if (positionIds.length === 0) {
    return {
      earnings: [],
      summary: {
        total: 0,
        claimed: 0,
        unclaimed: 0,
        byToken: [],
      },
    };
  }

  // Build filter conditions
  const whereClause: any = {
    positionId: { [Op.in]: positionIds },
    createdAt: { [Op.gte]: startDate },
  };

  if (query.claimed !== undefined) {
    whereClause.claimed = query.claimed === "true";
  }

  if (query.poolId) {
    whereClause.poolId = query.poolId;
  }

  // Get earnings records
  const earnings = await models.stakingEarningRecord.findAll({
    where: whereClause,
    include: [
      {
        model: models.stakingPosition,
        as: "position",
        attributes: ["id", "amount", "status"],
      },
      {
        model: models.stakingPool,
        as: "pool",
        attributes: ["id", "name", "apy"],
        include: [
          {
            model: models.token,
            as: "token",
            attributes: ["symbol", "icon"],
          },
        ],
      },
    ],
    order: [["createdAt", "DESC"]],
  });

  // Calculate summary
  const total = earnings.reduce((sum, record) => sum + record.amount, 0);
  const claimed = earnings
    .filter((record) => record.claimed)
    .reduce((sum, record) => sum + record.amount, 0);
  const unclaimed = total - claimed;

  // Calculate summary by token
  const tokenSummary = {};
  earnings.forEach((record) => {
    const tokenSymbol = record.pool.token.symbol;

    if (!tokenSummary[tokenSymbol]) {
      tokenSummary[tokenSymbol] = {
        tokenSymbol,
        tokenIcon: record.pool.token.icon,
        total: 0,
        claimed: 0,
        unclaimed: 0,
      };
    }

    tokenSummary[tokenSymbol].total += record.amount;
    if (record.claimed) {
      tokenSummary[tokenSymbol].claimed += record.amount;
    } else {
      tokenSummary[tokenSymbol].unclaimed += record.amount;
    }
  });

  // Get earnings by day for chart
  const earningsByDay = await models.stakingEarningRecord.findAll({
    attributes: [
      [fn("DATE", col("createdAt")), "date"],
      [fn("SUM", col("amount")), "totalAmount"],
    ],
    where: whereClause,
    group: [fn("DATE", col("createdAt"))],
    order: [[fn("DATE", col("createdAt")), "ASC"]],
    raw: true,
  });

  return {
    earnings,
    summary: {
      total,
      claimed,
      unclaimed,
      byToken: Object.values(tokenSummary),
      earningsByDay,
    },
  };
};
