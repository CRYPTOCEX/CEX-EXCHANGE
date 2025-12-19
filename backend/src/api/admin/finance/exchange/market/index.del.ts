// /server/api/exchange/markets/delete.del.ts

import {
  commonBulkDeleteParams,
  commonBulkDeleteResponses,
  handleBulkDelete,
} from "@b/utils/query";

export const metadata = {
  summary: "Bulk deletes exchange markets by IDs",
  operationId: "bulkDeleteExchangeMarkets",
  tags: ["Admin", "Exchange", "Markets"],
  parameters: commonBulkDeleteParams("Exchange Markets"),
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
              description: "Array of exchange market IDs to delete",
            },
          },
          required: ["ids"],
        },
      },
    },
  },
  responses: commonBulkDeleteResponses("Exchange Markets"),
  requiresAuth: true,
  permission: "delete.exchange.market",
  logModule: "ADMIN_FIN",
  logTitle: "Bulk Delete Exchange Markets",
};

export default async (data: Handler) => {
  const { body, query, ctx } = data;
  const { ids } = body;

  ctx?.step("Executing bulk delete");
  const result = await handleBulkDelete({
    model: "exchangeMarket",
    ids,
    query,
  });

  ctx?.success();
  return result;
};
