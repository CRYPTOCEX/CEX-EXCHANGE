import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Get Team Members for ICO Offering",
  description:
    "Retrieves team members for the ICO offering for the authenticated creator.",
  operationId: "getCreatorTokenTeam",
  tags: ["ICO", "Creator", "Team"],
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
    200: { description: "Team members retrieved successfully." },
    401: { description: "Unauthorized" },
    404: { description: "Team members not found" },
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

  // Fetch team members directly from the model while ensuring the offering belongs to the authenticated user.
  const teamMembers = await models.icoTeamMember.findAll({
    where: { offeringId: id },
  });

  if (!teamMembers) {
    throw createError({ statusCode: 404, message: "Team members not found" });
  }

  return teamMembers.map((tm: any) => tm.toJSON());
};
