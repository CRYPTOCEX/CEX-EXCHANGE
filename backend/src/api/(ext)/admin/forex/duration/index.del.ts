// /server/api/forex/durations/delete.del.ts

import {
  commonBulkDeleteParams,
  commonBulkDeleteResponses,
  handleBulkDelete,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Bulk deletes Forex durations by IDs",
  operationId: "bulkDeleteForexDurations",
  tags: ["Admin", "Forex", "Durations"],
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
};

export default async (data: Handler) => {
  const { body, query } = data;
  const { ids } = body;
  return handleBulkDelete({
    model: "forexDuration",
    ids,
    query,
  });
};
