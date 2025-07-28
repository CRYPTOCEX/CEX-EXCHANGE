import {
  deleteRecordParams,
  deleteRecordResponses,
  handleSingleDelete,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Deletes a specific comment",
  operationId: "deleteComment",
  tags: ["Admin", "Content", "Comment"],
  parameters: deleteRecordParams("Comment"),
  responses: deleteRecordResponses("Comment"),
  permission: "delete.blog.comment",
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { params, query } = data;
  return handleSingleDelete({
    model: "comment",
    id: params.id,
    query,
  });
};
