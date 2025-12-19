import { updateStatus, updateRecordResponses } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Updates the status of an Author",
  operationId: "updateAuthorStatus",
  tags: ["Admin", "Content", "Author"],
  parameters: [
    {
      name: "id",
      in: "path",
      required: true,
      description: "ID of the author to update",
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
              type: "string",
              enum: ["PENDING", "APPROVED", "REJECTED"],
              description: "New status to set for the author",
            },
          },
          required: ["status"],
        },
      },
    },
  },
  responses: updateRecordResponses("Author"),
  requiresAuth: true,
  permission: "edit.blog.author",
  logModule: "ADMIN_BLOG",
  logTitle: "Update author status",
};

export default async (data) => {
  const { body, params, ctx } = data;
  const { id } = params;
  const { status } = body;

  ctx?.step("Validating author ID and status");

  ctx?.step(`Updating author status to ${status}`);
  const result = await updateStatus("author", id, status);

  ctx?.success("Author status updated successfully");
  return result;
};
