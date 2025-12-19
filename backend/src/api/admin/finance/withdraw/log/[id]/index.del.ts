// /server/api/admin/wallets/transactions/index.delete.ts

import { models } from "@b/db";
import {
  deleteRecordParams,
  deleteRecordResponses,
  handleSingleDelete,
} from "@b/utils/query";

export const metadata = {
  summary: "Deletes a transaction",
  operationId: "deleteTransaction",
  tags: ["Admin", "Transaction"],
  parameters: deleteRecordParams("transaction"),
  responses: deleteRecordResponses("Transaction"),
  requiresAuth: true,
  permission: "delete.withdraw",
  logModule: "ADMIN_FIN",
  logTitle: "Delete Withdraw Log",
};

export default async (data: Handler) => {
  const { params, query, ctx } = data;

  ctx?.step("Deleting associated admin profit");
  // Delete associated admin profit if it exists
  await models.adminProfit.destroy({
    where: {
      transactionId: params.id,
    },
  });

  ctx?.step("Deleting withdraw log");
  const result = await handleSingleDelete({
    model: "transaction",
    id: params.id,
    query,
  });

  ctx?.success("Withdraw log deleted successfully");
  return result;
};
