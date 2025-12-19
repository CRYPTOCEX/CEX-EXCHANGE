// Update subscription settings
import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { createAuditLog } from "@b/api/(ext)/copy-trading/utils";
import {
  validateSubscriptionUpdate,
  throwValidationError,
  isValidUUID,
} from "@b/api/(ext)/copy-trading/utils/security";

export const metadata = {
  summary: "Update Subscription Settings",
  description: "Updates the settings for a subscription.",
  operationId: "updateCopyTradingSubscription",
  tags: ["Copy Trading", "Followers"],
  requiresAuth: true,
  logModule: "COPY",
  logTitle: "Update subscription",
  middleware: ["copyTradingFollowerAction"],
  parameters: [
    {
      name: "id",
      in: "path",
      required: true,
      schema: { type: "string", format: "uuid" },
      description: "Subscription ID",
    },
  ],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            copyMode: {
              type: "string",
              enum: ["PROPORTIONAL", "FIXED_AMOUNT", "FIXED_RATIO"],
            },
            fixedAmount: { type: "number", minimum: 0.01 },
            fixedRatio: { type: "number", minimum: 0.01, maximum: 10 },
            maxDailyLoss: { type: "number", minimum: 0, maximum: 100 },
            maxPositionSize: { type: "number", minimum: 0, maximum: 100 },
            stopLossPercent: { type: "number", minimum: 0, maximum: 100 },
            takeProfitPercent: { type: "number", minimum: 0, maximum: 1000 },
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: "Subscription updated successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: { type: "string" },
              subscription: { type: "object" },
            },
          },
        },
      },
    },
    400: { description: "Bad Request" },
    401: { description: "Unauthorized" },
    403: { description: "Forbidden" },
    404: { description: "Subscription not found" },
    429: { description: "Too Many Requests" },
    500: { description: "Internal Server Error" },
  },
};

export default async (data: Handler) => {
  const { user, params, body, ctx } = data;
  const { id } = params;

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  // Validate subscription ID
  if (!isValidUUID(id)) {
    throw createError({ statusCode: 400, message: "Invalid subscription ID" });
  }

  ctx?.step("Validating request");
  // Validate and sanitize input
  const validation = validateSubscriptionUpdate(body);
  if (!validation.valid) {
    throwValidationError(validation);
  }

  ctx?.step("Fetching subscription");
  const subscription = await models.copyTradingFollower.findByPk(id);

  if (!subscription) {
    throw createError({ statusCode: 404, message: "Subscription not found" });
  }

  if (subscription.userId !== user.id) {
    throw createError({ statusCode: 403, message: "Access denied" });
  }

  if (subscription.status === "STOPPED") {
    throw createError({
      statusCode: 400,
      message: "Cannot update a stopped subscription",
    });
  }

  // Prepare update data
  const updateData: any = {};
  const oldValues: any = {};

  const allowedFields = [
    "copyMode",
    "fixedAmount",
    "fixedRatio",
    "maxDailyLoss",
    "maxPositionSize",
    "stopLossPercent",
    "takeProfitPercent",
  ];

  for (const field of allowedFields) {
    if (validation.sanitized[field] !== undefined) {
      oldValues[field] = subscription[field as keyof typeof subscription];
      updateData[field] = validation.sanitized[field];
    }
  }

  // Validate copy mode settings
  const newCopyMode = updateData.copyMode ?? subscription.copyMode;
  if (newCopyMode === "FIXED_AMOUNT") {
    const fixedAmt = updateData.fixedAmount ?? subscription.fixedAmount;
    if (!fixedAmt || fixedAmt <= 0) {
      throw createError({
        statusCode: 400,
        message: "Fixed amount is required for FIXED_AMOUNT mode",
      });
    }
  }

  if (newCopyMode === "FIXED_RATIO") {
    const fixedR = updateData.fixedRatio ?? subscription.fixedRatio;
    if (!fixedR || fixedR <= 0) {
      throw createError({
        statusCode: 400,
        message: "Fixed ratio is required for FIXED_RATIO mode",
      });
    }
  }

  ctx?.step("Updating subscription");
  await subscription.update(updateData);

  // Create audit log
  await createAuditLog({
    entityType: "FOLLOWER",
    entityId: id,
    action: "UPDATE",
    oldValue: oldValues,
    newValue: updateData,
    userId: user.id,
  });

  ctx?.success("Subscription updated");
  return {
    message: "Subscription updated successfully",
    subscription: subscription.toJSON(),
  };
};
