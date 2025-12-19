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
  logModule: "ADMIN_FIN",
  logTitle: "Delete deposit method",
};

export default async (data: Handler) => {
  const { params, query, ctx } = data;

  ctx?.step("Fetching deposit method record");
  ctx?.step("Deleting deposit method");
  const result = await handleSingleDelete({
    model: "depositMethod",
    id: params.id,
    query,
  });

  ctx?.success("Deposit method deleted successfully");
  return result;
};
