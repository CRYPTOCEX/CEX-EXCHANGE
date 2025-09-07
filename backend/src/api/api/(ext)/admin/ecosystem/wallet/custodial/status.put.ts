import { updateRecordResponses, updateStatus } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Bulk updates the status of ecosystem custodial wallets",
  operationId: "bulkUpdateEcosystemCustodialWalletStatus",
  tags: ["Admin", "Ecosystem Custodial Wallets"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            ids: {
              type: "array",
              description: "Array of ecosystem custodial wallet IDs to update",
              items: { type: "string" },
            },
            status: {
              type: "string",
              enum: ["ACTIVE", "INACTIVE", "SUSPENDED"],
              description:
                "New status to apply to the ecosystem custodial wallets",
            },
          },
          required: ["ids", "status"],
        },
      },
    },
  },
  responses: updateRecordResponses("Ecosystem Custodial Wallet"),
  requiresAuth: true,
  permission: "edit.ecosystem.custodial.wallet",
};

export default async (data: Handler) => {
  const { body } = data;
  const { ids, status } = body;
  return updateStatus("ecosystemCustodialWallet", ids, status);
};
