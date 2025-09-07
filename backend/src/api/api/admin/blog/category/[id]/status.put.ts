import { updateStatus, updateRecordResponses } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Update Status for a Category",
  operationId: "updateCategoryStatus",
  tags: ["Admin", "Content", "Category"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the Category to update",
      schema: { type: "string" },
    },
  ],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            status: {
              type: "boolean",
              description:
                "New status to apply to the Category (true for active, false for inactive)",
            },
          },
          required: ["status"],
        },
      },
    },
  },
  responses: updateRecordResponses("Category"),
  requiresAuth: true,
  permission: "edit.blog.category",
};

export default async (data) => {
  const { body, params } = data;
  const { id } = params;
  const { status } = body;
  return updateStatus("category", id, status);
};
