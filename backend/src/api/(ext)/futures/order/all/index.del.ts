import { createError } from "@b/utils/error";
import { createRecordResponses } from "@b/utils/query";
import { cancelAllOrdersByUserId } from "@b/api/(ext)/futures/utils/queries/order";

export const metadata: OperationObject = {
  summary: "Cancel all futures orders",
  description: "Cancels all open futures orders for the authenticated user.",
  operationId: "cancelAllFuturesOrders",
  tags: ["Futures", "Orders"],
  logModule: "FUTURES",
  logTitle: "Cancel all futures orders",
  responses: createRecordResponses("Orders cancelled"),
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { user, ctx } = data;

  ctx?.step?.("Validating user authentication");
  if (!user?.id) {
    ctx?.fail?.("User not authenticated");
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  try {
    ctx?.step?.(`Cancelling all open futures orders for user ${user.id}`);
    const result = await cancelAllOrdersByUserId(user.id);

    ctx?.success?.(`Cancelled ${result.cancelledCount || 0} futures orders`);
    return {
      message: "All futures orders cancelled successfully",
      cancelledCount: result.cancelledCount || 0,
    };
  } catch (error) {
    console.error("Error cancelling all futures orders:", error);
    ctx?.fail?.(`Failed to cancel orders: ${error.message}`);
    throw createError({
      statusCode: 500,
      message: `Failed to cancel all futures orders: ${error.message}`,
    });
  }
}; 