// /server/api/categories/delete.del.ts

import {
  commonBulkDeleteParams,
  commonBulkDeleteResponses,
  handleBulkDelete,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Bulk deletes categories by IDs",
  operationId: "bulkDeleteCategories",
  tags: ["Admin", "Content", "Tag"],
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
              description: "Array of tag IDs to delete",
            },
          },
          required: ["ids"],
        },
      },
    },
  },
  responses: commonBulkDeleteResponses("Categories"),
  requiresAuth: true,
  permission: "delete.blog.tag",
  logModule: "ADMIN_BLOG",
  logTitle: "Bulk delete tags",
};

export default async (data: Handler) => {
  const { body, query, ctx } = data;
  const { ids } = body;

  ctx?.step("Validating tag IDs");

  ctx?.step(`Deleting ${ids.length} tags`);
  const result = await handleBulkDelete({
    model: "tag",
    ids,
    query,
  });

  ctx?.success(`${ids.length} tags deleted successfully`);
  return result;
};
