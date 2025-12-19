// Admin bulk update leader status
import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";
import { createAuditLog, updateLeaderStats } from "@b/api/(ext)/copy-trading/utils";

export const metadata = {
  summary: "Bulk Update Leader Status",
  description: "Updates the status of multiple leaders at once.",
  operationId: "adminBulkUpdateCopyTradingLeaderStatus",
  tags: ["Admin", "Copy Trading", "Leaders"],
  requiresAuth: true,
  permission: "access.copy_trading",
  middleware: ["copyTradingAdmin"],
  logModule: "ADMIN_COPY",
  logTitle: "Bulk update leader status",
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            leaderIds: {
              type: "array",
              items: { type: "string" },
              description: "Array of leader IDs to update",
            },
            status: {
              type: "string",
              enum: ["ACTIVE", "SUSPENDED", "INACTIVE"],
              description: "New status for all leaders",
            },
            reason: {
              type: "string",
              description: "Reason for the status change",
            },
          },
          required: ["leaderIds", "status", "reason"],
        },
      },
    },
  },
  responses: {
    200: { description: "Leaders updated successfully" },
    400: { description: "Bad Request" },
    401: { description: "Unauthorized" },
    403: { description: "Forbidden" },
    500: { description: "Internal Server Error" },
  },
};

export default async (data: Handler) => {
  const { user, body, ctx } = data;
  const { leaderIds, status, reason } = body || {};

  if (!user?.id) {
    ctx?.fail("Unauthorized");
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  ctx?.step("Validating request data");
  if (!leaderIds || !Array.isArray(leaderIds) || leaderIds.length === 0) {
    ctx?.fail("Leader IDs array is required");
    throw createError({ statusCode: 400, message: "Leader IDs array is required" });
  }

  if (!status) {
    ctx?.fail("Status is required");
    throw createError({ statusCode: 400, message: "Status is required" });
  }

  if (!reason) {
    ctx?.fail("Reason is required");
    throw createError({ statusCode: 400, message: "Reason is required" });
  }

  const validStatuses = ["ACTIVE", "SUSPENDED", "INACTIVE"];
  if (!validStatuses.includes(status)) {
    ctx?.fail(`Invalid status: ${status}`);
    throw createError({ statusCode: 400, message: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
  }

  ctx?.step(`Fetching ${leaderIds.length} leaders`);
  const leaders = await models.copyTradingLeader.findAll({
    where: { id: leaderIds },
  });

  if (leaders.length === 0) {
    ctx?.fail("No leaders found");
    throw createError({ statusCode: 404, message: "No leaders found" });
  }

  const results: any[] = [];
  const errors: any[] = [];

  ctx?.step(`Processing bulk status update to ${status}`);
  await sequelize.transaction(async (transaction) => {
    for (const leader of leaders) {
      try {
        const oldStatus = leader.status;

        // Skip if already at target status
        if (oldStatus === status) {
          results.push({
            id: leader.id,
            displayName: leader.displayName,
            status: "skipped",
            message: `Already ${status}`,
          });
          continue;
        }

        // Validate status transition
        if (status === "ACTIVE" && oldStatus === "PENDING") {
          // This should use approve endpoint instead
          errors.push({
            id: leader.id,
            displayName: leader.displayName,
            error: "Use approve endpoint for pending leaders",
          });
          continue;
        }

        // Update leader status
        await leader.update({ status }, { transaction });

        // If suspending, pause all followers
        if (status === "SUSPENDED") {
          await models.copyTradingFollower.update(
            { status: "PAUSED" },
            { where: { leaderId: leader.id, status: "ACTIVE" }, transaction }
          );
        }

        // If reactivating, optionally reactivate followers
        if (status === "ACTIVE" && oldStatus === "SUSPENDED") {
          // Followers stay paused - they need to manually resume
        }

        // Create audit log
        await createAuditLog({
          entityType: "LEADER",
          entityId: leader.id,
          action: `BULK_${status}`,
          oldValue: { status: oldStatus },
          newValue: { status },
          adminId: user.id,
          reason,
        });

        results.push({
          id: leader.id,
          displayName: leader.displayName,
          status: "updated",
          oldStatus,
          newStatus: status,
        });
      } catch (err: any) {
        errors.push({
          id: leader.id,
          displayName: leader.displayName,
          error: err.message,
        });
      }
    }
  });

  ctx?.step("Updating statistics for affected leaders");
  for (const result of results.filter((r) => r.status === "updated")) {
    try {
      await updateLeaderStats(result.id);
    } catch {}
  }

  ctx?.success(`Processed ${leaders.length} leaders: ${results.filter((r) => r.status === "updated").length} updated, ${results.filter((r) => r.status === "skipped").length} skipped, ${errors.length} failed`);
  return {
    message: `Processed ${leaders.length} leaders`,
    updated: results.filter((r) => r.status === "updated").length,
    skipped: results.filter((r) => r.status === "skipped").length,
    failed: errors.length,
    results,
    errors,
  };
};
