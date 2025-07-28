import {
  deleteRecordParams,
  deleteRecordResponses,
  handleSingleDelete,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Deletes a specific category",
  operationId: "deleteCategory",
  tags: ["Admin", "Content", "Category"],
  parameters: deleteRecordParams("Category"),
  responses: deleteRecordResponses("Category"),
  permission: "delete.blog.category",
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { params, query } = data;
  return handleSingleDelete({
    model: "category",
    id: params.id,
    query,
  });
};
