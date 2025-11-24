import { Op } from "sequelize";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { createError } from "@b/utils/error";
import { models } from "@b/db";
import { chainConfigs } from "@b/api/(ext)/ecosystem/utils/chains";

export const metadata: OperationObject = {
  summary: "Retrieves ecosystem master wallet options",
  description:
    "This endpoint retrieves a list of chain options for ecosystem master wallets by combining a predefined list with dynamically enabled chains.",
  operationId: "getEcosystemMasterWalletOptions",
  tags: ["Ecosystem", "Wallet"],
  requiresAuth: true,
  responses: {
    200: {
      description: "Ecosystem master wallet options retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                value: { type: "string" },
                label: { type: "string" },
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("EcosystemBlockchain"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { user } = data;
  if (!user?.id) throw createError(401, "Unauthorized");

  try {
    // Predefined list of chains to check dynamically.
    const chains = ["SOL", "TRON", "XMR", "TON", "MO"];
    const blockchainStatuses = await models.ecosystemBlockchain.findAll({
      where: {
        chain: { [Op.in]: chains },
      },
    });

    // Base chain options list.
    const chainOptions: { value: string; label: string }[] = [
      { value: "ETH", label: "Ethereum" },
      { value: "BSC", label: "Binance Smart Chain" },
      { value: "POLYGON", label: "Polygon" },
      { value: "FTM", label: "Fantom" },
      { value: "OPTIMISM", label: "Optimism" },
      { value: "ARBITRUM", label: "Arbitrum" },
      { value: "BASE", label: "Syscoin" },
      { value: "CELO", label: "Celo" },
      { value: "BTC", label: "Bitcoin" },
      { value: "LTC", label: "Litecoin" },
      { value: "DOGE", label: "Dogecoin" },
      { value: "DASH", label: "Dash" },
    ];

    // Dynamically add enabled chains.
    blockchainStatuses.forEach((blockchain) => {
      if (blockchain.status && blockchain.chain) {
        // Get currency from chainConfigs instead of blockchain.currency
        const chainConfig = chainConfigs[blockchain.chain];
        const currency = chainConfig?.currency || blockchain.chain;
        
        chainOptions.push({
          value: blockchain.chain,
          label: `${blockchain.chain} (${currency})`,
        });
      }
    });

    return chainOptions;
  } catch (error) {
    throw createError(
      500,
      "An error occurred while fetching ecosystem master wallet options"
    );
  }
};
