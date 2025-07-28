import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Delete All Notifications",
  description: "Deletes all notifications for the authenticated creator.",
  operationId: "deleteAllNotifications",
  tags: ["ICO", "Creator", "Notifications"],
  requiresAuth: true,
  responses: {
    200: { description: "All notifications deleted successfully." },
    401: { description: "Unauthorized" },
    500: { description: "Internal Server Error" },
  },
};

export default async (data: { user?: any }) => {
  const { user } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }
  await models.notification.destroy({
    where: { userId: user.id },
    force: true,
  });
  return { message: "All notifications deleted successfully." };
};
