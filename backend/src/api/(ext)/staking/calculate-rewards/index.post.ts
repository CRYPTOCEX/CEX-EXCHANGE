import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { Op } from "sequelize";

export const metadata = {
  summary: "Calculate Potential Staking Rewards",
  description:
    "Calculates potential rewards for a given amount and duration based on available staking pools.",
  operationId: "calculateStakingRewards",
  tags: ["Staking", "Rewards", "Calculator"],
  requiresAuth: true,
  parameters: [],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          required: ["amount", "duration"],
          properties: {
            amount: {
              type: "number",
              description: "Amount to stake",
            },
            duration: {
              type: "number",
              description: "Duration in days",
            },
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: "Rewards calculated successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              calculations: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    poolId: { type: "string" },
                    poolName: { type: "string" },
                    tokenSymbol: { type: "string" },
                    apr: { type: "number" },
                    potentialReward: { type: "number" },
                    totalReturn: { type: "number" },
                  },
                },
              },
            },
          },
        },
      },
    },
    400: { description: "Bad Request" },
    401: { description: "Unauthorized" },
    500: { description: "Internal Server Error" },
  },
};

export default async (data: Handler) => {
  const { user, body } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const { amount, duration } = body;

  if (!amount || amount <= 0) {
    throw createError({ statusCode: 400, message: "Invalid amount" });
  }

  if (!duration || duration <= 0) {
    throw createError({ statusCode: 400, message: "Invalid duration" });
  }

  // Find active pools that match the criteria
  const whereClause: any = {
    status: "ACTIVE",
    lockPeriod: { [Op.lte]: duration },
  };

  const pools = await models.stakingPool.findAll({
    where: whereClause,
    order: [["apr", "DESC"]],
  });

  // Calculate potential rewards for each pool
  const calculations = pools.map((pool) => {
    const { id, name, apr, symbol, icon, token } = pool;
    const annualReward = amount * (apr / 100);
    const dailyReward = annualReward / 365;
    const potentialReward = dailyReward * duration;
    const totalReturn = amount + potentialReward;

    return {
      poolId: id,
      poolName: name,
      tokenSymbol: symbol,
      tokenName: token,
      tokenIcon: icon,
      apr,
      potentialReward,
      totalReturn,
    };
  });

  return { calculations };
};
