import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Get Recent Activity (Admin)",
  description:
    "Retrieves a list of recent activity logs for the admin dashboard.",
  operationId: "getRecentAdminP2PActivity",
  tags: ["Admin", "Dashboard", "Activity", "P2P"],
  requiresAuth: true,
  responses: {
    200: { description: "Recent activity logs retrieved successfully." },
    401: { description: "Unauthorized." },
    500: { description: "Internal Server Error." },
  },
  permission: "view.p2p.activity",
};

export default async (data) => {
  try {
    // Retrieve the 10 most recent activity logs.
    const activityLogs = await models.p2pActivityLog.findAll({
      order: [["createdAt", "DESC"]],
      limit: 10,
      raw: true,
    });

    // Map database fields to the expected RecentActivity format.
    const recentActivity = activityLogs.map((log) => ({
      id: log.id,
      type: log.type,
      title: log.action, // Using 'action' as a title substitute
      description: log.details,
      createdAt: log.createdAt,
      status: "active", // Default status; adjust if your data includes one
      priority: "medium", // Default value; adjust as needed
      user: { id: log.userId }, // Minimal user info; join more fields if necessary
    }));

    return recentActivity;
  } catch (err) {
    throw createError({
      statusCode: 500,
      message: "Internal Server Error: " + err.message,
    });
  }
};
