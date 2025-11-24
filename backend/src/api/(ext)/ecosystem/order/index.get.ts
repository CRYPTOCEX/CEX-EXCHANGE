// /server/api/exchange/orders/index.get.ts

import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { baseOrderSchema } from "./utils";
import { createError } from "@b/utils/error";
import { getOrders } from "@b/api/(ext)/ecosystem/utils/scylla/queries";

export const metadata: OperationObject = {
  summary: "List Orders",
  operationId: "listOrders",
  tags: ["Exchange", "Orders"],
  description: "Retrieves a list of orders for the authenticated user.",
  parameters: [
    {
      name: "type",
      in: "query",
      description: "Type of order to retrieve.",
      schema: { type: "string" },
    },
    {
      name: "symbol",
      in: "query",
      description: "Symbol of the order to retrieve.",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "A list of orders",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: baseOrderSchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Order"),
    500: serverErrorResponse,
  },

  requiresAuth: true,
};

export default async (data: Handler) => {
  const { user } = data;
  if (!user?.id) throw new Error("Unauthorized");
  const { currency, pair, type } = data.query;

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  // If currency and pair are not provided, get all orders for the user
  if (!currency || !pair) {
    const { getOrdersByUserId } = await import("@b/api/(ext)/ecosystem/utils/scylla/queries");

    try {
      const orders = await getOrdersByUserId(user.id);

      // Filter by status (OPEN or not OPEN)
      const filteredOrders = orders.filter((order) =>
        type === "OPEN" ? order.status === "OPEN" : order.status !== "OPEN"
      );

      // Convert bigint fields to numbers
      const result = filteredOrders.map((order) => {
        const { fromBigInt } = require("@b/api/(ext)/ecosystem/utils/blockchain");
        return {
          ...order,
          amount: fromBigInt(order.amount),
          price: fromBigInt(order.price),
          cost: fromBigInt(order.cost),
          fee: fromBigInt(order.fee),
          filled: fromBigInt(order.filled),
          remaining: fromBigInt(order.remaining),
        };
      });

      return result;
    } catch (error) {
      console.error(`[Ecosystem Orders] Error fetching orders:`, error);
      throw error;
    }
  }

  const result = await getOrders(user.id, `${currency}/${pair}`, type === "OPEN");
  return result;
};
