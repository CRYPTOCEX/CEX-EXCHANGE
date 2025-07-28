import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Get Notifications for Creator",
  description:
    "Retrieves notifications for the authenticated creator along with aggregated statistics.",
  operationId: "getCreatorNotifications",
  tags: ["ICO", "Creator", "Notifications"],
  requiresAuth: true,
  responses: {
    200: {
      description: "Notifications retrieved successfully.",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              notifications: { type: "array", items: { type: "object" } },
              stats: {
                type: "object",
                properties: {
                  total: { type: "number" },
                  unread: { type: "number" },
                  types: {
                    type: "object",
                    properties: {
                      investment: { type: "number" },
                      message: { type: "number" },
                      alert: { type: "number" },
                      system: { type: "number" },
                      user: { type: "number" },
                    },
                  },
                  trend: {
                    type: "object",
                    properties: {
                      percentage: { type: "number" },
                      increasing: { type: "boolean" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    401: { description: "Unauthorized" },
    500: { description: "Internal Server Error" },
  },
};

export default async (data: Handler) => {
  const { user } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  // Fetch notifications for the user, sorted by creation date descending.
  const notifications = await models.notification.findAll({
    where: { userId: user.id },
    order: [["createdAt", "DESC"]],
    raw: true,
  });

  // Calculate statistics
  const total = notifications.length;
  const unread = notifications.filter((n) => !n.read).length;
  const typeCounts = notifications.reduce(
    (acc, n) => {
      acc[n.type] = (acc[n.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  // Dummy trend values – replace with real logic as needed.
  const stats = {
    total,
    unread,
    types: {
      investment: typeCounts.investment || 0,
      message: typeCounts.message || 0,
      alert: typeCounts.alert || 0,
      system: typeCounts.system || 0,
      user: typeCounts.user || 0,
    },
    trend: {
      percentage: 0,
      increasing: true,
    },
  };

  return { notifications, stats };
};
