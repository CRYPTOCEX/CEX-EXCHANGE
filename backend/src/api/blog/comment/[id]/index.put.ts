// /server/api/blog/comments/update.put.ts
import { createError } from "@b/utils/error";
import { models } from "@b/db";

import { updateRecordResponses } from "@b/utils/query";
import { CacheManager } from "@b/utils/cache";

export const metadata: OperationObject = {
  summary: "Updates an existing blog comment",
  description: "This endpoint updates an existing blog comment.",
  operationId: "updateComment",
  tags: ["Blog"],
  logModule: "BLOG",
  logTitle: "Update comment",
  requiresAuth: true,
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "The ID of the comment to update",
      required: true,
      schema: {
        type: "string",
        description: "Comment ID",
      },
    },
  ],
  requestBody: {
    required: true,
    description: "Comment data to update",
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            comment: { type: "string", description: "Updated comment content" },
          },
          required: ["comment"],
        },
      },
    },
  },
  responses: updateRecordResponses("Comment"),
};

export default async (data: Handler) => {
  const { ctx } = data;

  ctx?.step("Updating comment");
  const result = await updateComment(data.params.id, data.body.comment, ctx);

  ctx?.success(`Comment ${data.params.id} updated successfully`);
  return result;
};

export async function updateComment(id: string, data: any, ctx?: any): Promise<any> {
  ctx?.step("Validating comment status");
  // only allow updating the comment if its approved or pending
  const comment = await models.comment.findByPk(id);
  if (!comment) {
    throw createError(404, "Comment not found");
  }
  if (comment.status === "REJECTED") {
    throw createError(400, "Comment cannot be updated after rejection");
  }

  ctx?.step("Checking moderation settings");
  const cacheManager = CacheManager.getInstance();
  const settings = await cacheManager.getSettings();
  const moderateCommentsRaw = settings.has("moderateComments")
    ? settings.get("moderateComments")
    : null;
  const moderateComments =
    typeof moderateCommentsRaw === "boolean"
      ? moderateCommentsRaw
      : Boolean(moderateCommentsRaw);

  ctx?.step("Saving comment update");
  await comment.update(
    {
      content: data.comment,
      status: moderateComments ? "PENDING" : "APPROVED",
    },
    {
      where: { id },
    }
  );

  return {
    message: "Comment updated successfully",
  };
}
