import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { createNotification } from "@b/utils/notifications";
import {
  badRequestResponse,
  unauthorizedResponse,
  notFoundResponse,
  serverErrorResponse,
  commonFields,
} from "@b/utils/schema/errors";

export const metadata = {
  summary: "Create External Pool Performance Record",
  operationId: "createExternalPoolPerformance",
  description:
    "Creates a new performance record for an external staking pool. Records daily or periodic performance metrics including APR achieved, total amount staked, profit generated, and operational notes. Used for tracking and analyzing external pool performance over time.",
  tags: ["Admin", "Staking", "Performance"],
  requiresAuth: true,
  logModule: "ADMIN_STAKE",
  logTitle: "Add Pool Performance",
  requestBody: {
    description: "External pool performance data",
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            poolId: {
              type: "string",
              format: "uuid",
              description: "ID of the staking pool",
            },
            date: {
              type: "string",
              format: "date-time",
              description: "Date of the performance record",
            },
            apr: {
              type: "number",
              minimum: 0,
              description: "Annual Percentage Rate achieved",
            },
            totalStaked: {
              type: "number",
              minimum: 0,
              description: "Total amount staked in the pool",
            },
            profit: {
              type: "number",
              description: "Profit generated (can be negative)",
            },
            notes: {
              type: "string",
              description: "Additional notes or observations",
            },
          },
          required: ["poolId", "date", "apr", "totalStaked", "profit"],
        },
      },
    },
  },
  responses: {
    201: {
      description: "Performance record created successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              ...commonFields,
              poolId: { type: "string", format: "uuid" },
              date: { type: "string", format: "date-time" },
              apr: { type: "number" },
              totalStaked: { type: "number" },
              profit: { type: "number" },
              notes: { type: "string" },
              pool: {
                type: "object",
                description: "Associated staking pool details",
              },
            },
          },
        },
      },
    },
    400: badRequestResponse,
    401: unauthorizedResponse,
    404: notFoundResponse("Staking Pool"),
    500: serverErrorResponse,
  },
  permission: "create.staking.performance",
};

export default async (data: { user?: any; body?: any; ctx?: any }) => {
  const { user, body, ctx } = data;

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  if (!body) {
    throw createError({ statusCode: 400, message: "Request body is required" });
  }

  const { poolId, date, apr, totalStaked, profit, notes = "" } = body;

  if (
    !poolId ||
    !date ||
    apr === undefined ||
    totalStaked === undefined ||
    profit === undefined
  ) {
    throw createError({
      statusCode: 400,
      message: "poolId, date, apr, totalStaked, and profit are required",
    });
  }

  try {
    ctx?.step("Check if pool exists");
    // Check if the pool exists
    const pool = await models.stakingPool.findByPk(poolId);
    if (!pool) {
      throw createError({ statusCode: 404, message: "Pool not found" });
    }

    ctx?.step("Create performance record");
    // Create the performance record
    const performance = await models.stakingExternalPoolPerformance.create({
      poolId,
      date,
      apr,
      totalStaked,
      profit,
      notes,
    });

    ctx?.step("Fetch created performance with pool");
    // Fetch the created record with its pool
    const createdPerformance =
      await models.stakingExternalPoolPerformance.findOne({
        where: { id: performance.id },
        include: [
          {
            model: models.stakingPool,
            as: "pool",
          },
        ],
      });

    // Create a notification for the admin
    try {
      await createNotification({
        userId: user.id,
        relatedId: performance.id,
        type: "system",
        title: "Pool Performance Added",
        message: `New performance record added for ${pool.name} with ${apr}% APR.`,
        details: "The performance record has been created successfully.",
        link: `/admin/staking/performance`,
        actions: [
          {
            label: "View Performance",
            link: `/admin/staking/performance`,
            primary: true,
          },
        ],
      }, ctx);
    } catch (notifErr) {
      console.error(
        "Failed to create notification for performance record",
        notifErr
      );
      // Continue execution even if notification fails
    }

    ctx?.success("Pool performance record created successfully");
    return createdPerformance;
  } catch (error) {
    if (error.statusCode === 404) {
      throw error;
    }
    console.error("Error creating external pool performance:", error);
    throw createError({
      statusCode: 500,
      message: error.message,
    });
  }
};
