// /server/api/forex/investments/delete.del.ts

import {
  commonBulkDeleteParams,
  commonBulkDeleteResponses,
  handleBulkDelete,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Bulk deletes Forex investments",
  description: "Deletes multiple Forex investment records by their IDs. This permanently removes investment data and cannot be undone.",
  operationId: "bulkDeleteForexInvestments",
  tags: ["Admin", "Forex", "Investment"],
  parameters: commonBulkDeleteParams("Forex Investments"),
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
              description: "Array of Forex investment IDs to delete",
            },
          },
          required: ["ids"],
        },
      },
    },
  },
  responses: commonBulkDeleteResponses("Forex Investments"),
  requiresAuth: true,
  permission: "delete.forex.investment",
  logModule: "ADMIN_FOREX",
  logTitle: "Bulk delete forex investments",
};

export default async (data: Handler) => {
  const { body, query, ctx } = data;
  const { ids } = body;

  ctx?.step(`Validating ${ids.length} forex investment IDs`);

  ctx?.step(`Deleting ${ids.length} forex investments`);
  const result = await handleBulkDelete({
    model: "forexInvestment",
    ids,
    query,
  });

  ctx?.success(`Successfully deleted ${ids.length} forex investments`);
  return result;
};
