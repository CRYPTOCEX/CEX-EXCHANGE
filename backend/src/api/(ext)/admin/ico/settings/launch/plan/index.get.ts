import { models } from "@b/db";
import { createError } from "@b/utils/error";
import {
  unauthorizedResponse,
  serverErrorResponse,
} from "@b/utils/schema/errors";

export const metadata = {
  summary: "List ICO Launch Plans",
  description:
    "Retrieves all ICO launch plans ordered by sort order. Launch plans define pricing tiers and feature sets for token offering creators.",
  operationId: "getIcoLaunchPlans",
  tags: ["Admin", "ICO", "Settings"],
  requiresAuth: true,
  responses: {
    200: {
      description: "Launch plans retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string", format: "uuid" },
                name: { type: "string", description: "Plan name" },
                description: { type: "string", description: "Plan description" },
                price: { type: "number", description: "Plan price" },
                currency: { type: "string", description: "Currency code (e.g., USD)" },
                walletType: { type: "string", description: "Wallet type for the plan" },
                features: { type: "object", description: "Plan features in JSON format" },
                recommended: { type: "boolean", description: "Whether this plan is recommended" },
                status: { type: "boolean", description: "Whether the plan is active" },
                sortOrder: { type: "number", description: "Sort order for display" },
                createdAt: { type: "string", format: "date-time" },
                updatedAt: { type: "string", format: "date-time" },
                deletedAt: { type: "string", format: "date-time", nullable: true },
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    500: serverErrorResponse,
  },
  permission: "view.ico.settings",
  logModule: "ADMIN_ICO",
  logTitle: "Get launch plans",
};

export default async (data: Handler) => {
  const { user, ctx } = data;

  ctx?.step("Validating user permissions");
  if (!user?.id) {
    ctx?.fail("Unauthorized access");
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  ctx?.step("Fetching launch plans");
  // Return launch plans ordered by sortOrder
  const launchPlans = await models.icoLaunchPlan.findAll({
    order: [["sortOrder", "ASC"]],
  });

  ctx?.success(`Retrieved ${launchPlans.length} launch plans`);
  return launchPlans;
};
