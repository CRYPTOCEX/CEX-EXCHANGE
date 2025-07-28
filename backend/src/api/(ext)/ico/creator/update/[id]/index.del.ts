import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { createNotification } from "@b/utils/notifications";

export const metadata = {
  summary: "Delete a Token Offering Update",
  description:
    "Deletes an update for a token offering by the authenticated creator.",
  operationId: "deleteTokenOfferingUpdate",
  tags: ["ICO", "Creator", "Updates"],
  requiresAuth: true,
  parameters: [
    {
      index: 0,
      name: "updateId",
      in: "path",
      description: "Token offering update ID",
      required: true,
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "Token offering update deleted successfully.",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: { message: { type: "string" } },
          },
        },
      },
    },
    401: { description: "Unauthorized" },
    404: { description: "Not Found" },
    500: { description: "Internal Server Error" },
  },
};

export default async (data: Handler) => {
  const { user, params } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }
  const { updateId } = params;
  if (!updateId) {
    throw createError({ statusCode: 400, message: "Missing update ID" });
  }

  const updateRecord = await models.icoTokenOfferingUpdate.findByPk(updateId);
  if (!updateRecord) {
    throw createError({ statusCode: 404, message: "Update not found" });
  }
  if (updateRecord.userId !== user.id) {
    throw createError({ statusCode: 403, message: "Forbidden" });
  }

  // Capture title for notification
  const deletedTitle = updateRecord.title;
  await updateRecord.destroy();

  try {
    await createNotification({
      userId: user.id,
      relatedId: updateRecord.offeringId,
      type: "system",
      title: "Update Deleted",
      message: `Token offering update "${deletedTitle}" has been deleted successfully.`,
      details:
        "Your update has been removed. You can always add new updates to keep your investors informed.",
      link: updateRecord.offeringId
        ? `/ico/creator/token/${updateRecord.offeringId}?tab=updates`
        : undefined,
      actions: updateRecord.offeringId
        ? [
            {
              label: "View Offering",
              link: `/ico/creator/token/${updateRecord.offeringId}?tab=updates`,
              primary: true,
            },
          ]
        : [],
    });
  } catch (notifErr) {
    console.error(
      "Failed to create notification for update deletion",
      notifErr
    );
  }

  return { message: "Update deleted successfully." };
};
