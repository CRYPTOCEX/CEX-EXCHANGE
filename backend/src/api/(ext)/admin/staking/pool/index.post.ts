import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { createNotification } from "@b/utils/notifications";

export const metadata = {
  summary: "Create Staking Pool",
  description: "Creates a new staking pool with the provided details.",
  operationId: "createStakingPool",
  tags: ["Staking", "Admin", "Pools"],
  requiresAuth: true,
  requestBody: {
    description: "Staking pool data",
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
          required: [
            "name",
            "token",
            "symbol",
            "description",
            "apr",
            "lockPeriod",
            "minStake",
            "totalStaked",
            "availableToStake",
            "earlyWithdrawalFee",
            "adminFeePercentage",
            "status",
            "earningFrequency",
          ],
        },
      },
    },
  },
  responses: {
    201: {
      description: "Pool created successfully",
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
    500: { description: "Internal Server Error" },
  },
  permission: "create.staking.pool",
};

export default async (data: { user?: any; body?: any }) => {
  const { user, body } = data;

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  if (!body) {
    throw createError({ statusCode: 400, message: "Request body is required" });
  }

  try {
    // Get the highest order value to place the new pool at the end
    const highestOrderPool = await models.stakingPool.findOne({
      attributes: ["order"],
      order: [["order", "DESC"]],
      raw: true,
    });

    const nextOrder = highestOrderPool ? highestOrderPool.order + 1 : 1;

    // Create the new pool
    const newPool = await models.stakingPool.create({
      ...body,
      order: body.order || nextOrder,
    });

    // Create a notification for the admin
    try {
      await createNotification({
        userId: user.id,
        relatedId: newPool.id,
        type: "system",
        title: "Staking Pool Created",
        message: `New staking pool "${newPool.name}" has been created successfully.`,
        details: "The pool is now available in the admin dashboard.",
        link: `/admin/staking/pools/${newPool.id}`,
        actions: [
          {
            label: "View Pool",
            link: `/admin/staking/pools/${newPool.id}`,
            primary: true,
          },
        ],
      });
    } catch (notifErr) {
      console.error(
        "Failed to create notification for pool creation",
        notifErr
      );
    }

    return newPool;
  } catch (error) {
    console.error("Error creating staking pool:", error);
    
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
      message: error.message || "Failed to create staking pool",
    });
  }
};
