import { storeRecord, storeRecordResponses } from "@b/utils/query";
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
  summary: "Stores a new Ecosystem Token",
  operationId: "storeEcosystemToken",
  tags: ["Admin", "Ecosystem Tokens"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: ecosystemTokenDeploySchema,
      },
    },
  },
  responses: storeRecordResponses(ecosystemTokenStoreSchema, "Ecosystem Token"),
  requiresAuth: true,
  permission: "create.ecosystem.token",
};

export default async (data: Handler) => {
  const { body } = data;
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
    // Get the master wallet for this chain
    const masterWallet = await getMasterWalletByChainFull(chain);
    if (!masterWallet) {
      throw new Error(`Master wallet for chain ${chain} not found`);
    }

    let contract: string;
    if (chain === "SOL") {
      // Use SolanaService to deploy the SPL token mint
      const SolanaService = await getSolanaService();
      if (!SolanaService) {
        throw new Error("Solana service not available");
      }
      const solanaService = await SolanaService.getInstance();
      contract = await solanaService.deploySplToken(masterWallet, decimals);

      // Add minting task to the queue
      taskQueue.add(() =>
        solanaService
          .mintInitialSupply(
            masterWallet,
            contract,
            initialSupply,
            decimals,
            initialHolder
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
        await updateIconInCache(currency, icon);
      } catch (error) {
        console.error(`Failed to update icon in cache for ${currency}:`, error);
      }
    }

    // Return the response immediately after saving the token record
    return result;
  } catch (error) {
    // console.error(`Error creating ecosystem token:`, error);
    throw new Error(`Failed to create ecosystem token: ${error.message}`);
  }
};
