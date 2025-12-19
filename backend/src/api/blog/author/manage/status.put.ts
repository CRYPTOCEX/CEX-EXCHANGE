import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { updateRecordResponses, updateStatus } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Bulk updates the status of Posts",
  operationId: "bulkUpdatePostStatus",
  tags: ["Content", "Author", "Post"],
  logModule: "BLOG",
  logTitle: "Bulk update post status",
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            ids: {
              type: "array",
              description: "Array of Post IDs to update",
              items: { type: "string" },
            },
            status: {
              type: "string",
              enum: ["PUBLISHED", "DRAFT", "TRASH"],
              description: "New status to apply to the Posts",
            },
          },
          required: ["ids", "status"],
        },
      },
    },
  },
  responses: updateRecordResponses("Post"),
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { body, user, params, ctx } = data;
  if (!user?.id)
    throw createError({ statusCode: 401, message: "Unauthorized" });

  const { ids, status } = body;

  ctx?.step("Verifying author credentials");
  const author = await models.author.findOne({
    where: { userId: user.id },
  });

  if (!author)
    throw createError({ statusCode: 404, message: "Author not found" });

  ctx?.step(`Updating ${ids.length} post(s) to ${status}`);
  const result = await updateStatus("post", ids, status, undefined, undefined, undefined, {
    authorId: author.id,
  });

  ctx?.success(`Updated ${ids.length} post(s) to ${status} for author ${author.id}`);
  return result;
};
