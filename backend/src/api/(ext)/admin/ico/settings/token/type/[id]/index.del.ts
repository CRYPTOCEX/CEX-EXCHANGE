import {
  deleteRecordParams,
  deleteRecordResponses,
  handleSingleDelete,
} from "@b/utils/query";

export const metadata = {
  summary: "Delete ICO Token Type",
  description:
    "Deletes a specific token type configuration by ID. Supports both soft delete (default) and permanent delete based on query parameter.",
  operationId: "deleteIcoTokenType",
  tags: ["Admin", "ICO", "Settings"],
  parameters: deleteRecordParams("Token Type Configuration"),
  responses: deleteRecordResponses("Token Type Configuration"),
  permission: "edit.ico.settings",
  requiresAuth: true,
  logModule: "ADMIN_ICO",
  logTitle: "Delete token type",
};

export default async (data: Handler) => {
  const { params, query, ctx } = data;

  ctx?.step("Validating token type");

  ctx?.step("Deleting token type");
  const result = await handleSingleDelete({
    model: "icoTokenType",
    id: params.id,
    query,
  });

  ctx?.success("Token type deleted successfully");
  return result;
};
