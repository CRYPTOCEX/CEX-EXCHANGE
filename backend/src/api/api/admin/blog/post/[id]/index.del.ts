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
};

export default async (data: Handler) => {
  const { params, query } = data;
  return handleSingleDelete({
    model: "post",
    id: params.id,
    query,
  });
};
