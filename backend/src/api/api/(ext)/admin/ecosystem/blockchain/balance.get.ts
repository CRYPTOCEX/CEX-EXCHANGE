import { formatEther, JsonRpcProvider } from "ethers";
import { Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { createError } from "@b/utils/error";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { models } from "@b/db";

// Mapping for EVM providers using endpoints from environment variables.
const evmProviderMapping: Record<string, { url: string; chainId: number }> = {
  ETH: {
    url: process.env.ETH_MAINNET_RPC || "https://eth.public-rpc.com",
    chainId: 1,
  },
  ARBITRUM: {
    url: process.env.ARBIRUM_MAINNET_RPC || "https://arbitrum.public-rpc.com",
    chainId: 42161,
  },
  BASE: {
    url: process.env.BASE_MAINNET_RPC || "https://base.blockchain.rpc",
    chainId: 8453,
  },
  BSC: {
    url: process.env.BSC_MAINNET_RPC || "https://bscrpc.com",
    chainId: 56,
  },
  CELO: {
    url: process.env.CELO_MAINNET_RPC || "https://forno.celo.org",
    chainId: 42220,
  },
  FTM: {
    url:
      process.env.FTM_MAINNET_RPC ||
      "https://fantom-mainnet.public.blastapi.io/",
    chainId: 250,
  },
  OPTIMISM: {
    url: process.env.OPTIMISM_MAINNET_RPC || "https://mainnet.optimism.io",
    chainId: 10,
  },
  POLYGON: {
    url: process.env.POLYGON_MATIC_RPC || "https://polygon-rpc.com",
    chainId: 137,
  },
  RSK: {
    url: process.env.RSK_MAINNET_RPC || "https://public-node.rsk.co",
    chainId: 30,
  },
};

function getEVMProvider(chain: string): JsonRpcProvider {
  const config = evmProviderMapping[chain];
  if (!config) {
    throw new Error(`Unsupported EVM chain: ${chain}`);
  }
  return new JsonRpcProvider(config.url, config.chainId);
}

async function getTokenDeploymentCostForEVM(chain: string): Promise<string> {
  const provider = getEVMProvider(chain);
  // Estimated gas limit for token deployment (an approximation)
  const gasLimit = BigInt(500000);
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice;
  if (!gasPrice) {
    throw new Error("Failed to fetch gas price");
  }
  const costWei = gasPrice * gasLimit;
  return formatEther(costWei);
}

async function getTokenDeploymentCostForSolana(): Promise<string> {
  // Optionally use a custom Solana RPC endpoint from the env
  const solanaRpc =
    process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
  const connection = new Connection(solanaRpc);
  // Approximate token deployment cost using the rent-exempt minimum for a token account (165 bytes)
  const tokenAccountSize = 165;
  const costLamports =
    await connection.getMinimumBalanceForRentExemption(tokenAccountSize);
  const costSOL = costLamports / LAMPORTS_PER_SOL;
  return costSOL.toFixed(4);
}

// OpenAPI metadata definition for this endpoint.
export const metadata: OperationObject = {
  summary: "Retrieves wallet balance and token deployment cost",
  description:
    "This endpoint retrieves the master wallet balance from the ecosystemMasterWallet model for the specified chain and calculates an estimated token deployment cost. For EVM chains, it uses ethers with a dedicated provider configured via environment variables, and for Solana, it uses Solana's web3.js.",
  operationId: "getWalletBalanceAndTokenCost",
  tags: ["Ecosystem", "Wallet", "Token Deployment"],
  requiresAuth: true,
  parameters: [
    {
      index: 0,
      name: "chain",
      in: "query",
      required: true,
      schema: { type: "string" },
      description:
        "The blockchain chain identifier (e.g. ETH, ARBITRUM, BASE, BSC, CELO, FTM, OPTIMISM, POLYGON, RSK, SOL) for which to check the wallet balance and token deployment cost.",
    },
  ],
  responses: {
    200: {
      description:
        "Wallet balance and token deployment cost retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              wallet: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  chain: { type: "string" },
                  currency: { type: "string" },
                  address: { type: "string" },
                  balance: { type: "number" },
                },
              },
              tokenDeploymentCost: { type: "string" },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("MasterWallet"),
    500: serverErrorResponse,
  },
  permission: "view.ecosystem.blockchain",
};

export default async (data: Handler) => {
  const { user, query } = data;
  if (!user?.id) throw createError(401, "Unauthorized");

  // Normalize chain parameter to uppercase to match our mapping keys.
  const chain: string = (query.chain || "").toUpperCase();
  if (!chain) throw createError(400, "Chain parameter is required");

  try {
    // Find the master wallet for the given chain (assuming only active wallets with status=true)
    const masterWallet = await models.ecosystemMasterWallet.findOne({
      where: { chain, status: true },
    });
    if (!masterWallet)
      throw createError(404, "Master wallet not found for the specified chain");

    let tokenDeploymentCost: string;
    if (chain === "SOL") {
      tokenDeploymentCost = await getTokenDeploymentCostForSolana();
    } else if (evmProviderMapping[chain]) {
      tokenDeploymentCost = await getTokenDeploymentCostForEVM(chain);
    } else {
      tokenDeploymentCost =
        "Token deployment cost not available for this chain";
    }

    return {
      wallet: {
        id: masterWallet.id,
        chain: masterWallet.chain,
        currency: masterWallet.currency,
        address: masterWallet.address,
        balance: masterWallet.balance,
      },
      tokenDeploymentCost,
    };
  } catch (error) {
    // Optionally log the error for debugging purposes.
    throw createError(500, error.message);
  }
};
