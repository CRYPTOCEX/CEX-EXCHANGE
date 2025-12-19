import { updateStatus, updateRecordResponses } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Update Status for a Tag",
  operationId: "updateTagStatus",
  tags: ["Admin", "Content", "Category"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the Tag to update",
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
                "New status to apply to the Tag (true for active, false for inactive)",
            },
          },
          required: ["status"],
        },
      },
    },
  },
  responses: updateRecordResponses("Tag"),
  requiresAuth: true,
  permission: "edit.blog.tag",
  logModule: "ADMIN_BLOG",
  logTitle: "Update tag status",
};

export default async (data) => {
  const { body, params, ctx } = data;
  const { id } = params;
  const { status } = body;

  ctx?.step("Validating tag ID and status");

  ctx?.step(`Updating tag status to ${status ? 'active' : 'inactive'}`);
  const result = await updateStatus("tag", id, status);

  ctx?.success("Tag status updated successfully");
  return result;
};
