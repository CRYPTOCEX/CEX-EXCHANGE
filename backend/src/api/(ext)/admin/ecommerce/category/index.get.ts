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
import {
  unauthorizedResponse as unauthorizedError,
  serverErrorResponse as serverError,
  notFoundResponse,
} from "@b/utils/schema/errors";

export const metadata: OperationObject = {
  summary: "Lists all ecommerce categories",
  description:
    "Retrieves a paginated list of ecommerce categories with optional filtering and sorting. Supports search, status filtering, and custom sort fields.",
  operationId: "listEcommerceCategories",
  tags: ["Admin", "Ecommerce", "Category"],
  parameters: crudParameters,
  responses: {
    200: {
      description:
        "List of ecommerce categories retrieved successfully with pagination metadata",
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
    401: unauthorizedError,
    404: notFoundResponse("Ecommerce category"),
    500: serverError,
  },
  requiresAuth: true,
  permission: "view.ecommerce.category",
  logModule: "ADMIN_ECOM",
  logTitle: "List categories",
};

export default async (data: Handler) => {
  const { query, ctx } = data;

  ctx?.step("Parsing query parameters");
  ctx?.step("Fetching categories from database");

  const result = await getFiltered({
    model: models.ecommerceCategory,
    query,
    sortField: query.sortField || "name",
  });

  ctx?.success("Categories retrieved successfully");
  return result;
};
