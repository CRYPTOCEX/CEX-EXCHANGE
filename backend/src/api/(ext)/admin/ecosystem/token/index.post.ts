import {
  storeRecord,
  unauthorizedResponse,
  serverErrorResponse,
} from "@b/utils/query";
import {
  badRequestResponse,
  conflictResponse,
} from "@b/utils/schema/errors";
import {
  ecosystemTokenStoreSchema,
  ecosystemTokenDeploySchema,
  updateIconInCache,
} from "./utils";
import { deployTokenContract } from "@b/api/(ext)/ecosystem/utils/tokens";
import { getSolanaService } from "@b/utils/safe-imports";
import { chainConfigs } from "@b/api/(ext)/ecosystem/utils/chains";
import { getMasterWalletByChainFull } from "@b/api/(ext)/ecosystem/utils/wallet";
import { taskQueue } from "@b/utils/task";
import { models } from "@b/db";

export const metadata: OperationObject = {
  summary: "Deploys a new ecosystem token",
  description:
    "Deploys a new token contract on the blockchain and registers it in the platform. Supports both ERC20 tokens (EVM chains) and SPL tokens (Solana). The token is deployed using the master wallet and initial supply is minted to the specified holder.",
  operationId: "deployEcosystemToken",
  tags: ["Admin", "Ecosystem", "Token"],
  logModule: "ADMIN_ECO",
  logTitle: "Deploy token",
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: ecosystemTokenDeploySchema,
      },
    },
  },
  responses: {
    200: {
      description: "Ecosystem token deployed successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: {
                type: "string",
                description: "Success message",
              },
              record: {
                type: "object",
                properties: {
                  id: { type: "string", description: "Token ID" },
                  contract: { type: "string", description: "Deployed contract address" },
                  name: { type: "string", description: "Token name" },
                  currency: { type: "string", description: "Token currency symbol" },
                  chain: { type: "string", description: "Blockchain chain" },
                  network: { type: "string", description: "Network type" },
                  type: { type: "string", description: "Token type" },
                  decimals: { type: "number", description: "Token decimals" },
                  contractType: {
                    type: "string",
                    enum: ["PERMIT", "NO_PERMIT", "NATIVE"],
                    description: "Contract type",
                  },
                  status: { type: "boolean", description: "Token status" },
                },
              },
            },
          },
        },
      },
    },
    400: badRequestResponse,
    401: unauthorizedResponse,
    409: conflictResponse("Ecosystem Token"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "create.ecosystem.token",
};

export default async (data: Handler) => {
  const { body, ctx } = data;
  const {
    name,
    currency,
    chain,
    decimals,
    status,
    precision,
    limits,
    fee,
    icon,
    initialHolder,
    initialSupply,
    marketCap,
  } = body;

  ctx?.step("Validating token deployment parameters");
  const network = process.env[`${chain}_NETWORK`];
  if (!network) {
    throw new Error(`Network not found for chain ${chain}`);
  }

  if (marketCap < 0) {
    throw new Error("Market cap cannot be negative");
  }

  if (initialSupply < 0) {
    throw new Error("Initial supply cannot be negative");
  }

  if (marketCap < initialSupply) {
    throw new Error("Market cap cannot be less than initial supply");
  }

  if (initialSupply === 0) {
    throw new Error("Initial supply cannot be zero");
  }

  if (!initialHolder) {
    throw new Error("Initial holder is required");
  }

  try {
    ctx?.step(`Retrieving master wallet for chain ${chain}`);
    // Get the master wallet for this chain
    const masterWallet = await getMasterWalletByChainFull(chain);
    if (!masterWallet) {
      throw new Error(`Master wallet for chain ${chain} not found`);
    }

    let contract: string;
    if (chain === "SOL") {
      ctx?.step("Deploying SPL token on Solana");
      // Use SolanaService to deploy the SPL token mint
      const SolanaService = await getSolanaService();
      if (!SolanaService) {
        throw new Error("Solana service not available");
      }
      const solanaService = await SolanaService.getInstance();
      contract = await solanaService.deploySplToken(masterWallet, decimals, ctx);

      ctx?.step("Queueing initial supply minting");
      // Add minting task to the queue
      taskQueue.add(() =>
        solanaService
          .mintInitialSupply(
            masterWallet,
            contract,
            initialSupply,
            decimals,
            initialHolder,
            ctx
          ) // Add initialHolder here
          .then(() =>
            console.log(
              `[INFO] Background minting completed for mint ${contract}`
            )
          )
          .catch(async (err) => {
            // remove token from ecosystemToken
            await models.ecosystemToken.destroy({
              where: { contract },
            });
            console.error(
              `[ERROR] Background minting failed for mint ${contract}: ${err.message}`
            );
          })
      );
    } else {
      ctx?.step(`Deploying ERC20 token on ${chain}`);
      // Deploy ERC20 Token on Ethereum or other supported EVM chains
      contract = await deployTokenContract(
        masterWallet,
        chain,
        name,
        currency,
        initialHolder,
        decimals,
        initialSupply,
        marketCap
      );
    }

    const type = chainConfigs[chain]?.smartContract?.name;

    ctx?.step("Saving token to database");
    // Save to ecosystemToken database, including off-chain metadata
    const result = await storeRecord({
      model: "ecosystemToken",
      data: {
        contract,
        name,
        currency,
        chain,
        network,
        type,
        decimals,
        status,
        precision,
        limits: JSON.stringify(limits),
        fee: JSON.stringify(fee),
        icon,
        contractType: "PERMIT",
      },
      returnResponse: true,
    });

    // If the creation was successful and an icon was provided, update the cache
    if (result.record && icon) {
      try {
        ctx?.step("Updating token icon in cache");
        await updateIconInCache(currency, icon);
      } catch (error) {
        ctx?.warn(`Failed to update icon in cache: ${error.message}`);
        console.error(`Failed to update icon in cache for ${currency}:`, error);
      }
    }

    ctx?.success(`Token ${currency} deployed successfully`);
    // Return the response immediately after saving the token record
    return result;
  } catch (error) {
    ctx?.fail(error.message);
    // console.error(`Error creating ecosystem token:`, error);
    throw new Error(`Failed to create ecosystem token: ${error.message}`);
  }
};
