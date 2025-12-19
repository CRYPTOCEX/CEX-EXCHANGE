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
  logModule: "ADMIN_CMS",
  logTitle: "Delete page",
};

export default async (data: Handler) => {
  const { params, query, ctx } = data;

  ctx?.step(`Deleting page with ID: ${params.id}`);
  const result = await handleSingleDelete({
    model: "page",
    id: params.id,
    query,
  });

  ctx?.success("Page deleted successfully");
  return result;
};
