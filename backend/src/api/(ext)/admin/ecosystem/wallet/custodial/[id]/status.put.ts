import { updateStatus, updateRecordResponses } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Update custodial wallet status",
  description: "Updates the operational status of a specific ecosystem custodial wallet. Status can be set to ACTIVE, INACTIVE, or SUSPENDED to control wallet accessibility.",
  operationId: "updateEcosystemCustodialWalletStatus",
  tags: ["Admin", "Ecosystem", "Wallet"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the custodial wallet to update",
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
              type: "string",
              enum: ["ACTIVE", "INACTIVE", "SUSPENDED"],
              description: "New status to apply",
            },
          },
          required: ["status"],
        },
      },
    },
  },
  responses: updateRecordResponses("Ecosystem Custodial Wallet"),
  requiresAuth: true,
  permission: "edit.ecosystem.custodial.wallet",
  logModule: "ADMIN_ECO",
  logTitle: "Update Custodial Wallet Status",
};

export default async (data) => {
  const { body, params, ctx } = data;
  const { id } = params;
  const { status } = body;

  ctx?.step("Updating Custodial Wallet Status");
  const result = await updateStatus("ecosystemCustodialWallet", id, status);

  ctx?.success(`Custodial wallet ${id} status updated to ${status}`);
  return result;
};
