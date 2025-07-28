import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { createNotification } from "@b/utils/notifications";

export const metadata = {
  summary: "Update a Team Member",
  description:
    "Updates a team member of a specified ICO offering for the authenticated creator.",
  operationId: "updateTeamMember",
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
    {
      index: 1,
      name: "teamId",
      in: "path",
      description: "Team member ID",
      required: true,
      schema: { type: "string" },
    },
  ],
  requestBody: {
    description: "Updated team member data",
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            name: { type: "string" },
            role: { type: "string" },
            bio: { type: "string" },
            avatar: { type: "string" },
            linkedin: { type: "string" },
            twitter: { type: "string" },
            website: { type: "string" },
            github: { type: "string" },
          },
          required: ["name", "role", "bio"],
        },
      },
    },
  },
  responses: {
    200: { description: "Team member updated successfully" },
    400: { description: "Bad Request" },
    401: { description: "Unauthorized" },
    404: { description: "Team member not found" },
    500: { description: "Internal Server Error" },
  },
};

export default async (data: { user?: any; params?: any; body?: any }) => {
  const { user, params, body } = data;
  const { id, teamId } = params;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }
  if (!id || !teamId) {
    throw createError({
      statusCode: 400,
      message: "Offering ID and Team Member ID are required",
    });
  }

  const teamMember = await models.icoTeamMember.findOne({
    where: { id: teamId, offeringId: id },
  });
  if (!teamMember) {
    throw createError({ statusCode: 404, message: "Team member not found" });
  }

  // Capture the old name before updating
  const oldName = teamMember.name;
  await teamMember.update(body);

  // Create a notification for the update.
  try {
    await createNotification({
      userId: user.id,
      relatedId: id,
      type: "system",
      title: "Team Member Updated",
      message: `Team member "${body.name}" updated successfully.`,
      details: `The team member details have been updated.${oldName !== body.name ? ` Name changed from "${oldName}" to "${body.name}".` : ""}`,
      link: `/ico/creator/token/${id}?tab=team`,
      actions: [
        {
          label: "View Team",
          link: `/ico/creator/token/${id}?tab=team`,
          primary: true,
        },
      ],
    });
  } catch (notifErr) {
    console.error(
      "Failed to create update notification for team member",
      notifErr
    );
  }

  return { message: "Team member updated successfully" };
};
