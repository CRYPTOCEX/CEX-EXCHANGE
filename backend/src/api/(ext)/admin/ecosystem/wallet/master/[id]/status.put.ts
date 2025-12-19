import { updateStatus, updateRecordResponses } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Update master wallet status",
  description: "Updates the operational status of a specific ecosystem master wallet. Active wallets can process transactions and manage custodial wallets, while inactive wallets are disabled.",
  operationId: "updateEcosystemMasterWalletStatus",
  tags: ["Admin", "Ecosystem", "Wallet"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the master wallet to update",
      schema: { type: "string" },
    },
  ],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            status: {
              type: "boolean",
              description:
                "New status to apply (true for active, false for inactive)",
            },
          },
          required: ["status"],
        },
      },
    },
  },
  responses: updateRecordResponses("Ecosystem Master Wallet"),
  requiresAuth: true,
  permission: "edit.ecosystem.master.wallet",
  logModule: "ADMIN_ECO",
  logTitle: "Update Master Wallet Status",
};

export default async (data) => {
  const { body, params, ctx } = data;
  const { id } = params;
  const { status } = body;

  ctx?.step("Updating Master Wallet Status");
  const result = await updateStatus("ecosystemMasterWallet", id, status);

  ctx?.success(`Master wallet ${id} status updated to ${status ? 'active' : 'inactive'}`);
  return result;
};
