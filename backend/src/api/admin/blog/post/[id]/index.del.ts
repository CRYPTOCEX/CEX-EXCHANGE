import {
  deleteRecordParams,
  deleteRecordResponses,
  handleSingleDelete,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Deletes a specific post",
  operationId: "deletePost",
  tags: ["Admin", "Content", "Posts"],
  parameters: deleteRecordParams("Post"),
  responses: deleteRecordResponses("Post"),
  permission: "delete.blog.post",
  requiresAuth: true,
  logModule: "ADMIN_BLOG",
  logTitle: "Delete blog post",
};

export default async (data: Handler) => {
  const { params, query, ctx } = data;

  ctx?.step("Validating blog post ID");

  ctx?.step("Deleting blog post");
  const result = await handleSingleDelete({
    model: "post",
    id: params.id,
    query,
  });

  ctx?.success("Blog post deleted successfully");
  return result;
};
