// /server/api/comments/delete.del.ts

import {
  commonBulkDeleteParams,
  commonBulkDeleteResponses,
  handleBulkDelete,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Bulk deletes comments by IDs",
  operationId: "bulkDeleteComments",
  tags: ["Admin", "Content", "Comment"],
  parameters: commonBulkDeleteParams("Comments"),
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
              description: "Array of comment IDs to delete",
            },
          },
          required: ["ids"],
        },
      },
    },
  },
  responses: commonBulkDeleteResponses("Comments"),
  requiresAuth: true,
  permission: "delete.blog.comment",
};

export default async (data: Handler) => {
  const { body, query } = data;
  const { ids } = body;
  return handleBulkDelete({
    model: "comment",
    ids,
    query,
  });
};
