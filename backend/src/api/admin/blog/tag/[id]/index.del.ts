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
};

export default async (data: Handler) => {
  const { params, query } = data;
  return handleSingleDelete({
    model: "tag",
    id: params.id,
    query,
  });
};
