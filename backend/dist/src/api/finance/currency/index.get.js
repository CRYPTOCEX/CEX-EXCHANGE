"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const utils_1 = require("./utils");
const query_1 = require("@b/utils/query");
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const cache_1 = require("@b/utils/cache");
const console_1 = require("@b/utils/console");
exports.metadata = {
    summary: "Lists all currencies with their current rates",
    description: "This endpoint retrieves all available currencies along with their current rates.",
    operationId: "getCurrencies",
    tags: ["Finance", "Currency"],
    logModule: "FINANCE",
    logTitle: "Get currencies by action",
    parameters: [
        {
            name: "action",
            in: "query",
            description: "The action to perform",
            required: false,
            schema: {
                type: "string",
            },
        },
        {
            name: "walletType",
            in: "query",
            description: "The type of wallet to retrieve currencies for",
            required: true,
            schema: {
                type: "string",
                enum: ["FIAT", "SPOT", "ECO", "FUTURES"],
            },
        },
        {
            name: "targetWalletType",
            in: "query",
            description: "The type of wallet to transfer to (optional for transfer action)",
            required: false,
            schema: {
                type: "string",
                enum: ["FIAT", "SPOT", "ECO", "FUTURES"],
            },
        },
    ],
    requiresAuth: true,
    responses: {
        200: {
            description: "Currencies retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            ...utils_1.baseResponseSchema,
                            data: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: utils_1.baseCurrencySchema,
                                },
                            },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Currency"),
        500: query_1.serverErrorResponse,
    },
};
const walletTypeToModel = {
    FIAT: async (where) => db_1.models.currency.findAll({ where }),
    SPOT: async (where) => db_1.models.exchangeCurrency.findAll({ where }),
    ECO: async (where) => db_1.models.ecosystemToken.findAll({ where }),
    FUTURES: async (where) => db_1.models.ecosystemToken.findAll({ where }),
};
exports.default = async (data) => {
    const { user, query, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("User not authenticated");
        throw (0, error_1.createError)(401, "Unauthorized");
    }
    const { action, walletType, targetWalletType } = query;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking wallet configuration");
    const cacheManager = cache_1.CacheManager.getInstance();
    const spotWalletsEnabled = await cacheManager.getSetting("spotWallets");
    const fiatWalletsEnabled = await cacheManager.getSetting("fiatWallets");
    const extensions = await cacheManager.getExtensions();
    const isSpotEnabled = spotWalletsEnabled === true || spotWalletsEnabled === "true";
    const isFiatEnabled = fiatWalletsEnabled === true || fiatWalletsEnabled === "true";
    const isEcosystemEnabled = extensions.has("ecosystem");
    if (!isSpotEnabled && (walletType === "SPOT" || targetWalletType === "SPOT")) {
        ctx === null || ctx === void 0 ? void 0 : ctx.warn("SPOT wallets are disabled");
        return [];
    }
    if (!isFiatEnabled && (walletType === "FIAT" || targetWalletType === "FIAT")) {
        ctx === null || ctx === void 0 ? void 0 : ctx.warn("FIAT wallets are disabled");
        return [];
    }
    if (!isEcosystemEnabled && (walletType === "ECO" || targetWalletType === "ECO")) {
        ctx === null || ctx === void 0 ? void 0 : ctx.warn("Ecosystem extension is not enabled");
        return [];
    }
    const where = { status: true };
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Processing ${action} action for ${walletType} wallet`);
    switch (action) {
        case "deposit":
            return handleDeposit(walletType, where, ctx);
        case "withdraw":
        case "payment":
            return handleWithdraw(walletType, user.id, isSpotEnabled, ctx);
        case "transfer":
            return handleTransfer(walletType, targetWalletType, user.id, isSpotEnabled, ctx);
        default:
            ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Invalid action: ${action}`);
            throw (0, error_1.createError)(400, "Invalid action");
    }
};
async function handleDeposit(walletType, where, ctx) {
    const getModel = walletTypeToModel[walletType];
    if (!getModel) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Invalid wallet type: ${walletType}`);
        throw (0, error_1.createError)(400, "Invalid wallet type");
    }
    let currencies = await getModel(where);
    switch (walletType) {
        case "FIAT":
            const fiatResult = currencies
                .map((currency) => ({
                value: currency.id,
                label: `${currency.id} - ${currency.name}`,
            }))
                .sort((a, b) => a.label.localeCompare(b.label));
            ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${fiatResult.length} FIAT currencies for deposit`);
            return fiatResult;
        case "SPOT":
            const spotResult = currencies
                .map((currency) => ({
                value: currency.currency,
                label: `${currency.currency} - ${currency.name}`,
            }))
                .sort((a, b) => a.label.localeCompare(b.label));
            ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${spotResult.length} SPOT currencies for deposit`);
            return spotResult;
        case "ECO":
        case "FUTURES": {
            const seen = new Set();
            currencies = currencies.filter((currency) => {
                const duplicate = seen.has(currency.currency);
                seen.add(currency.currency);
                return !duplicate;
            });
            const ecoResult = currencies
                .map((currency) => ({
                value: currency.currency,
                label: `${currency.currency} - ${currency.name}`,
                icon: currency.icon,
            }))
                .sort((a, b) => a.label.localeCompare(b.label));
            ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${ecoResult.length} ${walletType} currencies for deposit`);
            return ecoResult;
        }
        default:
            ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Invalid wallet type: ${walletType}`);
            throw (0, error_1.createError)(400, "Invalid wallet type");
    }
}
async function handleWithdraw(walletType, userId, isSpotEnabled = true, ctx) {
    const wallets = await db_1.models.wallet.findAll({
        where: { userId, type: walletType, balance: { [sequelize_1.Op.gt]: 0 } },
    });
    if (!wallets.length) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`No ${walletType} wallets found to withdraw from`);
        throw (0, error_1.createError)(404, `No ${walletType} wallets found to withdraw from`);
    }
    const validWallets = [];
    for (const wallet of wallets) {
        let isValidCurrency = false;
        try {
            switch (walletType) {
                case "FIAT": {
                    const currency = await db_1.models.currency.findOne({
                        where: { id: wallet.currency, status: true }
                    });
                    isValidCurrency = !!currency;
                    break;
                }
                case "SPOT": {
                    const currency = await db_1.models.exchangeCurrency.findOne({
                        where: { currency: wallet.currency, status: true }
                    });
                    isValidCurrency = !!currency;
                    break;
                }
                case "ECO":
                case "FUTURES": {
                    const currency = await db_1.models.ecosystemToken.findOne({
                        where: { currency: wallet.currency, status: true }
                    });
                    isValidCurrency = !!currency;
                    break;
                }
                default:
                    isValidCurrency = false;
            }
            if (isValidCurrency) {
                validWallets.push(wallet);
            }
        }
        catch (err) {
            console_1.logger.warn("WALLET", `Error checking currency status for ${wallet.currency}`, err);
            ctx === null || ctx === void 0 ? void 0 : ctx.warn(`Error checking currency status for ${wallet.currency}`);
        }
    }
    if (!validWallets.length) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`No active ${walletType} currencies available for withdrawal`);
        throw (0, error_1.createError)(404, `No active ${walletType} currencies available for withdrawal`);
    }
    const currencies = validWallets
        .map((wallet) => ({
        value: wallet.currency,
        label: `${wallet.currency} - ${wallet.balance}`,
        balance: wallet.balance,
    }))
        .sort((a, b) => a.label.localeCompare(b.label));
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${currencies.length} ${walletType} currencies for withdrawal`);
    return currencies;
}
async function handleTransfer(walletType, targetWalletType, userId, isSpotEnabled = true, ctx) {
    const validWalletTypes = ["FIAT", "SPOT", "ECO", "FUTURES"];
    if (!validWalletTypes.includes(walletType)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Invalid source wallet type: ${walletType}`);
        throw (0, error_1.createError)(400, `Invalid source wallet type: ${walletType}`);
    }
    const fromWallets = await db_1.models.wallet.findAll({
        where: { userId, type: walletType, balance: { [sequelize_1.Op.gt]: 0 } },
    });
    if (!fromWallets.length) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`No ${walletType} wallets found to transfer from`);
        throw (0, error_1.createError)(404, `No ${walletType} wallets found to transfer from`);
    }
    const currencies = fromWallets
        .map((wallet) => ({
        value: wallet.currency,
        label: `${wallet.currency} - ${wallet.balance}`,
    }))
        .sort((a, b) => a.label.localeCompare(b.label));
    if (!targetWalletType) {
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${currencies.length} source currencies for transfer`);
        return { from: currencies, to: [] };
    }
    if (!validWalletTypes.includes(targetWalletType)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Invalid target wallet type: ${targetWalletType}`);
        throw (0, error_1.createError)(400, `Invalid target wallet type: ${targetWalletType}`);
    }
    let targetCurrencies = [];
    switch (targetWalletType) {
        case "FIAT": {
            const fiatCurrencies = await db_1.models.currency.findAll({
                where: { status: true },
            });
            targetCurrencies = fiatCurrencies
                .map((currency) => ({
                value: currency.id,
                label: `${currency.id} - ${currency.name}`,
            }))
                .sort((a, b) => a.label.localeCompare(b.label));
            break;
        }
        case "SPOT":
            {
                const spotCurrencies = await db_1.models.exchangeCurrency.findAll({
                    where: { status: true },
                });
                targetCurrencies = spotCurrencies
                    .map((currency) => ({
                    value: currency.currency,
                    label: `${currency.currency} - ${currency.name}`,
                }))
                    .sort((a, b) => a.label.localeCompare(b.label));
            }
            break;
        case "ECO":
        case "FUTURES":
            {
                const ecoCurrencies = await db_1.models.ecosystemToken.findAll({
                    where: { status: true },
                });
                targetCurrencies = ecoCurrencies
                    .map((currency) => ({
                    value: currency.currency,
                    label: `${currency.currency} - ${currency.name}`,
                }))
                    .sort((a, b) => a.label.localeCompare(b.label));
            }
            break;
        default:
            ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Invalid wallet type: ${targetWalletType}`);
            throw (0, error_1.createError)(400, "Invalid wallet type");
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${currencies.length} source and ${targetCurrencies.length} target currencies for transfer`);
    return { from: currencies, to: targetCurrencies };
}
