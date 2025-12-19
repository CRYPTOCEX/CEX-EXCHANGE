// /server/api/authors/delete.del.ts

import {
  commonBulkDeleteParams,
  commonBulkDeleteResponses,
  handleBulkDelete,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Bulk deletes authors by IDs",
  operationId: "bulkDeleteAuthors",
  tags: ["Admin", "Content", "Author"],
  parameters: commonBulkDeleteParams("Authors"),
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
              description: "Array of author IDs to delete",
            },
          },
          required: ["ids"],
        },
      },
    },
  },
  responses: commonBulkDeleteResponses("Authors"),
  requiresAuth: true,
  permission: "delete.blog.author",
  logModule: "ADMIN_BLOG",
  logTitle: "Bulk delete authors",
};

export default async (data: Handler) => {
  const { body, query, ctx } = data;
  const { ids } = body;

  ctx?.step("Validating author IDs");

  ctx?.step(`Deleting ${ids.length} authors`);
  const result = await handleBulkDelete({
    model: "author",
    ids,
    query,
  });

  ctx?.success(`${ids.length} authors deleted successfully`);
  return result;
};
