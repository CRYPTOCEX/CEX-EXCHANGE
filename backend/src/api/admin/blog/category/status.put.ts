import { updateRecordResponses, updateStatus } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Bulk updates the status of categories",
  operationId: "bulkUpdateCategoryStatus",
  tags: ["Admin", "Content", "Category"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            ids: {
              type: "array",
              description: "Array of category IDs to update",
              items: { type: "string" },
            },
            status: {
              type: "boolean",
              description:
                "New status to apply to the categories (true for active, false for inactive)",
            },
          },
          required: ["ids", "status"],
        },
      },
    },
  },
  responses: updateRecordResponses("Category"),
  requiresAuth: true,
  permission: "edit.blog.category",
  logModule: "ADMIN_BLOG",
  logTitle: "Bulk update category status",
};

export default async (data: Handler) => {
  const { body, ctx } = data;
  const { ids, status } = body;

  ctx?.step("Validating category IDs and status");

  ctx?.step(`Updating status to ${status ? 'active' : 'inactive'} for ${ids.length} categories`);
  const result = await updateStatus("category", ids, status);

  ctx?.success(`${ids.length} categories status updated successfully`);
  return result;
};
