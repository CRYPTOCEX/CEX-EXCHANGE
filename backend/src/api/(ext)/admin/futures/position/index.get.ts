import { crudParameters, paginationSchema } from "@b/utils/constants";
import {
  unauthorizedResponse,
  serverErrorResponse,
  notFoundResponse,
} from "@b/utils/schema/errors";
import { positionSchema } from "./utils";

// Safe import for ecosystem modules
let getFiltered: any;
try {
  const module = require("@b/api/(ext)/ecosystem/utils/scylla/query");
  getFiltered = module.getFiltered;
} catch (e) {
  // Ecosystem extension not available
}

export const metadata: OperationObject = {
  summary: "Lists all futures positions with pagination and filtering",
  operationId: "listFuturesPositions",
  tags: ["Admin", "Futures", "Position"],
  description:
    "Retrieves a paginated list of all futures positions from ScyllaDB with support for filtering, sorting, and search. Returns position details including side, entry price, amount, leverage, unrealized PnL, stop loss, take profit, and associated user information.",
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
              pagination: paginationSchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundResponse("Futures Positions"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.futures.position",
  logModule: "ADMIN_FUTURES",
  logTitle: "List futures positions",
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

  ctx?.step("Fetching futures positions");
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

  ctx?.success(`Retrieved ${result.items.length} futures positions`);
  return result;
};
