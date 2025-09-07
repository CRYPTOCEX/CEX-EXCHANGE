import {
  deleteRecordParams,
  deleteRecordResponses,
  handleSingleDelete,
} from "@b/utils/query";

export const metadata = {
  summary: "Deletes a binary duration",
  operationId: "deleteBinaryDuration",
  tags: ["Admin", "Binary Duration"],
  parameters: deleteRecordParams("binary duration"),
  responses: deleteRecordResponses("Binary Duration"),
  requiresAuth: true,
  permission: "delete.binary.duration",
};

export default async (data: Handler) => {
  const { params, query } = data;
  const { id } = params;
  return await handleSingleDelete({
    model: "binaryDuration",
    id,
    query,
  });
};