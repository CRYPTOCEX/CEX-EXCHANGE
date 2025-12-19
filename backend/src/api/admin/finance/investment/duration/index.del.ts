// /server/api/investment/durations/delete.del.ts

import {
  commonBulkDeleteParams,
  commonBulkDeleteResponses,
  handleBulkDelete,
} from "@b/utils/query";

export const metadata = {
  summary: "Bulk deletes Investment durations by IDs",
  operationId: "bulkDeleteInvestmentDurations",
  tags: ["Admin", "Investment", "Durations"],
  parameters: commonBulkDeleteParams("Investment Durations"),
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
              description: "Array of Investment duration IDs to delete",
            },
          },
          required: ["ids"],
        },
      },
    },
  },
  responses: commonBulkDeleteResponses("Investment Durations"),
  requiresAuth: true,
  permission: "delete.investment.duration",
  logModule: "ADMIN_FIN",
  logTitle: "Bulk Delete Investment Durations",
};

export default async (data: Handler) => {
  const { body, query, ctx } = data;
  const { ids } = body;

  ctx?.step("Validating investment duration IDs");

  ctx?.step("Deleting investment duration records");
  const result = await handleBulkDelete({
    model: "investmentDuration",
    ids,
    query,
  });

  ctx?.success("Investment durations deleted successfully");
  return result;
};
