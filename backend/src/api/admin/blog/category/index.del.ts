// /server/api/categories/delete.del.ts

import {
  commonBulkDeleteParams,
  commonBulkDeleteResponses,
  handleBulkDelete,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Bulk deletes categories by IDs",
  operationId: "bulkDeleteCategories",
  tags: ["Admin", "Content", "Category"],
  parameters: commonBulkDeleteParams("Categories"),
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
              description: "Array of category IDs to delete",
            },
          },
          required: ["ids"],
        },
      },
    },
  },
  responses: commonBulkDeleteResponses("Categories"),
  requiresAuth: true,
  permission: "delete.blog.category",
  logModule: "ADMIN_BLOG",
  logTitle: "Bulk delete categories",
};

export default async (data: Handler) => {
  const { body, query, ctx } = data;
  const { ids } = body;

  ctx?.step("Validating category IDs");

  ctx?.step(`Deleting ${ids.length} categories`);
  const result = await handleBulkDelete({
    model: "category",
    ids,
    query,
  });

  ctx?.success(`${ids.length} categories deleted successfully`);
  return result;
};
