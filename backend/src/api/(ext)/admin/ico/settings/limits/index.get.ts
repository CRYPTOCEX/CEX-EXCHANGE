import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Get ICO Investment Limits",
  description: "Retrieves the current ICO investment limit settings",
  operationId: "getIcoLimits",
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
              minInvestment: { type: "number" },
              maxInvestment: { type: "number" },
              maxPerUser: { type: "number" },
              softCapPercentage: { type: "number" },
              refundGracePeriod: { type: "number" },
              vestingEnabled: { type: "boolean" },
              defaultVestingMonths: { type: "number" },
            },
          },
        },
      },
    },
    401: { description: "Unauthorized" },
    403: { description: "Forbidden" },
    500: { description: "Internal Server Error" },
  },
};

export default async (data: Handler) => {
  const { user } = data;
  
  if (!user?.id) {
    throw createError({ 
      statusCode: 401, 
      message: "Authentication required" 
    });
  }
  
  // Check admin role through user model
  const fullUser = await models.user.findByPk(user.id, {
    include: [{ model: models.role, as: "role" }]
  });
  
  if (!fullUser || (fullUser.role?.name !== 'admin' && fullUser.role?.name !== 'super_admin')) {
    throw createError({ 
      statusCode: 403, 
      message: "Admin privileges required" 
    });
  }

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