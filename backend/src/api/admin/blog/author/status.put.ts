import { updateRecordResponses, updateStatus } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Bulk updates the status of authors",
  operationId: "bulkUpdateAuthorStatus",
  tags: ["Admin", "Content", "Author"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            ids: {
              type: "array",
              description: "Array of author IDs to update",
              items: { type: "string" },
            },
            status: {
              type: "string",
              enum: ["PENDING", "APPROVED", "REJECTED"],
              description: "New status to apply to the authors",
            },
          },
          required: ["ids", "status"],
        },
      },
    },
  },
  responses: updateRecordResponses("Author"),
  requiresAuth: true,
  permission: "edit.blog.author",
  logModule: "ADMIN_BLOG",
  logTitle: "Bulk update author status",
};

export default async (data: Handler) => {
  const { body, ctx } = data;
  const { ids, status } = body;

  ctx?.step("Validating author IDs and status");

  ctx?.step(`Updating status to ${status} for ${ids.length} authors`);
  const result = await updateStatus("author", ids, status);

  ctx?.success(`${ids.length} authors status updated successfully`);
  return result;
};
