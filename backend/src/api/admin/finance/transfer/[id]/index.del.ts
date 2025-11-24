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
  permission: "delete.transfer",
};

export default async (data: Handler) => {
  const { params, query } = data;
  // Delete associated admin profit if it exists
  await models.adminProfit.destroy({
    where: {
      transactionId: params.id,
    },
  });

  return handleSingleDelete({
    model: "transaction",
    id: params.id,
    query,
  });
};
