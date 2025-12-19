import { models } from "@b/db";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import ExchangeManager from "@b/utils/exchange";
import { createError } from "@b/utils/error";
import { handleBanStatus, loadBanStatus } from "@b/api/exchange/utils";
import { BinaryOrderService } from "../util/BinaryOrderService";

const binaryProfit = parseFloat(process.env.NEXT_PUBLIC_BINARY_PROFIT || "87");

export const metadata: OperationObject = {
  summary: "Cancel Binary Order",
  operationId: "cancelBinaryOrder",
  tags: ["Binary", "Orders"],
  description: "Cancels a binary order for the authenticated user.",
  parameters: [
    {
      name: "id",
      in: "path",
      description: "ID of the binary order to cancel.",
      required: true,
      schema: { type: "string" },
    },
  ],
  requestBody: {
    description: "Cancellation percentage data.",
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            percentage: { type: "number" },
          },
        },
      },
    },
    required: false,
  },
  responses: {
    200: {
      description: "Binary order cancelled",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: { type: "string" },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Binary Order"),
    500: serverErrorResponse,
  },
  logModule: "BINARY",
  logTitle: "Cancel binary order",
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { body, params, user, ctx } = data;

  if (!user?.id)
    throw createError({ statusCode: 401, message: "Unauthorized" });

  const { id } = params;
  const { percentage } = body;

  try {
    ctx?.step("Validating order existence");
    const order = await models.binaryOrder.findOne({
      where: {
        id,
      },
    });

    if (!order) {
      throw createError(404, "Order not found");
    }

    ctx?.step("Checking order status and eligibility for cancellation");

    ctx?.step("Fetching current market price");

    ctx?.step("Calculating refund amount");

    ctx?.step("Refunding wallet balance");

    ctx?.step("Updating order status to cancelled");
    BinaryOrderService.cancelOrder(user.id, id, percentage);

    ctx?.success(`Cancelled binary order on ${order.symbol}${percentage ? ` with ${percentage}% penalty` : ''}`);
  } catch (error) {
    ctx?.fail(error.message || "Failed to cancel binary order");
    if (error.statusCode === 503) {
      throw error;
    }
    console.error("Error cancelling binary order:", error);
    throw createError(500, "An error occurred while cancelling the order");
  }
};
