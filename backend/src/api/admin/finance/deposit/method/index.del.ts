// /server/api/admin/deposit/methods/delete.del.ts

import {
  commonBulkDeleteParams,
  commonBulkDeleteResponses,
  handleBulkDelete,
} from "@b/utils/query";

export const metadata = {
  summary: "Bulk deletes deposit methods by IDs",
  operationId: "bulkDeleteDepositMethods",
  tags: ["Admin", "Deposit Methods"],
  parameters: commonBulkDeleteParams("Deposit Methods"),
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
              description: "Array of deposit method IDs to delete",
            },
          },
          required: ["ids"],
        },
      },
    },
  },
  responses: commonBulkDeleteResponses("Deposit Methods"),
  requiresAuth: true,
  permission: "delete.deposit.method",
  logModule: "ADMIN_FIN",
  logTitle: "Bulk delete deposit methods",
};

export default async (data: Handler) => {
  const { body, query, ctx } = data;
  const { ids } = body;

  ctx?.step(`Deleting ${ids.length} deposit method(s)`);
  const result = await handleBulkDelete({
    model: "depositMethod",
    ids,
    query,
  });

  ctx?.success("Deposit methods deleted successfully");
  return result;
};
