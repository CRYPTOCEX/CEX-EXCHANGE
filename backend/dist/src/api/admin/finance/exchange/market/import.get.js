"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const exchange_1 = __importDefault(require("@b/utils/exchange"));
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Import Exchange Markets",
    operationId: "importMarkets",
    tags: ["Admin", "Settings", "Exchange"],
    description: "Imports markets from the specified exchange, processes their data, and saves them to the database.",
    requiresAuth: true,
    responses: {
        200: {
            description: "Markets imported successfully",
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
    permission: "create.exchange.market",
};
exports.default = async (data) => {
    const { ctx } = data;
    const exchange = await exchange_1.default.startExchange(ctx);
    const provider = await exchange_1.default.getProvider();
    if (!exchange) {
        throw (0, error_1.createError)({ statusCode: 500, message: `Failed to start exchange provider: ${provider}` });
    }
    await exchange.loadMarkets();
    const markets = exchange.markets;
    const validSymbols = {};
    for (const market of Object.values(markets)) {
        if (market.active && market.precision.price && market.precision.amount) {
            if (provider &&
                ["binance", "xt"].includes(provider) &&
                market.type !== "spot") {
                continue;
            }
            const { symbol, precision, limits, taker, maker } = market;
            validSymbols[symbol] = {
                taker,
                maker,
                precision: {
                    price: (0, utils_1.countDecimals)(precision.price),
                    amount: (0, utils_1.countDecimals)(precision.amount),
                },
                limits: {
                    amount: limits.amount || { min: 0, max: null },
                    price: limits.price || { min: 0, max: null },
                    cost: limits.cost || { min: 0.0001, max: 9000000 },
                    leverage: limits.leverage || {},
                },
            };
        }
    }
    const newMarketSymbols = Object.keys(validSymbols);
    const existingMarkets = await db_1.models.exchangeMarket.findAll({
        attributes: ["currency", "pair"],
    });
    const existingMarketSymbols = new Set(existingMarkets.map((m) => `${m.currency}/${m.pair}`));
    const marketsToDelete = [...existingMarketSymbols].filter((symbol) => !newMarketSymbols.includes(symbol));
    await db_1.sequelize.transaction(async (transaction) => {
        if (marketsToDelete.length > 0) {
            await db_1.models.exchangeMarket.destroy({
                where: {
                    [sequelize_1.Op.or]: marketsToDelete.map((symbol) => {
                        const [currency, pair] = symbol.split("/");
                        return { currency, pair };
                    }),
                },
                transaction,
            });
            await db_1.models.exchangeOrder.destroy({
                where: {
                    symbol: {
                        [sequelize_1.Op.in]: marketsToDelete,
                    },
                },
                transaction,
            });
            await db_1.models.exchangeWatchlist.destroy({
                where: {
                    symbol: {
                        [sequelize_1.Op.in]: marketsToDelete,
                    },
                },
                transaction,
            });
        }
        await saveValidMarkets(validSymbols, transaction);
    });
    return {
        message: "Exchange markets imported and saved successfully!",
    };
};
async function saveValidMarkets(validSymbols, transaction) {
    const existingMarkets = await db_1.models.exchangeMarket.findAll({
        attributes: ["currency", "pair"],
        transaction,
    });
    const existingMarketSymbols = new Set(existingMarkets.map((m) => `${m.currency}/${m.pair}`));
    for (const symbolKey of Object.keys(validSymbols)) {
        const symbolData = validSymbols[symbolKey];
        const [currency, pair] = symbolKey.split("/");
        if (!existingMarketSymbols.has(symbolKey)) {
            await db_1.models.exchangeMarket.create({
                currency,
                pair,
                metadata: symbolData,
                status: false,
            }, { transaction });
        }
    }
}
