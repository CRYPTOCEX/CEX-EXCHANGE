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
  logModule: "ADMIN_BINARY",
  logTitle: "Delete binary duration",
};

export default async (data: Handler) => {
  const { params, query, ctx } = data;
  const { id } = params;

  ctx?.step("Fetching binary duration record");
  ctx?.step("Deleting binary duration");
  const result = await handleSingleDelete({
    model: "binaryDuration",
    id,
    query,
  });

  ctx?.success("Binary duration deleted successfully");
  return result;
};