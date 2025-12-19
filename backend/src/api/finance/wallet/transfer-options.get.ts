import { models } from "@b/db";
import { CacheManager } from "@b/utils/cache";
import { logger } from "@b/utils/console";

export const metadata = {
  summary: "Get wallet types available for transfers",
  operationId: "getTransferWalletTypes",
  tags: ["Finance", "Transfer", "Wallets"],
  responses: {
    200: {
      description: "Available wallet types for transfers",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              types: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string", enum: ["FIAT", "SPOT", "ECO", "FUTURES"] },
                    name: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

export default async () => {
  const types: { id: string; name: string }[] = [];

  try {
    // Check wallet settings
    const cacheManager = CacheManager.getInstance();
    const fiatWalletsEnabled = await cacheManager.getSetting("fiatWallets");
    const spotWalletsEnabled = await cacheManager.getSetting("spotWallets");
    const isFiatEnabled = fiatWalletsEnabled === true || fiatWalletsEnabled === "true";
    const isSpotEnabled = spotWalletsEnabled === true || spotWalletsEnabled === "true";

    // Add FIAT only if enabled
    if (isFiatEnabled) {
      types.push({ id: "FIAT", name: "Fiat" });
    }

    // Check if exchange is enabled with error handling
    const exchangeEnabled = await models.exchange.findOne({
      where: { status: true },
    });

    if (exchangeEnabled) {
      // Only add SPOT if it's enabled in settings
      if (isSpotEnabled) {
        types.push({ id: "SPOT", name: "Spot" });
      }
      types.push({ id: "FUTURES", name: "Futures" });
    }
  } catch (error) {
    logger.warn("WALLET", "Error checking wallet settings", error);
    // Continue with what we have
  }

  try {
    // Check if ecosystem extension is available with error handling
    const cacheManager = CacheManager.getInstance();
    const extensions = await cacheManager.getExtensions();
    if (extensions && extensions.has("ecosystem")) {
      types.push({ id: "ECO", name: "Eco" });
    }
  } catch (error) {
    logger.warn("WALLET", "Error checking ecosystem extension", error);
    // Continue without ECO if extension check fails
  }

  return { types };
}; 