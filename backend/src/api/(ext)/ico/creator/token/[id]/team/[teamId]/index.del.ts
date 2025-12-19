import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { createNotification } from "@b/utils/notifications";

export const metadata = {
  summary: "Delete a Team Member",
  description:
    "Deletes a team member from the specified ICO offering for the authenticated creator.",
  operationId: "deleteTeamMember",
  tags: ["ICO", "Creator", "Team"],
  requiresAuth: true,
  logModule: "ICO",
  logTitle: "Delete ICO Team Member",
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
  responses: {
    200: { description: "Team member deleted successfully" },
    401: { description: "Unauthorized" },
    404: { description: "Team member not found" },
    500: { description: "Internal Server Error" },
  },
};

export default async (data: { user?: any; params?: any; ctx?: any }) => {
  const { user, params, ctx } = data;
  const { id, teamId } = params;

  ctx?.step?.("Validating user authentication");
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  ctx?.step?.("Validating request parameters");
  if (!id || !teamId) {
    throw createError({
      statusCode: 400,
      message: "Offering ID and Team Member ID are required",
    });
  }

  ctx?.step?.("Fetching team member from database");
  const teamMember = await models.icoTeamMember.findOne({
    where: { id: teamId, offeringId: id },
  });
  if (!teamMember) {
    throw createError({ statusCode: 404, message: "Team member not found" });
  }

  // Store the team member name for the notification
  const deletedName = teamMember.name;

  ctx?.step?.("Deleting team member");
  await teamMember.destroy();

  // Create a notification for team member deletion.
  ctx?.step?.("Creating deletion notification");
  try {
    await createNotification({
      userId: user.id,
      relatedId: id,
      type: "system",
      title: "Team Member Removed",
      message: `Team member "${deletedName}" has been removed successfully.`,
      details: "The selected team member was removed from your ICO offering.",
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
      "Failed to create notification for team member deletion",
      notifErr
    );
  }

  ctx?.success?.("Team member deleted successfully");
  return { message: "Team member deleted successfully" };
};
