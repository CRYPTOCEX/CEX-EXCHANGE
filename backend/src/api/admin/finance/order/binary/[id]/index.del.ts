// /server/api/admin/binary/orders/index.delete.ts

import {
  deleteRecordParams,
  deleteRecordResponses,
  handleSingleDelete,
} from "@b/utils/query";

export const metadata = {
  summary: "Deletes a binary order",
  operationId: "deleteBinaryOrder",
  tags: ["Admin", "Binary Order"],
  parameters: deleteRecordParams("binary order"),
  responses: deleteRecordResponses("Binary Order"),
  requiresAuth: true,
  permission: "delete.binary.order",
};

export default async (data: Handler) => {
  const { params, query } = data;
  return handleSingleDelete({
    model: "binaryOrder",
    id: params.id,
    query,
  });
};
