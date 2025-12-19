// Admin suspend leader
import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { createAuditLog, updateLeaderStats, isValidUUID, notifyLeaderApplicationEvent, notifyFollowerSubscriptionEvent, notifyCopyTradingAdmins } from "@b/api/(ext)/copy-trading/utils";

export const metadata = {
  summary: "Suspend Leader (Admin)",
  description: "Suspends an active leader. All followers will be paused.",
  operationId: "adminSuspendCopyTradingLeader",
  tags: ["Admin", "Copy Trading"],
  requiresAuth: true,
  permission: "access.copy_trading",
  middleware: ["copyTradingAdmin"],
  logModule: "ADMIN_COPY",
  logTitle: "Suspend copy trading leader",
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
              description: "Reason for suspension",
            },
          },
          required: ["reason"],
        },
      },
    },
  },
  responses: {
    200: { description: "Leader suspended successfully" },
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

  ctx?.step("Validating suspension reason");
  if (!reason) {
    ctx?.fail("Suspension reason is required");
    throw createError({ statusCode: 400, message: "Suspension reason is required" });
  }

  ctx?.step("Fetching leader");
  const leader = await models.copyTradingLeader.findByPk(id);

  if (!leader) {
    ctx?.fail("Leader not found");
    throw createError({ statusCode: 404, message: "Leader not found" });
  }

  ctx?.step("Validating leader status");
  if (leader.status !== "ACTIVE") {
    ctx?.fail(`Cannot suspend leader with status: ${leader.status}`);
    throw createError({
      statusCode: 400,
      message: `Cannot suspend leader with status: ${leader.status}`,
    });
  }

  const oldStatus = leader.status;

  ctx?.step("Suspending leader");
  await leader.update({ status: "SUSPENDED" });

  ctx?.step("Pausing all active followers");
  await models.copyTradingFollower.update(
    { status: "PAUSED" },
    { where: { leaderId: id, status: "ACTIVE" } }
  );

  ctx?.step("Creating audit log");
  await createAuditLog({
    entityType: "LEADER",
    entityId: id,
    action: "SUSPEND",
    oldValue: { status: oldStatus },
    newValue: { status: "SUSPENDED" },
    adminId: user?.id,
    reason,
  });

  ctx?.step("Updating leader statistics");
  await updateLeaderStats(id);

  // Notify leader about suspension
  ctx?.step("Sending suspension notification to leader");
  await notifyLeaderApplicationEvent(leader.userId, id, "SUSPENDED", { reason }, ctx);

  // Notify all affected followers
  ctx?.step("Notifying affected followers");
  const affectedFollowers = await models.copyTradingFollower.findAll({
    where: { leaderId: id },
    attributes: ["id", "userId"],
  });

  for (const follower of affectedFollowers) {
    await notifyFollowerSubscriptionEvent(
      follower.id,
      "PAUSED",
      { reason: `Leader suspended: ${reason}` },
      ctx
    );
  }

  // Notify admins about suspension
  await notifyCopyTradingAdmins(
    "LEADER_SUSPENDED",
    {
      leaderId: id,
      leaderName: `User ${leader.userId}`,
      reason,
    },
    ctx
  );

  ctx?.success("Leader suspended successfully");
  return {
    message: "Leader suspended successfully",
    leader: leader.toJSON(),
  };
};
