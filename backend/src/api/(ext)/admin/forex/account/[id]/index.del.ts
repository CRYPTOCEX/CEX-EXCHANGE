import {
  deleteRecordParams,
  deleteRecordResponses,
  handleSingleDelete,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Deletes a Forex account",
  operationId: "deleteForexAccount",
  tags: ["Admin", "Forex", "Account"],
  description:
    "Permanently deletes a specific Forex account by its ID. This operation cannot be undone.",
  parameters: deleteRecordParams("Forex account"),
  responses: deleteRecordResponses("Forex account"),
  permission: "delete.forex.account",
  requiresAuth: true,
  logModule: "ADMIN_FOREX",
  logTitle: "Delete forex account",
};

export default async (data: Handler) => {
  const { params, query, ctx } = data;

  ctx?.step(`Validating forex account ${params.id}`);

  ctx?.step(`Deleting forex account ${params.id}`);
  const result = await handleSingleDelete({
    model: "forexAccount",
    id: params.id,
    query,
  });

  ctx?.success("Forex account deleted successfully");
  return result;
};
