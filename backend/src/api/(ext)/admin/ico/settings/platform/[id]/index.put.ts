import { models } from "@b/db";
import { createError } from "@b/utils/error";
import {
  badRequestResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from "@b/utils/schema/errors";

export const metadata = {
  summary: "Update ICO Platform Settings",
  description:
    "Updates ICO platform settings using upsert. Only provided fields will be updated, allowing partial updates of platform configuration.",
  operationId: "updateIcoPlatformSettings",
  tags: ["Admin", "ICO", "Settings"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            minInvestmentAmount: { type: "number", description: "Minimum investment amount" },
            maxInvestmentAmount: { type: "number", description: "Maximum investment amount" },
            platformFeePercentage: { type: "number", description: "Platform fee percentage" },
            kycRequired: { type: "boolean", description: "KYC requirement flag" },
            maintenanceMode: { type: "boolean", description: "Maintenance mode flag" },
            allowPublicOfferings: { type: "boolean", description: "Allow public offerings flag" },
            announcementMessage: { type: "string", description: "Announcement message" },
            announcementActive: { type: "boolean", description: "Announcement active flag" },
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: "Platform settings updated successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: { type: "string" },
            },
          },
        },
      },
    },
    400: badRequestResponse,
    401: unauthorizedResponse,
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "edit.ico.settings",
  logModule: "ADMIN_ICO",
  logTitle: "Update platform settings",
};

export default async (data: Handler) => {
  const { user, body, ctx } = data;

  ctx?.step("Validating user permissions");
  if (!user?.id) {
    ctx?.fail("Unauthorized access");
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const {
    minInvestmentAmount,
    maxInvestmentAmount,
    platformFeePercentage,
    kycRequired,
    maintenanceMode,
    allowPublicOfferings,
    announcementMessage,
    announcementActive,
  } = body;

  ctx?.step("Preparing platform settings updates");
  // Prepare settings updates
  const updates = [
    { key: 'icoPlatformMinInvestmentAmount', value: minInvestmentAmount?.toString() },
    { key: 'icoPlatformMaxInvestmentAmount', value: maxInvestmentAmount?.toString() },
    { key: 'icoPlatformFeePercentage', value: platformFeePercentage?.toString() },
    { key: 'icoPlatformKycRequired', value: kycRequired?.toString() },
    { key: 'icoPlatformMaintenanceMode', value: maintenanceMode?.toString() },
    { key: 'icoPlatformAllowPublicOfferings', value: allowPublicOfferings?.toString() },
    { key: 'icoPlatformAnnouncementMessage', value: announcementMessage },
    { key: 'icoPlatformAnnouncementActive', value: announcementActive?.toString() },
  ].filter(update => update.value !== undefined);

  ctx?.step(`Updating ${updates.length} platform settings`);
  // Upsert each setting
  for (const update of updates) {
    await models.settings.upsert({
      key: update.key,
      value: update.value,
    });
  }

  ctx?.success("Platform settings updated successfully");
  return { message: "Platform settings updated successfully" };
};
