import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Get Roadmap Items for ICO Offering",
  description:
    "Retrieves roadmap items for the ICO offering for the authenticated creator.",
  operationId: "getCreatorTokenRoadmap",
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
  responses: {
    200: { description: "Roadmap items retrieved successfully." },
    401: { description: "Unauthorized" },
    404: { description: "Roadmap items not found" },
    500: { description: "Internal Server Error" },
  },
};

export default async (data: { user?: any; params?: any }) => {
  const { user, params } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }
  const { id } = params;
  if (!id) {
    throw createError({ statusCode: 400, message: "No offering ID provided" });
  }

  // Fetch roadmap items directly from the model while ensuring the offering belongs to the authenticated user.
  const roadmapItems = await models.icoRoadmapItem.findAll({
    where: { offeringId: id },
  });

  if (!roadmapItems) {
    throw createError({ statusCode: 404, message: "Roadmap items not found" });
  }

  return roadmapItems.map((rm: any) => rm.toJSON());
};
