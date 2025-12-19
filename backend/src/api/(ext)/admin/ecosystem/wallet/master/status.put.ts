import { updateRecordResponses, updateStatus } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Bulk update master wallet status",
  description: "Updates the status of multiple ecosystem master wallets simultaneously. Active wallets can process transactions and manage custodial wallets, while inactive wallets are disabled.",
  operationId: "bulkUpdateEcosystemMasterWalletStatus",
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
              description: "Array of ecosystem master wallet IDs to update",
              items: { type: "string" },
            },
            status: {
              type: "string",
              enum: ["ACTIVE", "INACTIVE"],
              description: "New status to apply (true for active, false for inactive)",
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
  logModule: "ADMIN_ECO",
  logTitle: "Bulk Update Master Wallet Status",
};

export default async (data: Handler) => {
  const { body, ctx } = data;
  const { ids, status } = body;

  ctx?.step("Updating Master Wallet Status");
  const result = await updateStatus("ecosystemMasterWallet", ids, status);

  ctx?.success(`Updated status for ${Array.isArray(ids) ? ids.length : 1} master wallet(s)`);
  return result;
};
