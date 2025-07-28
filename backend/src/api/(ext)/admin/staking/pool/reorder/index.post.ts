import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";
import { createNotification } from "@b/utils/notifications";

export const metadata = {
  summary: "Reorder Staking Pools",
  description:
    "Updates the order of staking pools based on the provided pool IDs array.",
  operationId: "reorderStakingPools",
  tags: ["Staking", "Admin", "Pools"],
  requiresAuth: true,
  requestBody: {
    description: "Pool IDs in the desired order",
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            poolIds: {
              type: "array",
              items: { type: "string" },
            },
          },
          required: ["poolIds"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Pools reordered successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: { type: "string" },
            },
          },
        },
      },
    },
    400: { description: "Bad Request" },
    401: { description: "Unauthorized" },
    500: { description: "Internal Server Error" },
  },
  permission: "edit.staking.pool",
};

export default async (data: { user?: any; body?: any }) => {
  const { user, body } = data;

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  if (
    !body?.poolIds ||
    !Array.isArray(body.poolIds) ||
    body.poolIds.length === 0
  ) {
    throw createError({
      statusCode: 400,
      message: "Pool IDs array is required and must not be empty",
    });
  }

  const { poolIds } = body;

  try {
    // Use a transaction to ensure all updates succeed or fail together
    await sequelize.transaction(async (t) => {
      // Update each pool's order based on its position in the array
      for (let i = 0; i < poolIds.length; i++) {
        await models.stakingPool.update(
          { order: i + 1 },
          {
            where: { id: poolIds[i] },
            transaction: t,
          }
        );
      }
    });

    // Create a notification for the admin
    try {
      await createNotification({
        userId: user.id,
        type: "system",
        title: "Staking Pools Reordered",
        message: "Staking pools have been reordered successfully.",
        details: "The new order is now reflected in the admin dashboard.",
        link: `/admin/staking/pools`,
        actions: [
          {
            label: "View Pools",
            link: `/admin/staking/pools`,
            primary: true,
          },
        ],
      });
    } catch (notifErr) {
      console.error(
        "Failed to create notification for pool reordering",
        notifErr
      );
      // Continue execution even if notification fails
    }

    return { message: "Pools reordered successfully" };
  } catch (error) {
    console.error("Error reordering staking pools:", error);
    throw createError({
      statusCode: 500,
      message: error.message,
    });
  }
};
