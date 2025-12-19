// Get allocations for a subscription
import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { isValidUUID } from "@b/api/(ext)/copy-trading/utils/security";

export const metadata = {
  summary: "Get Subscription Allocations",
  description: "Retrieves all market allocations for a subscription.",
  operationId: "getSubscriptionAllocations",
  tags: ["Copy Trading", "Followers", "Allocations"],
  requiresAuth: true,
  logModule: "COPY",
  logTitle: "Get allocations",
  parameters: [
    {
      name: "id",
      in: "path",
      required: true,
      schema: { type: "string", format: "uuid" },
      description: "Subscription (follower) ID",
    },
  ],
  responses: {
    200: {
      description: "Allocations retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: { type: "object" },
          },
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

  ctx?.step("Fetching allocations");
  const allocations = await models.copyTradingFollowerAllocation.findAll({
    where: { followerId: id },
    order: [["symbol", "ASC"]],
  });

  ctx?.success(`Found ${allocations.length} allocations`);
  return allocations.map((a: any) => a.toJSON());
};
