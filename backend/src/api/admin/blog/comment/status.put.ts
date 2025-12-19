import { updateRecordResponses, updateStatus } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Bulk updates the status of comments",
  operationId: "bulkUpdateCommentStatus",
  tags: ["Admin", "Content", "Comment"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            ids: {
              type: "array",
              description: "Array of comment IDs to update",
              items: { type: "string" },
            },
            status: {
              type: "boolean",
              description:
                "New status to apply to the comments (true for active, false for inactive)",
            },
          },
          required: ["ids", "status"],
        },
      },
    },
  },
  responses: updateRecordResponses("Comment"),
  requiresAuth: true,
  permission: "edit.blog.comment",
  logModule: "ADMIN_BLOG",
  logTitle: "Bulk update comment status",
};

export default async (data: Handler) => {
  const { body, ctx } = data;
  const { ids, status } = body;

  ctx?.step("Validating comment IDs and status");

  ctx?.step(`Updating status to ${status ? 'active' : 'inactive'} for ${ids.length} comments`);
  const result = await updateStatus("comment", ids, status);

  ctx?.success(`${ids.length} comments status updated successfully`);
  return result;
};
