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
};

export default async (data: Handler) => {
  const { body, query } = data;
  const { ids } = body;
  return handleBulkDelete({
    model: "author",
    ids,
    query,
  });
};
