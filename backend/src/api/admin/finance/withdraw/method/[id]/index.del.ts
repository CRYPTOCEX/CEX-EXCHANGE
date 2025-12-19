// /server/api/admin/wallets/index.delete.ts

import {
  deleteRecordParams,
  deleteRecordResponses,
  handleSingleDelete,
} from "@b/utils/query";

export const metadata = {
  summary: "Deletes a wallet",
  operationId: "deleteWallet",
  tags: ["Admin", "Wallets"],
  parameters: deleteRecordParams("wallet"),
  responses: deleteRecordResponses("Wallet"),
  requiresAuth: true,
  permission: "delete.withdraw.method",
  logModule: "ADMIN_FIN",
  logTitle: "Delete Withdraw Method",
};

export default async (data: Handler) => {
  const { params, query, ctx } = data;

  ctx?.step("Deleting withdraw method");
  const result = await handleSingleDelete({
    model: "withdrawMethod",
    id: params.id,
    query,
  });

  ctx?.success("Withdraw method deleted successfully");
  return result;
};
