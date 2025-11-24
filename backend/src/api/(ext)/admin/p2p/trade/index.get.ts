// backend/src/api/admin/p2p/trades/index.get.ts

import { models } from "@b/db";
import {
  getFiltered,
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { crudParameters, paginationSchema } from "@b/utils/constants";
import { createError } from "@b/utils/error";

export const metadata: OperationObject = {
  summary: "Lists all p2p trades with pagination and optional filtering",
  operationId: "listP2PTrades",
  tags: ["Admin", "P2P", "Trades"],
  parameters: crudParameters,
  responses: {
    200: {
      description: "Paginated list of p2p trades with detailed information",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              data: {
                type: "array",
                items: {
                  type: "object",
                  // You can document p2pTrade properties here if needed.
                },
              },
              pagination: paginationSchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("p2p Trades"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.p2p.trade",
};

export default async (data: Handler) => {
  const { query, user } = data;
  if (!user?.id)
    throw createError({ statusCode: 401, message: "Unauthorized" });

  // Adjust filtering as needed.
  return getFiltered({
    model: models.p2pTrade,
    query,
    sortField: query.sortField || "createdAt",
    // Optionally, add filtering here. For example, to exclude trades if the admin
    // is part of the transaction, you could use an AND condition. For now, we'll list all trades.
    where: {},
    includeModels: [
      {
        model: models.user,
        as: "buyer",
        attributes: ["id", "firstName", "lastName", "email", "avatar"],
      },
      {
        model: models.user,
        as: "seller",
        attributes: ["id", "firstName", "lastName", "email", "avatar"],
      },
      {
        model: models.p2pDispute,
        as: "dispute",
        // You can specify attributes or leave as default.
      },
    ],
  });
};
