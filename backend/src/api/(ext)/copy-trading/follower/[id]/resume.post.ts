// Resume subscription
import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { createAuditLog, notifyFollowerSubscriptionEvent } from "@b/api/(ext)/copy-trading/utils";
import { isValidUUID } from "@b/api/(ext)/copy-trading/utils/security";

export const metadata = {
  summary: "Resume Subscription",
  description: "Resumes a paused subscription.",
  operationId: "resumeCopyTradingSubscription",
  tags: ["Copy Trading", "Followers"],
  requiresAuth: true,
  logModule: "COPY",
  logTitle: "Resume subscription",
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
  responses: {
    200: {
      description: "Subscription resumed successfully",
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
  const { user, params, ctx } = data;
  const { id } = params;

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  // Validate subscription ID
  if (!isValidUUID(id)) {
    throw createError({ statusCode: 400, message: "Invalid subscription ID" });
  }

  ctx?.step("Fetching subscription");
  const subscription = await models.copyTradingFollower.findByPk(id, {
    include: [
      {
        model: models.copyTradingLeader,
        as: "leader",
      },
    ],
  });

  if (!subscription) {
    throw createError({ statusCode: 404, message: "Subscription not found" });
  }

  if (subscription.userId !== user.id) {
    throw createError({ statusCode: 403, message: "Access denied" });
  }

  if (subscription.status !== "PAUSED") {
    throw createError({
      statusCode: 400,
      message: "Only paused subscriptions can be resumed",
    });
  }

  // Check if leader is still active
  const leader = (subscription as any).leader;
  if (!leader || leader.status !== "ACTIVE") {
    throw createError({
      statusCode: 400,
      message: "Cannot resume - leader is no longer active",
    });
  }

  ctx?.step("Resuming subscription");
  const oldStatus = subscription.status;
  await subscription.update({ status: "ACTIVE" });

  // Create audit log
  await createAuditLog({
    entityType: "FOLLOWER",
    entityId: id,
    action: "RESUME",
    oldValue: { status: oldStatus },
    newValue: { status: "ACTIVE" },
    userId: user.id,
  });

  // Notify follower
  ctx?.step("Sending notification");
  await notifyFollowerSubscriptionEvent(id, "RESUMED", undefined, ctx);

  ctx?.success("Subscription resumed");
  return {
    message: "Subscription resumed successfully",
    subscription: subscription.toJSON(),
  };
};
