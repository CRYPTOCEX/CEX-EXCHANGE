import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { deleteRecordResponses, handleSingleDelete } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Deletes a specific post",
  operationId: "deletePost",
  tags: ["Content", "Author", "Post"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: `ID of the post to delete`,
      required: true,
      schema: {
        type: "string",
      },
    },
    {
      name: "restore",
      in: "query",
      description: `Restore the post instead of deleting`,
      required: false,
      schema: {
        type: "boolean",
      },
    },
    {
      name: "force",
      in: "query",
      description: `Delete the post permanently`,
      required: false,
      schema: {
        type: "boolean",
      },
    },
  ],
  responses: deleteRecordResponses("Post"),
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { params, query, user } = data;
  if (!user?.id)
    throw createError({ statusCode: 401, message: "Unauthorized" });

  const author = await models.author.findOne({
    where: { userId: user.id },
  });

  if (!author)
    throw createError({ statusCode: 404, message: "Author not found" });

  return handleSingleDelete({
    model: "post",
    id: params.id,
    query,
    where: { authorId: author.id },
  });
};
