import {
  deleteRecordParams,
  deleteRecordResponses,
  handleSingleDelete,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Deletes a specific AI Investment Plan",
  operationId: "deleteAIInvestmentPlan",
  tags: ["Admin", "AI Investment Plan"],
  parameters: deleteRecordParams("AI Investment Plan"),
  responses: deleteRecordResponses("AI Investment Plan"),
  permission: "delete.ai.investment.plan",
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { params, query } = data;
  return handleSingleDelete({
    model: "aiInvestmentPlan",
    id: params.id,
    query,
  });
};
