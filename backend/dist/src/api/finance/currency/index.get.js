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
const token_network_1 = require("@b/utils/token-network");
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
                        oneOf: [
                            { type: "array", items: { type: "object", required: ["value", "label"], properties: { value: { type: "string" }, label: { type: "string" } } } },
                            { type: "object", required: ["from", "to"], properties: {
                                from: { type: "array", items: { type: "object", properties: { value: { type: "string" }, label: { type: "string" } } } },
                                to: { type: "array", items: { type: "object", properties: { value: { type: "string" }, label: { type: "string" } } } },
                            } },
                        ],
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
    const extensions = await cacheManager.getExtensions();
    const isSpotEnabled = await cacheManager.getSettingBool("spotWallets", true);
    const isFiatEnabled = await cacheManager.getSettingBool("fiatWallets", true);
    const isEcosystemEnabled = extensions.has("ecosystem");
    if (!isSpotEnabled && (walletType === "SPOT" || targetWalletType === "SPOT")) {
        ctx === null || ctx === void 0 ? void 0 : ctx.warn("SPOT wallets are disabled");
        return action === "transfer" ? { from: [], to: [] } : [];
    }
    if (!isFiatEnabled && (walletType === "FIAT" || targetWalletType === "FIAT")) {
        ctx === null || ctx === void 0 ? void 0 : ctx.warn("FIAT wallets are disabled");
        return action === "transfer" ? { from: [], to: [] } : [];
    }
    if (!isEcosystemEnabled && (walletType === "ECO" || targetWalletType === "ECO")) {
        ctx === null || ctx === void 0 ? void 0 : ctx.warn("Ecosystem extension is not enabled");
        return action === "transfer" ? { from: [], to: [] } : [];
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
                .map((currency) => { var _a, _b; return ({
                value: currency.currency,
                label: `${currency.currency} - ${currency.name}`,
                fee: (_a = currency.fee) !== null && _a !== void 0 ? _a : 0,
                precision: (_b = currency.precision) !== null && _b !== void 0 ? _b : 8,
            }); })
                .sort((a, b) => a.label.localeCompare(b.label));
            ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${spotResult.length} SPOT currencies for deposit`);
            return spotResult;
        case "ECO":
        case "FUTURES": {
            const catalogue = await (0, token_network_1.loadChainNetworkCatalogue)();
            const depositable = currencies.filter((token) => (0, token_network_1.tokenNetworkMatchesEnv)(token, catalogue));
            if (depositable.length < currencies.length) {
                const dropped = currencies.filter((token) => !(0, token_network_1.tokenNetworkMatchesEnv)(token, catalogue));
                console_1.logger.warn("CURRENCY", `Excluding ${dropped.length} ecosystem token(s) from the deposit currency list — ${(0, token_network_1.describeTokenNetworkMismatch)(dropped, catalogue)}`);
            }
            currencies = depositable;
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
        attributes: ["id", "userId", "type", "currency", "balance"],
    });
    if (!wallets.length) {
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`No ${walletType} wallets with a balance to withdraw from`);
        return [];
    }
    const normalise = (code) => String(code !== null && code !== void 0 ? code : "").trim().toUpperCase();
    const codes = [...new Set(wallets.map((wallet) => wallet.currency))];
    const activeCurrencies = new Set();
    const spotFees = new Map();
    try {
        switch (walletType) {
            case "FIAT": {
                const rows = await db_1.models.currency.findAll({
                    where: { id: codes, status: true },
                    attributes: ["id"],
                    raw: true,
                });
                for (const row of rows)
                    activeCurrencies.add(normalise(row.id));
                break;
            }
            case "SPOT": {
                const rows = await db_1.models.exchangeCurrency.findAll({
                    where: { currency: codes, status: true },
                    attributes: ["currency", "fee", "precision"],
                    raw: true,
                });
                for (const row of rows) {
                    activeCurrencies.add(normalise(row.currency));
                    const fee = Number(row.fee);
                    const precision = Number(row.precision);
                    spotFees.set(normalise(row.currency), {
                        fee: Number.isFinite(fee) ? fee : 0,
                        precision: Number.isFinite(precision) ? precision : 8,
                    });
                }
                break;
            }
            case "ECO":
            case "FUTURES": {
                const rows = await db_1.models.ecosystemToken.findAll({
                    where: { currency: codes, status: true },
                    attributes: ["currency"],
                    raw: true,
                });
                for (const row of rows)
                    activeCurrencies.add(normalise(row.currency));
                break;
            }
            default:
                break;
        }
    }
    catch (err) {
        console_1.logger.warn("WALLET", `Error checking currency status for ${walletType} wallets`, err);
        ctx === null || ctx === void 0 ? void 0 : ctx.warn(`Error checking currency status for ${walletType} wallets`);
    }
    const validWallets = wallets.filter((wallet) => activeCurrencies.has(normalise(wallet.currency)));
    if (!validWallets.length) {
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`No active ${walletType} currencies available for withdrawal`);
        return [];
    }
    const currencies = validWallets
        .map((wallet) => {
        const row = {
            value: wallet.currency,
            label: `${wallet.currency} - ${wallet.balance}`,
            balance: wallet.balance,
        };
        const spot = spotFees.get(normalise(wallet.currency));
        return spot ? { ...row, fee: spot.fee, precision: spot.precision } : row;
    })
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
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`No ${walletType} wallets with a balance to transfer from`);
        return { from: [], to: [] };
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
                    .map((currency) => { var _a, _b; return ({
                    value: currency.currency,
                    label: `${currency.currency} - ${currency.name}`,
                    fee: (_a = currency.fee) !== null && _a !== void 0 ? _a : 0,
                    precision: (_b = currency.precision) !== null && _b !== void 0 ? _b : 8,
                }); })
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
