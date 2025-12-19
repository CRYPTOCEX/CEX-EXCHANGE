import {
  deleteRecordParams,
  deleteRecordResponses,
  handleSingleDelete,
} from "@b/utils/query";

export const metadata = {
  summary: "Deletes a specific Investment duration",
  operationId: "deleteInvestmentDuration",
  tags: ["Admin", "Investment", "Durations"],
  parameters: deleteRecordParams("Investment duration"),
  responses: deleteRecordResponses("Investment duration"),
  permission: "delete.investment.duration",
  requiresAuth: true,
  logModule: "ADMIN_FIN",
  logTitle: "Delete Investment Duration",
};

export default async (data: Handler) => {
  const { params, query, ctx } = data;
  
  ctx?.step("Validating investment duration ID");

  ctx?.step("Deleting investment duration record");
  const result = await handleSingleDelete({
    model: "investmentDuration",
    id: params.id,
    query,
  });

  ctx?.success();
  return result;
};
