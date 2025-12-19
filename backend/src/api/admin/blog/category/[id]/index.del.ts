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
  logModule: "ADMIN_BLOG",
  logTitle: "Delete category",
};

export default async (data: Handler) => {
  const { params, query, ctx } = data;

  ctx?.step("Validating category ID");

  ctx?.step("Deleting category");
  const result = await handleSingleDelete({
    model: "category",
    id: params.id,
    query,
  });

  ctx?.success("Category deleted successfully");
  return result;
};
