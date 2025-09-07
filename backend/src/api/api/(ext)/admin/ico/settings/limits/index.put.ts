import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Update ICO Investment Limits",
  description: "Updates the ICO investment limit settings",
  operationId: "updateIcoLimits",
  tags: ["Admin", "ICO", "Settings"],
  requiresAuth: true,
  requiresAdmin: true,
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            minInvestment: { type: "number", minimum: 0 },
            maxInvestment: { type: "number", minimum: 0 },
            maxPerUser: { type: "number", minimum: 0 },
            softCapPercentage: { type: "number", minimum: 0, maximum: 100 },
            refundGracePeriod: { type: "number", minimum: 0 },
            vestingEnabled: { type: "boolean" },
            defaultVestingMonths: { type: "number", minimum: 0 },
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: "ICO limits updated successfully",
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
    400: { description: "Bad Request" },
    401: { description: "Unauthorized" },
    403: { description: "Forbidden" },
    500: { description: "Internal Server Error" },
  },
};

export default async (data: Handler) => {
  const { user, body } = data;
  
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

  const {
    minInvestment,
    maxInvestment,
    maxPerUser,
    softCapPercentage,
    refundGracePeriod,
    vestingEnabled,
    defaultVestingMonths,
  } = body;

  // Validate limits
  if (minInvestment !== undefined && minInvestment < 0) {
    throw createError({ 
      statusCode: 400, 
      message: "Minimum investment cannot be negative" 
    });
  }
  
  if (maxInvestment !== undefined && minInvestment !== undefined && maxInvestment < minInvestment) {
    throw createError({ 
      statusCode: 400, 
      message: "Maximum investment must be greater than minimum investment" 
    });
  }

  if (softCapPercentage !== undefined && (softCapPercentage < 0 || softCapPercentage > 100)) {
    throw createError({ 
      statusCode: 400, 
      message: "Soft cap percentage must be between 0 and 100" 
    });
  }

  const transaction = await sequelize.transaction();
  
  try {
    // Update settings
    const updates = [
      { key: 'icoMinInvestment', value: minInvestment?.toString() },
      { key: 'icoMaxInvestment', value: maxInvestment?.toString() },
      { key: 'icoMaxPerUser', value: maxPerUser?.toString() },
      { key: 'icoSoftCapPercentage', value: softCapPercentage?.toString() },
      { key: 'icoRefundGracePeriod', value: refundGracePeriod?.toString() },
      { key: 'icoVestingEnabled', value: vestingEnabled?.toString() },
      { key: 'icoDefaultVestingMonths', value: defaultVestingMonths?.toString() },
    ].filter(update => update.value !== undefined);

    for (const update of updates) {
      await models.settings.upsert(
        {
          key: update.key,
          value: update.value,
        },
        { transaction }
      );
    }

    // Create audit log
    await models.icoAdminActivity.create({
      type: "SETTINGS_UPDATED",
      offeringId: null,
      offeringName: "ICO Limits",
      adminId: user.id,
      details: JSON.stringify({
        updates: updates.reduce((acc, u) => {
          acc[u.key] = u.value;
          return acc;
        }, {}),
      }),
    }, { transaction });

    await transaction.commit();

    return {
      message: "ICO limits updated successfully",
    };
  } catch (err: any) {
    await transaction.rollback();
    throw err;
  }
};