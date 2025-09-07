import { updateRecordResponses, updateStatus } from "@b/utils/query";

export const metadata = {
  summary: "Bulk updates the status of wallets",
  operationId: "bulkUpdateWalletStatus",
  tags: ["Admin", "Wallets"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            ids: {
              type: "array",
              description: "Array of wallet IDs to update",
              items: { type: "string" },
            },
            status: {
              type: "boolean",
              description:
                "New status to apply to the wallets (true for active, false for inactive)",
            },
          },
          required: ["ids", "status"],
        },
      },
    },
  },
  responses: updateRecordResponses("Wallet"),
  requiresAuth: true,
  permission: "edit.wallet",
};

export default async (data: Handler) => {
  const { body } = data;
  const { ids, status } = body;
  return updateStatus("wallet", ids, status);
};
