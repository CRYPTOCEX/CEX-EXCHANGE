// /server/api/admin/wallets/transactions/index.delete.ts

import { models } from "@b/db";
import {
  deleteRecordParams,
  deleteRecordResponses,
  handleSingleDelete,
} from "@b/utils/query";

export const metadata = {
  summary: "Deletes a Forex deposit",
  operationId: "deleteForexDeposit",
  tags: ["Admin", "Forex", "Deposit"],
  description:
    "Permanently deletes a specific Forex deposit transaction by its ID. Also removes associated admin profit records.",
  parameters: deleteRecordParams("transaction"),
  responses: deleteRecordResponses("Transaction"),
  requiresAuth: true,
  permission: "delete.forex.deposit",
  logModule: "ADMIN_FOREX",
  logTitle: "Delete forex deposit",
};

export default async (data: Handler) => {
  const { params, query, ctx } = data;

  ctx?.step(`Validating forex deposit ${params.id}`);

  ctx?.step("Deleting associated admin profit");
  await models.adminProfit.destroy({
    where: {
      transactionId: params.id,
    },
  });

  ctx?.step(`Deleting forex deposit ${params.id}`);
  const result = await handleSingleDelete({
    model: "transaction",
    id: params.id,
    query,
  });

  ctx?.success("Forex deposit deleted successfully");
  return result;
};
