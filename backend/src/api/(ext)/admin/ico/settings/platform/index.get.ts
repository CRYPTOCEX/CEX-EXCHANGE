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

  // Get all ICO platform settings
  const settingKeys = [
    'icoPlatformMinInvestmentAmount',
    'icoPlatformMaxInvestmentAmount',
    'icoPlatformFeePercentage',
    'icoPlatformKycRequired',
    'icoPlatformMaintenanceMode',
    'icoPlatformAllowPublicOfferings',
    'icoPlatformAnnouncementMessage',
    'icoPlatformAnnouncementActive',
  ];

  const settings = await models.settings.findAll({
    where: { key: settingKeys },
  });

  // Convert to object with defaults
  const settingsMap = settings.reduce((acc, setting) => {
    acc[setting.key] = setting.value;
    return acc;
  }, {} as Record<string, any>);

  return {
    minInvestmentAmount: parseFloat(settingsMap.icoPlatformMinInvestmentAmount || '0'),
    maxInvestmentAmount: parseFloat(settingsMap.icoPlatformMaxInvestmentAmount || '0'),
    platformFeePercentage: parseFloat(settingsMap.icoPlatformFeePercentage || '0'),
    kycRequired: settingsMap.icoPlatformKycRequired === 'true',
    maintenanceMode: settingsMap.icoPlatformMaintenanceMode === 'true',
    allowPublicOfferings: settingsMap.icoPlatformAllowPublicOfferings === 'true',
    announcementMessage: settingsMap.icoPlatformAnnouncementMessage || '',
    announcementActive: settingsMap.icoPlatformAnnouncementActive === 'true',
  };
};
