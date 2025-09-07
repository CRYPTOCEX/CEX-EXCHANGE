import { createError } from "@b/utils/error";
import { createRecordResponses } from "@b/utils/query";
import { cancelAllOrdersByUserId } from "@b/api/(ext)/futures/utils/queries/order";

export const metadata: OperationObject = {
  summary: "Cancel all futures orders",
  description: "Cancels all open futures orders for the authenticated user.",
  operationId: "cancelAllFuturesOrders",
  tags: ["Futures", "Orders"],
  responses: createRecordResponses("Orders cancelled"),
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { user } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  try {
    const result = await cancelAllOrdersByUserId(user.id);
    
    return {
      message: "All futures orders cancelled successfully",
      cancelledCount: result.cancelledCount || 0,
    };
  } catch (error) {
    console.error("Error cancelling all futures orders:", error);
    throw createError({
      statusCode: 500,
      message: `Failed to cancel all futures orders: ${error.message}`,
    });
  }
}; 