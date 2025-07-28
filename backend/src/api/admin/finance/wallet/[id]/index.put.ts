// /api/admin/wallets/[id]/update.put.ts
import { updateRecord, updateRecordResponses } from "@b/utils/query";
import { walletUpdateSchema } from "../utils";

export const metadata = {
  summary: "Updates an existing wallet",
  operationId: "updateWallet",
  tags: ["Admin", "Wallets"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "The ID of the wallet to update",
      required: true,
      schema: {
        type: "string",
      },
    },
  ],
  requestBody: {
    required: true,
    description: "Updated data for the wallet",
    content: {
      "application/json": {
        schema: walletUpdateSchema,
      },
    },
  },
  responses: updateRecordResponses("Wallet"),
  requiresAuth: true,
  permission: "edit.wallet",
};

export default async (data: Handler) => {
  const { body, params } = data;
  const { id } = params;
  const { type, currency, balance, inOrder, status } = body;

  return await updateRecord("wallet", id, {
    type,
    currency,
    balance,
    inOrder,
    status,
  });
};
