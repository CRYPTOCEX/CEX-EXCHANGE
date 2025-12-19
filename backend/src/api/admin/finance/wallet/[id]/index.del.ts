import {
  deleteRecordParams,
  deleteRecordResponses,
  handleSingleDelete,
} from "@b/utils/query";

export const metadata = {
  summary: "Deletes a wallet",
  operationId: "deleteWallet",
  tags: ["Admin", "Wallet"],
  parameters: deleteRecordParams("wallet"),
  responses: deleteRecordResponses("Wallet"),
  requiresAuth: true,
  permission: "delete.wallet",
  logModule: "ADMIN_FIN",
  logTitle: "Delete Wallet",
};

export default async (data: Handler) => {
  const { params, query, ctx } = data;
  ctx?.step("Deleting wallet");
  const result = await handleSingleDelete({
    model: "wallet",
    id: params.id,
    query,
  });
  ctx?.success("Wallet deleted successfully");
  return result;
};
