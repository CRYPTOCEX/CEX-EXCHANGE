import { updateRecordResponses, updateStatus } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Bulk updates the status of ecosystem master wallets",
  operationId: "bulkUpdateEcosystemMasterWalletStatus",
  tags: ["Admin", "Ecosystem Master Wallets"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            ids: {
              type: "array",
              description: "Array of ecosystem master wallet IDs to update",
              items: { type: "string" },
            },
            status: {
              type: "string",
              enum: ["ACTIVE", "INACTIVE"],
              description:
                "New status to apply to the ecosystem master wallets",
            },
          },
          required: ["ids", "status"],
        },
      },
    },
  },
  responses: updateRecordResponses("Ecosystem Master Wallet"),
  requiresAuth: true,
  permission: "edit.ecosystem.master.wallet",
};

export default async (data: Handler) => {
  const { body } = data;
  const { ids, status } = body;
  return updateStatus("ecosystemMasterWallet", ids, status);
};
