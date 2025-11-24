import {
  deleteRecordParams,
  deleteRecordResponses,
  handleSingleDelete,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Deletes a specific API key",
  operationId: "deleteApiKey",
  tags: ["Admin", "API Keys"],
  parameters: deleteRecordParams("API Key"),
  responses: deleteRecordResponses("API Key"),
  permission: "delete.api.key",
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { params, query } = data;

  return handleSingleDelete({
    model: "apiKey",
    id: params.id,
    query,
  });
};
