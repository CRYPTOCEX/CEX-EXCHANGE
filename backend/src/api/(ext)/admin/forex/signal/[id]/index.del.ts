import {
  deleteRecordParams,
  deleteRecordResponses,
  handleSingleDelete,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Deletes a Forex signal",
  description: "Deletes a specific Forex trading signal by its ID. This will remove signal references from associated accounts.",
  operationId: "deleteForexSignal",
  tags: ["Admin", "Forex", "Signal"],
  parameters: deleteRecordParams("Forex signal"),
  responses: deleteRecordResponses("Forex signal"),
  logModule: "ADMIN_FOREX",
  logTitle: "Delete forex signal",
  permission: "delete.forex.signal",
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { params, query , ctx } = data;

  ctx?.step(`Validating record ${params.id}`);

  ctx?.step(`Deleting record ${params.id}`);
  const result = await handleSingleDelete({
    model: "forexSignal",
    id: params.id,
    query,
  });

  ctx?.success("Record deleted successfully");
  return result;
};
