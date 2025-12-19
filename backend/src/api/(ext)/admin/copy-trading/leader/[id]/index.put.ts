// Admin update leader
import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { createAuditLog, isValidUUID } from "@b/api/(ext)/copy-trading/utils";

export const metadata = {
  summary: "Update Leader (Admin)",
  description: "Updates leader profile and settings.",
  operationId: "adminUpdateCopyTradingLeader",
  tags: ["Admin", "Copy Trading"],
  requiresAuth: true,
  permission: "access.copy_trading",
  middleware: ["copyTradingAdmin"],
  logModule: "ADMIN_COPY",
  logTitle: "Update copy trading leader",
  parameters: [
    {
      name: "id",
      in: "path",
      required: true,
      schema: { type: "string" },
    },
  ],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            displayName: { type: "string" },
            bio: { type: "string" },
            tradingStyle: { type: "string" },
            riskLevel: { type: "string" },
            profitSharePercent: { type: "number" },
            minFollowAmount: { type: "number" },
            maxFollowers: { type: "number" },
            isPublic: { type: "boolean" },
          },
        },
      },
    },
  },
  responses: {
    200: { description: "Leader updated successfully" },
    400: { description: "Bad Request" },
    401: { description: "Unauthorized" },
    403: { description: "Forbidden" },
    404: { description: "Leader not found" },
    500: { description: "Internal Server Error" },
  },
};

export default async (data: Handler) => {
  const { params, body, user, ctx } = data;
  const { id } = params;

  // Validate UUID format
  if (!isValidUUID(id)) {
    throw createError({ statusCode: 400, message: "Invalid leader ID format" });
  }

  ctx?.step("Fetching leader");
  const leader = await models.copyTradingLeader.findByPk(id);

  if (!leader) {
    ctx?.fail("Leader not found");
    throw createError({ statusCode: 404, message: "Leader not found" });
  }

  ctx?.step("Preparing update data");
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

  const updateData: any = {};
  const oldValues: any = {};

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      oldValues[field] = leader[field as keyof typeof leader];
      updateData[field] = body[field];
    }
  }

  ctx?.step("Updating leader");
  await leader.update(updateData);

  ctx?.step("Creating audit log");
  await createAuditLog({
    entityType: "LEADER",
    entityId: id,
    action: "UPDATE",
    oldValue: oldValues,
    newValue: updateData,
    adminId: user?.id,
  });

  ctx?.success("Leader updated successfully");
  return {
    message: "Leader updated successfully",
    leader: leader.toJSON(),
  };
};
