// /server/api/ai/investment-durations/delete.del.ts

import {
  commonBulkDeleteParams,
  commonBulkDeleteResponses,
  handleBulkDelete,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Bulk delete AI investment durations",
  operationId: "bulkDeleteAiInvestmentDurations",
  tags: ["Admin", "AI Investment", "Duration"],
  description:
    "Deletes multiple AI investment duration records by their IDs. This endpoint allows administrators to remove multiple duration options in a single operation.",
  parameters: commonBulkDeleteParams("AI Investment Durations"),
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            ids: {
              type: "array",
              items: { type: "string", format: "uuid" },
              description: "Array of AI Investment Duration IDs to delete (at least 1 required)",
            },
          },
          required: ["ids"],
        },
      },
    },
  },
  responses: commonBulkDeleteResponses("AI Investment Durations"),
  requiresAuth: true,
  permission: "delete.ai.investment.duration",
  logModule: "ADMIN_AI",
  logTitle: "Bulk delete investment durations",
};

export default async (data: Handler) => {
  const { body, query, ctx } = data;
  const { ids } = body;

  ctx?.step(`Deleting ${ids.length} duration(s)`);
  const result = await handleBulkDelete({
    model: "aiInvestmentDuration",
    ids,
    query,
  });

  ctx?.success(`Deleted ${ids.length} duration(s)`);
  return result;
};
