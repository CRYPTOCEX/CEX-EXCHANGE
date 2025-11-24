// /api/admin/ecosystem/custodialWallets/store.post.ts
import { deployCustodialContract } from "../master/utils";
import { models } from "@b/db";
import { isError } from "ethers";

export const metadata: OperationObject = {
  summary: "Stores a new Ecosystem Custodial Wallet",
  operationId: "storeEcosystemCustodialWallet",
  tags: ["Admin", "Ecosystem Custodial Wallets"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            masterWalletId: {
              type: "string",
              description:
                "Master wallet ID associated with the custodial wallet",
            },
          },
          required: ["masterWalletId"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Ecosystem custodial wallet created successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: {
                type: "string",
                description: "Success message",
              },
            },
          },
        },
      },
    },
  },
  requiresAuth: true,
  permission: "create.ecosystem.custodial.wallet",
};

export default async (data: Handler) => {
  const { body } = data;
  const { masterWalletId } = body;

  try {
    // Validate input
    if (!masterWalletId) {
      throw new Error("Master wallet ID is required");
    }

    const wallet = await models.ecosystemMasterWallet.findByPk(masterWalletId);
    if (!wallet) {
      throw new Error(`Master wallet with ID ${masterWalletId} not found`);
    }

    const contractAddress = await deployCustodialContract(wallet);
    if (!contractAddress) {
      throw new Error("Failed to deploy custodial wallet contract - no address returned");
    }

    const custodialWallet = await storeCustodialWallet(wallet.id, wallet.chain, contractAddress);

    return {
      message: "Ecosystem custodial wallet created successfully",
      data: custodialWallet,
    };
  } catch (error) {
    console.error("Custodial wallet creation error:", error);

    if (isError(error, "INSUFFICIENT_FUNDS")) {
      throw new Error("Insufficient funds in master wallet to deploy custodial contract");
    }

    if (error.message.includes("Provider not initialized")) {
      throw new Error(`Blockchain provider for ${body.masterWalletId ? 'selected chain' : 'unknown chain'} is not configured`);
    }

    if (error.message.includes("Smart contract ABI or Bytecode not found")) {
      throw new Error("Custodial wallet smart contract files are missing - please contact administrator");
    }

    // Re-throw the original error message if it's already descriptive
    throw new Error(error.message || "Failed to create custodial wallet");
  }
};

export async function storeCustodialWallet(
  walletId: string,
  chain: string,
  contractAddress: string
): Promise<ecosystemCustodialWalletAttributes> {
  return await models.ecosystemCustodialWallet.create({
    masterWalletId: walletId,
    address: contractAddress,
    network: process.env[`${chain}_NETWORK`] || "mainnet",
    chain: chain,
    status: "ACTIVE",
  });
}
