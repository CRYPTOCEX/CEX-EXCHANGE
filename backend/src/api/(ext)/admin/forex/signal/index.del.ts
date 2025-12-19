// /server/api/forex/signals/delete.del.ts

import {
  commonBulkDeleteParams,
  commonBulkDeleteResponses,
  handleBulkDelete,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Bulk deletes Forex signals",
  description: "Deletes multiple Forex trading signal configurations by their IDs. This will remove signal references from associated accounts.",
  operationId: "bulkDeleteForexSignals",
  tags: ["Admin", "Forex", "Signal"],
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
  logModule: "ADMIN_FOREX",
  logTitle: "Bulk delete forex signals",
};

export default async (data: Handler) => {
  const { body, query , ctx } = data;
  const { ids } = body;

  ctx?.step(`Validating ${ids.length} IDs`);

  ctx?.step(`Deleting ${ids.length} records`);
  const result = await handleBulkDelete({
    model: "forexSignal",
    ids,
    query,
  });

  ctx?.success(`Successfully deleted ${ids.length} records`);
  return result;
};
