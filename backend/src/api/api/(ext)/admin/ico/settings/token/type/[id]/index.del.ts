import {
  deleteRecordParams,
  deleteRecordResponses,
  handleSingleDelete,
} from "@b/utils/query";

export const metadata = {
  summary: "Deletes a specific Token Type Configuration",
  operationId: "deleteTokenType",
  tags: ["Admin", "TokenTypes"],
  parameters: deleteRecordParams("Token Type Configuration"),
  responses: deleteRecordResponses("Token Type Configuration"),
  permission: "edit.ico.settings",
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { params, query } = data;
  return handleSingleDelete({
    model: "icoTokenType",
    id: params.id,
    query,
  });
};
