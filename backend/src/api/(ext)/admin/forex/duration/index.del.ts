// /server/api/forex/durations/delete.del.ts

import {
  commonBulkDeleteParams,
  commonBulkDeleteResponses,
  handleBulkDelete,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Bulk deletes Forex durations",
  description: "Deletes multiple Forex duration configurations by their IDs. This will also affect any plans or investments associated with these durations.",
  operationId: "bulkDeleteForexDurations",
  tags: ["Admin", "Forex", "Duration"],
  parameters: commonBulkDeleteParams("Forex Durations"),
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
              description: "Array of Forex duration IDs to delete",
            },
          },
          required: ["ids"],
        },
      },
    },
  },
  responses: commonBulkDeleteResponses("Forex Durations"),
  requiresAuth: true,
  permission: "delete.forex.duration",
  logModule: "ADMIN_FOREX",
  logTitle: "Bulk delete forex durations",
};

export default async (data: Handler) => {
  const { body, query, ctx } = data;
  const { ids } = body;

  ctx?.step(`Validating ${ids.length} forex duration IDs`);

  ctx?.step(`Deleting ${ids.length} forex durations`);
  const result = await handleBulkDelete({
    model: "forexDuration",
    ids,
    query,
  });

  ctx?.success(`Successfully deleted ${ids.length} forex durations`);
  return result;
};
