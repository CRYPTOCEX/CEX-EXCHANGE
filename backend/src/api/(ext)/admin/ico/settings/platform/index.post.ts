import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Create Platform Settings",
  description: "Creates a new platform settings configuration for ICO admin.",
  operationId: "createPlatformSettings",
  tags: ["ICO", "Admin", "PlatformSettings"],
  requiresAuth: true,
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            minInvestmentAmount: { type: "number" },
            maxInvestmentAmount: { type: "number" },
            platformFeePercentage: { type: "number" },
            kycRequired: { type: "boolean" },
            maintenanceMode: { type: "boolean" },
            allowPublicOfferings: { type: "boolean" },
            announcementMessage: { type: "string" },
            announcementActive: { type: "boolean" },
            // Add additional properties as needed.
          },
          required: [
            "minInvestmentAmount",
            "maxInvestmentAmount",
            "platformFeePercentage",
          ],
        },
      },
    },
  },
  responses: {
    200: { description: "Platform settings created successfully." },
    401: { description: "Unauthorized – Admin privileges required." },
    400: { description: "Bad Request" },
    500: { description: "Internal Server Error" },
  },
  permission: "edit.ico.settings",
};

export default async (data: Handler) => {
  const { user, body } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const settings = await models.icoPlatformSettings.create(body);
  return { message: "Platform settings created successfully.", settings };
};
