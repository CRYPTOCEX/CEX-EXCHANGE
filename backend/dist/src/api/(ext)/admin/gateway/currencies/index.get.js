"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const cache_1 = require("@b/utils/cache");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "List available gateway currencies",
    description: "Retrieves available wallet types (FIAT, SPOT, ECO) and their supported currencies for gateway payment configuration. Returns currencies filtered by enabled wallet types in system settings.",
    operationId: "listGatewayCurrencies",
    tags: ["Admin", "Gateway", "Currencies"],
    responses: {
        200: {
            description: "Available wallet types and currencies",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            walletTypes: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        value: { type: "string", description: "Wallet type code (FIAT, SPOT, ECO)" },
                                        label: { type: "string", description: "Display label" },
                                        enabled: { type: "boolean", description: "Whether this wallet type is enabled" },
                                        currencies: {
                                            type: "array",
                                            items: {
                                                type: "object",
                                                properties: {
                                                    value: { type: "string", description: "Currency code" },
                                                    label: { type: "string", description: "Currency display label" },
                                                    icon: { type: "string", description: "Currency icon/symbol" },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                            systemSettings: {
                                type: "object",
                                properties: {
                                    kycEnabled: { type: "boolean", description: "Whether KYC is enabled" },
                                },
                            },
                        },
                    },
                },
            },
        },
        401: errors_1.unauthorizedResponse,
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "view.gateway.settings",
    logModule: "ADMIN_GATEWAY",
    logTitle: "Get gateway currencies",
};
exports.default = async (data) => {
    const { ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching system configuration");
    const cacheManager = cache_1.CacheManager.getInstance();
    const extensions = await cacheManager.getExtensions();
    const spotWalletsEnabled = await cacheManager.getSetting("spotWallets");
    const fiatWalletsEnabled = await cacheManager.getSetting("fiatWallets");
    const isSpotEnabled = spotWalletsEnabled === true || spotWalletsEnabled === "true";
    const isFiatEnabled = fiatWalletsEnabled === true || fiatWalletsEnabled === "true";
    const isEcosystemEnabled = extensions.has("ecosystem");
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Loading available currencies by wallet type");
    const walletTypes = [];
    if (isFiatEnabled) {
        const fiatCurrencies = await db_1.models.currency.findAll({
            where: { status: true },
            attributes: ["id", "name", "symbol"],
            order: [["id", "ASC"]],
        });
        walletTypes.push({
            value: "FIAT",
            label: "Fiat",
            enabled: true,
            currencies: fiatCurrencies.map((c) => ({
                value: c.id,
                label: `${c.id} - ${c.name}`,
                icon: c.symbol,
            })),
        });
    }
    if (isSpotEnabled) {
        const spotCurrencies = await db_1.models.exchangeCurrency.findAll({
            where: { status: true },
            attributes: ["currency", "name"],
            order: [["currency", "ASC"]],
        });
        walletTypes.push({
            value: "SPOT",
            label: "Spot",
            enabled: true,
            currencies: spotCurrencies.map((c) => ({
                value: c.currency,
                label: `${c.currency} - ${c.name}`,
            })),
        });
    }
    if (isEcosystemEnabled) {
        const ecoCurrencies = await db_1.models.ecosystemToken.findAll({
            where: { status: true },
            attributes: ["currency", "name", "icon"],
            order: [["currency", "ASC"]],
        });
        const seen = new Set();
        const uniqueEcoCurrencies = ecoCurrencies.filter((c) => {
            const duplicate = seen.has(c.currency);
            seen.add(c.currency);
            return !duplicate;
        });
        walletTypes.push({
            value: "ECO",
            label: "Ecosystem",
            enabled: true,
            currencies: uniqueEcoCurrencies.map((c) => ({
                value: c.currency,
                label: `${c.currency} - ${c.name}`,
                icon: c.icon,
            })),
        });
    }
    const kycEnabled = await cacheManager.getSetting("kycStatus");
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${walletTypes.length} wallet types with currencies`);
    return {
        walletTypes,
        systemSettings: {
            kycEnabled: kycEnabled === true || kycEnabled === "true",
        },
    };
};
