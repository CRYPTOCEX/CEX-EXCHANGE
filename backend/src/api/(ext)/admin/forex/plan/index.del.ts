// /server/api/forex/plans/delete.del.ts

import {
  commonBulkDeleteParams,
  commonBulkDeleteResponses,
  handleBulkDelete,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Bulk deletes Forex plans",
  description: "Deletes multiple Forex plan configurations by their IDs. This will cascade delete to associated plan durations and investments.",
  operationId: "bulkDeleteForexPlans",
  tags: ["Admin", "Forex", "Plan"],
  parameters: commonBulkDeleteParams("Forex Plans"),
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
              description: "Array of Forex plan IDs to delete",
            },
          },
          required: ["ids"],
        },
      },
    },
  },
  responses: commonBulkDeleteResponses("Forex Plans"),
  requiresAuth: true,
  permission: "delete.forex.plan",
  logModule: "ADMIN_FOREX",
  logTitle: "Bulk delete forex plans",
};

export default async (data: Handler) => {
  const { body, query, ctx } = data;
  const { ids } = body;

  ctx?.step(`Validating ${ids.length} forex plan IDs`);

  ctx?.step(`Deleting ${ids.length} forex plans`);
  const result = await handleBulkDelete({
    model: "forexPlan",
    ids,
    query,
  });

  ctx?.success(`Successfully deleted ${ids.length} forex plans`);
  return result;
};
