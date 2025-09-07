// /server/api/blog/comments/delete.del.ts
import { models } from "@b/db";

import { deleteRecordResponses } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Deletes a blog comment",
  description: "This endpoint deletes a blog comment.",
  operationId: "deleteComment",
  tags: ["Blog"],
  requiresAuth: true,
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "The ID of the comment to delete",
      required: true,
      schema: {
        type: "string",
        description: "Comment ID",
      },
    },
  ],
  responses: deleteRecordResponses("Comment"),
};

export default async (data: Handler) => {
  return deleteComment(data.params.id);
};

export async function deleteComment(id: string): Promise<any> {
  await models.comment.destroy({
    where: { id },
  });
  return {
    message: "Comment deleted successfully",
  };
}
