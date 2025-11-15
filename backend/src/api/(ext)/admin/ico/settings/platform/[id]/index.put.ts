import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Update Platform Settings",
  description:
    "Updates the platform settings configuration for ICO admin.",
  operationId: "updatePlatformSettings",
  tags: ["ICO", "Admin", "PlatformSettings"],
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
    500: { description: "Internal Server Error" },
  },
  requiresAuth: true,
  permission: "edit.ico.settings",
};

export default async (data: Handler) => {
  const { user, body } = data;
  if (!user?.id) {
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

  // Upsert each setting
  for (const update of updates) {
    await models.settings.upsert({
      key: update.key,
      value: update.value,
    });
  }

  return { message: "Platform settings updated successfully" };
};
