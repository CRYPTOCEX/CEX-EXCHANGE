import { models } from "@b/db";
import { createError } from "@b/utils/error";
import {
  unauthorizedResponse,
  forbiddenResponse,
  serverErrorResponse,
} from "@b/utils/schema/errors";

export const metadata = {
  summary: "Get ICO Investment Limits",
  description:
    "Retrieves the current ICO investment limit settings including min/max investment amounts, soft cap percentage, vesting configuration, and refund grace period.",
  operationId: "getIcoInvestmentLimits",
  tags: ["Admin", "ICO", "Settings"],
  requiresAuth: true,
  requiresAdmin: true,
  responses: {
    200: {
      description: "ICO limits retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              minInvestment: { type: "number", description: "Minimum investment amount" },
              maxInvestment: { type: "number", description: "Maximum investment amount" },
              maxPerUser: { type: "number", description: "Maximum investment per user" },
              softCapPercentage: { type: "number", description: "Soft cap percentage threshold" },
              refundGracePeriod: { type: "number", description: "Refund grace period in days" },
              vestingEnabled: { type: "boolean", description: "Whether token vesting is enabled" },
              defaultVestingMonths: { type: "number", description: "Default vesting period in months" },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    403: forbiddenResponse,
    500: serverErrorResponse,
  },
  logModule: "ADMIN_ICO",
  logTitle: "Get ICO limits",
};

export default async (data: Handler) => {
  const { user, ctx } = data;

  if (!user?.id) {
    ctx?.fail("Authentication required");
    throw createError({
      statusCode: 401,
      message: "Authentication required"
    });
  }

  ctx?.step("Checking admin privileges");
  // Check admin role through user model
  const fullUser = await models.user.findByPk(user.id, {
    include: [{ model: models.role, as: "role" }]
  });

  if (!fullUser || (fullUser.role?.name !== 'admin' && fullUser.role?.name !== 'super_admin')) {
    ctx?.fail("Admin privileges required");
    throw createError({
      statusCode: 403,
      message: "Admin privileges required"
    });
  }

  ctx?.step("Fetching ICO limit settings");
  // Get all ICO-related settings
  const settingKeys = [
    'icoMinInvestment',
    'icoMaxInvestment',
    'icoMaxPerUser',
    'icoSoftCapPercentage',
    'icoRefundGracePeriod',
    'icoVestingEnabled',
    'icoDefaultVestingMonths',
  ];

  const settings = await models.settings.findAll({
    where: { key: settingKeys },
  });

  // Convert to object with defaults
  const settingsMap = settings.reduce((acc, setting) => {
    acc[setting.key] = setting.value;
    return acc;
  }, {} as Record<string, any>);

  ctx?.success("ICO limits retrieved successfully");
  return {
    minInvestment: parseFloat(settingsMap.icoMinInvestment || '10'),
    maxInvestment: parseFloat(settingsMap.icoMaxInvestment || '100000'),
    maxPerUser: parseFloat(settingsMap.icoMaxPerUser || '50000'),
    softCapPercentage: parseFloat(settingsMap.icoSoftCapPercentage || '30'),
    refundGracePeriod: parseInt(settingsMap.icoRefundGracePeriod || '7'),
    vestingEnabled: settingsMap.icoVestingEnabled === 'true',
    defaultVestingMonths: parseInt(settingsMap.icoDefaultVestingMonths || '12'),
  };
};
