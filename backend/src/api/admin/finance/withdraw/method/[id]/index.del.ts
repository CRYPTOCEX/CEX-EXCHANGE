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
};

export default async (data: Handler) => {
  const { params, query } = data;
  return handleSingleDelete({
    model: "withdrawMethod",
    id: params.id,
    query,
  });
};
