import { Op } from "sequelize";
import {
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/schema/errors";
import { createError } from "@b/utils/error";
import { models } from "@b/db";

export const metadata: OperationObject = {
  summary: "Get available blockchain options",
  description:
    "Retrieves a list of supported blockchain options for the ecosystem. Returns a static list of EVM-compatible chains (Arbitrum, Base, BSC, Celo, Ethereum, Fantom, Optimism, Polygon, RSK) and conditionally includes Solana and Mo Chain if they are enabled in the database.",
  operationId: "getEcosystemBlockchainOptions",
  tags: ["Admin", "Ecosystem", "Blockchain"],
  requiresAuth: true,
  logModule: "ADMIN_ECO",
  logTitle: "Get blockchain options",
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
                id: {
                  type: "string",
                  description: "Blockchain chain identifier",
                  example: "ETH"
                },
                name: {
                  type: "string",
                  description: "Blockchain display name with symbol",
                  example: "Ethereum (ETH)"
                },
              },
              required: ["id", "name"]
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    500: serverErrorResponse,
  },
  permission: "view.ecosystem.blockchain",
};

export default async (data: Handler) => {
  const { user, ctx } = data;
  if (!user?.id) throw createError(401, "Unauthorized");

  try {
    ctx?.step("Retrieving blockchain statuses");
    // Retrieve blockchain statuses for SOL and MO.
    const chains = await models.ecosystemBlockchain.findAll({
      where: { chain: ["SOL", "MO"] },
    });

    const solanaBlockchain = chains.find((c) => c.chain === "SOL" && c.status);
    const moBlockchain = chains.find((c) => c.chain === "MO" && c.status);

    ctx?.step("Building blockchain options list");
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

    ctx?.success("Blockchain options retrieved successfully");
    return blockchainOptions;
  } catch (error) {
    ctx?.fail(error.message);
    throw createError(
      500,
      "An error occurred while fetching blockchain options"
    );
  }
};
