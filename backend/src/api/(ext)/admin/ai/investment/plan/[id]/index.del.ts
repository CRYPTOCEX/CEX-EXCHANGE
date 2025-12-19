import {
  deleteRecordParams,
  deleteRecordResponses,
  handleSingleDelete,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Deletes a specific AI Investment Plan",
  operationId: "deleteAiInvestmentPlan",
  tags: ["Admin", "AI Investment", "Plan"],
  description:
    "Permanently deletes a specific AI Investment Plan by ID. This operation cannot be undone and may affect related investments and durations.",
  parameters: deleteRecordParams("AI Investment Plan"),
  responses: deleteRecordResponses("AI Investment Plan"),
  permission: "delete.ai.investment.plan",
  requiresAuth: true,
  logModule: "ADMIN_AI",
  logTitle: "Delete investment plan",
};

export default async (data: Handler) => {
  const { params, query, ctx } = data;

  ctx?.step(`Deleting plan ${params.id}`);
  const result = await handleSingleDelete({
    model: "aiInvestmentPlan",
    id: params.id,
    query,
  });

  ctx?.success("Plan deleted successfully");
  return result;
};
