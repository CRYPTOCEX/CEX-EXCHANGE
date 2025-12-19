// /server/api/admin/wallets/transactions/index.delete.ts

import { models } from "@b/db";
import {
  deleteRecordParams,
  deleteRecordResponses,
  handleSingleDelete,
} from "@b/utils/query";

export const metadata = {
  summary: "Deletes a Forex withdrawal transaction",
  description: "Deletes a specific Forex withdrawal transaction by its ID. This also removes associated admin profit records.",
  operationId: "deleteForexWithdrawal",
  tags: ["Admin", "Forex", "Withdraw"],
  parameters: deleteRecordParams("transaction"),
  responses: deleteRecordResponses("Transaction"),
  logModule: "ADMIN_FOREX",
  logTitle: "Delete forex withdrawal",
  requiresAuth: true,
  permission: "delete.forex.withdraw",
};

export default async (data: Handler) => {
  const { params, query , ctx } = data;

  ctx?.step(`Validating record ${params.id}`);

  ctx?.step(`Deleting record ${params.id}`);
  // Delete associated admin profit if it exists
  await models.adminProfit.destroy({
    where: {
      transactionId: params.id,
    },
  });

  const result = await handleSingleDelete({
    model: "transaction",
    id: params.id,
    query,
  });

  ctx?.success("Record deleted successfully");
  return result;
};
