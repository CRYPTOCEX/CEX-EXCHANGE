// /server/api/admin/wallets/transactions/delete.del.ts

import { models } from "@b/db";
import {
  commonBulkDeleteParams,
  commonBulkDeleteResponses,
  handleBulkDelete,
} from "@b/utils/query";

export const metadata = {
  summary: "Bulk deletes Forex deposits",
  operationId: "bulkDeleteForexDeposits",
  tags: ["Admin", "Forex", "Deposit"],
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
  permission: "delete.forex.deposit",
  logModule: "ADMIN_FOREX",
  logTitle: "Bulk delete forex deposits",
};

export default async (data: Handler) => {
  const { body, query, ctx } = data;
  const { ids } = body;

  ctx?.step(`Validating ${ids.length} forex deposit IDs`);

  ctx?.step("Deleting associated admin profits");
  await models.adminProfit.destroy({
    where: {
      transactionId: ids,
    },
  });

  ctx?.step(`Deleting ${ids.length} forex deposits`);
  const result = await handleBulkDelete({
    model: "transaction",
    ids,
    query,
  });

  ctx?.success(`Successfully deleted ${ids.length} forex deposits`);
  return result;
};
