import {
  deleteRecordParams,
  deleteRecordResponses,
  handleSingleDelete,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Deletes a specific API key",
  operationId: "deleteApiKey",
  tags: ["Admin", "API Keys"],
  logModule: "ADMIN_API",
  logTitle: "Delete API",
  parameters: deleteRecordParams("API Key"),
  responses: deleteRecordResponses("API Key"),
  permission: "delete.api.key",
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { params, query, ctx } = data;

  ctx?.step("Validating API key ID");
  ctx?.step(`Deleting API key: ${params.id}`);
  const result = await handleSingleDelete({
    model: "apiKey",
    id: params.id,
    query,
  });
  ctx?.success();
  return result;
};
