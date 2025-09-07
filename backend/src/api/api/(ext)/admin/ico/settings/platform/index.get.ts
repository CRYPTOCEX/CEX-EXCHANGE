import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Get Platform Settings",
  description: "Retrieves the platform settings configuration for ICO admin.",
  operationId: "getPlatformSettings",
  tags: ["ICO", "Admin", "PlatformSettings"],
  requiresAuth: true,
  responses: {
    200: {
      description: "Platform settings retrieved successfully.",
      content: {
        "application/json": {
          schema: { type: "object" },
        },
      },
    },
    401: { description: "Unauthorized – Admin privileges required." },
    500: { description: "Internal Server Error" },
  },
  permission: "view.ico.settings",
};

export default async (data: Handler) => {
  const { user } = data;
  if (!user?.id) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized: Admin privileges required.",
    });
  }

  const settings = await models.icoPlatformSettings.findOne();
  if (!settings) {
    throw createError({
      statusCode: 404,
      message: "Platform settings not found.",
    });
  }
  return settings;
};
