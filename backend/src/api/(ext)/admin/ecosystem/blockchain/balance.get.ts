import { formatEther, JsonRpcProvider } from "ethers";
import { Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { createError } from "@b/utils/error";
import {
  notFoundResponse,
  serverErrorResponse,
  unauthorizedResponse,
  badRequestResponse,
} from "@b/utils/schema/errors";
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
  summary: "Get master wallet balance and token deployment cost",
  description:
    "Retrieves the master wallet balance for a specified blockchain and calculates the estimated token deployment cost. For EVM-compatible chains (ETH, ARBITRUM, BASE, BSC, CELO, FTM, OPTIMISM, POLYGON, RSK), it uses ethers.js to estimate gas costs. For Solana, it calculates the rent-exempt minimum for token account creation.",
  operationId: "getEcosystemBlockchainBalance",
  tags: ["Admin", "Ecosystem", "Blockchain"],
  requiresAuth: true,
  logModule: "ADMIN_ECO",
  logTitle: "Get wallet balance and token deployment cost",
  parameters: [
    {
      index: 0,
      name: "chain",
      in: "query",
      required: true,
      schema: {
        type: "string",
        enum: ["ETH", "ARBITRUM", "BASE", "BSC", "CELO", "FTM", "OPTIMISM", "POLYGON", "RSK", "SOL"]
      },
      description:
        "The blockchain chain identifier for which to retrieve the wallet balance and token deployment cost.",
    },
  ],
  responses: {
    200: {
      description:
        "Master wallet balance and token deployment cost retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              wallet: {
                type: "object",
                properties: {
                  id: {
                    type: "string",
                    format: "uuid",
                    description: "Master wallet unique identifier"
                  },
                  chain: {
                    type: "string",
                    description: "Blockchain chain identifier"
                  },
                  currency: {
                    type: "string",
                    description: "Native currency symbol"
                  },
                  address: {
                    type: "string",
                    description: "Wallet address"
                  },
                  balance: {
                    type: "number",
                    description: "Current wallet balance"
                  },
                },
                required: ["id", "chain", "currency", "address", "balance"]
              },
              tokenDeploymentCost: {
                type: "string",
                description: "Estimated cost to deploy a token in native currency"
              },
            },
            required: ["wallet", "tokenDeploymentCost"]
          },
        },
      },
    },
    400: badRequestResponse,
    401: unauthorizedResponse,
    404: notFoundResponse("Master wallet"),
    500: serverErrorResponse,
  },
  permission: "view.ecosystem.blockchain",
};

export default async (data: Handler) => {
  const { user, query, ctx } = data;
  if (!user?.id) throw createError(401, "Unauthorized");

  // Normalize chain parameter to uppercase to match our mapping keys.
  const chain: string = (query.chain || "").toUpperCase();
  if (!chain) throw createError(400, "Chain parameter is required");

  try {
    ctx?.step(`Retrieving master wallet for chain ${chain}`);
    // Find the master wallet for the given chain (assuming only active wallets with status=true)
    const masterWallet = await models.ecosystemMasterWallet.findOne({
      where: { chain, status: true },
    });
    if (!masterWallet)
      throw createError(404, "Master wallet not found for the specified chain");

    ctx?.step("Calculating token deployment cost");
    let tokenDeploymentCost: string;
    if (chain === "SOL") {
      tokenDeploymentCost = await getTokenDeploymentCostForSolana();
    } else if (evmProviderMapping[chain]) {
      tokenDeploymentCost = await getTokenDeploymentCostForEVM(chain);
    } else {
      tokenDeploymentCost =
        "Token deployment cost not available for this chain";
    }

    ctx?.success("Balance and cost retrieved successfully");
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
    ctx?.fail(error.message);
    throw createError(500, error.message);
  }
};
