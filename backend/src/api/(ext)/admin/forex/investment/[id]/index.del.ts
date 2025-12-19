import {
  deleteRecordParams,
  deleteRecordResponses,
  handleSingleDelete,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Deletes a Forex investment",
  description: "Deletes a specific Forex investment record by its ID. This permanently removes the investment data.",
  operationId: "deleteForexInvestment",
  tags: ["Admin", "Forex", "Investment"],
  parameters: deleteRecordParams("Forex investment"),
  responses: deleteRecordResponses("Forex investment"),
  permission: "delete.forex.investment",
  requiresAuth: true,
  logModule: "ADMIN_FOREX",
  logTitle: "Delete forex investment",
};

export default async (data: Handler) => {
  const { params, query, ctx } = data;

  ctx?.step(`Validating forex investment ${params.id}`);

  ctx?.step(`Deleting forex investment ${params.id}`);
  const result = await handleSingleDelete({
    model: "forexInvestment",
    id: params.id,
    query,
  });

  ctx?.success("Forex investment deleted successfully");
  return result;
};
