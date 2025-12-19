// Get subscription details
import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Get Subscription Details",
  description: "Retrieves detailed information about a specific subscription.",
  operationId: "getCopyTradingSubscription",
  tags: ["Copy Trading", "Followers"],
  requiresAuth: true,
  logModule: "COPY",
  logTitle: "Get subscription details",
  parameters: [
    {
      name: "id",
      in: "path",
      required: true,
      schema: { type: "string" },
      description: "Subscription ID",
    },
  ],
  responses: {
    200: {
      description: "Subscription details retrieved successfully",
      content: {
        "application/json": {
          schema: { type: "object" },
        },
      },
    },
    401: { description: "Unauthorized" },
    403: { description: "Forbidden" },
    404: { description: "Subscription not found" },
    500: { description: "Internal Server Error" },
  },
};

export default async (data: Handler) => {
  const { user, params, ctx } = data;
  const { id } = params;

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  ctx?.step("Fetching subscription");
  const subscription = await models.copyTradingFollower.findByPk(id, {
    include: [
      {
        model: models.copyTradingLeader,
        as: "leader",
        include: [
          {
            model: models.user,
            as: "user",
            attributes: ["id", "firstName", "lastName", "avatar"],
          },
        ],
      },
    ],
  });

  if (!subscription) {
    throw createError({ statusCode: 404, message: "Subscription not found" });
  }

  // Check ownership
  if (subscription.userId !== user.id) {
    throw createError({ statusCode: 403, message: "Access denied" });
  }

  ctx?.step("Fetching recent trades");
  // Get recent trades for this subscription
  const recentTrades = await models.copyTradingTrade.findAll({
    where: { followerId: id },
    order: [["createdAt", "DESC"]],
    limit: 20,
  });

  ctx?.step("Fetching transactions");
  // Get transactions for this subscription
  const transactions = await models.copyTradingTransaction.findAll({
    where: { followerId: id },
    order: [["createdAt", "DESC"]],
    limit: 20,
  });

  ctx?.success("Subscription details retrieved");
  return {
    ...subscription.toJSON(),
    recentTrades: recentTrades.map((t: any) => t.toJSON()),
    transactions: transactions.map((t: any) => t.toJSON()),
  };
};
