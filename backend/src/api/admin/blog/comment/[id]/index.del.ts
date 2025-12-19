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
  logModule: "ADMIN_BLOG",
  logTitle: "Delete comment",
};

export default async (data: Handler) => {
  const { params, query, ctx } = data;

  ctx?.step("Validating comment ID");

  ctx?.step("Deleting comment");
  const result = await handleSingleDelete({
    model: "comment",
    id: params.id,
    query,
  });

  ctx?.success("Comment deleted successfully");
  return result;
};
