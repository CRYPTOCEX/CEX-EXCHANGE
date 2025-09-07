import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { createNotification } from "@b/utils/notifications";

export const metadata = {
  summary: "Update a Roadmap Item",
  description:
    "Updates a roadmap item of a specified ICO offering for the authenticated creator.",
  operationId: "updateRoadmapItem",
  tags: ["ICO", "Creator", "Roadmap"],
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
    {
      index: 1,
      name: "roadmapId",
      in: "path",
      description: "Roadmap item ID",
      required: true,
      schema: { type: "string" },
    },
  ],
  requestBody: {
    description: "Updated roadmap item data",
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            date: { type: "string" },
            completed: { type: "boolean" },
          },
          required: ["title", "description", "date"],
        },
      },
    },
  },
  responses: {
    200: { description: "Roadmap item updated successfully" },
    400: { description: "Bad Request" },
    401: { description: "Unauthorized" },
    404: { description: "Roadmap item not found" },
    500: { description: "Internal Server Error" },
  },
};

export default async (data: { user?: any; params?: any; body?: any }) => {
  const { user, params, body } = data;
  const { id, roadmapId } = params;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }
  if (!id || !roadmapId) {
    throw createError({
      statusCode: 400,
      message: "Offering ID and Roadmap Item ID are required",
    });
  }

  const roadmapItem = await models.icoRoadmapItem.findOne({
    where: { id: roadmapId, offeringId: id },
  });
  if (!roadmapItem) {
    throw createError({ statusCode: 404, message: "Roadmap item not found" });
  }

  // Save the old title before updating for notification details.
  const oldTitle = roadmapItem.title;

  await roadmapItem.update(body);

  // Create a notification about the update.
  try {
    await createNotification({
      userId: user.id,
      relatedId: id,
      type: "system",
      title: "Roadmap Item Updated",
      message: `Roadmap item "${body.title}" updated successfully.`,
      details: `The roadmap item has been updated.${
        oldTitle !== body.title
          ? ` Title changed from "${oldTitle}" to "${body.title}".`
          : ""
      }`,
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
    console.error("Failed to create update notification", notifErr);
  }

  return { message: "Roadmap item updated successfully" };
};
