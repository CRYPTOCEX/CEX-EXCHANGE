import {
  deleteRecordParams,
  deleteRecordResponses,
  handleSingleDelete,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Deletes a specific tag",
  operationId: "deleteTag",
  tags: ["Admin", "Content", "Tag"],
  parameters: deleteRecordParams("Tag"),
  responses: deleteRecordResponses("Tag"),
  permission: "delete.blog.tag",
  requiresAuth: true,
  logModule: "ADMIN_BLOG",
  logTitle: "Delete tag",
};

export default async (data: Handler) => {
  const { params, query, ctx } = data;

  ctx?.step("Validating tag ID");

  ctx?.step("Deleting tag");
  const result = await handleSingleDelete({
    model: "tag",
    id: params.id,
    query,
  });

  ctx?.success("Tag deleted successfully");
  return result;
};
