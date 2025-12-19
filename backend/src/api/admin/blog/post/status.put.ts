import { updateRecordResponses, updateStatus } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Bulk updates the status of Posts",
  operationId: "bulkUpdatePostStatus",
  tags: ["Admin", "Content", "Posts"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            ids: {
              type: "array",
              description: "Array of Post IDs to update",
              items: { type: "string" },
            },
            status: {
              type: "string",
              enum: ["PUBLISHED", "DRAFT", "TRASH"],
              description: "New status to apply to the Posts",
            },
          },
          required: ["ids", "status"],
        },
      },
    },
  },
  responses: updateRecordResponses("Post"),
  requiresAuth: true,
  permission: "edit.blog.post",
  logModule: "ADMIN_BLOG",
  logTitle: "Bulk update blog post status",
};

export default async (data: Handler) => {
  const { body, ctx } = data;
  const { ids, status } = body;

  ctx?.step("Validating blog post IDs and status");

  ctx?.step(`Updating status to ${status} for ${ids.length} blog posts`);
  const result = await updateStatus("post", ids, status);

  ctx?.success(`${ids.length} blog posts status updated successfully`);
  return result;
};
