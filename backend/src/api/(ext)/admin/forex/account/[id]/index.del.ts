import {
  deleteRecordParams,
  deleteRecordResponses,
  handleSingleDelete,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Deletes a specific Forex account",
  operationId: "deleteForexAccount",
  tags: ["Admin", "Forex"],
  parameters: deleteRecordParams("Forex account"),
  responses: deleteRecordResponses("Forex account"),
  permission: "delete.forex.account",
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { params, query } = data;
  return handleSingleDelete({
    model: "forexAccount",
    id: params.id,
    query,
  });
};
