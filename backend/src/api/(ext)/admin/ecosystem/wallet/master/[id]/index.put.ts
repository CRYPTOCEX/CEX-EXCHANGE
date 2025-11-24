import { updateRecord, updateRecordResponses } from "@b/utils/query";
import { ecosystemMasterWalletUpdateSchema } from "../utils";

export const metadata: OperationObject = {
  summary: "Updates a specific master wallet",
  operationId: "updateEcosystemMasterWallet",
  tags: ["Admin", "Ecosystem", "Master Wallets"],
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
};

export default async (data) => {
  const { body, params } = data;
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

  return await updateRecord("ecosystemMasterWallet", id, {
    chain,
    currency,
    address,
    balance,
    data: walletData,
    status,
    lastIndex,
  });
};
