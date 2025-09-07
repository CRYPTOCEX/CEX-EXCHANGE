import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { createNotification } from "@b/utils/notifications";

export const metadata = {
  summary: "Upgrade ICO Offering Plan",
  description:
    "Updates the launch plan for the specified ICO offering for the authenticated creator.",
  operationId: "upgradeOfferingPlan",
  tags: ["ICO", "Creator", "Plan"],
  requiresAuth: true,
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "ICO offering ID",
      required: true,
      schema: { type: "string" },
    },
  ],
  requestBody: {
    description: "New plan ID",
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            planId: { type: "string" },
          },
          required: ["planId"],
        },
      },
    },
  },
  responses: {
    200: { description: "Plan upgraded successfully" },
    400: { description: "Bad Request" },
    401: { description: "Unauthorized" },
    404: { description: "Offering not found" },
    500: { description: "Internal Server Error" },
  },
};

export default async (data: { user?: any; params?: any; body?: any }) => {
  const { user, params, body } = data;
  const offeringId = params.id;
  const { planId } = body;

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }
  if (!offeringId || !planId) {
    throw createError({
      statusCode: 400,
      message: "Offering ID and planId are required",
    });
  }

  // Ensure the offering belongs to the current creator.
  const offering = await models.icoTokenOffering.findOne({
    where: { id: offeringId, userId: user.id },
  });
  if (!offering) {
    throw createError({ statusCode: 404, message: "Offering not found" });
  }

  // Update the offering with the new plan.
  await offering.update({ planId });

  // Create a detailed notification regarding the plan upgrade.
  try {
    await createNotification({
      userId: user.id,
      relatedId: offering.id,
      type: "system",
      title: "ICO Offering Plan Upgraded",
      message: `Your ICO offering "${offering.name}" has been upgraded successfully.`,
      details:
        "Your offering plan has been updated to the new plan. Please check your dashboard to review the updated features and benefits.",
      link: `/ico/creator/token/${offering.id}`,
      actions: [
        {
          label: "View Offering",
          link: `/ico/creator/token/${offering.id}`,
          primary: true,
        },
      ],
    });
  } catch (notifErr) {
    console.error("Failed to create notification for plan upgrade", notifErr);
    // Decide if you want to fail the request here or log and continue.
  }

  return { message: "Plan upgraded successfully" };
};
