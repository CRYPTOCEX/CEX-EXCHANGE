// /api/admin/ecosystem/custodialWallets/store.post.ts
import { deployCustodialContract } from "../master/utils";
import { models } from "@b/db";
import { isError } from "ethers";

export const metadata: OperationObject = {
  summary: "Create a new ecosystem custodial wallet",
  description: "Creates a new custodial wallet by deploying a smart contract on the blockchain. The wallet is associated with a master wallet and automatically configured with the appropriate chain and network settings.",
  operationId: "createEcosystemCustodialWallet",
  tags: ["Admin", "Ecosystem", "Wallet"],
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
      description: "Custodial wallet created successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: {
                type: "string",
                description: "Success message",
              },
              data: {
                type: "object",
                properties: {
                  id: { type: "string", description: "Custodial wallet ID" },
                  masterWalletId: { type: "string", description: "Associated master wallet ID" },
                  address: { type: "string", description: "Wallet contract address" },
                  chain: { type: "string", description: "Blockchain chain" },
                  network: { type: "string", description: "Network (mainnet/testnet)" },
                  status: { type: "string", enum: ["ACTIVE", "INACTIVE", "SUSPENDED"] },
                },
              },
            },
          },
        },
      },
    },
  },
  requiresAuth: true,
  permission: "create.ecosystem.custodial.wallet",
  logModule: "ADMIN_ECO",
  logTitle: "Create Ecosystem Custodial Wallet",
};

export default async (data: Handler) => {
  const { body, ctx } = data;
  const { masterWalletId } = body;

  try {
    ctx?.step("Validating Input");
    // Validate input
    if (!masterWalletId) {
      throw new Error("Master wallet ID is required");
    }

    ctx?.step("Fetching Master Wallet");
    const wallet = await models.ecosystemMasterWallet.findByPk(masterWalletId);
    if (!wallet) {
      throw new Error(`Master wallet with ID ${masterWalletId} not found`);
    }

    ctx?.step("Deploying Custodial Contract");
    const contractAddress = await deployCustodialContract(wallet, ctx);
    if (!contractAddress) {
      throw new Error("Failed to deploy custodial wallet contract - no address returned");
    }

    ctx?.step("Storing Custodial Wallet");
    const custodialWallet = await storeCustodialWallet(wallet.id, wallet.chain, contractAddress);

    ctx?.success("Custodial wallet created successfully");
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
