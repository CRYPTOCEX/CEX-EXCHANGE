// /server/api/ecommerce/orders/index.get.ts

import { ecommerceOrderSchema } from "@b/api/(ext)/admin/ecommerce/order/utils";
import { models } from "@b/db";

import { crudParameters, paginationSchema } from "@b/utils/constants";
import { createError } from "@b/utils/error";
import {
  getFiltered,
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Lists all ecommerce orders with pagination and optional filtering",
  operationId: "listEcommerceOrders",
  tags: ["E-commerce", "Orders"],
  parameters: crudParameters,
  responses: {
    200: {
      description:
        "List of ecommerce orders with details about order items and the user",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: ecommerceOrderSchema,
                },
              },
              pagination: paginationSchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("E-commerce Orders"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { user, query } = data;
  if (!user?.id)
    throw createError({ statusCode: 401, message: "Unauthorized" });

  return getFiltered({
    model: models.ecommerceOrder,
    query,
    where: { userId: user.id },
    sortField: query.sortField || "createdAt",
    includeModels: [
      {
        model: models.ecommerceProduct,
        as: "products",
        through: {
          attributes: ["quantity"],
        },
        attributes: ["name", "price", "status"],
      },
    ],
  });
};
