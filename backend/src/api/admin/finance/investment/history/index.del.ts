// /server/api/investment/investments/delete.del.ts

import {
  commonBulkDeleteParams,
  commonBulkDeleteResponses,
  handleBulkDelete,
} from "@b/utils/query";

export const metadata = {
  summary: "Bulk deletes investments by IDs",
  operationId: "bulkDeleteInvestments",
  tags: ["Admin", "General", "Investments"],
  parameters: commonBulkDeleteParams("Investments"),
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
              description: "Array of investment IDs to delete",
            },
          },
          required: ["ids"],
        },
      },
    },
  },
  responses: commonBulkDeleteResponses("Investments"),
  requiresAuth: true,
  permission: "delete.investment",
  logModule: "ADMIN_FIN",
  logTitle: "Bulk Delete Investment History",
};

export default async (data: Handler) => {
  const { body, query, ctx } = data;
  const { ids } = body;

  ctx?.step("Validating investment IDs for bulk deletion");

  ctx?.step("Bulk deleting investment records");
  const result = await handleBulkDelete({
    model: "investment",
    ids,
    query,
  });

  ctx?.success();
  return result
};
