import {
  deleteRecordParams,
  deleteRecordResponses,
  handleSingleDelete,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Deletes a specific Forex duration",
  operationId: "deleteForexDuration",
  tags: ["Admin", "Forex", "Durations"],
  parameters: deleteRecordParams("Forex duration"),
  responses: deleteRecordResponses("Forex duration"),
  permission: "delete.forex.duration",
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { params, query } = data;
  return handleSingleDelete({
    model: "forexDuration",
    id: params.id,
    query,
  });
};
