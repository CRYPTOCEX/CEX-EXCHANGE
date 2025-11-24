// /server/api/ecommerce/orders/index.get.ts

import { models } from "@b/db";

import { crudParameters, paginationSchema } from "@b/utils/constants";
import {
  getFiltered,
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { ecommerceOrderSchema } from "./utils";

export const metadata: OperationObject = {
  summary: "Lists all ecommerce orders with pagination and optional filtering",
  operationId: "listEcommerceOrders",
  tags: ["Admin", "Ecommerce", "Orders"],
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
  permission: "view.ecommerce.order",
};

export default async (data: Handler) => {
  const { query } = data;

  return getFiltered({
    model: models.ecommerceOrder,
    query,
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
      {
        model: models.user,
        as: "user",
        attributes: ["id", "firstName", "lastName", "email", "avatar"],
      },
      {
        model: models.ecommerceShippingAddress,
        as: "shippingAddress",
        required: false,
      },
    ],
  });
};
