import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { createNotification } from "@b/utils/notifications";

export const metadata = {
  summary: "Delete a Roadmap Item",
  description:
    "Deletes a roadmap item from the specified ICO offering for the authenticated creator.",
  operationId: "deleteRoadmapItem",
  tags: ["ICO", "Creator", "Roadmap"],
  requiresAuth: true,
  logModule: "ICO",
  logTitle: "Delete ICO Roadmap Item",
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "ICO offering ID",
      required: true,
      schema: { type: "string" },
    },
    {
      index: 1,
      name: "roadmapId",
      in: "path",
      description: "Roadmap item ID",
      required: true,
      schema: { type: "string" },
    },
  ],
  responses: {
    200: { description: "Roadmap item deleted successfully" },
    401: { description: "Unauthorized" },
    404: { description: "Roadmap item not found" },
    500: { description: "Internal Server Error" },
  },
};

export default async (data: { user?: any; params?: any; ctx?: any }) => {
  const { user, params, ctx } = data;
  const { id, roadmapId } = params;

  ctx?.step?.("Validating user authentication");
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  ctx?.step?.("Validating request parameters");
  if (!id || !roadmapId) {
    throw createError({
      statusCode: 400,
      message: "Offering ID and Roadmap Item ID are required",
    });
  }

  ctx?.step?.("Fetching roadmap item from database");
  const roadmapItem = await models.icoRoadmapItem.findOne({
    where: { id: roadmapId, offeringId: id },
  });
  if (!roadmapItem) {
    throw createError({ statusCode: 404, message: "Roadmap item not found" });
  }

  // Store the title for the notification
  const deletedTitle = roadmapItem.title;

  ctx?.step?.("Deleting roadmap item");
  await roadmapItem.destroy();

  // Create a notification informing the user about the deletion.
  ctx?.step?.("Creating deletion notification");
  try {
    await createNotification({
      userId: user.id,
      relatedId: id,
      type: "system",
      title: "Roadmap Item Deleted",
      message: `Roadmap item "${deletedTitle}" deleted successfully.`,
      details: "The selected roadmap item has been removed from your offering.",
      link: `/ico/creator/token/${id}?tab=roadmap`,
      actions: [
        {
          label: "View Offering",
          link: `/ico/creator/token/${id}?tab=roadmap`,
          primary: true,
        },
      ],
    });
  } catch (notifErr) {
    console.error("Failed to create deletion notification", notifErr);
  }

  ctx?.success?.("Roadmap item deleted successfully");
  return { message: "Roadmap item deleted successfully" };
};
