// /server/api/posts/delete.del.ts

import { models } from "@b/db";
import { createError } from "@b/utils/error";
import {
  commonBulkDeleteParams,
  commonBulkDeleteResponses,
  handleBulkDelete,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Bulk deletes posts by IDs",
  operationId: "bulkDeletePosts",
  tags: ["Content", "Author", "Post"],
  parameters: [...commonBulkDeleteParams("Posts")],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            ids: {
              type: "array",
              items: { type: "string" },
              description: "Array of post IDs to delete",
            },
          },
          required: ["ids"],
        },
      },
    },
  },
  responses: commonBulkDeleteResponses("Posts"),
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { body, query, user, params } = data;
  if (!user?.id)
    throw createError({ statusCode: 401, message: "Unauthorized" });

  const { ids } = body;

  const author = await models.author.findOne({
    where: { userId: user.id },
  });

  if (!author)
    throw createError({ statusCode: 404, message: "Author not found" });

  return handleBulkDelete({
    model: "post",
    ids,
    query,
    where: { authorId: author.id },
  });
};
