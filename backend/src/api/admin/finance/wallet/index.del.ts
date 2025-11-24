import {
  commonBulkDeleteParams,
  commonBulkDeleteResponses,
  handleBulkDelete,
} from "@b/utils/query";

export const metadata = {
  summary: "Bulk deletes wallets by IDs",
  operationId: "bulkDeleteWallets",
  tags: ["Admin", "Wallets"],
  parameters: commonBulkDeleteParams("Wallets"),
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
              description: "Array of wallet IDs to delete",
            },
          },
          required: ["ids"],
        },
      },
    },
  },
  responses: commonBulkDeleteResponses("Wallets"),
  requiresAuth: true,
  permission: "delete.wallet",
};

export default async (data: Handler) => {
  const { body, query } = data;
  const { ids } = body;
  return handleBulkDelete({
    model: "wallet",
    ids,
    query,
  });
};
