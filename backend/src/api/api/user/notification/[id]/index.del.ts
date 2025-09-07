import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Delete a Notification",
  description:
    "Deletes the specified notification for the authenticated creator.",
  operationId: "deleteNotification",
  tags: ["ICO", "Creator", "Notifications"],
  requiresAuth: true,
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "Notification ID",
      required: true,
      schema: { type: "string" },
    },
  ],
  responses: {
    200: { description: "Notification deleted successfully." },
    401: { description: "Unauthorized" },
    404: { description: "Notification not found" },
    500: { description: "Internal Server Error" },
  },
};

export default async (data: { user?: any; params?: any }) => {
  const { user, params } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }
  const notificationId = params.id;
  if (!notificationId) {
    throw createError({
      statusCode: 400,
      message: "Notification ID is required",
    });
  }
  const notification = await models.notification.findOne({
    where: { id: notificationId, userId: user.id },
  });
  if (!notification) {
    throw createError({ statusCode: 404, message: "Notification not found" });
  }
  await notification.destroy({
    force: true,
  });
  return { message: "Notification deleted successfully." };
};
