// /server/api/forex/accounts/delete.del.ts

import {
  commonBulkDeleteParams,
  commonBulkDeleteResponses,
  handleBulkDelete,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Bulk deletes Forex accounts",
  operationId: "bulkDeleteForexAccounts",
  tags: ["Admin", "Forex", "Account"],
  description:
    "Deletes multiple Forex accounts by their IDs. This operation permanently removes the accounts from the system.",
  parameters: commonBulkDeleteParams("Forex Accounts"),
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
              description: "Array of Forex account IDs to delete",
            },
          },
          required: ["ids"],
        },
      },
    },
  },
  responses: commonBulkDeleteResponses("Forex Accounts"),
  requiresAuth: true,
  permission: "delete.forex.account",
  logModule: "ADMIN_FOREX",
  logTitle: "Bulk delete forex accounts",
};

export default async (data: Handler) => {
  const { body, query, ctx } = data;
  const { ids } = body;

  ctx?.step(`Validating ${ids.length} forex account IDs`);

  ctx?.step(`Deleting ${ids.length} forex accounts`);
  const result = await handleBulkDelete({
    model: "forexAccount",
    ids,
    query,
  });

  ctx?.success(`Successfully deleted ${ids.length} forex accounts`);
  return result;
};
