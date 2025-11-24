import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Mark Notification as Read",
  description:
    "Marks the specified notification as read for the authenticated creator.",
  operationId: "markNotificationRead",
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
    200: { description: "Notification marked as read successfully." },
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
  await notification.update({ read: true });
  return { message: "Notification marked as read successfully." };
};
