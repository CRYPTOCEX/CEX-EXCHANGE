// /server/api/ecommerce/products/index.get.ts

import { models } from "@b/db";

import { crudParameters, paginationSchema } from "@b/utils/constants";
import {
  getFiltered,
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { ecommerceProductSchema } from "./utils";

export const metadata: OperationObject = {
  summary:
    "Lists all ecommerce products with pagination and optional filtering",
  operationId: "listEcommerceProducts",
  tags: ["Admin", "Ecommerce", "Products"],
  parameters: crudParameters,
  responses: {
    200: {
      description:
        "List of ecommerce products with detailed information including associated categories, discounts, and reviews",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: ecommerceProductSchema,
                },
              },
              pagination: paginationSchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("E-commerce Products"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.ecommerce.product",
};

export default async (data: Handler) => {
  const { query } = data;

  return getFiltered({
    model: models.ecommerceProduct,
    query,
    sortField: query.sortField || "createdAt",
    includeModels: [
      {
        model: models.ecommerceCategory,
        as: "category",
        attributes: ["name"],
      },
      {
        model: models.ecommerceReview,
        as: "ecommerceReviews",
        attributes: ["rating", "comment"],
        required: false,
      },
    ],
    numericFields: ["price", "inventoryQuantity", "rating"],
  });
};
