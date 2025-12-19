import { updateRecordResponses, updateStatus } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Bulk update custodial wallet status",
  description: "Updates the status of multiple ecosystem custodial wallets simultaneously. Can be used to activate, deactivate, or suspend wallets in bulk.",
  operationId: "bulkUpdateEcosystemCustodialWalletStatus",
  tags: ["Admin", "Ecosystem", "Wallet"],
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
              description: "New status to apply (ACTIVE, INACTIVE, or SUSPENDED)",
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
  logModule: "ADMIN_ECO",
  logTitle: "Bulk Update Custodial Wallet Status",
};

export default async (data: Handler) => {
  const { body, ctx } = data;
  const { ids, status } = body;

  ctx?.step("Updating Custodial Wallet Status");
  const result = await updateStatus("ecosystemCustodialWallet", ids, status);

  ctx?.success(`Updated status for ${Array.isArray(ids) ? ids.length : 1} custodial wallet(s)`);
  return result;
};
