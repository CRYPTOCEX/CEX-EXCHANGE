import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Mark Notification as Unread",
  description:
    "Marks the specified notification as unread for the authenticated creator.",
  operationId: "markNotificationUnread",
  tags: ["ICO", "Creator", "Notifications"],
  requiresAuth: true,
  logModule: "USER",
  logTitle: "Mark notification as unread",
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
    200: { description: "Notification marked as unread successfully." },
    401: { description: "Unauthorized" },
    404: { description: "Notification not found" },
    500: { description: "Internal Server Error" },
  },
};

export default async (data: { user?: any; params?: any; ctx?: any }) => {
  const { user, params, ctx } = data;
  if (!user?.id) {
    ctx?.fail("User not authenticated");
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }
  const notificationId = params.id;
  if (!notificationId) {
    ctx?.fail("Notification ID missing");
    throw createError({
      statusCode: 400,
      message: "Notification ID is required",
    });
  }
  ctx?.step("Finding notification");
  const notification = await models.notification.findOne({
    where: { id: notificationId, userId: user.id },
  });
  if (!notification) {
    ctx?.fail("Notification not found");
    throw createError({ statusCode: 404, message: "Notification not found" });
  }
  ctx?.step("Marking notification as unread");
  await notification.update({ read: false });
  ctx?.success("Notification marked as unread");
  return { message: "Notification marked as unread successfully." };
};
