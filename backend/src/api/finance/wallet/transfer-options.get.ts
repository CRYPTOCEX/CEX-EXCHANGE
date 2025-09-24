import { models } from "@b/db";
import { CacheManager } from "@b/utils/cache";

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
  const types = [{ id: "FIAT", name: "Fiat" }];

  try {
    // Check if spot wallets are enabled in settings
    const cacheManager = CacheManager.getInstance();
    const spotWalletsEnabled = await cacheManager.getSetting("spotWallets");
    const isSpotEnabled = spotWalletsEnabled === true || spotWalletsEnabled === "true";

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
    console.warn("Error checking exchange status:", error.message);
    // Continue without SPOT/FUTURES if exchange check fails
  }

  try {
    // Check if ecosystem extension is available with error handling
    const cacheManager = CacheManager.getInstance();
    const extensions = await cacheManager.getExtensions();
    if (extensions && extensions.has("ecosystem")) {
      types.push({ id: "ECO", name: "Eco" });
    }
  } catch (error) {
    console.warn("Error checking ecosystem extension:", error.message);
    // Continue without ECO if extension check fails
  }

  // Ensure at least FIAT is always available
  if (types.length === 0) {
    return { types: [{ id: "FIAT", name: "Fiat" }] };
  }

  return { types };
}; 