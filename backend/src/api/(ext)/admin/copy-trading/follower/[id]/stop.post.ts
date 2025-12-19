import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";
import {
  unauthorizedResponse,
  serverErrorResponse,
  notFoundResponse,
  badRequestResponse,
} from "@b/utils/schema/errors";
import { createAuditLog } from "@b/api/(ext)/copy-trading/utils";

export const metadata: OperationObject = {
  summary: "Force stop copy trading follower subscription",
  description:
    "Administratively forces a follower subscription to stop, returns any unused allocated funds to the user's wallet, creates a deallocation transaction record, decrements the leader's follower count, and creates an audit log entry. This operation uses database transactions to ensure data consistency. Returns an error if the subscription is already stopped.",
  operationId: "forceStopCopyTradingFollower",
  tags: ["Admin", "Copy Trading", "Follower"],
  requiresAuth: true,
  permission: "access.copy_trading",
  middleware: ["copyTradingAdmin"],
  logModule: "ADMIN_COPY",
  logTitle: "Force Stop Copy Trading Follower Subscription",
  parameters: [
    {
      name: "id",
      in: "path",
      required: true,
      description: "Unique identifier of the follower subscription to stop",
      schema: { type: "string", format: "uuid" },
    },
  ],
  requestBody: {
    required: false,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            reason: {
              type: "string",
              description: "Administrative reason for force stopping the subscription",
              example: "Policy violation",
            },
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: "Follower subscription stopped successfully and funds returned",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: {
                type: "string",
                example: "Subscription stopped successfully",
                description: "Success message",
              },
            },
            required: ["message"],
          },
        },
      },
    },
    400: {
      description: "Bad request - Subscription already stopped",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: {
                type: "string",
                example: "Subscription already stopped",
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundResponse("Follower"),
    500: serverErrorResponse,
  },
};

export default async (data: any) => {
  const { user, params, body, ctx } = data;
  if (!user?.id) {
    ctx?.fail("Unauthorized");
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const { id } = params;
  const { reason } = body || {};

  const t = await sequelize.transaction();

  try {
    ctx?.step("Fetching follower subscription");
    const follower = await models.copyTradingFollower.findByPk(id, {
      include: [
        { model: models.user, as: "user" },
        { model: models.copyTradingLeader, as: "leader" },
      ],
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!follower) {
      await t.rollback();
      ctx?.fail("Follower not found");
      throw createError({ statusCode: 404, message: "Follower not found" });
    }

    const followerData = follower as any;

    ctx?.step("Validating follower status");
    if (followerData.status === "STOPPED") {
      await t.rollback();
      ctx?.fail("Subscription already stopped");
      throw createError({ statusCode: 400, message: "Subscription already stopped" });
    }

    // Note: Funds are now managed per-allocation, not at follower level
    // When a subscription is stopped, funds remain in individual allocations
    // They will be returned when those allocations are removed

    ctx?.step("Updating follower status");
    await follower.update(
      {
        status: "STOPPED",
      },
      { transaction: t }
    );

    // Note: totalFollowers is now calculated on-demand from copyTradingFollower table
    // No need to decrement here - stats-calculator.ts handles this

    ctx?.step("Creating audit log");
    await createAuditLog({
      userId: user.id,
      action: "ADMIN_FORCE_STOP",
      entityType: "copyTradingFollower",
      entityId: id,
      metadata: {
        reason,
        followerId: followerData.userId,
        leaderId: followerData.leaderId,
      },
      ipAddress: data.request?.ip || "unknown",
    });

    await t.commit();

    ctx?.success("Subscription stopped successfully");
    return {
      message: "Subscription stopped successfully",
    };
  } catch (error) {
    await t.rollback();
    ctx?.fail("Failed to stop subscription");
    throw error;
  }
};
