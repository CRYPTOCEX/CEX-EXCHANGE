// /server/api/ecommerce/categories/delete.del.ts

import {
  commonBulkDeleteParams,
  commonBulkDeleteResponses,
  handleBulkDelete,
} from "@b/utils/query";
import {
  unauthorizedResponse,
  serverErrorResponse,
  notFoundResponse,
  badRequestResponse,
} from "@b/utils/schema/errors";

export const metadata: OperationObject = {
  summary: "Bulk deletes ecommerce categories",
  description:
    "Permanently deletes multiple ecommerce categories by their IDs. This operation cannot be undone. All related data will be affected according to the cascade rules defined in the database.",
  operationId: "bulkDeleteEcommerceCategories",
  tags: ["Admin", "Ecommerce", "Category"],
  parameters: commonBulkDeleteParams("Ecommerce categories"),
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            ids: {
              type: "array",
              items: { type: "string" },
              description: "Array of ecommerce category IDs to delete",
            },
          },
          required: ["ids"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Categories deleted successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: {
                type: "string",
                description: "Success message",
              },
            },
          },
        },
      },
    },
    400: badRequestResponse,
    401: unauthorizedResponse,
    404: notFoundResponse("Ecommerce category"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "delete.ecommerce.category",
  logModule: "ADMIN_ECOM",
  logTitle: "Bulk delete categories",
};

export default async (data: Handler) => {
  const { body, query, ctx } = data;
  const { ids } = body;

  ctx?.step(`Validating ${ids.length} category IDs`);
  ctx?.step("Performing bulk delete operation");

  const result = await handleBulkDelete({
    model: "ecommerceCategory",
    ids,
    query,
  });

  ctx?.success(`Successfully deleted ${ids.length} categories`);
  return result;
};
