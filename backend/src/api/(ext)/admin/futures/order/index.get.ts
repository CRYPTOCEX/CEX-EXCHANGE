import { crudParameters, paginationSchema } from "@b/utils/constants";
import {
  unauthorizedResponse,
  serverErrorResponse,
  notFoundResponse,
} from "@b/utils/schema/errors";
import { orderSchema } from "./utils";

// Safe import for ecosystem modules
let getFiltered: any;
try {
  const module = require("@b/api/(ext)/ecosystem/utils/scylla/query");
  getFiltered = module.getFiltered;
} catch (e) {
  // Ecosystem extension not available
}

export const metadata: OperationObject = {
  summary: "Lists all futures orders with pagination and filtering",
  operationId: "listFuturesOrders",
  tags: ["Admin", "Futures", "Order"],
  description:
    "Retrieves a paginated list of all futures orders from ScyllaDB with support for filtering, sorting, and search. Returns order details including type, status, side, price, amount, fees, and associated user information.",
  parameters: crudParameters,
  responses: {
    200: {
      description: "Futures orders retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              items: {
                type: "array",
                items: { type: "object", properties: orderSchema },
              },
              pagination: paginationSchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundResponse("Futures Orders"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.futures.order",
  logModule: "ADMIN_FUTURES",
  logTitle: "List futures orders",
};

const keyspace = process.env.SCYLLA_FUTURES_KEYSPACE || "futures";

export default async (data: Handler) => {
  const { query, ctx } = data;

  if (!getFiltered) {
    return {
      error: "Ecosystem extension not available",
      status: 500
    };
  }

  ctx?.step("Fetching futures orders");
  const table = "orders";
  const partitionKeys = ["userId"];

  const result = await getFiltered({
    table,
    query,
    filter: query.filter,
    sortField: query.sortField || "createdAt",
    sortOrder: query.sortOrder || "DESC",
    perPage: Number(query.perPage) || 10,
    allowFiltering: true,
    keyspace,
    partitionKeys,
    transformColumns: [
      "amount",
      "cost",
      "fee",
      "filled",
      "price",
      "remaining",
      "leverage",
      "stopLossPrice",
      "takeProfitPrice",
    ],
    nonStringLikeColumns: ["userId"],
  });

  ctx?.success(`Retrieved ${result.items.length} futures orders`);
  return result;
};
