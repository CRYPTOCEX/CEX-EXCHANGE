import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";
import { Op } from "sequelize";

export const metadata = {
  summary: "Stake Tokens",
  description:
    "Creates a new staking position for the authenticated user by staking tokens into a specified pool.",
  operationId: "stakeTokens",
  tags: ["Staking", "Positions"],
  requiresAuth: true,
  rateLimit: {
    windowMs: 60000, // 1 minute
    max: 5 // 5 requests per minute
  },
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

/**
 * Creates a new staking position for the authenticated user.
 * 
 * @description This endpoint allows users to stake tokens in a staking pool.
 * It performs the following operations:
 * - Validates the pool exists and is active
 * - Checks user has sufficient wallet balance
 * - Deducts tokens from user's wallet
 * - Creates a new staking position
 * - Updates pool's available stake capacity
 * 
 * @param {Handler} data - Request handler data
 * @param {User} data.user - Authenticated user
 * @param {Object} data.body - Request body
 * @param {string} data.body.poolId - ID of the staking pool
 * @param {number} data.body.amount - Amount to stake
 * 
 * @returns {Promise<StakingPosition>} The created staking position
 * 
 * @throws {401} Unauthorized - User not authenticated
 * @throws {400} Bad Request - Invalid input or insufficient balance
 * @throws {404} Not Found - Pool not found
 * @throws {429} Too Many Requests - Rate limit exceeded
 * @throws {500} Internal Server Error - Transaction failed
 */
export default async (data: Handler) => {
  const { user, body } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const { poolId, amount } = body;
  
  // Rate limiting check for this specific user
  const recentPositions = await models.stakingPosition.count({
    where: {
      userId: user.id,
      createdAt: {
        [Op.gte]: new Date(Date.now() - 60000) // Last minute
      }
    }
  });
  
  if (recentPositions >= 5) {
    throw createError({
      statusCode: 429,
      message: "Too many staking requests. Please wait before trying again."
    });
  }
  
  // Validate poolId
  if (!poolId || typeof poolId !== "string") {
    throw createError({
      statusCode: 400,
      message: "Valid poolId is required",
    });
  }

  // Validate amount
  if (typeof amount !== "number" || isNaN(amount) || !isFinite(amount)) {
    throw createError({
      statusCode: 400,
      message: "Valid numeric amount is required",
    });
  }

  if (amount <= 0) {
    throw createError({
      statusCode: 400,
      message: "Amount must be greater than zero",
    });
  }

  // Validate decimal places (max 8 decimals)
  const decimalPlaces = (amount.toString().split('.')[1] || '').length;
  if (decimalPlaces > 8) {
    throw createError({
      statusCode: 400,
      message: "Amount can have maximum 8 decimal places",
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

  // Check user's wallet balance
  const userWallet = await models.wallet.findOne({
    where: {
      userId: user.id,
      currency: pool.symbol,
      type: pool.walletType || 'SPOT'
    }
  });

  if (!userWallet) {
    throw createError({
      statusCode: 400,
      message: `You don't have a ${pool.symbol} wallet. Please create one first.`,
    });
  }

  if (userWallet.balance < amount) {
    throw createError({
      statusCode: 400,
      message: `Insufficient balance. You have ${userWallet.balance} ${pool.symbol} but need ${amount} ${pool.symbol}`,
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

    // Deduct staked amount from user's wallet
    await userWallet.decrement('balance', {
      by: amount,
      transaction
    });

    // Create wallet transaction record for audit trail
    await models.walletTransaction.create({
      userId: user.id,
      walletId: userWallet.id,
      amount: amount,
      type: 'WITHDRAWAL',
      status: 'COMPLETED',
      description: `Staked ${amount} ${pool.symbol} in pool ${pool.name}`,
      metadata: {
        source: 'STAKING',
        positionId: position.id,
        poolId: pool.id
      }
    }, { transaction });

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
