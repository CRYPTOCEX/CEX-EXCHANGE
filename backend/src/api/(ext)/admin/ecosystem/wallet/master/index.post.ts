// /api/admin/ecosystem/masterWallets/store.post.ts

import { storeRecordResponses } from "@b/utils/query";
import {
  createAndEncryptWallet,
  createMasterWallet,
  ecosystemMasterWalletStoreSchema,
} from "./utils";
import { chainConfigs } from "@b/api/(ext)/ecosystem/utils/chains";
import { baseStringSchema } from "@b/utils/schema";
import { getMasterWalletByChain } from "@b/api/(ext)/ecosystem/utils/wallet";

export const metadata: OperationObject = {
  summary: "Stores a new Ecosystem Master Wallet",
  operationId: "storeEcosystemMasterWallet",
  tags: ["Admin", "Ecosystem Master Wallets"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            chain: baseStringSchema(
              "Blockchain chain associated with the master wallet",
              255
            ),
          },
          required: ["chain"],
        },
      },
    },
  },
  responses: storeRecordResponses(
    ecosystemMasterWalletStoreSchema,
    "Ecosystem Master Wallet"
  ),
  requiresAuth: true,
  permission: "create.ecosystem.master.wallet",
};

export default async (data: Handler) => {
  const { body } = data;
  const { chain } = body;

  const existingWallet = await getMasterWalletByChain(chain);
  if (existingWallet) {
    throw new Error(`Master wallet already exists: ${chain}`);
  }

  const walletData = await createAndEncryptWallet(chain);
  return await createMasterWallet(walletData, chainConfigs[chain].currency);
};
