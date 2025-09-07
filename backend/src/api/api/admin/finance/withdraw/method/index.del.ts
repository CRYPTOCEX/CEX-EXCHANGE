// /server/api/admin/wallets/delete.del.ts

import {
  commonBulkDeleteParams,
  commonBulkDeleteResponses,
  handleBulkDelete,
} from "@b/utils/query";

export const metadata = {
  summary: "Bulk deletes wallets by UUIDs",
  operationId: "bulkDeleteWallets",
  tags: ["Admin", "Wallets"],
  parameters: commonBulkDeleteParams("wallet"),
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
              description: "Array of wallet UUIDs to delete",
            },
          },
          required: ["ids"],
        },
      },
    },
  },
  responses: commonBulkDeleteResponses("wallet"),
  requiresAuth: true,
  permission: "delete.withdraw.method",
};

export default async (data: Handler) => {
  const { body, query } = data;
  const { ids } = body;
  return handleBulkDelete({
    model: "withdrawMethod",
    ids,
    query,
  });
};
