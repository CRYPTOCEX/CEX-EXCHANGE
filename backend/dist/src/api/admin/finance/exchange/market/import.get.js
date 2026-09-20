"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const funding = require("@b/utils/exchange-funding");
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
    description: "Imports markets from the specified exchange. Without `confirm=true` this only reports what WOULD change and writes nothing. Delisted markets that still carry OPEN orders are never removed — the funds those orders hold would be stranded.",
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
    logTitle: "Import exchange markets",
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
    const { ctx, query } = data;
    const confirmed = String(query === null || query === void 0 ? void 0 : query.confirm) === "true";
    const exchange = await exchange_1.default.startExchange(ctx);
    const provider = await exchange_1.default.getProvider();
    if (!exchange) {
        throw (0, error_1.createError)({ statusCode: 500, message: `Failed to start exchange provider: ${provider}` });
    }
    await exchange.loadMarkets();
    const markets = exchange.markets;
    const validSymbols = {};
    for (const market of Object.values(markets)) {
        if ((market === null || market === void 0 ? void 0 : market.active) === false)
            continue;
        if ((market === null || market === void 0 ? void 0 : market.spot) !== true && (market === null || market === void 0 ? void 0 : market.type) !== "spot")
            continue;
        const { symbol, precision, limits, taker, maker } = market;
        if (typeof symbol !== "string" || symbol.includes(":"))
            continue;
        validSymbols[symbol] = {
            provider,
            precisionMode: exchange.precisionMode,
            exchangePrecision: precision,
            taker,
            maker,
            precision: {
                price: funding.precisionDecimals(precision && precision.price, exchange.precisionMode),
                amount: funding.precisionDecimals(precision && precision.amount, exchange.precisionMode),
            },
            limits: {
                amount: (limits && limits.amount) || { min: 0, max: null },
                price: (limits && limits.price) || { min: 0, max: null },
                cost: (limits && limits.cost) || { min: 0.0001, max: 9000000 },
                leverage: (limits && limits.leverage) || {},
            },
        };
    }
    const newMarketSymbols = Object.keys(validSymbols);
    if (!newMarketSymbols.length) throw (0, error_1.createError)({ statusCode: 503, message: "Exchange returned no spot markets; refusing to modify the catalog" });
    const existingMarkets = await db_1.models.exchangeMarket.findAll({
        attributes: ["currency", "pair"],
    });
    const existingMarketSymbols = new Set(existingMarkets.map((m) => `${m.currency}/${m.pair}`));
    const delistedSymbols = [...existingMarketSymbols].filter((symbol) => !newMarketSymbols.includes(symbol));
    let symbolsWithOpenOrders = [];
    if (delistedSymbols.length > 0) {
        const openOrders = await db_1.models.exchangeOrder.findAll({
            attributes: ["symbol"],
            where: { symbol: { [sequelize_1.Op.in]: delistedSymbols }, status: "OPEN" },
            group: ["symbol"],
            raw: true,
        });
        symbolsWithOpenOrders = openOrders.map((o) => o.symbol);
    }
    const blocked = new Set(symbolsWithOpenOrders);
    const marketsToDelete = delistedSymbols.filter((s) => !blocked.has(s));
    const retainedOrderCount = marketsToDelete.length > 0
        ? await db_1.models.exchangeOrder.count({
            where: { symbol: { [sequelize_1.Op.in]: marketsToDelete } },
        })
        : 0;
    const plan = {
        provider,
        toCreate: newMarketSymbols.filter((s) => !existingMarketSymbols.has(s))
            .length,
        toDelete: marketsToDelete.length,
        deleteSample: marketsToDelete.slice(0, 25),
        keptForOpenOrders: symbolsWithOpenOrders.length,
        keptSample: symbolsWithOpenOrders.slice(0, 25),
        retainedOrderCount,
    };
    if (!confirmed) {
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Import preview: ${plan.toCreate} new, ${plan.toDelete} removed, ${plan.keptForOpenOrders} kept for open orders`);
        return {
            dryRun: true,
            message: "Preview only — nothing was written.",
            plan,
        };
    }
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
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Imported ${plan.toCreate} new, removed ${plan.toDelete}, retained ${retainedOrderCount} order records`);
    return {
        dryRun: false,
        message: "Exchange markets imported and saved successfully!",
        plan,
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
        if (existingMarketSymbols.has(symbolKey)) {
            await db_1.models.exchangeMarket.update({ metadata: symbolData }, { where: { currency, pair }, transaction });
        } else {
            await db_1.models.exchangeMarket.create({
                currency,
                pair,
                metadata: symbolData,
                status: false,
            }, { transaction });
        }
    }
}
