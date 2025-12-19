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
  summary: "Lists all ecommerce products with pagination and filtering",
  operationId: "listEcommerceProducts",
  tags: ["Admin", "Ecommerce", "Product"],
  description: "Retrieves a paginated list of ecommerce products with optional filtering and sorting. Includes associated category information and reviews for each product.",
  parameters: crudParameters,
  responses: {
    200: {
      description: "Ecommerce products retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              items: {
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
    404: notFoundMetadataResponse("Ecommerce Products"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.ecommerce.product",
};

export default async (data: Handler) => {
  const { query, ctx } = data;

  ctx?.step("Fetching products list");

  const result = await getFiltered({
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

  ctx?.success(`Retrieved ${result.items?.length || 0} products`);
  return result;
};
