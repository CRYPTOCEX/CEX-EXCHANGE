import {
  deleteRecordParams,
  deleteRecordResponses,
  handleSingleDelete,
} from "@b/utils/query";

export const metadata = {
  summary: "Delete ICO Blockchain Configuration",
  description:
    "Deletes a specific blockchain configuration by ID. Supports both soft delete (default) and permanent delete based on query parameter.",
  operationId: "deleteIcoBlockchain",
  tags: ["Admin", "ICO", "Settings"],
  parameters: deleteRecordParams("Blockchain Configuration"),
  responses: deleteRecordResponses("Blockchain Configuration"),
  permission: "edit.ico.settings",
  requiresAuth: true,
  logModule: "ADMIN_ICO",
  logTitle: "Delete blockchain configuration",
};

export default async (data: Handler) => {
  const { params, query, ctx } = data;

  ctx?.step("Validating blockchain configuration");

  ctx?.step("Deleting blockchain configuration");
  const result = await handleSingleDelete({
    model: "icoBlockchain",
    id: params.id,
    query,
  });

  ctx?.success("Blockchain configuration deleted successfully");
  return result;
};
