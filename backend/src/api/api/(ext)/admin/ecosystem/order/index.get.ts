import { crudParameters, paginationSchema } from "@b/utils/constants";
import {
  unauthorizedResponse,
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { orderSchema } from "./utils";
import { getFiltered } from "@b/api/(ext)/ecosystem/utils/scylla/query";

export const metadata = {
  summary: "List all ecosystem orders",
  operationId: "listEcosystemOrders",
  tags: ["Admin", "Ecosystem Orders"],
  parameters: crudParameters,
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
    404: notFoundMetadataResponse("Ecosystem Orders"),
    500: serverErrorResponse,
  },
  permission: "view.ecosystem.order",
  requiresAuth: true,
};

const keyspace = process.env.SCYLLA_KEYSPACE || "trading";

export default async (data: Handler) => {
  const { query } = data;
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
    transformColumns: ["amount", "cost", "fee", "filled", "price", "remaining"],
    nonStringLikeColumns: ["userId"],
  });

  return result;
};
