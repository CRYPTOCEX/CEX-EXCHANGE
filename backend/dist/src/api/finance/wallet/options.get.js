"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const cache_1 = require("@b/utils/cache");
exports.metadata = {
    summary: "Get wallet types",
    operationId: "getWalletTypes",
    tags: ["Admin", "Wallets"],
    responses: {
        200: {
            description: "Wallet types",
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
                                        value: { type: "string" },
                                        label: { type: "string" },
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
    const type = [{ id: "FIAT", name: "Fiat" }];
    const cacheManager = cache_1.CacheManager.getInstance();
    const spotWalletsEnabled = await cacheManager.getSetting("spotWallets");
    const isSpotEnabled = spotWalletsEnabled === true || spotWalletsEnabled === "true";
    const exchangeEnabled = await db_1.models.exchange.findOne({
        where: { status: true },
    });
    if (exchangeEnabled && isSpotEnabled) {
        type.push({ id: "SPOT", name: "Spot" });
    }
    const extensions = await cacheManager.getExtensions();
    if (extensions.has("ecosystem")) {
        type.push({ id: "ECO", name: "Funding" });
    }
    return type;
};
