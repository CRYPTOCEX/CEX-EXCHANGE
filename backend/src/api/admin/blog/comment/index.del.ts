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
  logModule: "ADMIN_BLOG",
  logTitle: "Bulk delete comments",
};

export default async (data: Handler) => {
  const { body, query, ctx } = data;
  const { ids } = body;

  ctx?.step("Validating comment IDs");

  ctx?.step(`Deleting ${ids.length} comments`);
  const result = await handleBulkDelete({
    model: "comment",
    ids,
    query,
  });

  ctx?.success(`${ids.length} comments deleted successfully`);
  return result;
};
