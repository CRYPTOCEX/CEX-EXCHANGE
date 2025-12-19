import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Delete All Notifications",
  description: "Deletes all notifications for the authenticated creator.",
  operationId: "deleteAllNotifications",
  tags: ["ICO", "Creator", "Notifications"],
  requiresAuth: true,
  logModule: "USER",
  logTitle: "Delete all notifications",
  responses: {
    200: { description: "All notifications deleted successfully." },
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
  ctx?.step("Deleting all notifications");
  await models.notification.destroy({
    where: { userId: user.id },
    force: true,
  });
  ctx?.success("All notifications deleted successfully");
  return { message: "All notifications deleted successfully." };
};
