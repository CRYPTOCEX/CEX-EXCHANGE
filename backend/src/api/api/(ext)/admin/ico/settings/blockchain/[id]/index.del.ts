import {
  deleteRecordParams,
  deleteRecordResponses,
  handleSingleDelete,
} from "@b/utils/query";

export const metadata = {
  summary: "Delete a specific Blockchain Configuration",
  operationId: "deleteBlockchain",
  tags: ["Admin", "Blockchain"],
  parameters: deleteRecordParams("Blockchain Configuration"),
  responses: deleteRecordResponses("Blockchain Configuration"),
  permission: "edit.ico.settings",
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { params, query } = data;
  return handleSingleDelete({
    model: "icoBlockchain",
    id: params.id,
    query,
  });
};
