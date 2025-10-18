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

  console.log(`[Ecosystem Orders] Fetching orders for user ${user.id}, type: ${type}, currency: ${currency}, pair: ${pair}`);

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  // If currency and pair are not provided, get all orders for the user
  if (!currency || !pair) {
    console.log(`[Ecosystem Orders] No currency/pair provided, fetching all orders for user ${user.id}`);
    const { getOrdersByUserId } = await import("@b/api/(ext)/ecosystem/utils/scylla/queries");

    try {
      const orders = await getOrdersByUserId(user.id);
      console.log(`[Ecosystem Orders] Retrieved ${orders.length} total orders from database`);

      // Filter by status (OPEN or not OPEN)
      const filteredOrders = orders.filter((order) =>
        type === "OPEN" ? order.status === "OPEN" : order.status !== "OPEN"
      );
      console.log(`[Ecosystem Orders] Filtered to ${filteredOrders.length} orders with status: ${type === "OPEN" ? "OPEN" : "NOT OPEN"}`);

      if (filteredOrders.length > 0) {
        console.log(`[Ecosystem Orders] Sample order:`, JSON.stringify(filteredOrders[0], (key, value) =>
          typeof value === 'bigint' ? value.toString() : value
        ));
      }

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

      console.log(`[Ecosystem Orders] Returning ${result.length} orders`);
      return result;
    } catch (error) {
      console.error(`[Ecosystem Orders] Error fetching orders:`, error);
      throw error;
    }
  }

  console.log(`[Ecosystem Orders] Fetching orders for specific symbol: ${currency}/${pair}`);
  const result = await getOrders(user.id, `${currency}/${pair}`, type === "OPEN");
  console.log(`[Ecosystem Orders] Retrieved ${result.length} orders for symbol ${currency}/${pair}`);
  return result;
};
