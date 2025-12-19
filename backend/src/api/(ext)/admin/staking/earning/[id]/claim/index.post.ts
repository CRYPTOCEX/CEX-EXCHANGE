import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { createNotification } from "@b/utils/notifications";
import {
  badRequestResponse,
  unauthorizedResponse,
  notFoundResponse,
  serverErrorResponse,
  successMessageResponse,
} from "@b/utils/schema/errors";

export const metadata = {
  summary: "Claim Admin Earning",
  operationId: "claimAdminEarning",
  description:
    "Marks an admin earning record as claimed. This updates the isClaimed flag to true, indicating that the platform has processed and claimed this earning. Once claimed, the earning cannot be claimed again.",
  tags: ["Admin", "Staking", "Earnings"],
  requiresAuth: true,
  logModule: "ADMIN_STAKE",
  logTitle: "Claim Admin Earning",
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      schema: { type: "string", format: "uuid" },
      description: "Admin earning record ID",
    },
  ],
  responses: {
    200: successMessageResponse("Admin earning claimed successfully"),
    400: badRequestResponse,
    401: unauthorizedResponse,
    404: notFoundResponse("Admin Earning"),
    500: serverErrorResponse,
  },
  permission: "edit.staking.earning",
};

export default async (data: { user?: any; params?: any; ctx?: any }) => {
  const { user, params, ctx } = data;

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const earningId = params.id;
  if (!earningId) {
    throw createError({ statusCode: 400, message: "Earning ID is required" });
  }

  try {
    ctx?.step("Find earning to claim");
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
      ctx?.success("Earning already claimed");
      return { message: "Earning already claimed" };
    }

    ctx?.step("Mark earning as claimed");
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
      }, ctx);
    } catch (notifErr) {
      console.error(
        "Failed to create notification for claiming admin earning",
        notifErr
      );
      // Continue execution even if notification fails
    }

    ctx?.success("Earning claimed successfully");
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
