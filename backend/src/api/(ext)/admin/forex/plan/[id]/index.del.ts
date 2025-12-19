import {
  deleteRecordParams,
  deleteRecordResponses,
  handleSingleDelete,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Deletes a Forex plan",
  description: "Deletes a specific Forex plan by its ID. This will cascade delete to associated plan durations and investments.",
  operationId: "deleteForexPlan",
  tags: ["Admin", "Forex", "Plan"],
  parameters: deleteRecordParams("Forex plan"),
  responses: deleteRecordResponses("Forex plan"),
  logModule: "ADMIN_FOREX",
  logTitle: "Delete forex plan",
  permission: "delete.forex.plan",
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { params, query , ctx } = data;

  ctx?.step(`Validating record ${params.id}`);

  ctx?.step(`Deleting record ${params.id}`);
  const result = await handleSingleDelete({
    model: "forexPlan",
    id: params.id,
    query,
  });

  ctx?.success("Record deleted successfully");
  return result;
};
