import { updateStatus, updateRecordResponses } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Update Status for a Comment",
  operationId: "updateCommentStatus",
  tags: ["Admin", "Content", "Comment"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the Comment to update",
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
                "New status to apply to the Comment (true for active, false for inactive)",
            },
          },
          required: ["status"],
        },
      },
    },
  },
  responses: updateRecordResponses("Comment"),
  requiresAuth: true,
  permission: "edit.blog.comment",
  logModule: "ADMIN_BLOG",
  logTitle: "Update comment status",
};

export default async (data) => {
  const { body, params, ctx } = data;
  const { id } = params;
  const { status } = body;

  ctx?.step("Validating comment ID and status");

  ctx?.step(`Updating comment status to ${status ? 'active' : 'inactive'}`);
  const result = await updateStatus("comment", id, status);

  ctx?.success("Comment status updated successfully");
  return result;
};
