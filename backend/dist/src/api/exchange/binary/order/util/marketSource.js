"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveBinaryMarket = resolveBinaryMarket;
exports.getBinaryMarketPrice = getBinaryMarketPrice;
exports.getBinarySettlementPrice = getBinarySettlementPrice;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const safe_imports_1 = require("@b/utils/safe-imports");
const utils_1 = require("../utils");
const DEFAULT_MIN_AMOUNT = 1;
const DEFAULT_MAX_AMOUNT = 100000;
async function resolveBinaryMarket(currency, pair) {
    var _a;
    const symbol = `${currency}/${pair}`;
    const binaryMarket = await db_1.models.binaryMarket.findOne({
        where: { currency, pair },
    });
    if (!binaryMarket) {
        throw (0, error_1.createError)({
            statusCode: 404,
            message: `Binary market ${symbol} not found`,
        });
    }
    if (binaryMarket.status === false) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Binary market ${symbol} is disabled`,
        });
    }
    const declaredSource = binaryMarket.source === "ECOSYSTEM" ? "ECOSYSTEM" : "EXCHANGE";
    if (declaredSource === "ECOSYSTEM") {
        const ecosystemMarket = await ((_a = db_1.models.ecosystemMarket) === null || _a === void 0 ? void 0 : _a.findOne({
            where: { currency, pair },
        }));
        if (!ecosystemMarket) {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: `Ecosystem market ${symbol} not found`,
            });
        }
        return {
            source: "ECOSYSTEM",
            symbol,
            minAmount: numberOr(binaryMarket.minAmount, DEFAULT_MIN_AMOUNT),
            maxAmount: numberOr(binaryMarket.maxAmount, DEFAULT_MAX_AMOUNT),
        };
    }
    const exchangeMarket = await db_1.models.exchangeMarket.findOne({
        where: { currency, pair },
    });
    if (!exchangeMarket || !exchangeMarket.metadata) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Market data not found" });
    }
    return {
        source: "EXCHANGE",
        symbol,
        minAmount: numberOr(binaryMarket.minAmount, DEFAULT_MIN_AMOUNT),
        maxAmount: numberOr(binaryMarket.maxAmount, DEFAULT_MAX_AMOUNT),
    };
}
async function getBinaryMarketPrice(currency, pair, source) {
    const symbol = `${currency}/${pair}`;
    const resolvedSource = source !== null && source !== void 0 ? source : (await resolveBinaryMarket(currency, pair)).source;
    if (resolvedSource === "ECOSYSTEM") {
        const price = await (0, safe_imports_1.getEcosystemMarketPrice)(symbol);
        if (price == null || !Number.isFinite(price) || price <= 0) {
            throw (0, error_1.createError)({
                statusCode: 503,
                message: `Price unavailable for ${symbol}. The market maker for this market is not running.`,
            });
        }
        return price;
    }
    const exchange = await (0, utils_1.ensureExchange)();
    const ticker = await exchange.fetchTicker(symbol);
    const price = ticker === null || ticker === void 0 ? void 0 : ticker.last;
    if (price == null || !Number.isFinite(price) || price <= 0) {
        throw (0, error_1.createError)({
            statusCode: 503,
            message: `Price unavailable for ${symbol}.`,
        });
    }
    return price;
}
async function getBinarySettlementPrice(currency, pair, expiryMs, source) {
    const symbol = `${currency}/${pair}`;
    if (source === "ECOSYSTEM") {
        const atExpiry = await (0, safe_imports_1.getEcosystemCandleClose)(symbol, expiryMs);
        if (atExpiry != null && Number.isFinite(atExpiry) && atExpiry > 0) {
            return atExpiry;
        }
    }
    return getBinaryMarketPrice(currency, pair, source);
}
function numberOr(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : fallback;
}
