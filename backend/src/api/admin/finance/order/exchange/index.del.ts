// /server/api/admin/exchange/orders/delete.del.ts

import {
  commonBulkDeleteParams,
  commonBulkDeleteResponses,
  handleBulkDelete,
} from "@b/utils/query";

export const metadata = {
  summary: "Bulk deletes exchange orders by IDs",
  operationId: "bulkDeleteExchangeOrders",
  tags: ["Admin", "Exchange Orders"],
  parameters: commonBulkDeleteParams("Exchange Orders"),
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
              description: "Array of exchange order IDs to delete",
            },
          },
          required: ["ids"],
        },
      },
    },
  },
  responses: commonBulkDeleteResponses("Exchange Orders"),
  requiresAuth: true,
  permission: "delete.exchange.order",
};

export default async (data: Handler) => {
  const { body, query } = data;
  const { ids } = body;
  return handleBulkDelete({
    model: "exchangeOrder",
    ids,
    query,
  });
};
