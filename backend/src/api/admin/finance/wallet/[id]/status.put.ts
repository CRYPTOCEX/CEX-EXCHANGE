import { updateRecordResponses, updateStatus } from "@b/utils/query";

export const metadata = {
  summary: "Updates the status of a wallet",
  operationId: "updateWalletStatus",
  tags: ["Admin", "Wallets"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the wallet to update",
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
  responses: updateRecordResponses("Wallet"),
  requiresAuth: true,
  permission: "edit.wallet",
  logModule: "ADMIN_FIN",
  logTitle: "Update Wallet Status",
};

export default async (data: Handler) => {
  const { body, params, ctx } = data;
  const { id } = params;
  const { status } = body;
  const result = await updateStatus("wallet", id, status);
  ctx?.success("Wallet status updated successfully");
  return result;
};
