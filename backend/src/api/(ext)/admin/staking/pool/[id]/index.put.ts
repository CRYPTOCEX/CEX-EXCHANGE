import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { createNotification } from "@b/utils/notifications";

export const metadata = {
  summary: "Update Staking Pool",
  description: "Updates an existing staking pool with the provided details.",
  operationId: "updateStakingPool",
  tags: ["Staking", "Admin", "Pools"],
  requiresAuth: true,
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      schema: { type: "string" },
      description: "Pool ID",
    },
  ],
  requestBody: {
    description: "Updated staking pool data",
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            name: { type: "string" },
            token: { type: "string" },
            symbol: { type: "string" },
            icon: { type: "string" },
            description: { type: "string" },
            apr: { type: "number" },
            lockPeriod: { type: "number" },
            minStake: { type: "number" },
            maxStake: { type: "number", nullable: true },
            totalStaked: { type: "number" },
            availableToStake: { type: "number" },
            earlyWithdrawalFee: { type: "number" },
            adminFeePercentage: { type: "number" },
            status: {
              type: "string",
              enum: ["ACTIVE", "INACTIVE", "COMING_SOON"],
            },
            isPromoted: { type: "boolean" },
            order: { type: "number" },
            earningFrequency: {
              type: "string",
              enum: ["DAILY", "WEEKLY", "MONTHLY", "END_OF_TERM"],
            },
            autoCompound: { type: "boolean" },
            externalPoolUrl: { type: "string" },
            profitSource: { type: "string" },
            fundAllocation: { type: "string" },
            risks: { type: "string" },
            rewards: { type: "string" },
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: "Pool updated successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
          },
        },
      },
    },
    400: { description: "Bad Request" },
    401: { description: "Unauthorized" },
    404: { description: "Pool not found" },
    500: { description: "Internal Server Error" },
  },
  permission: "edit.staking.pool",
};

export default async (data: { user?: any; params?: any; body?: any }) => {
  const { user, params, body } = data;

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const poolId = params.id;
  if (!poolId) {
    throw createError({ statusCode: 400, message: "Pool ID is required" });
  }

  if (!body) {
    throw createError({ statusCode: 400, message: "Request body is required" });
  }

  try {
    // Find the pool to update
    const pool = await models.stakingPool.findOne({
      where: { id: poolId },
    });

    if (!pool) {
      throw createError({ statusCode: 404, message: "Pool not found" });
    }

    // Update the pool
    await pool.update(body);

    // Reload the pool with associations
    const updatedPool = await models.stakingPool.findOne({
      where: { id: poolId },
      include: [
        {
          model: models.stakingPosition,
          as: "positions",
          required: false,
        },
        {
          model: models.stakingAdminEarning,
          as: "adminEarnings",
          required: false,
        },
        {
          model: models.stakingExternalPoolPerformance,
          as: "performances",
          required: false,
        },
      ],
    });

    // Create a notification for the admin
    try {
      await createNotification({
        userId: user.id,
        relatedId: pool.id,
        type: "system",
        title: "Staking Pool Updated",
        message: `Staking pool "${pool.name}" has been updated successfully.`,
        details: "The changes are now reflected in the admin dashboard.",
        link: `/admin/staking/pools/${pool.id}`,
        actions: [
          {
            label: "View Pool",
            link: `/admin/staking/pools/${pool.id}`,
            primary: true,
          },
        ],
      });
    } catch (notifErr) {
      console.error("Failed to create notification for pool update", notifErr);
      // Continue execution even if notification fails
    }

    return updatedPool;
  } catch (error) {
    if (error.statusCode === 404) {
      throw error;
    }
    
    console.error(`Error updating staking pool ${poolId}:`, error);
    
    // Handle Sequelize validation errors
    if (error.name === "SequelizeValidationError") {
      const validationErrors = {};
      error.errors.forEach((err) => {
        validationErrors[err.path] = err.message;
      });
      
      // Create a custom error object with validation details
      const validationError = createError({
        statusCode: 400,
        message: "Validation failed. Please check the required fields.",
      });
      // Add validation errors as a property
      (validationError as any).validationErrors = validationErrors;
      throw validationError;
    }
    
    // Handle other Sequelize errors
    if (error.name === "SequelizeUniqueConstraintError") {
      throw createError({
        statusCode: 400,
        message: "A pool with this name or symbol already exists",
      });
    }
    
    // Handle generic errors
    throw createError({
      statusCode: 500,
      message: error.message || "Failed to update staking pool",
    });
  }
};
