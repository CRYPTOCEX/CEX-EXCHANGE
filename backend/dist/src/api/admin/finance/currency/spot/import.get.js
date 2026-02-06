"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const exchange_1 = __importDefault(require("@b/utils/exchange"));
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const utils_1 = require("../../exchange/utils");
const sequelize_1 = require("sequelize");
const cron_1 = require("@b/cron");
const console_1 = require("@b/utils/console");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Import Exchange Currencies",
    operationId: "importCurrencies",
    tags: ["Admin", "Settings", "Exchange"],
    description: "Imports currencies from the specified exchange, processes their data, and saves them to the database.",
    requiresAuth: true,
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
exports.default = async (data) => {
    const { ctx } = data;
    const exchange = await exchange_1.default.startExchange(ctx);
    const provider = await exchange_1.default.getProvider();
    if (!exchange) {
        throw (0, error_1.createError)({ statusCode: 503, message: `Failed to start exchange provider: ${provider}` });
    }
    await exchange.loadMarkets();
    const currencies = exchange.currencies;
    const transformedCurrencies = {};
    Object.values(currencies).forEach((currency) => {
        let standardizedNetworks;
        if (provider === "binance") {
            standardizedNetworks = (0, utils_1.standardizeBinanceData)(currency.networks || {});
        }
        else if (provider === "kucoin") {
            standardizedNetworks = (0, utils_1.standardizeKucoinData)(currency);
        }
        else if (provider === "okx") {
            standardizedNetworks = (0, utils_1.standardizeOkxData)(currency.networks || {});
        }
        else if (provider === "xt") {
            standardizedNetworks = (0, utils_1.standardizeXtData)(currency);
        }
        if (currency["precision"]) {
            transformedCurrencies[currency["code"]] = {
                currency: currency["code"],
                name: currency["name"] || currency["code"],
                precision: parseInt(currency["precision"]),
                status: currency["active"],
                deposit: currency["deposit"],
                withdraw: currency["withdraw"],
                fee: currency["fee"],
                chains: standardizedNetworks,
            };
        }
    });
    const newCurrencyCodes = Object.keys(transformedCurrencies);
    const existingCurrencies = await db_1.models.exchangeCurrency.findAll({
        attributes: ["currency"],
    });
    const existingCurrencyCodes = new Set(existingCurrencies.map((c) => c.currency));
    const currenciesToDelete = [...existingCurrencyCodes].filter((code) => !newCurrencyCodes.includes(code));
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
    return {
        message: "Exchange currencies imported and saved successfully!",
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
            const fee = currencyData.fee !== undefined && currencyData.fee !== null
                ? Number(currencyData.fee)
                : 0;
            if (isNaN(fee)) {
                continue;
            }
            if (!existingCurrencyCodes.has(currencyCode)) {
                await db_1.models.exchangeCurrency.create({
                    currency: currencyData.currency,
                    name: currencyData.name || currencyData.currency,
                    precision: currencyData.precision,
                    status: false,
                    fee: fee,
                }, { transaction });
            }
            else {
                await db_1.models.exchangeCurrency.update({
                    name: currencyData.name || currencyData.currency,
                    precision: currencyData.precision,
                    status: false,
                    fee: fee,
                }, { where: { currency: currencyCode }, transaction });
            }
        }
        catch (error) {
            continue;
        }
    }
}
