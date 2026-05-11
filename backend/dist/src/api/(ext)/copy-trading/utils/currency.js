"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPriceInUSDT = getPriceInUSDT;
exports.getPairPrice = getPairPrice;
exports.convertToUSDT = convertToUSDT;
exports.convertFromUSDT = convertFromUSDT;
exports.convertCurrency = convertCurrency;
exports.sumToUSDT = sumToUSDT;
exports.calculateProfitInUSDT = calculateProfitInUSDT;
exports.parseSymbol = parseSymbol;
exports.getQuoteCurrency = getQuoteCurrency;
exports.getBaseCurrency = getBaseCurrency;
exports.getTradeCurrency = getTradeCurrency;
exports.getCurrencySymbol = getCurrencySymbol;
exports.formatCurrencyAmount = formatCurrencyAmount;
exports.validateMinimumAmount = validateMinimumAmount;
exports.getPricesInUSDT = getPricesInUSDT;
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const redis_1 = require("@b/utils/redis");
const redis = redis_1.RedisSingleton.getInstance();
const PRICE_CACHE_TTL = 60;
const PRICE_CACHE_PREFIX = "copy_trading:price:";
async function getMatchingEngine() {
    try {
        const module = await Promise.resolve().then(() => __importStar(require("@b/api/(ext)/ecosystem/utils/matchingEngine")));
        return module.MatchingEngine.getInstance();
    }
    catch (error) {
        console_1.logger.error("COPY_TRADING", "Failed to load matching engine", error);
        return null;
    }
}
async function getPriceInUSDT(currency) {
    if (currency === "USDT" || currency === "USD") {
        return 1;
    }
    const cacheKey = `${PRICE_CACHE_PREFIX}${currency}`;
    try {
        const cached = await redis.get(cacheKey);
        if (cached) {
            const price = parseFloat(cached);
            if (!isNaN(price) && price > 0) {
                return price;
            }
        }
    }
    catch (error) {
        console_1.logger.warn("COPY_TRADING", `Cache read failed for ${currency} price`, error);
    }
    const engine = await getMatchingEngine();
    if (!engine) {
        throw (0, error_1.createError)({ statusCode: 503, message: `Unable to get price for ${currency}: Matching engine unavailable` });
    }
    try {
        const symbol = `${currency}/USDT`;
        const ticker = await engine.getTicker(symbol);
        const price = ticker === null || ticker === void 0 ? void 0 : ticker.last;
        if (price === null || price === undefined || isNaN(price)) {
            throw (0, error_1.createError)({ statusCode: 500, message: `Invalid price data for ${symbol}` });
        }
        try {
            await redis.set(cacheKey, price.toString(), "EX", PRICE_CACHE_TTL);
        }
        catch (error) {
            console_1.logger.warn("COPY_TRADING", `Cache write failed for ${currency} price`, error);
        }
        return price;
    }
    catch (error) {
        console_1.logger.error("COPY_TRADING", `Error fetching price for ${currency}/USDT`, error);
        throw (0, error_1.createError)({ statusCode: 500, message: `Unable to get price for ${currency}: ${error.message}` });
    }
}
async function getPairPrice(symbol) {
    const engine = await getMatchingEngine();
    if (!engine) {
        throw (0, error_1.createError)({ statusCode: 503, message: `Unable to get price for ${symbol}: Matching engine unavailable` });
    }
    try {
        const ticker = await engine.getTicker(symbol);
        const price = ticker === null || ticker === void 0 ? void 0 : ticker.last;
        if (price === null || price === undefined || isNaN(price)) {
            throw (0, error_1.createError)({ statusCode: 500, message: `Invalid price data for ${symbol}` });
        }
        return price;
    }
    catch (error) {
        console_1.logger.error("COPY_TRADING", `Error fetching price for ${symbol}`, error);
        throw (0, error_1.createError)({ statusCode: 500, message: `Unable to get price for ${symbol}: ${error.message}` });
    }
}
async function convertToUSDT(amount, fromCurrency) {
    if (fromCurrency === "USDT" || fromCurrency === "USD") {
        return amount;
    }
    const priceInUSDT = await getPriceInUSDT(fromCurrency);
    return amount * priceInUSDT;
}
async function convertFromUSDT(amountUSDT, toCurrency) {
    if (toCurrency === "USDT" || toCurrency === "USD") {
        return amountUSDT;
    }
    const priceInUSDT = await getPriceInUSDT(toCurrency);
    if (priceInUSDT === 0) {
        throw (0, error_1.createError)({ statusCode: 400, message: `Cannot convert to ${toCurrency}: price is 0` });
    }
    return amountUSDT / priceInUSDT;
}
async function convertCurrency(amount, fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) {
        return amount;
    }
    const amountInUSDT = await convertToUSDT(amount, fromCurrency);
    return await convertFromUSDT(amountInUSDT, toCurrency);
}
async function sumToUSDT(amounts) {
    let total = 0;
    for (const { amount, currency } of amounts) {
        const usdtAmount = await convertToUSDT(amount, currency);
        total += usdtAmount;
    }
    return total;
}
async function calculateProfitInUSDT(profit, profitCurrency) {
    return await convertToUSDT(profit, profitCurrency);
}
function parseSymbol(symbol) {
    const parts = symbol.split("/");
    if (parts.length !== 2) {
        throw (0, error_1.createError)({ statusCode: 400, message: `Invalid symbol format: ${symbol}` });
    }
    return {
        base: parts[0],
        quote: parts[1],
    };
}
function getQuoteCurrency(symbol) {
    return parseSymbol(symbol).quote;
}
function getBaseCurrency(symbol) {
    return parseSymbol(symbol).base;
}
function getTradeCurrency(symbol, side) {
    const { base, quote } = parseSymbol(symbol);
    if (side === "BUY") {
        return { spend: quote, receive: base };
    }
    else {
        return { spend: base, receive: quote };
    }
}
const CURRENCY_SYMBOLS = {
    USD: "$",
    USDT: "$",
    USDC: "$",
    EUR: "\u20AC",
    GBP: "\u00A3",
    JPY: "\u00A5",
    BTC: "\u20BF",
    ETH: "\u039E",
};
function getCurrencySymbol(currency) {
    return CURRENCY_SYMBOLS[currency] || currency;
}
function formatCurrencyAmount(amount, currency, decimals = 2) {
    const symbol = getCurrencySymbol(currency);
    const formattedAmount = amount.toFixed(decimals);
    if (["USD", "USDT", "USDC", "EUR", "GBP", "JPY"].includes(currency)) {
        return `${symbol}${formattedAmount}`;
    }
    return `${formattedAmount} ${currency}`;
}
async function validateMinimumAmount(amount, amountCurrency, minimumUSDT) {
    const amountInUSDT = await convertToUSDT(amount, amountCurrency);
    if (amountInUSDT < minimumUSDT) {
        return {
            valid: false,
            amountUSDT: amountInUSDT,
            message: `Amount ${formatCurrencyAmount(amount, amountCurrency)} (~${formatCurrencyAmount(amountInUSDT, "USDT")}) is below minimum ${formatCurrencyAmount(minimumUSDT, "USDT")}`,
        };
    }
    return { valid: true, amountUSDT: amountInUSDT };
}
async function getPricesInUSDT(currencies) {
    const prices = {};
    for (const currency of currencies) {
        try {
            prices[currency] = await getPriceInUSDT(currency);
        }
        catch (error) {
            console_1.logger.warn("COPY_TRADING", `Failed to get price for ${currency}`, error);
            prices[currency] = 0;
        }
    }
    return prices;
}
