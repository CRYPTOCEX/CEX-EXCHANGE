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
};

export default async (data: Handler) => {
  const { params, query } = data;
  const { id } = params;
  return await handleSingleDelete({
    model: "binaryMarket",
    id,
    query,
  });
};