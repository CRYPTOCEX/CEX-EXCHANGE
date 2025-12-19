import {
  deleteRecordParams,
  deleteRecordResponses,
  handleSingleDelete,
} from "@b/utils/query";

export const metadata = {
  summary: "Deletes an investment plan",
  operationId: "deleteInvestmentPlan",
  tags: ["Admin", "Investment Plan"],
  logModule: "ADMIN_FIN",
  logTitle: "Delete Investment Plan",
  parameters: deleteRecordParams("investment plan"),
  responses: deleteRecordResponses("Investment plan"),
  permission: "delete.investment.plan",
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { params, query, ctx } = data;

  ctx?.step("Deleting investment plan");

  const result = await handleSingleDelete({
    model: "investmentPlan",
    id: params.id,
    query,
  });

  ctx?.success("Investment plan deleted successfully");
  return result;
};
