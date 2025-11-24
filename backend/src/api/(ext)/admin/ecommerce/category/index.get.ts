// /server/api/ecommerce/categories/index.get.ts

import { models } from "@b/db";

import { crudParameters, paginationSchema } from "@b/utils/constants";
import {
  getFiltered,
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { ecommerceCategorySchema } from "./utils";

export const metadata: OperationObject = {
  summary:
    "Lists all e-commerce categories with pagination and optional filtering",
  operationId: "listEcommerceCategories",
  tags: ["Admin", "Ecommerce", "Categories"],
  parameters: crudParameters,
  responses: {
    200: {
      description:
        "List of e-commerce categories with optional related products and pagination",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: ecommerceCategorySchema,
                },
              },
              pagination: paginationSchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("E-commerce Categories"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.ecommerce.category",
};

export default async (data: Handler) => {
  const { query } = data;

  return getFiltered({
    model: models.ecommerceCategory,
    query,
    sortField: query.sortField || "name",
  });
};
