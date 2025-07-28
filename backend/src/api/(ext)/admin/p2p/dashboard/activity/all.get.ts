import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Get All Activity (Admin)",
  description: "Retrieves all activity logs for the admin dashboard.",
  operationId: "getAllAdminP2PActivity",
  tags: ["Admin", "Dashboard", "Activity", "P2P"],
  requiresAuth: true,
  responses: {
    200: { description: "All activity logs retrieved successfully." },
    401: { description: "Unauthorized." },
    500: { description: "Internal Server Error." },
  },
  permission: "view.p2p.activity",
};

export default async (data) => {
  try {
    // Retrieve all activity logs ordered by creation date in descending order.
    const activityLogs = await models.p2pActivityLog.findAll({
      order: [["createdAt", "DESC"]],
      raw: true,
    });

    const allActivity = activityLogs.map((log) => ({
      id: log.id,
      type: log.type,
      title: log.action,
      description: log.details,
      createdAt: log.createdAt,
      status: "active",
      priority: "medium",
      user: { id: log.userId },
    }));

    return allActivity;
  } catch (err) {
    throw createError({
      statusCode: 500,
      message: "Internal Server Error: " + err.message,
    });
  }
};
