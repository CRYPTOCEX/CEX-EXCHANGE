// /server/api/admin/wallets/transactions/delete.del.ts

import { models } from "@b/db";
import {
  commonBulkDeleteParams,
  commonBulkDeleteResponses,
  handleBulkDelete,
} from "@b/utils/query";

export const metadata = {
  summary: "Bulk deletes Forex withdrawal transactions",
  description: "Deletes multiple Forex withdrawal transactions by their IDs. This also removes associated admin profit records.",
  operationId: "bulkDeleteForexWithdrawals",
  tags: ["Admin", "Forex", "Withdraw"],
  parameters: commonBulkDeleteParams("Transactions"),
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            ids: {
              type: "array",
              items: { type: "string" },
              description: "Array of transaction IDs to delete",
            },
          },
          required: ["ids"],
        },
      },
    },
  },
  responses: commonBulkDeleteResponses("Transactions"),
  requiresAuth: true,
  permission: "delete.forex.withdraw",
  logModule: "ADMIN_FOREX",
  logTitle: "Bulk delete forex withdrawals",
};

export default async (data: Handler) => {
  const { body, query , ctx } = data;
  const { ids } = body;

  ctx?.step(`Validating ${ids.length} IDs`);

  ctx?.step(`Deleting ${ids.length} records`);
  // Delete associated admin profits if they exist
  await models.adminProfit.destroy({
    where: {
      transactionId: ids,
    },
  });
  const result = await handleBulkDelete({
    model: "transaction",
    ids,
    query,
  });

  ctx?.success(`Successfully deleted ${ids.length} records`);
  return result;
};
