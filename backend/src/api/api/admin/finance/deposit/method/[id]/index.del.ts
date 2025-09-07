import {
  deleteRecordParams,
  deleteRecordResponses,
  handleSingleDelete,
} from "@b/utils/query";

export const metadata = {
  summary: "Deletes a deposit method",
  operationId: "deleteDepositMethod",
  tags: ["Admin", "Deposit Methods"],
  parameters: deleteRecordParams("deposit method"),
  responses: deleteRecordResponses("Deposit method"),
  requiresAuth: true,
  permission: "delete.deposit.method",
};

export default async (data: Handler) => {
  const { params, query } = data;
  return handleSingleDelete({
    model: "depositMethod",
    id: params.id,
    query,
  });
};
