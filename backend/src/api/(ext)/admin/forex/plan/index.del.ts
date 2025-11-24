// /server/api/forex/plans/delete.del.ts

import {
  commonBulkDeleteParams,
  commonBulkDeleteResponses,
  handleBulkDelete,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Bulk deletes Forex plans by IDs",
  operationId: "bulkDeleteForexPlans",
  tags: ["Admin", "Forex", "Plans"],
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
};

export default async (data: Handler) => {
  const { body, query } = data;
  const { ids } = body;
  return handleBulkDelete({
    model: "forexPlan",
    ids,
    query,
  });
};
