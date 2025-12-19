import {
  deleteRecordParams,
  deleteRecordResponses,
  handleSingleDelete,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Delete an AI investment duration",
  operationId: "deleteAiInvestmentDuration",
  tags: ["Admin", "AI Investment", "Duration"],
  description:
    "Deletes a specific AI investment duration by ID. This will remove the duration option from the system.",
  parameters: deleteRecordParams("AI Investment Duration"),
  responses: deleteRecordResponses("AI Investment Duration"),
  permission: "delete.ai.investment.duration",
  requiresAuth: true,
  logModule: "ADMIN_AI",
  logTitle: "Delete investment duration",
};

export default async (data: Handler) => {
  const { params, query, ctx } = data;

  ctx?.step(`Deleting duration ${params.id}`);
  const result = await handleSingleDelete({
    model: "aiInvestmentDuration",
    id: params.id,
    query,
  });

  ctx?.success("Duration deleted successfully");
  return result;
};
