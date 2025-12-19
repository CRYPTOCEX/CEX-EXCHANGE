import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Mark All Notifications as Read",
  description: "Marks all notifications as read for the authenticated creator.",
  operationId: "markAllNotificationsRead",
  tags: ["ICO", "Creator", "Notifications"],
  requiresAuth: true,
  logModule: "USER",
  logTitle: "Mark all notifications as read",
  responses: {
    200: { description: "All notifications marked as read successfully." },
    401: { description: "Unauthorized" },
    500: { description: "Internal Server Error" },
  },
};

export default async (data: { user?: any; ctx?: any }) => {
  const { user, ctx } = data;
  if (!user?.id) {
    ctx?.fail("User not authenticated");
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }
  ctx?.step("Marking all notifications as read");
  await models.notification.update(
    { read: true },
    { where: { userId: user.id } }
  );
  ctx?.success("All notifications marked as read");
  return { message: "All notifications marked as read successfully." };
};
