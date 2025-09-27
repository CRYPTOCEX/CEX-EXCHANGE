import { crudParameters, paginationSchema } from "@b/utils/constants";
import {
  unauthorizedResponse,
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { positionSchema } from "./utils"; // Adjust as needed

// Safe import for ecosystem modules
let getFiltered: any;
try {
  const module = require("@b/api/(ext)/ecosystem/utils/scylla/query");
  getFiltered = module.getFiltered;
} catch (e) {
  // Ecosystem extension not available
}

export const metadata = {
  summary: "List all futures positions",
  operationId: "listFuturesPositions",
  tags: ["Admin", "Futures Positions"],
  parameters: crudParameters,
  responses: {
    200: {
      description: "Futures positions retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              items: {
                type: "array",
                items: { type: "object", properties: positionSchema },
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
    404: notFoundMetadataResponse("Futures Positions"),
    500: serverErrorResponse,
  },
  permission: "view.futures.position",
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

  const table = "position"; // Note: table name is "position" (singular) as created
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
      "entryPrice",
      "amount",
      "leverage",
      "unrealizedPnl",
      "stopLossPrice",
      "takeProfitPrice",
    ],
    nonStringLikeColumns: ["userId"],
  });

  return result;
};
