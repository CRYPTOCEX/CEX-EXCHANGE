// backend/src/api/admin/p2p/disputes/index.get.ts

import { models } from "@b/db";
import {
  getFiltered,
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { crudParameters, paginationSchema } from "@b/utils/constants";
import { createError } from "@b/utils/error";
import { Op } from "sequelize";

export const metadata: OperationObject = {
  summary: "Lists all p2p disputes with pagination and optional filtering",
  operationId: "listP2PDisputes",
  tags: ["Admin", "P2P", "Disputes"],
  parameters: crudParameters,
  responses: {
    200: {
      description: "Paginated list of p2p disputes with detailed information",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              data: {
                type: "array",
                items: { type: "object" },
              },
              pagination: paginationSchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("p2p Disputes"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.p2p.dispute",
};

export default async (data: Handler) => {
  const { query, user } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  // You might adjust filtering logic as needed.
  return getFiltered({
    model: models.p2pDispute,
    query,
    sortField: query.sortField || "filedOn",
    where: {},
    includeModels: [
      {
        model: models.p2pTrade,
        as: "trade",
      },
      {
        model: models.user,
        as: "reportedBy",
        attributes: ["id", "firstName", "lastName", "email", "avatar"],
      },
      {
        model: models.user,
        as: "against",
        attributes: ["id", "firstName", "lastName", "email", "avatar"],
      },
    ],
  });
};
