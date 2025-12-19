import { models } from "@b/db";
import { createError } from "@b/utils/error";
import {
  unauthorizedResponse,
  serverErrorResponse,
} from "@b/utils/schema/errors";

export const metadata = {
  summary: "Get ICO Platform Settings",
  description:
    "Retrieves ICO platform-wide settings including investment limits, fees, KYC requirements, maintenance mode, and announcement configuration.",
  operationId: "getIcoPlatformSettings",
  tags: ["Admin", "ICO", "Settings"],
  requiresAuth: true,
  responses: {
    200: {
      description: "Platform settings retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              minInvestmentAmount: { type: "number", description: "Minimum platform investment amount" },
              maxInvestmentAmount: { type: "number", description: "Maximum platform investment amount" },
              platformFeePercentage: { type: "number", description: "Platform fee percentage" },
              kycRequired: { type: "boolean", description: "Whether KYC is required" },
              maintenanceMode: { type: "boolean", description: "Whether platform is in maintenance mode" },
              allowPublicOfferings: { type: "boolean", description: "Whether public offerings are allowed" },
              announcementMessage: { type: "string", description: "Platform announcement message" },
              announcementActive: { type: "boolean", description: "Whether announcement is active" },
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
  logTitle: "Get platform settings",
};

export default async (data: Handler) => {
  const { user, ctx } = data;

  ctx?.step("Validating user permissions");
  if (!user?.id) {
    ctx?.fail("Unauthorized access");
    throw createError({
      statusCode: 401,
      message: "Unauthorized: Admin privileges required.",
    });
  }

  ctx?.step("Fetching platform settings");
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

  ctx?.success("Platform settings retrieved successfully");
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
