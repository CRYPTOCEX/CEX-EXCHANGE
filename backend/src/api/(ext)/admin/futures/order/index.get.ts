import { crudParameters, paginationSchema } from "@b/utils/constants";
import {
  unauthorizedResponse,
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { orderSchema } from "./utils";

// Safe import for ecosystem modules
let getFiltered: any;
try {
  const module = require("@b/api/(ext)/ecosystem/utils/scylla/query");
  getFiltered = module.getFiltered;
} catch (e) {
  // Ecosystem extension not available
}

export const metadata = {
  summary: "List all futures orders",
  operationId: "listFuturesOrders",
  tags: ["Admin", "Futures Orders"],
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
              pagination: {
                type: "object",
                properties: {
                  totalItems: { type: "number" },
                  currentPage: { type: "number" },
                  perPage: { type: "number" },
                  totalPages: { type: "number" },
                },
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Futures Orders"),
    500: serverErrorResponse,
  },
  permission: "view.futures.order",
  requiresAuth: true,
};

const keyspace = process.env.SCYLLA_FUTURES_KEYSPACE || "futures";

export default async (data: Handler) => {
  const { query } = data;

  if (!getFiltered) {
    return {
      error: "Ecosystem extension not available",
      status: 500
    };
  }

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

  return result;
};
