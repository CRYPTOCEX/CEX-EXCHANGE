import { updateRecord, updateRecordResponses } from "@b/utils/query";
import { ecosystemMasterWalletUpdateSchema } from "../utils";

export const metadata: OperationObject = {
  summary: "Update master wallet",
  description: "Updates the configuration of a specific ecosystem master wallet. Allows modification of chain, currency, address, balance, encrypted data, status, and last index values.",
  operationId: "updateEcosystemMasterWallet",
  tags: ["Admin", "Ecosystem", "Wallet"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "ID of the master wallet to update",
      required: true,
      schema: {
        type: "string",
      },
    },
  ],
  requestBody: {
    description: "New data for the master wallet",
    content: {
      "application/json": {
        schema: ecosystemMasterWalletUpdateSchema,
      },
    },
  },
  responses: updateRecordResponses("Master Wallet"),
  requiresAuth: true,
  permission: "edit.ecosystem.master.wallet",
  logModule: "ADMIN_ECO",
  logTitle: "Update Master Wallet",
};

export default async (data) => {
  const { body, params, ctx } = data;
  const { id } = params;
  const {
    chain,
    currency,
    address,
    balance,
    data: walletData,
    status,
    lastIndex,
  } = body;

  ctx?.step("Updating Master Wallet");
  const result = await updateRecord("ecosystemMasterWallet", id, {
    chain,
    currency,
    address,
    balance,
    data: walletData,
    status,
    lastIndex,
  });

  ctx?.success(`Master wallet ${id} updated successfully`);
  return result;
};
