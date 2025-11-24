import {
  deleteRecordParams,
  deleteRecordResponses,
  handleSingleDelete,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Deletes a page",
  operationId: "deletePage",
  tags: ["Admin", "Content", "Page"],
  parameters: deleteRecordParams("page"),
  responses: deleteRecordResponses("Page"),
  permission: "delete.page",
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { params, query } = data;
  return handleSingleDelete({
    model: "page",
    id: params.id,
    query,
  });
};
