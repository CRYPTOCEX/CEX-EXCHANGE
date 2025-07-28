// /server/api/forex/signals/delete.del.ts

import {
  commonBulkDeleteParams,
  commonBulkDeleteResponses,
  handleBulkDelete,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Bulk deletes Forex signals by IDs",
  operationId: "bulkDeleteForexSignals",
  tags: ["Admin", "Forex", "Signals"],
  parameters: commonBulkDeleteParams("Forex Signals"),
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
              description: "Array of Forex signal IDs to delete",
            },
          },
          required: ["ids"],
        },
      },
    },
  },
  responses: commonBulkDeleteResponses("Forex Signals"),
  requiresAuth: true,
  permission: "delete.forex.signal",
};

export default async (data: Handler) => {
  const { body, query } = data;
  const { ids } = body;
  return handleBulkDelete({
    model: "forexSignal",
    ids,
    query,
  });
};
