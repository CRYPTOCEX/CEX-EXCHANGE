import {
  deleteRecordParams,
  deleteRecordResponses,
  handleSingleDelete,
} from "@b/utils/query";

export const metadata = {
  summary: "Deletes an investment plan",
  operationId: "deleteInvestmentPlan",
  tags: ["Admin", "Investment Plan"],
  parameters: deleteRecordParams("investment plan"),
  responses: deleteRecordResponses("Investment plan"),
  permission: "delete.investment.plan",
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { params, query } = data;
  return handleSingleDelete({
    model: "investmentPlan",
    id: params.id,
    query,
  });
};
