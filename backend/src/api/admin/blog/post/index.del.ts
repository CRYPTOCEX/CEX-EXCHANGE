// /server/api/posts/delete.del.ts

import {
  commonBulkDeleteParams,
  commonBulkDeleteResponses,
  handleBulkDelete,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Bulk deletes posts by IDs",
  operationId: "bulkDeletePosts",
  tags: ["Admin", "Content", "Posts"],
  parameters: commonBulkDeleteParams("Posts"),
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
              description: "Array of post IDs to delete",
            },
          },
          required: ["ids"],
        },
      },
    },
  },
  responses: commonBulkDeleteResponses("Posts"),
  requiresAuth: true,
  permission: "delete.blog.post",
  logModule: "ADMIN_BLOG",
  logTitle: "Bulk delete blog posts",
};

export default async (data: Handler) => {
  const { body, query, ctx } = data;
  const { ids } = body;

  ctx?.step("Validating blog post IDs");

  ctx?.step(`Deleting ${ids.length} blog posts`);
  const result = await handleBulkDelete({
    model: "post",
    ids,
    query,
  });

  ctx?.success(`${ids.length} blog posts deleted successfully`);
  return result;
};
