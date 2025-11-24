import { Op } from "sequelize";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { createError } from "@b/utils/error";
import { models } from "@b/db";

export const metadata: OperationObject = {
  summary: "Retrieves ecosystem blockchain options",
  description:
    "This endpoint retrieves a list of blockchain options for the ecosystem. It includes a static list of blockchains, and conditionally adds Solana and Mo Chain if they are enabled.",
  operationId: "getEcosystemBlockchainOptions",
  tags: ["Ecosystem", "Blockchain"],
  requiresAuth: true,
  responses: {
    200: {
      description: "Blockchain options retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string" },
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
    // Retrieve blockchain statuses for SOL and MO.
    const chains = await models.ecosystemBlockchain.findAll({
      where: { chain: ["SOL", "MO"] },
    });

    const solanaBlockchain = chains.find((c) => c.chain === "SOL" && c.status);
    const moBlockchain = chains.find((c) => c.chain === "MO" && c.status);

    // Base list of static blockchain options.
    const blockchainOptions = [
      { id: "ARBITRUM", name: "Arbitrum (ARB)" },
      { id: "BASE", name: "Base (BASE)" },
      { id: "BSC", name: "Binance Smart Chain (BSC)" },
      { id: "CELO", name: "Celo (CELO)" },
      { id: "ETH", name: "Ethereum (ETH)" },
      { id: "FTM", name: "Fantom (FTM)" },
      { id: "OPTIMISM", name: "Optimism (OVM)" },
      { id: "POLYGON", name: "Polygon (MATIC)" },
      { id: "RSK", name: "RSK (RSK)" },
      ...(solanaBlockchain ? [{ id: "SOL", name: "Solana (SOL)" }] : []),
      ...(moBlockchain ? [{ id: "MO", name: "Mo Chain (MO)" }] : []),
    ];

    return blockchainOptions;
  } catch (error) {
    throw createError(
      500,
      "An error occurred while fetching blockchain options"
    );
  }
};
