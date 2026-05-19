"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const cache_1 = require("@b/utils/cache");
const console_1 = require("@b/utils/console");
exports.metadata = {
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
exports.default = async () => {
    const types = [];
    try {
        const cacheManager = cache_1.CacheManager.getInstance();
        const fiatWalletsEnabled = await cacheManager.getSetting("fiatWallets");
        const spotWalletsEnabled = await cacheManager.getSetting("spotWallets");
        const isFiatEnabled = fiatWalletsEnabled === true || fiatWalletsEnabled === "true";
        const isSpotEnabled = spotWalletsEnabled === true || spotWalletsEnabled === "true";
        if (isFiatEnabled) {
            types.push({ id: "FIAT", name: "Fiat" });
        }
        const exchangeEnabled = await db_1.models.exchange.findOne({
            where: { status: true },
        });
        if (exchangeEnabled) {
            if (isSpotEnabled) {
                types.push({ id: "SPOT", name: "Spot" });
            }
            types.push({ id: "FUTURES", name: "Futures" });
        }
    }
    catch (error) {
        console_1.logger.warn("WALLET", "Error checking wallet settings", error);
    }
    try {
        const cacheManager = cache_1.CacheManager.getInstance();
        const extensions = await cacheManager.getExtensions();
        if (extensions && extensions.has("ecosystem")) {
            types.push({ id: "ECO", name: "Eco" });
        }
    }
    catch (error) {
        console_1.logger.warn("WALLET", "Error checking ecosystem extension", error);
    }
    return { types };
};
