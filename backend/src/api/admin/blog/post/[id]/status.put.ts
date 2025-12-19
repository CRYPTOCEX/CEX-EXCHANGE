import { updateStatus, updateRecordResponses } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Update Status for a Post",
  operationId: "updatePostStatus",
  tags: ["Admin", "Content", "Posts"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the Post to update",
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
              enum: ["PUBLISHED", "DRAFT", "TRASH"],
              description: "New status to apply to the Post",
            },
          },
          required: ["status"],
        },
      },
    },
  },
  responses: updateRecordResponses("Post"),
  requiresAuth: true,
  permission: "edit.blog.post",
  logModule: "ADMIN_BLOG",
  logTitle: "Update blog post status",
};

export default async (data) => {
  const { body, params, ctx } = data;
  const { id } = params;
  const { status } = body;

  ctx?.step("Validating blog post ID and status");

  ctx?.step(`Updating blog post status to ${status}`);
  const result = await updateStatus("post", id, status);

  ctx?.success("Blog post status updated successfully");
  return result;
};
