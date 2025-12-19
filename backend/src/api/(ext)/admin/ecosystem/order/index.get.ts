import { crudParameters, paginationSchema } from "@b/utils/constants";
import {
  unauthorizedResponse,
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { orderSchema } from "./utils";
import { getFiltered } from "@b/api/(ext)/ecosystem/utils/scylla/query";

export const metadata = {
  summary: "Lists all ecosystem orders",
  description:
    "Retrieves a paginated list of all ecosystem orders with optional filtering and sorting. Orders include details about user trades, order types, status, prices, amounts, and fees.",
  operationId: "listEcosystemOrders",
  tags: ["Admin", "Ecosystem", "Order"],
  parameters: crudParameters,
  logModule: "ADMIN_ECO",
  logTitle: "List orders",
  responses: {
    200: {
      description: "Ecosystem orders retrieved successfully",
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
    404: notFoundMetadataResponse("Ecosystem Orders"),
    500: serverErrorResponse,
  },
  permission: "view.ecosystem.order",
  requiresAuth: true,
};

const keyspace = process.env.SCYLLA_KEYSPACE || "trading";

export default async (data: Handler) => {
  const { query, ctx } = data;
  const table = "orders";
  const partitionKeys = ["userId"];

  ctx?.step("Fetching ecosystem orders");
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
    transformColumns: ["amount", "cost", "fee", "filled", "price", "remaining"],
    nonStringLikeColumns: ["userId"],
  });

  // Filter out corrupted orders with null essential fields
  // These are ghost records created by ScyllaDB's upsert behavior
  // when UPDATE queries were called with non-existent primary key combinations
  const validItems = result.items.filter((order) => {
    return (
      order.symbol !== null &&
      order.symbol !== undefined &&
      order.amount !== null &&
      order.amount !== undefined &&
      order.price !== null &&
      order.price !== undefined &&
      order.side !== null &&
      order.side !== undefined
    );
  });

  // Update pagination to reflect filtered count
  const removedCount = result.items.length - validItems.length;
  if (removedCount > 0) {
    // Adjust total items count
    result.pagination.totalItems = Math.max(0, result.pagination.totalItems - removedCount);
    result.pagination.totalPages = Math.ceil(result.pagination.totalItems / result.pagination.perPage);
  }

  ctx?.success("Orders retrieved successfully");
  return {
    items: validItems,
    pagination: result.pagination,
  };
};
