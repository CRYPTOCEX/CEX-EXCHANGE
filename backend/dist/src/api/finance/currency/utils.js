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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEcoPriceInUSD = exports.getSpotPriceInUSD = exports.getFiatPriceInUSD = exports.baseResponseSchema = exports.baseCurrencySchema = void 0;
exports.cacheCurrencies = cacheCurrencies;
exports.updateCurrencyRates = updateCurrencyRates;
exports.findCurrencyById = findCurrencyById;
exports.getCurrencies = getCurrencies;
const db_1 = require("@b/db");
const exchange_1 = __importDefault(require("@b/utils/exchange"));
const utils_1 = require("@b/api/exchange/utils");
const console_1 = require("@b/utils/console");
async function getMatchingEngine() {
    try {
        const module = await Promise.resolve().then(() => __importStar(require("@b/api/(ext)/ecosystem/utils/matchingEngine")));
        return module.MatchingEngine.getInstance();
    }
    catch (error) {
        return {
            getTicker: async (symbol) => ({ last: 0 })
        };
    }
}
const redis_1 = require("@b/utils/redis");
const schema_1 = require("@b/utils/schema");
const lodash_1 = require("lodash");
const error_1 = require("@b/utils/error");
const redis = redis_1.RedisSingleton.getInstance();
exports.baseCurrencySchema = {
    id: (0, schema_1.baseNumberSchema)("ID of the currency"),
    name: (0, schema_1.baseStringSchema)("Currency name"),
    symbol: (0, schema_1.baseStringSchema)("Currency symbol"),
    precision: (0, schema_1.baseNumberSchema)("Currency precision"),
    price: (0, schema_1.baseNumberSchema)("Currency price"),
    status: (0, schema_1.baseBooleanSchema)("Currency status"),
};
exports.baseResponseSchema = {
    status: (0, schema_1.baseBooleanSchema)("Indicates if the request was successful"),
    statusCode: (0, schema_1.baseNumberSchema)("HTTP status code"),
    data: (0, schema_1.baseObjectSchema)("Detailed data response"),
};
async function cacheCurrencies() {
    try {
        const currencies = await getCurrencies();
        await redis.set("currencies", JSON.stringify(currencies), "EX", 300);
    }
    catch (error) {
        console_1.logger.error("CURRENCY", "Error caching currencies", error);
    }
}
cacheCurrencies();
async function updateCurrencyRates(rates) {
    await db_1.sequelize.transaction(async (transaction) => {
        const codes = Object.keys(rates);
        codes.forEach((code) => {
            const price = rates[code];
            if (!(0, lodash_1.isNumber)(price) || isNaN(price)) {
                throw (0, error_1.createError)({ statusCode: 400, message: `Invalid price for currency ${code}: ${price}` });
            }
        });
        const updatePromises = codes.map((code) => {
            return db_1.models.currency.update({ price: rates[code] }, { where: { id: code }, transaction });
        });
        await Promise.all(updatePromises);
    });
    const updatedCurrencies = await db_1.models.currency.findAll({
        where: { id: Object.keys(rates) },
    });
    return updatedCurrencies.map((currency) => currency.get({ plain: true }));
}
async function findCurrencyById(id) {
    const currency = await db_1.models.currency.findOne({
        where: { id },
    });
    if (!currency)
        throw (0, error_1.createError)({ statusCode: 404, message: "Currency not found" });
    return currency;
}
async function getCurrencies() {
    try {
        const currencies = await db_1.models.currency.findAll({
            where: { status: "true" },
            order: [["id", "ASC"]],
        });
        if (!currencies || !Array.isArray(currencies)) {
            return [];
        }
        return currencies.map((currency) => currency.get({ plain: true }));
    }
    catch (error) {
        return [];
    }
}
const getFiatPriceInUSD = async (currency) => {
    var _a;
    if (currency === "USD") {
        return 1;
    }
    const fiatCurrency = await db_1.models.currency.findOne({
        where: { id: currency, status: true },
    });
    if (!fiatCurrency) {
        throw (0, error_1.createError)(404, `Currency ${currency} not found`);
    }
    const price = typeof fiatCurrency.price === 'number' ? fiatCurrency.price : parseFloat(String((_a = fiatCurrency.price) !== null && _a !== void 0 ? _a : 0));
    if (!price || isNaN(price) || price <= 0) {
        console_1.logger.warn("CURRENCY", `Invalid price for FIAT currency ${currency}: ${fiatCurrency.price}`);
        throw (0, error_1.createError)(400, `Price not configured for currency ${currency}. Please update the currency rate.`);
    }
    return price;
};
exports.getFiatPriceInUSD = getFiatPriceInUSD;
const getSpotPriceInUSD = async (currency) => {
    var _a, _b, _c;
    if (currency === "USDT") {
        return 1;
    }
    const exchange = await exchange_1.default.startExchange();
    if (!exchange) {
        throw (0, error_1.createError)(503, "Service temporarily unavailable. Please try again later.");
    }
    try {
        const unblockTime = await (0, utils_1.loadBanStatus)();
        if (await (0, utils_1.handleBanStatus)(unblockTime)) {
            throw (0, error_1.createError)(503, "Service temporarily unavailable. Please try again later.");
        }
        const symbol = `${currency}/USDT`;
        const ticker = await exchange.fetchTicker(symbol);
        const price = ticker.last;
        if (price === null || price === undefined) {
            throw (0, error_1.createError)({ statusCode: 500, message: "Error fetching ticker data" });
        }
        return price;
    }
    catch (error) {
        if (error.statusCode === 503) {
            throw error;
        }
        const isMarketNotFound = ((_a = error.message) === null || _a === void 0 ? void 0 : _a.includes("market")) ||
            ((_b = error.message) === null || _b === void 0 ? void 0 : _b.includes("symbol")) ||
            ((_c = error.message) === null || _c === void 0 ? void 0 : _c.includes("not found"));
        if (!isMarketNotFound) {
            console_1.logger.error("CURRENCY", `Error fetching spot price for ${currency}`, error);
        }
        throw (0, error_1.createError)({ statusCode: 404, message: `Market data unavailable for ${currency}` });
    }
};
exports.getSpotPriceInUSD = getSpotPriceInUSD;
const getEcoPriceInUSD = async (currency) => {
    var _a, _b, _c;
    if (currency === "USDT") {
        return 1;
    }
    const engine = await getMatchingEngine();
    try {
        const symbol = `${currency}/USDT`;
        const ticker = await engine.getTicker(symbol);
        const price = ticker.last;
        if (price === null || price === undefined) {
            throw (0, error_1.createError)({ statusCode: 500, message: "Error fetching ticker data" });
        }
        return price;
    }
    catch (error) {
        const isMarketNotFound = ((_a = error.message) === null || _a === void 0 ? void 0 : _a.includes("market")) ||
            ((_b = error.message) === null || _b === void 0 ? void 0 : _b.includes("symbol")) ||
            ((_c = error.message) === null || _c === void 0 ? void 0 : _c.includes("not found"));
        if (!isMarketNotFound) {
            console_1.logger.error("CURRENCY", `Error fetching eco price for ${currency}`, error);
        }
        throw (0, error_1.createError)({ statusCode: 404, message: `Market data unavailable for ${currency}` });
    }
};
exports.getEcoPriceInUSD = getEcoPriceInUSD;
