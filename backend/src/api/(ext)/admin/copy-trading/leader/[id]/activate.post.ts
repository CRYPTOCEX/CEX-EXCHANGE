// Admin reactivate suspended leader
import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { createAuditLog } from "@b/api/(ext)/copy-trading/utils";

export const metadata = {
  summary: "Activate Leader (Admin)",
  description: "Reactivates a suspended leader.",
  operationId: "adminActivateCopyTradingLeader",
  tags: ["Admin", "Copy Trading"],
  requiresAuth: true,
  permission: "access.copy_trading",
  middleware: ["copyTradingAdmin"],
  logModule: "ADMIN_COPY",
  logTitle: "Activate copy trading leader",
  parameters: [
    {
      name: "id",
      in: "path",
      required: true,
      schema: { type: "string" },
    },
  ],
  responses: {
    200: { description: "Leader activated successfully" },
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

  ctx?.step("Fetching leader");
  const leader = await models.copyTradingLeader.findByPk(id);

  if (!leader) {
    ctx?.fail("Leader not found");
    throw createError({ statusCode: 404, message: "Leader not found" });
  }

  ctx?.step("Validating leader status");
  if (leader.status !== "SUSPENDED") {
    ctx?.fail(`Can only activate suspended leaders. Current status: ${leader.status}`);
    throw createError({
      statusCode: 400,
      message: `Can only activate suspended leaders. Current status: ${leader.status}`,
    });
  }

  ctx?.step("Activating leader");
  const oldStatus = leader.status;
  await leader.update({ status: "ACTIVE" });

  ctx?.step("Creating audit log");
  await createAuditLog({
    entityType: "LEADER",
    entityId: id,
    action: "ACTIVATE",
    oldValue: { status: oldStatus },
    newValue: { status: "ACTIVE" },
    adminId: user?.id,
  });

  // TODO: Send notification to leader

  ctx?.success("Leader activated successfully");
  return {
    message: "Leader activated successfully",
    leader: leader.toJSON(),
  };
};
