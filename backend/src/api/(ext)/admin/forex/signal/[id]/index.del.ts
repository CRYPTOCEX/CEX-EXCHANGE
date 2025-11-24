import {
  deleteRecordParams,
  deleteRecordResponses,
  handleSingleDelete,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Deletes a specific Forex signal",
  operationId: "deleteForexSignal",
  tags: ["Admin", "Forex", "Signals"],
  parameters: deleteRecordParams("Forex signal"),
  responses: deleteRecordResponses("Forex signal"),
  permission: "delete.forex.signal",
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { params, query } = data;
  return handleSingleDelete({
    model: "forexSignal",
    id: params.id,
    query,
  });
};
