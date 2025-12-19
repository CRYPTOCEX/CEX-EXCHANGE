// Admin reject leader application
import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { createAuditLog, isValidUUID, notifyLeaderApplicationEvent } from "@b/api/(ext)/copy-trading/utils";

export const metadata = {
  summary: "Reject Leader Application (Admin)",
  description: "Rejects a pending leader application.",
  operationId: "adminRejectCopyTradingLeader",
  tags: ["Admin", "Copy Trading"],
  requiresAuth: true,
  permission: "access.copy_trading",
  middleware: ["copyTradingAdmin"],
  logModule: "ADMIN_COPY",
  logTitle: "Reject copy trading leader",
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
            reason: {
              type: "string",
              description: "Reason for rejection",
            },
          },
          required: ["reason"],
        },
      },
    },
  },
  responses: {
    200: { description: "Leader rejected successfully" },
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
  const { reason } = body;

  // Validate UUID format
  if (!isValidUUID(id)) {
    throw createError({ statusCode: 400, message: "Invalid leader ID format" });
  }

  ctx?.step("Validating rejection reason");
  if (!reason) {
    ctx?.fail("Rejection reason is required");
    throw createError({ statusCode: 400, message: "Rejection reason is required" });
  }

  ctx?.step("Fetching leader application");
  const leader = await models.copyTradingLeader.findByPk(id);

  if (!leader) {
    ctx?.fail("Leader not found");
    throw createError({ statusCode: 404, message: "Leader not found" });
  }

  ctx?.step("Validating leader status");
  if (leader.status !== "PENDING") {
    ctx?.fail(`Cannot reject leader with status: ${leader.status}`);
    throw createError({
      statusCode: 400,
      message: `Cannot reject leader with status: ${leader.status}`,
    });
  }

  ctx?.step("Rejecting leader application");
  const oldStatus = leader.status;
  await leader.update({ status: "REJECTED", rejectionReason: reason });

  ctx?.step("Creating audit log");
  await createAuditLog({
    entityType: "LEADER",
    entityId: id,
    action: "REJECT",
    oldValue: { status: oldStatus },
    newValue: { status: "REJECTED", rejectionReason: reason },
    adminId: user?.id,
    reason,
  });

  // Notify user about rejection
  ctx?.step("Sending rejection notification");
  await notifyLeaderApplicationEvent(leader.userId, id, "REJECTED", { rejectionReason: reason }, ctx);

  ctx?.success("Leader rejected successfully");
  return {
    message: "Leader rejected successfully",
    leader: leader.toJSON(),
  };
};
