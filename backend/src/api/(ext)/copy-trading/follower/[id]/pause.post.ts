// Pause subscription
import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { createAuditLog, notifyFollowerSubscriptionEvent } from "@b/api/(ext)/copy-trading/utils";
import { isValidUUID } from "@b/api/(ext)/copy-trading/utils/security";

export const metadata = {
  summary: "Pause Subscription",
  description: "Pauses a subscription, stopping new trades from being copied.",
  operationId: "pauseCopyTradingSubscription",
  tags: ["Copy Trading", "Followers"],
  requiresAuth: true,
  logModule: "COPY",
  logTitle: "Pause subscription",
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
      description: "Subscription paused successfully",
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
  const subscription = await models.copyTradingFollower.findByPk(id);

  if (!subscription) {
    throw createError({ statusCode: 404, message: "Subscription not found" });
  }

  if (subscription.userId !== user.id) {
    throw createError({ statusCode: 403, message: "Access denied" });
  }

  if (subscription.status !== "ACTIVE") {
    throw createError({
      statusCode: 400,
      message: "Only active subscriptions can be paused",
    });
  }

  ctx?.step("Pausing subscription");
  const oldStatus = subscription.status;
  await subscription.update({ status: "PAUSED" });

  // Create audit log
  await createAuditLog({
    entityType: "FOLLOWER",
    entityId: id,
    action: "PAUSE",
    oldValue: { status: oldStatus },
    newValue: { status: "PAUSED" },
    userId: user.id,
  });

  // Notify follower
  ctx?.step("Sending notification");
  await notifyFollowerSubscriptionEvent(id, "PAUSED", undefined, ctx);

  ctx?.success("Subscription paused");
  return {
    message: "Subscription paused successfully",
    subscription: subscription.toJSON(),
  };
};
