import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Update Platform Settings",
  description:
    "Updates the platform settings configuration by ID for ICO admin.",
  operationId: "updatePlatformSettings",
  tags: ["ICO", "Admin", "PlatformSettings"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      schema: { type: "string", description: "Platform settings ID" },
    },
  ],
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
            // Include additional properties as needed.
          },
        },
      },
    },
  },
  responses: {
    200: { description: "Platform settings updated successfully." },
    401: { description: "Unauthorized – Admin privileges required." },
    404: { description: "Platform settings not found." },
    500: { description: "Internal Server Error" },
  },
  requiresAuth: true,
  permission: "edit.ico.settings",
};

export default async (data: Handler) => {
  const { user, params, body } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const { id } = params;
  const settings = await models.icoPlatformSettings.findByPk(id);
  if (!settings) {
    throw createError({
      statusCode: 404,
      message: "Platform settings not found",
    });
  }

  await settings.update(body);

  return { message: "Platform settings updated successfully", settings };
};
