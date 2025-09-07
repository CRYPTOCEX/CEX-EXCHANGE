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
};

export default async (data: Handler) => {
  const { body, params, user } = data;

  if (!user?.id)
    throw createError({ statusCode: 401, message: "Unauthorized" });

  const { id } = params;
  const { percentage } = body;
  const order = await models.binaryOrder.findOne({
    where: {
      id,
    },
  });

  if (!order) {
    throw createError(404, "Order not found");
  }

  try {
    BinaryOrderService.cancelOrder(user.id, id, percentage);
  } catch (error) {
    if (error.statusCode === 503) {
      throw error;
    }
    console.error("Error cancelling binary order:", error);
    throw createError(500, "An error occurred while cancelling the order");
  }
};
