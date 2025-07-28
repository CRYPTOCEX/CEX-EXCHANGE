// /server/api/admin/exchange/orders/index.get.ts

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
  summary: "List all exchange orders",
  operationId: "listExchangeOrders",
  tags: ["Admin", "Exchange Orders"],
  parameters: crudParameters,
  responses: {
    200: {
      description: "Exchange orders retrieved successfully",
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
    404: notFoundMetadataResponse("Exchange Orders"),
    500: serverErrorResponse,
  },
  permission: "view.exchange.order",
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { query } = data;
  return getFiltered({
    model: models.exchangeOrder,
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
