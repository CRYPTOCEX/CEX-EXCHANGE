// Admin approve leader application
import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { createAuditLog, isValidUUID, notifyLeaderApplicationEvent } from "@b/api/(ext)/copy-trading/utils";

export const metadata = {
  summary: "Approve Leader Application (Admin)",
  description: "Approves a pending leader application.",
  operationId: "adminApproveCopyTradingLeader",
  tags: ["Admin", "Copy Trading"],
  requiresAuth: true,
  permission: "access.copy_trading",
  middleware: ["copyTradingAdmin"],
  logModule: "ADMIN_COPY",
  logTitle: "Approve copy trading leader",
  parameters: [
    {
      name: "id",
      in: "path",
      required: true,
      schema: { type: "string" },
    },
  ],
  responses: {
    200: { description: "Leader approved successfully" },
    400: { description: "Bad Request" },
    401: { description: "Unauthorized" },
    403: { description: "Forbidden" },
    404: { description: "Leader not found" },
    500: { description: "Internal Server Error" },
  },
};

export default async (data: Handler) => {
  const { params, user, ctx } = data;
  const { id } = params;

  // Validate UUID format
  if (!isValidUUID(id)) {
    throw createError({ statusCode: 400, message: "Invalid leader ID format" });
  }

  ctx?.step("Fetching leader application");
  const leader = await models.copyTradingLeader.findByPk(id);

  if (!leader) {
    ctx?.fail("Leader not found");
    throw createError({ statusCode: 404, message: "Leader not found" });
  }

  ctx?.step("Validating leader status");
  if (leader.status !== "PENDING") {
    ctx?.fail(`Cannot approve leader with status: ${leader.status}`);
    throw createError({
      statusCode: 400,
      message: `Cannot approve leader with status: ${leader.status}`,
    });
  }

  ctx?.step("Approving leader application");
  const oldStatus = leader.status;
  await leader.update({ status: "ACTIVE" });

  ctx?.step("Creating audit log");
  await createAuditLog({
    entityType: "LEADER",
    entityId: id,
    action: "APPROVE",
    oldValue: { status: oldStatus },
    newValue: { status: "ACTIVE" },
    adminId: user?.id,
  });

  // Notify user about approval
  ctx?.step("Sending approval notification");
  await notifyLeaderApplicationEvent(leader.userId, id, "APPROVED", undefined, ctx);

  ctx?.success("Leader approved successfully");
  return {
    message: "Leader approved successfully",
    leader: leader.toJSON(),
  };
};
