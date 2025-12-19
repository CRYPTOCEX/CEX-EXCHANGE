import {
  deleteRecordParams,
  deleteRecordResponses,
  handleSingleDelete,
} from "@b/utils/query";

export const metadata = {
  summary: "Deletes a binary market",
  operationId: "deleteBinaryMarket",
  tags: ["Admin", "Binary Market"],
  parameters: deleteRecordParams("binary market"),
  responses: deleteRecordResponses("Binary Market"),
  requiresAuth: true,
  permission: "delete.binary.market",
  logModule: "ADMIN_BINARY",
  logTitle: "Delete binary market",
};

export default async (data: Handler) => {
  const { params, query, ctx } = data;
  const { id } = params;

  ctx?.step("Fetching binary market record");
  ctx?.step("Deleting binary market");
  const result = await handleSingleDelete({
    model: "binaryMarket",
    id,
    query,
  });

  ctx?.success("Binary market deleted successfully");
  return result;
};