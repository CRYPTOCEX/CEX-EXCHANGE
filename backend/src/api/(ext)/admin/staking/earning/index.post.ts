import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { createNotification } from "@b/utils/notifications";

export const metadata = {
  summary: "Add Admin Earning",
  description: "Creates a new admin earning record.",
  operationId: "addAdminEarning",
  tags: ["Staking", "Admin", "Earnings"],
  requiresAuth: true,
  requestBody: {
    description: "Admin earning data",
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            poolId: { type: "string" },
            date: { type: "string", format: "date-time" },
            amount: { type: "number" },
            isClaimed: { type: "boolean" },
            type: { type: "string" },
            status: { type: "string" },
            currency: { type: "string" },
          },
          required: ["poolId", "date", "amount", "type", "status", "currency"],
        },
      },
    },
  },
  responses: {
    201: {
      description: "Earning record created successfully",
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
  permission: "create.staking.earning",
};

export default async (data: { user?: any; body?: any }) => {
  const { user, body } = data;

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  if (!body) {
    throw createError({ statusCode: 400, message: "Request body is required" });
  }

  const {
    poolId,
    date,
    amount,
    type,
    status,
    currency,
    isClaimed = false,
  } = body;

  if (
    !poolId ||
    !date ||
    amount === undefined ||
    !type ||
    !status ||
    !currency
  ) {
    throw createError({
      statusCode: 400,
      message: "poolId, date, amount, type, status, and currency are required",
    });
  }

  try {
    // Check if the pool exists
    const pool = await models.stakingPool.findByPk(poolId);
    if (!pool) {
      throw createError({ statusCode: 404, message: "Pool not found" });
    }

    // Create the admin earning record
    const adminEarning = await models.stakingAdminEarning.create({
      poolId,
      date,
      amount,
      isClaimed,
      type,
      status,
      currency,
      createdAt: new Date(),
    });

    // Fetch the created record with its pool
    const createdEarning = await models.stakingAdminEarning.findOne({
      where: { id: adminEarning.id },
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
        relatedId: adminEarning.id,
        type: "system",
        title: "Admin Earning Added",
        message: `New admin earning of ${amount} ${currency} has been added for ${pool.name}.`,
        details: "The earning record has been created successfully.",
        link: `/admin/staking/earnings`,
        actions: [
          {
            label: "View Earnings",
            link: `/admin/staking/earnings`,
            primary: true,
          },
        ],
      });
    } catch (notifErr) {
      console.error(
        "Failed to create notification for admin earning",
        notifErr
      );
      // Continue execution even if notification fails
    }

    return createdEarning;
  } catch (error) {
    if (error.statusCode === 404) {
      throw error;
    }
    console.error("Error creating admin earning:", error);
    throw createError({
      statusCode: 500,
      message: error.message,
    });
  }
};
