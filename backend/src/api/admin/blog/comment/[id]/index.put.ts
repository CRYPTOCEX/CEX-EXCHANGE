import { updateRecord, updateRecordResponses } from "@b/utils/query";
import { commentUpdateSchema } from "../utils";

export const metadata: OperationObject = {
  summary: "Updates a specific comment",
  operationId: "updateComment",
  tags: ["Admin", "Content", "Comment"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "ID of the comment to update",
      required: true,
      schema: {
        type: "string",
      },
    },
  ],
  requestBody: {
    description: "New data for the comment",
    content: {
      "application/json": {
        schema: commentUpdateSchema,
      },
    },
  },
  responses: updateRecordResponses("Comment"),
  requiresAuth: true,
  permission: "edit.blog.comment",
  logModule: "ADMIN_BLOG",
  logTitle: "Update comment",
};

export default async (data) => {
  const { body, params, ctx } = data;
  const { id } = params;
  const { content, userId, postId } = body;

  ctx?.step("Validating comment ID and data");

  ctx?.step("Updating comment");
  const result = await updateRecord("comment", id, {
    content,
    userId,
    postId,
  });

  ctx?.success("Comment updated successfully");
  return result;
};
