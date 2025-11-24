import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { createNotification } from "@b/utils/notifications";

export const metadata = {
  summary: "Claim Admin Earning",
  description: "Marks an admin earning as claimed.",
  operationId: "claimAdminEarning",
  tags: ["Staking", "Admin", "Earnings"],
  requiresAuth: true,
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      schema: { type: "string" },
      description: "Earning ID",
    },
  ],
  responses: {
    200: {
      description: "Earning claimed successfully",
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
    404: { description: "Earning not found" },
    500: { description: "Internal Server Error" },
  },
  permission: "edit.staking.earning",
};

export default async (data: { user?: any; params?: any }) => {
  const { user, params } = data;

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const earningId = params.id;
  if (!earningId) {
    throw createError({ statusCode: 400, message: "Earning ID is required" });
  }

  try {
    // Find the earning to claim
    const earning = await models.stakingAdminEarning.findOne({
      where: { id: earningId },
      include: [
        {
          model: models.stakingPool,
          as: "pool",
        },
      ],
    });

    if (!earning) {
      throw createError({ statusCode: 404, message: "Earning not found" });
    }

    if (earning.isClaimed) {
      return { message: "Earning already claimed" };
    }

    // Update the earning to claimed
    await earning.update({ isClaimed: true });

    // Create a notification for the admin
    try {
      await createNotification({
        userId: user.id,
        relatedId: earning.id,
        type: "system",
        title: "Admin Earning Claimed",
        message: `Admin earning of ${earning.amount} ${earning.currency} for ${earning.pool.name} has been claimed.`,
        details: "The earning has been marked as claimed.",
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
        "Failed to create notification for claiming admin earning",
        notifErr
      );
      // Continue execution even if notification fails
    }

    return { message: "Earning claimed successfully" };
  } catch (error) {
    if (error.statusCode === 404) {
      throw error;
    }
    console.error(`Error claiming admin earning ${earningId}:`, error);
    throw createError({
      statusCode: 500,
      message: error.message,
    });
  }
};
