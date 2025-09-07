import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { createNotification } from "@b/utils/notifications";

export const metadata = {
  summary: "Add External Pool Performance",
  description: "Creates a new external pool performance record.",
  operationId: "addExternalPoolPerformance",
  tags: ["Staking", "Admin", "Performance"],
  requiresAuth: true,
  requestBody: {
    description: "External pool performance data",
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            poolId: { type: "string" },
            date: { type: "string", format: "date-time" },
            apr: { type: "number" },
            totalStaked: { type: "number" },
            profit: { type: "number" },
            notes: { type: "string" },
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
          },
        },
      },
    },
    400: { description: "Bad Request" },
    401: { description: "Unauthorized" },
    404: { description: "Pool not found" },
    500: { description: "Internal Server Error" },
  },
  permission: "create.staking.performance",
};

export default async (data: { user?: any; body?: any }) => {
  const { user, body } = data;

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
    // Check if the pool exists
    const pool = await models.stakingPool.findByPk(poolId);
    if (!pool) {
      throw createError({ statusCode: 404, message: "Pool not found" });
    }

    // Create the performance record
    const performance = await models.stakingExternalPoolPerformance.create({
      poolId,
      date,
      apr,
      totalStaked,
      profit,
      notes,
    });

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
      });
    } catch (notifErr) {
      console.error(
        "Failed to create notification for performance record",
        notifErr
      );
      // Continue execution even if notification fails
    }

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
