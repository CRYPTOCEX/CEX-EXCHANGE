import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Mark All Notifications as Read",
  description: "Marks all notifications as read for the authenticated creator.",
  operationId: "markAllNotificationsRead",
  tags: ["ICO", "Creator", "Notifications"],
  requiresAuth: true,
  responses: {
    200: { description: "All notifications marked as read successfully." },
    401: { description: "Unauthorized" },
    500: { description: "Internal Server Error" },
  },
};

export default async (data: { user?: any }) => {
  const { user } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }
  await models.notification.update(
    { read: true },
    { where: { userId: user.id } }
  );
  return { message: "All notifications marked as read successfully." };
};
