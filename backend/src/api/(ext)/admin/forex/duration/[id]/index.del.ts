import {
  deleteRecordParams,
  deleteRecordResponses,
  handleSingleDelete,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Deletes a Forex duration",
  description: "Deletes a specific Forex duration configuration by its ID. This will cascade delete to associated plan durations and investments.",
  operationId: "deleteForexDuration",
  tags: ["Admin", "Forex", "Duration"],
  parameters: deleteRecordParams("Forex duration"),
  responses: deleteRecordResponses("Forex duration"),
  permission: "delete.forex.duration",
  requiresAuth: true,
  logModule: "ADMIN_FOREX",
  logTitle: "Delete forex duration",
};

export default async (data: Handler) => {
  const { params, query, ctx } = data;

  ctx?.step(`Validating forex duration ${params.id}`);

  ctx?.step(`Deleting forex duration ${params.id}`);
  const result = await handleSingleDelete({
    model: "forexDuration",
    id: params.id,
    query,
  });

  ctx?.success("Forex duration deleted successfully");
  return result;
};
