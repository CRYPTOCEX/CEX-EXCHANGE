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
  summary: "Resume copy trading follower subscription",
  description:
    "Administratively resumes a paused follower subscription, creates an audit log entry. This operation uses database transactions to ensure data consistency. Returns an error if the subscription is not paused or if the leader is no longer active.",
  operationId: "resumeCopyTradingFollower",
  tags: ["Admin", "Copy Trading", "Follower"],
  requiresAuth: true,
  permission: "access.copy_trading",
  middleware: ["copyTradingAdmin"],
  logModule: "ADMIN_COPY",
  logTitle: "Resume Copy Trading Follower Subscription",
  parameters: [
    {
      name: "id",
      in: "path",
      required: true,
      description: "Unique identifier of the follower subscription to resume",
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
              description: "Administrative reason for resuming the subscription",
              example: "Manual review completed",
            },
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: "Follower subscription resumed successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: {
                type: "string",
                example: "Subscription resumed successfully",
                description: "Success message",
              },
            },
            required: ["message"],
          },
        },
      },
    },
    400: {
      description: "Bad request - Subscription not paused or leader not active",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: {
                type: "string",
                example: "Only paused subscriptions can be resumed",
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
    if (followerData.status !== "PAUSED") {
      await t.rollback();
      ctx?.fail("Only paused subscriptions can be resumed");
      throw createError({
        statusCode: 400,
        message: "Only paused subscriptions can be resumed",
      });
    }

    ctx?.step("Validating leader status");
    if (!followerData.leader || followerData.leader.status !== "ACTIVE") {
      await t.rollback();
      ctx?.fail("Cannot resume - leader is no longer active");
      throw createError({
        statusCode: 400,
        message: "Cannot resume - leader is no longer active",
      });
    }

    ctx?.step("Updating follower status");
    const oldStatus = followerData.status;
    await follower.update(
      {
        status: "ACTIVE",
      },
      { transaction: t }
    );

    ctx?.step("Creating audit log");
    await createAuditLog({
      userId: user.id,
      action: "ADMIN_RESUME",
      entityType: "copyTradingFollower",
      entityId: id,
      metadata: {
        reason,
        followerId: followerData.userId,
        leaderId: followerData.leaderId,
        oldStatus,
        newStatus: "ACTIVE",
      },
      ipAddress: data.request?.ip || "unknown",
    });

    await t.commit();

    ctx?.success("Subscription resumed successfully");
    return {
      message: "Subscription resumed successfully",
    };
  } catch (error) {
    await t.rollback();
    ctx?.fail("Failed to resume subscription");
    throw error;
  }
};
