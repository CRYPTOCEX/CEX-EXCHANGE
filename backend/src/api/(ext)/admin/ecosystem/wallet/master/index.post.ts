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
  summary: "Create a new ecosystem master wallet",
  description: "Creates a new master wallet for a specific blockchain. Generates a new wallet with private key, encrypts the sensitive data, and stores it securely in the database. The master wallet is used to manage custodial wallets and ecosystem transactions.",
  operationId: "createEcosystemMasterWallet",
  tags: ["Admin", "Ecosystem", "Wallet"],
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
  logModule: "ADMIN_ECO",
  logTitle: "Create Ecosystem Master Wallet",
};

export default async (data: Handler) => {
  const { body, ctx } = data;
  const { chain } = body;

  ctx?.step("Checking for Existing Master Wallet");
  const existingWallet = await getMasterWalletByChain(chain);
  if (existingWallet) {
    throw new Error(`Master wallet already exists: ${chain}`);
  }

  ctx?.step("Creating and Encrypting Wallet");
  const walletData = await createAndEncryptWallet(chain, ctx);

  ctx?.step("Storing Master Wallet");
  const result = await createMasterWallet(walletData, chainConfigs[chain].currency, ctx);

  ctx?.success(`Master wallet created successfully for chain: ${chain}`);
  return result;
};
