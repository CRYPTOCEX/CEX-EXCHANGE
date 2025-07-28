import {
  deleteRecordParams,
  deleteRecordResponses,
  handleSingleDelete,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Deletes a specific Forex plan",
  operationId: "deleteForexPlan",
  tags: ["Admin", "Forex", "Plans"],
  parameters: deleteRecordParams("Forex plan"),
  responses: deleteRecordResponses("Forex plan"),
  permission: "delete.forex.plan",
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { params, query } = data;
  return handleSingleDelete({
    model: "forexPlan",
    id: params.id,
    query,
  });
};
