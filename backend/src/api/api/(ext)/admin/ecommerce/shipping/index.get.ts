// /server/api/ecommerce/Shipping/index.get.ts

import { models } from "@b/db";
import { crudParameters, paginationSchema } from "@b/utils/constants";
import {
  getFiltered,
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { ecommerceShippingSchema } from "./utils";

export const metadata: OperationObject = {
  summary:
    "Lists all ecommerce Shipping with pagination and optional filtering",
  operationId: "listEcommerceShipping",
  tags: ["Admin", "Ecommerce", "Shipping"],
  parameters: crudParameters,
  responses: {
    200: {
      description:
        "List of ecommerce Shipping with details about shipping items",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: ecommerceShippingSchema,
                },
              },
              pagination: paginationSchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("E-commerce Shipping"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.ecommerce.shipping",
};

export default async (data: Handler) => {
  const { query } = data;

  return getFiltered({
    model: models.ecommerceShipping,
    query,
    sortField: query.sortField || "createdAt",
    includeModels: [
      {
        model: models.ecommerceOrder,
        as: "ecommerceOrders",
        includeModels: [
          {
            model: models.ecommerceOrderItem,
            as: "ecommerceOrderItems",
            attributes: ["orderId", "productId", "quantity"],
          },
        ],
      },
    ],
    numericFields: ["cost", "weight", "volume", "tax"],
  });
};
