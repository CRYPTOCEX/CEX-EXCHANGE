import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Get Launch Plans",
  description: "Retrieves all launch plans for ICO admin.",
  operationId: "getLaunchPlans",
  tags: ["ICO", "Admin", "LaunchPlans"],
  requiresAuth: true,
  responses: {
    200: {
      description: "Launch plans retrieved successfully.",
      content: {
        "application/json": {
          schema: { type: "array", items: { type: "object" } },
        },
      },
    },
    401: { description: "Unauthorized – Admin privileges required." },
    500: { description: "Internal Server Error" },
  },
};

export default async (data: Handler) => {
  const { user } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  // Return launch plans ordered by sortOrder
  const launchPlans = await models.icoLaunchPlan.findAll({
    order: [["sortOrder", "ASC"]],
  });
  return launchPlans;
};
