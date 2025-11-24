import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { createNotification } from "@b/utils/notifications";

export const metadata = {
  summary: "Add a Roadmap Item",
  description:
    "Adds a new roadmap item to the specified ICO offering for the authenticated creator.",
  operationId: "addRoadmapItem",
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
  ],
  requestBody: {
    description: "Roadmap item data",
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
    200: { description: "Roadmap item added successfully" },
    400: { description: "Bad Request" },
    401: { description: "Unauthorized" },
    500: { description: "Internal Server Error" },
  },
};

export default async (data: { user?: any; params?: any; body?: any }) => {
  const { user, params, body } = data;
  const offeringId = params.id;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }
  if (!offeringId) {
    throw createError({ statusCode: 400, message: "Offering ID is required" });
  }

  // Fetch offering with plan and existing roadmap items for limit check.
  const offering = await models.icoTokenOffering.findOne({
    where: { id: offeringId, userId: user.id },
    include: [
      { model: models.icoLaunchPlan, as: "plan" },
      { model: models.icoRoadmapItem, as: "roadmapItems" },
    ],
  });
  if (!offering) {
    throw createError({ statusCode: 404, message: "Offering not found" });
  }

  // Check roadmap item limit based on the launch plan's features.
  if (
    offering.plan &&
    offering.roadmapItems.length >= offering.plan.features.maxRoadmapItems
  ) {
    throw createError({
      statusCode: 400,
      message:
        "Roadmap item limit reached. Upgrade your plan to add more roadmap items.",
    });
  }

  const { title, description, date, completed } = body;
  await models.icoRoadmapItem.create({
    offeringId,
    title,
    description,
    date,
    completed,
  });

  // Create a notification about the new roadmap item.
  try {
    await createNotification({
      userId: user.id,
      relatedId: offeringId,
      type: "system",
      title: "New Roadmap Item Added",
      message: `New roadmap item "${title}" added successfully.`,
      details: "A new roadmap item has been added to your offering.",
      link: `/ico/creator/token/${offeringId}?tab=roadmap`,
      actions: [
        {
          label: "View Offering",
          link: `/ico/creator/token/${offeringId}?tab=roadmap`,
          primary: true,
        },
      ],
    });
  } catch (notifErr) {
    console.error(
      "Failed to create notification for adding roadmap item",
      notifErr
    );
  }

  return { message: "Roadmap item added successfully" };
};
