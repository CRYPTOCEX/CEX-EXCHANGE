import { models, sequelize } from "@b/db";
import { Op } from "sequelize";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";

export const metadata = {
  summary: "Import Binary Markets from Exchange Markets",
  operationId: "importBinaryMarkets",
  tags: ["Admin", "Binary", "Markets"],
  description:
    "Imports spot markets from exchange markets and creates binary markets for trading.",
  requiresAuth: true,
  responses: {
    200: {
      description: "Binary markets imported successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: { type: "string" },
              imported: { type: "number" },
              skipped: { type: "number" },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Exchange Markets"),
    500: serverErrorResponse,
  },
  permission: "create.binary.market",
};

export default async (data: Handler) => {
  try {
    // Get all active exchange markets (spot markets only)
    const exchangeMarkets = await models.exchangeMarket.findAll({
      where: {
        status: true,
      },
      attributes: ["currency", "pair"],
    });

    if (exchangeMarkets.length === 0) {
      throw new Error("No active exchange markets found to import");
    }

    // Get existing binary markets to avoid duplicates
    const existingBinaryMarkets = await models.binaryMarket.findAll({
      attributes: ["currency", "pair"],
    });

    const existingPairs = new Set(
      existingBinaryMarkets.map((m) => `${m.currency}/${m.pair}`)
    );

    // Filter out markets that already exist in binary markets
    const marketsToImport = exchangeMarkets.filter(
      (market) => !existingPairs.has(`${market.currency}/${market.pair}`)
    );

    let imported = 0;
    const skipped = exchangeMarkets.length - marketsToImport.length;

    // Import markets in transaction
    await sequelize.transaction(async (transaction) => {
      for (const market of marketsToImport) {
        await models.binaryMarket.create(
          {
            currency: market.currency,
            pair: market.pair,
            isTrending: false,
            isHot: false,
            status: false, // Import as disabled by default
          },
          { transaction }
        );
        imported++;
      }
    });

    return {
      message: `Successfully imported ${imported} binary markets from exchange markets`,
      imported,
      skipped,
    };
  } catch (error) {
    console.error("Error importing binary markets:", error);
    throw error;
  }
}; 