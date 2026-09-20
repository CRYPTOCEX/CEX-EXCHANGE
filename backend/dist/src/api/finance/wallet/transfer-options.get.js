"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const cache_1 = require("@b/utils/cache");
const console_1 = require("@b/utils/console");
const utils_1 = require("@b/api/finance/transfer/utils");
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
                            feePercentage: {
                                type: "number",
                                description: "Configured wallet transfer fee, in percent. The client must quote from this rather than hardcoding a rate.",
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
    let feePercentage = 0;
    try {
        const cacheManager = cache_1.CacheManager.getInstance();
        const isFiatEnabled = await cacheManager.getSettingBool("fiatWallets", true);
        const isSpotEnabled = await cacheManager.getSettingBool("spotWallets", true);
        feePercentage = (0, utils_1.getTransferFeePercentage)(await cacheManager.getSettings());
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
    return { types, feePercentage };
};
