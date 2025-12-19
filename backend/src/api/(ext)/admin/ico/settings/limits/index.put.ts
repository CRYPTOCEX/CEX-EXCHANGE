import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";
import {
  badRequestResponse,
  unauthorizedResponse,
  forbiddenResponse,
  serverErrorResponse,
} from "@b/utils/schema/errors";

export const metadata = {
  summary: "Update ICO Investment Limits",
  description:
    "Updates the ICO investment limit settings with validation. Ensures min/max relationships are valid and soft cap percentage is within 0-100 range. Changes are logged in audit trail.",
  operationId: "updateIcoInvestmentLimits",
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
            minInvestment: { type: "number", minimum: 0, description: "Minimum investment amount" },
            maxInvestment: { type: "number", minimum: 0, description: "Maximum investment amount" },
            maxPerUser: { type: "number", minimum: 0, description: "Maximum investment per user" },
            softCapPercentage: { type: "number", minimum: 0, maximum: 100, description: "Soft cap percentage" },
            refundGracePeriod: { type: "number", minimum: 0, description: "Refund grace period in days" },
            vestingEnabled: { type: "boolean", description: "Enable token vesting" },
            defaultVestingMonths: { type: "number", minimum: 0, description: "Default vesting period in months" },
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
    400: badRequestResponse,
    401: unauthorizedResponse,
    403: forbiddenResponse,
    500: serverErrorResponse,
  },
  logModule: "ADMIN_ICO",
  logTitle: "Update ICO limits",
};

export default async (data: Handler) => {
  const { user, body, ctx } = data;

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

  const {
    minInvestment,
    maxInvestment,
    maxPerUser,
    softCapPercentage,
    refundGracePeriod,
    vestingEnabled,
    defaultVestingMonths,
  } = body;

  ctx?.step("Validating limit values");
  // Validate limits
  if (minInvestment !== undefined && minInvestment < 0) {
    ctx?.fail("Invalid minimum investment");
    throw createError({
      statusCode: 400,
      message: "Minimum investment cannot be negative"
    });
  }

  if (maxInvestment !== undefined && minInvestment !== undefined && maxInvestment < minInvestment) {
    ctx?.fail("Invalid max/min investment relationship");
    throw createError({
      statusCode: 400,
      message: "Maximum investment must be greater than minimum investment"
    });
  }

  if (softCapPercentage !== undefined && (softCapPercentage < 0 || softCapPercentage > 100)) {
    ctx?.fail("Invalid soft cap percentage");
    throw createError({
      statusCode: 400,
      message: "Soft cap percentage must be between 0 and 100"
    });
  }

  ctx?.step("Starting database transaction");
  const transaction = await sequelize.transaction();

  try {
    ctx?.step("Updating limit settings");
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

    ctx?.step("Creating audit log");
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

    ctx?.success("ICO limits updated successfully");
    return {
      message: "ICO limits updated successfully",
    };
  } catch (err: any) {
    await transaction.rollback();
    ctx?.fail("Transaction failed");
    throw err;
  }
};
