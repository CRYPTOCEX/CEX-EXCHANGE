"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.normalizeCcxtPrecision = normalizeCcxtPrecision;
const exchange_1 = __importDefault(require("@b/utils/exchange"));
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const utils_1 = require("../../exchange/utils");
const sequelize_1 = require("sequelize");
const cron_1 = require("@b/cron");
const console_1 = require("@b/utils/console");
const funding = require("@b/utils/exchange-funding");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Import Exchange Currencies",
    operationId: "importCurrencies",
    tags: ["Admin", "Settings", "Exchange"],
    description: "Imports currencies from the specified exchange. Without `confirm=true` this only reports what WOULD change and writes nothing, so the admin can see the delete count before agreeing to it.",
    requiresAuth: true,
    parameters: [
        {
            name: "confirm",
            in: "query",
            description: "Apply the plan. Omitted or false, the endpoint is a dry run and returns the plan only.",
            required: false,
            schema: { type: "boolean" },
        },
    ],
    logModule: "ADMIN_FIN",
    logTitle: "Import spot currencies",
    responses: {
        200: {
            description: "Currencies imported successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Exchange"),
        500: query_1.serverErrorResponse,
    },
    permission: "create.spot.currency",
};
function normalizeCcxtPrecision(raw, mode = 4) {
    return funding.precisionDecimals(raw, mode);
}
function networksForProvider(provider, currency) {
    return (0, utils_1.standardizeCcxtNetworks)(currency.networks || {});
}
exports.default = async (data) => {
    const { ctx, query } = data;
    const confirmed = String(query === null || query === void 0 ? void 0 : query.confirm) === "true";
    const exchange = await exchange_1.default.startExchange(ctx);
    const provider = await exchange_1.default.getProvider();
    if (!exchange) {
        throw (0, error_1.createError)({ statusCode: 503, message: `Failed to start exchange provider: ${provider}` });
    }
    await exchange.loadMarkets();
    const currencies = exchange.currencies;
    const transformedCurrencies = {};
    Object.values(currencies).forEach((currency) => {
        const code = currency["code"] || currency["id"];
        if (!code)
            return;
        const standardizedNetworks = networksForProvider(provider, currency);
        transformedCurrencies[code] = {
            currency: code,
            name: currency["name"] || code,
            precision: normalizeCcxtPrecision(currency["precision"], exchange.precisionMode),
            status: currency["active"],
            deposit: currency["deposit"],
            withdraw: currency["withdraw"],
            fee: currency["fee"],
            chains: standardizedNetworks,
        };
    });
    const newCurrencyCodes = Object.keys(transformedCurrencies);
    if (!newCurrencyCodes.length) throw (0, error_1.createError)({ statusCode: 503, message: "Exchange returned no currencies; refusing to modify the catalog" });
    const existingCurrencies = await db_1.models.exchangeCurrency.findAll({
        attributes: ["currency", "status"],
    });
    const existingCurrencyCodes = new Set(existingCurrencies.map((c) => c.currency));
    const enabledCount = existingCurrencies.filter((c) => c.status).length;
    const currenciesToDelete = [...existingCurrencyCodes].filter((code) => !newCurrencyCodes.includes(code));
    const currenciesToCreate = newCurrencyCodes.filter((code) => !existingCurrencyCodes.has(code));
    const plan = {
        provider,
        toCreate: currenciesToCreate.length,
        toUpdate: newCurrencyCodes.length - currenciesToCreate.length,
        toDelete: currenciesToDelete.length,
        deleteSample: currenciesToDelete.slice(0, 25),
        enabledCount,
    };
    if (!confirmed) {
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Import preview: ${plan.toCreate} new, ${plan.toUpdate} updated, ${plan.toDelete} removed`);
        return {
            dryRun: true,
            message: "Preview only — nothing was written.",
            plan,
        };
    }
    await db_1.sequelize.transaction(async (transaction) => {
        if (currenciesToDelete.length > 0) {
            await db_1.models.exchangeCurrency.destroy({
                where: {
                    currency: { [sequelize_1.Op.in]: currenciesToDelete },
                },
                transaction,
            });
        }
        await saveValidCurrencies(transformedCurrencies, transaction);
    });
    try {
        await (0, cron_1.processCurrenciesPrices)();
    }
    catch (error) {
        console_1.logger.error("CURRENCY", "Error processing currencies prices", error);
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Imported ${plan.toCreate} new, updated ${plan.toUpdate}, removed ${plan.toDelete}`);
    return {
        dryRun: false,
        message: "Exchange currencies imported and saved successfully!",
        plan,
    };
};
async function saveValidCurrencies(transformedCurrencies, transaction) {
    const existingCurrencies = await db_1.models.exchangeCurrency.findAll({
        attributes: ["currency"],
        transaction,
    });
    const existingCurrencyCodes = new Set(existingCurrencies.map((c) => c.currency));
    const currencyCodes = Object.keys(transformedCurrencies);
    for (const currencyCode of currencyCodes) {
        const currencyData = transformedCurrencies[currencyCode];
        try {
            if (!existingCurrencyCodes.has(currencyCode)) {
                await db_1.models.exchangeCurrency.create({
                    currency: currencyData.currency,
                    name: currencyData.name || currencyData.currency,
                    precision: currencyData.precision,
                    status: false,
                    fee: 0,
                }, { transaction });
            }
            else {
                await db_1.models.exchangeCurrency.update({
                    name: currencyData.name || currencyData.currency,
                    precision: currencyData.precision,
                }, { where: { currency: currencyCode }, transaction });
            }
        }
        catch (error) {
            throw error;
        }
    }
}
