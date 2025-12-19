import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { baseOrderSchema } from "./utils";
import { createError } from "@b/utils/error";
import { getOrders } from "@b/api/(ext)/futures/utils/queries/order";

export const metadata: OperationObject = {
  summary: "List Futures Orders",
  operationId: "listFuturesOrders",
  tags: ["Futures", "Orders"],
  logModule: "FUTURES",
  logTitle: "List futures orders",
  description: "Retrieves a list of futures orders for the authenticated user.",
  parameters: [
    {
      name: "currency",
      in: "query",
      description: "Currency of the orders to retrieve.",
      schema: { type: "string" },
    },
    {
      name: "pair",
      in: "query",
      description: "Pair of the orders to retrieve.",
      schema: { type: "string" },
    },
    {
      name: "type",
      in: "query",
      description: "Type of order to retrieve.",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "A list of futures orders",
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
  const { user, query, ctx } = data;

  ctx?.step?.("Validating user authentication");
  if (!user?.id) {
    ctx?.fail?.("User not authenticated");
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const { currency, pair, type } = query;

  // Build symbol only if both currency and pair are provided
  const symbol = currency && pair ? `${currency}/${pair}` : undefined;
  const isOpen = type === "OPEN";

  ctx?.step?.(`Fetching futures orders${symbol ? ` for ${symbol}` : ""}${type ? ` (${type})` : ""}`);
  const orders = await getOrders(user.id, symbol, isOpen);

  ctx?.success?.(`Retrieved ${orders.length} futures orders`);
  return orders;
};
