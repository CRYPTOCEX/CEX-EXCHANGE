import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Stake Tokens",
  description:
    "Creates a new staking position for the authenticated user by staking tokens into a specified pool.",
  operationId: "stakeTokens",
  tags: ["Staking", "Positions"],
  requiresAuth: true,
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            poolId: {
              type: "string",
              description: "The ID of the staking pool",
            },
            amount: {
              type: "number",
              description: "The amount of tokens to stake",
            },
          },
          required: ["poolId", "amount"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Staking position created successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              id: { type: "string", description: "Staking position ID" },
              userId: { type: "string", description: "User ID" },
              poolId: { type: "string", description: "Pool ID" },
              amount: { type: "number", description: "Staked amount" },
              startDate: {
                type: "string",
                format: "date-time",
                description: "Staking start date",
              },
              endDate: {
                type: "string",
                format: "date-time",
                description: "Staking end date",
              },
              status: {
                type: "string",
                description: "Status of the staking position",
              },
              withdrawalRequested: {
                type: "boolean",
                description: "Withdrawal requested flag",
              },
              withdrawalRequestDate: {
                type: "string",
                format: "date-time",
                nullable: true,
                description: "Date when withdrawal was requested",
              },
              adminNotes: {
                type: "string",
                nullable: true,
                description: "Admin notes",
              },
              completedAt: {
                type: "string",
                format: "date-time",
                nullable: true,
                description: "Completion timestamp",
              },
              createdAt: {
                type: "string",
                format: "date-time",
                description: "Creation timestamp",
              },
              updatedAt: {
                type: "string",
                format: "date-time",
                description: "Last update timestamp",
              },
            },
          },
        },
      },
    },
    400: {
      description:
        "Invalid request parameters or business logic validation failed",
    },
    401: { description: "Unauthorized" },
    404: { description: "Staking pool not found" },
    500: { description: "Internal Server Error" },
  },
};

export default async (data: Handler) => {
  const { user, body } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const { poolId, amount } = body;
  if (!poolId || typeof amount !== "number") {
    throw createError({
      statusCode: 400,
      message: "poolId and amount are required",
    });
  }

  // Retrieve the staking pool
  const pool = await models.stakingPool.findByPk(poolId);
  if (!pool) {
    throw createError({ statusCode: 404, message: "Staking pool not found" });
  }

  // Ensure the pool is active
  if (pool.status !== "ACTIVE") {
    throw createError({
      statusCode: 400,
      message: "Staking pool is not active",
    });
  }

  // Validate the staking amount against the pool's limits
  if (amount < pool.minStake) {
    throw createError({
      statusCode: 400,
      message: `Amount must be at least ${pool.minStake}`,
    });
  }
  if (pool.maxStake && amount > pool.maxStake) {
    throw createError({
      statusCode: 400,
      message: `Amount must not exceed ${pool.maxStake}`,
    });
  }
  if (amount > pool.availableToStake) {
    throw createError({
      statusCode: 400,
      message: "Insufficient available amount to stake in this pool",
    });
  }

  // Calculate staking period
  const startDate = new Date();
  // Assuming pool.lockPeriod is in days
  const endDate = new Date(
    startDate.getTime() + pool.lockPeriod * 24 * 60 * 60 * 1000
  );

  // Use a transaction to ensure atomic operations: creating the staking position and updating the pool
  const transaction = await sequelize.transaction();
  try {
    const position = await models.stakingPosition.create(
      {
        userId: user.id,
        poolId,
        amount,
        startDate,
        endDate,
        status: "ACTIVE",
        withdrawalRequested: false,
        withdrawalRequestDate: null,
        adminNotes: null,
        completedAt: null,
      },
      { transaction }
    );

    // Deduct staked amount from availableToStake
    pool.availableToStake = pool.availableToStake - amount;
    await pool.save({ transaction });

    await transaction.commit();
    return position;
  } catch (err) {
    await transaction.rollback();
    throw createError({
      statusCode: 500,
      message: err.message || "Failed to stake tokens",
    });
  }
};
