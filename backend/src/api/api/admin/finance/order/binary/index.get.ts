// /server/api/admin/binary/orders/index.get.ts

import { models } from "@b/db";
import {
  getFiltered,
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { crudParameters, paginationSchema } from "@b/utils/constants";
import { orderSchema } from "./utils";

export const metadata = {
  summary: "List all binary orders",
  operationId: "listBinaryOrders",
  tags: ["Admin", "Binary Orders"],
  parameters: crudParameters,
  responses: {
    200: {
      description: "Binary orders retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: orderSchema,
                },
              },
              pagination: paginationSchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Binary orders"),
    500: serverErrorResponse,
  },
  permission: "view.binary.order",
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { query } = data;
  return getFiltered({
    model: models.binaryOrder,
    query,
    sortField: query.sortField || "createdAt",
    includeModels: [
      {
        model: models.user,
        as: "user",
        attributes: ["id", "firstName", "lastName", "email", "avatar"],
      },
    ],
  });
};
