// /server/api/deposit/paypal/details.get.ts

import { paypalClient, paypalOrders } from "./utils";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Fetches PayPal order details",
  description: "Retrieves details for a specific PayPal order by its ID.",
  operationId: "getPayPalOrderDetails",
  tags: ["Finance", "Deposit"],
  parameters: [
    {
      name: "orderId",
      in: "query",
      description: "PayPal order ID",
      required: true,
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "PayPal order details fetched successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              id: { type: "string", description: "Order ID" },
              status: { type: "string", description: "Order status" },
              purchase_units: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    amount: {
                      type: "object",
                      properties: {
                        currency_code: { type: "string" },
                        value: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Paypal"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { user, query } = data;
  if (!user) throw new Error("User not authenticated");

  const { orderId } = query;
  if (!orderId) throw new Error("Order ID is required");

  const client = paypalClient();
  const request = new paypalOrders.OrdersGetRequest(orderId);

  try {
    const order = await client.execute(request);
    return order.result; // Adjust based on the structure of the order details you want to return
  } catch (error) {
    throw new Error(`Error getting PayPal order details: ${error.message}`);
  }
};
