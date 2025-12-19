// /server/api/admin/wallets/transactions/delete.del.ts

import { models } from "@b/db";
import {
  commonBulkDeleteParams,
  commonBulkDeleteResponses,
  handleBulkDelete,
} from "@b/utils/query";

export const metadata = {
  summary: "Bulk deletes transactions by IDs",
  operationId: "bulkDeleteTransactions",
  tags: ["Admin", "Transaction"],
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
  permission: "delete.withdraw",
  logModule: "ADMIN_FIN",
  logTitle: "Bulk Delete Withdraw Logs",
};

export default async (data: Handler) => {
  const { body, query, ctx } = data;
  const { ids } = body;

  ctx?.step("Deleting associated admin profits");
  // Delete associated admin profits if they exist
  await models.adminProfit.destroy({
    where: {
      transactionId: ids,
    },
  });

  ctx?.step("Bulk deleting withdraw logs");
  const result = await handleBulkDelete({
    model: "transaction",
    ids,
    query,
  });

  ctx?.success("Withdraw logs deleted successfully");
  return result;
};
