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
  logModule: "ADMIN_FIN",
  logTitle: "Update Wallet",
};

export default async (data: Handler) => {
  const { body, params, ctx } = data;
  const { id } = params;
  const { type, currency, balance, inOrder, status } = body;

  // Filter out undefined values to allow partial updates
  const updateData: any = {};
  if (type !== undefined) updateData.type = type;
  if (currency !== undefined) updateData.currency = currency;
  if (balance !== undefined) updateData.balance = balance;
  if (inOrder !== undefined) updateData.inOrder = inOrder;
  if (status !== undefined) updateData.status = status;

  const result = await updateRecord("wallet", id, updateData);
  ctx?.success("Wallet updated successfully");
  return result;
};
