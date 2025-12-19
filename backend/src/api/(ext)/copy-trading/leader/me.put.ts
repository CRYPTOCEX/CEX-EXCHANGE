// Update current user's leader profile
import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { createAuditLog } from "@b/api/(ext)/copy-trading/utils";
import {
  validateLeaderUpdate,
  throwValidationError,
} from "@b/api/(ext)/copy-trading/utils/security";

export const metadata = {
  summary: "Update My Leader Profile",
  description: "Updates the current user's leader profile settings.",
  operationId: "updateMyLeaderProfile",
  tags: ["Copy Trading", "Leaders"],
  requiresAuth: true,
  logModule: "COPY",
  logTitle: "Update leader profile",
  middleware: ["copyTradingLeaderUpdate"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            displayName: { type: "string", minLength: 2, maxLength: 100 },
            bio: { type: "string", maxLength: 1000 },
            avatar: { type: "string" },
            tradingStyle: {
              type: "string",
              enum: ["SCALPING", "DAY_TRADING", "SWING", "POSITION"],
            },
            riskLevel: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] },
            profitSharePercent: { type: "number", minimum: 0, maximum: 50 },
            minFollowAmount: { type: "number", minimum: 0 },
            maxFollowers: { type: "number", minimum: 1 },
            isPublic: { type: "boolean" },
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: "Profile updated successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: { type: "string" },
              leader: { type: "object" },
            },
          },
        },
      },
    },
    400: { description: "Bad Request" },
    401: { description: "Unauthorized" },
    404: { description: "Not a leader" },
    429: { description: "Too Many Requests" },
    500: { description: "Internal Server Error" },
  },
};

export default async (data: Handler) => {
  const { user, body, ctx } = data;

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  ctx?.step("Validating request");
  // Validate and sanitize input
  const validation = validateLeaderUpdate(body);
  if (!validation.valid) {
    throwValidationError(validation);
  }

  ctx?.step("Fetching leader profile");
  const leader = await models.copyTradingLeader.findOne({
    where: { userId: user.id },
  });

  if (!leader) {
    throw createError({ statusCode: 404, message: "You are not a leader" });
  }

  if (leader.status !== "ACTIVE") {
    throw createError({
      statusCode: 400,
      message: "Only active leaders can update their profile",
    });
  }

  // Prepare update data from sanitized input
  const updateData: any = {};
  const oldValues: any = {};

  const allowedFields = [
    "displayName",
    "bio",
    "tradingStyle",
    "riskLevel",
    "profitSharePercent",
    "minFollowAmount",
    "maxFollowers",
    "isPublic",
  ];

  for (const field of allowedFields) {
    if (validation.sanitized[field] !== undefined) {
      oldValues[field] = leader[field as keyof typeof leader];
      updateData[field] = validation.sanitized[field];
    }
  }

  // Handle avatar separately (not in validation schema)
  if (body.avatar !== undefined) {
    oldValues.avatar = leader.avatar;
    updateData.avatar = body.avatar;
  }

  ctx?.step("Checking constraints");
  // Check maxFollowers constraint
  if (updateData.maxFollowers !== undefined) {
    const activeFollowerCount = await models.copyTradingFollower.count({
      where: { leaderId: leader.id, status: "ACTIVE" },
    });
    if (updateData.maxFollowers < activeFollowerCount) {
      throw createError({
        statusCode: 400,
        message: `Cannot set max followers below current count (${activeFollowerCount})`,
      });
    }
  }

  ctx?.step("Updating leader profile");
  // Update the leader profile
  await leader.update(updateData);

  // Create audit log
  await createAuditLog({
    entityType: "LEADER",
    entityId: leader.id,
    action: "UPDATE",
    oldValue: oldValues,
    newValue: updateData,
    userId: user.id,
  });

  ctx?.success("Leader profile updated");
  return {
    message: "Profile updated successfully",
    leader: leader.toJSON(),
  };
};
