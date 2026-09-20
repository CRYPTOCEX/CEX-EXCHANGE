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
exports.getCrossWalletRate = exports.indexTickersByBaseAsset = exports.crossMidRate = exports.applyTransferSpread = exports.getPriceInUSDByWalletType = exports.getEcoPriceInUSD = exports.sumInUSD = exports.getUsdRates = exports.getSpotPricesInUSD = exports.getSpotPriceInUSD = exports.getUsdtPriceInUSD = exports.getFiatPriceInUSD = exports.fiatUsdPriceFromStored = exports.baseResponseSchema = exports.baseCurrencySchema = void 0;
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
const fiatUsdPriceFromStored = (stored) => {
    const unitsPerUSD = typeof stored === "number" ? stored : parseFloat(String(stored !== null && stored !== void 0 ? stored : ""));
    if (!Number.isFinite(unitsPerUSD) || unitsPerUSD <= 0)
        return null;
    return 1 / unitsPerUSD;
};
exports.fiatUsdPriceFromStored = fiatUsdPriceFromStored;
const getFiatPriceInUSD = async (currency) => {
    if (currency === "USD") {
        return 1;
    }
    const fiatCurrency = await db_1.models.currency.findOne({
        where: { id: currency, status: true },
    });
    if (!fiatCurrency) {
        throw (0, error_1.createError)(404, `Currency ${currency} not found`);
    }
    const priceUSD = (0, exports.fiatUsdPriceFromStored)(fiatCurrency.price);
    if (priceUSD === null) {
        console_1.logger.warn("CURRENCY", `Invalid price for FIAT currency ${currency}: ${fiatCurrency.price}`);
        throw (0, error_1.createError)(400, `Price not configured for currency ${currency}. Please update the currency rate.`);
    }
    return priceUSD;
};
exports.getFiatPriceInUSD = getFiatPriceInUSD;
const USDT_USD_CANDIDATES = ["USDT/USD", "USDT/USDC"];
const USDT_USD_CACHE_KEY = "currency:usdt-usd-price";
const USDT_USD_CACHE_TTL = 300;
const USDT_USD_SANE_MIN = 0.9;
const USDT_USD_SANE_MAX = 1.1;
const getUsdtPriceInUSD = async (exchange) => {
    var _a;
    try {
        const cached = await redis.get(USDT_USD_CACHE_KEY);
        if (cached !== null && cached !== undefined) {
            const parsed = parseFloat(String(cached));
            if (Number.isFinite(parsed) && parsed > 0)
                return parsed;
        }
    }
    catch (_b) {
    }
    let price = 1;
    try {
        const ex = exchange !== null && exchange !== void 0 ? exchange : (await exchange_1.default.startExchange());
        if (ex) {
            if (!ex.markets || Object.keys(ex.markets).length === 0) {
                await ex.loadMarkets();
            }
            for (const symbol of USDT_USD_CANDIDATES) {
                const market = ex.markets ? ex.markets[symbol] : undefined;
                if (!market || !(market.spot === true || market.type === "spot"))
                    continue;
                const ticker = await ex.fetchTicker(symbol);
                const last = ticker === null || ticker === void 0 ? void 0 : ticker.last;
                if (last === null || last === undefined)
                    continue;
                const candidate = typeof last === "number" ? last : parseFloat(String(last));
                if (!Number.isFinite(candidate) || candidate <= 0)
                    continue;
                if (candidate < USDT_USD_SANE_MIN || candidate > USDT_USD_SANE_MAX) {
                    console_1.logger.warn("CURRENCY", `Ignoring out-of-band USDT quote from ${symbol}: ${candidate} (keeping 1.0)`);
                    continue;
                }
                price = candidate;
                break;
            }
        }
    }
    catch (error) {
        console_1.logger.debug("CURRENCY", `USDT/USD market price unavailable, using peg 1.0: ${(_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : error}`);
        price = 1;
    }
    try {
        await redis.set(USDT_USD_CACHE_KEY, String(price), "EX", USDT_USD_CACHE_TTL);
    }
    catch (_c) {
    }
    return price;
};
exports.getUsdtPriceInUSD = getUsdtPriceInUSD;
const getSpotPriceInUSD = async (currency) => {
    var _a, _b, _c;
    if (currency === "USDT") {
        return await (0, exports.getUsdtPriceInUSD)();
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
        const usdtInUSD = await (0, exports.getUsdtPriceInUSD)(exchange);
        return price * usdtInUSD;
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
const getSpotPricesInUSD = async (currencies) => {
    const prices = new Map();
    const wanted = [...new Set(currencies)].filter(Boolean);
    if (!wanted.length)
        return prices;
    const rows = await db_1.models.exchangeCurrency.findAll({
        where: { currency: wanted },
        attributes: ["currency", "price"],
    });
    if (!rows.length)
        return prices;
    const usdtInUSD = await (0, exports.getUsdtPriceInUSD)();
    for (const row of rows) {
        const price = Number(row.price);
        if (!Number.isFinite(price) || price < 0)
            continue;
        prices.set(row.currency, price * usdtInUSD);
    }
    return prices;
};
exports.getSpotPricesInUSD = getSpotPricesInUSD;
const getUsdRates = async (currencies) => {
    const rates = new Map();
    const wanted = [...new Set(currencies)].filter(Boolean);
    if (!wanted.length)
        return rates;
    if (wanted.includes("USD"))
        rates.set("USD", 1);
    const unresolved = wanted.filter((c) => c !== "USD");
    if (!unresolved.length)
        return rates;
    try {
        const fiatRows = await db_1.models.currency.findAll({
            where: { id: unresolved, status: true },
            attributes: ["id", "price"],
        });
        for (const row of fiatRows) {
            const priceUSD = (0, exports.fiatUsdPriceFromStored)(row.price);
            if (priceUSD !== null)
                rates.set(row.id, priceUSD);
        }
    }
    catch (error) {
        console_1.logger.warn("CURRENCY", `Fiat rate lookup failed: ${error === null || error === void 0 ? void 0 : error.message}`);
    }
    const stillUnresolved = unresolved.filter((c) => !rates.has(c));
    if (!stillUnresolved.length)
        return rates;
    try {
        const spot = await (0, exports.getSpotPricesInUSD)(stillUnresolved);
        for (const [currency, price] of spot)
            rates.set(currency, price);
    }
    catch (error) {
        console_1.logger.warn("CURRENCY", `Spot rate lookup failed: ${error === null || error === void 0 ? void 0 : error.message}`);
    }
    return rates;
};
exports.getUsdRates = getUsdRates;
const sumInUSD = async (byCurrency) => {
    const entries = byCurrency instanceof Map
        ? [...byCurrency.entries()]
        : Object.entries(byCurrency);
    if (!entries.length)
        return { total: 0, unpriced: [] };
    const rates = await (0, exports.getUsdRates)(entries.map(([currency]) => currency));
    let total = 0;
    const unpriced = [];
    for (const [currency, amount] of entries) {
        const value = Number(amount);
        if (!Number.isFinite(value) || value === 0)
            continue;
        const rate = rates.get(currency);
        if (rate === undefined) {
            unpriced.push(currency);
            continue;
        }
        total += value * rate;
    }
    return { total, unpriced };
};
exports.sumInUSD = sumInUSD;
const getEcoPriceInUSD = async (currency) => {
    var _a, _b, _c;
    if (currency === "USDT") {
        return await (0, exports.getUsdtPriceInUSD)();
    }
    const engine = await getMatchingEngine();
    try {
        const symbol = `${currency}/USDT`;
        const ticker = await engine.getTicker(symbol);
        const price = ticker.last;
        if (price === null || price === undefined) {
            throw (0, error_1.createError)({ statusCode: 500, message: "Error fetching ticker data" });
        }
        const usdtInUSD = await (0, exports.getUsdtPriceInUSD)();
        return price * usdtInUSD;
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
const getPriceInUSDByWalletType = async (currency, walletType) => {
    switch (walletType) {
        case "FIAT":
            return await (0, exports.getFiatPriceInUSD)(currency);
        case "SPOT":
            return await (0, exports.getSpotPriceInUSD)(currency);
        case "ECO":
        case "FUTURES":
            return await (0, exports.getEcoPriceInUSD)(currency);
        default:
            throw (0, error_1.createError)(400, `Invalid wallet type: ${walletType}`);
    }
};
exports.getPriceInUSDByWalletType = getPriceInUSDByWalletType;
const rate_math_1 = require("./rate-math");
Object.defineProperty(exports, "applyTransferSpread", { enumerable: true, get: function () { return rate_math_1.applyTransferSpread; } });
Object.defineProperty(exports, "crossMidRate", { enumerable: true, get: function () { return rate_math_1.crossMidRate; } });
var rate_math_2 = require("./rate-math");
Object.defineProperty(exports, "indexTickersByBaseAsset", { enumerable: true, get: function () { return rate_math_2.indexTickersByBaseAsset; } });
const getCrossWalletRate = async (fromCurrency, fromType, toCurrency, toType, spreadPercentage = 0) => {
    const fromPriceUSD = await (0, exports.getPriceInUSDByWalletType)(fromCurrency, fromType);
    const toPriceUSD = await (0, exports.getPriceInUSDByWalletType)(toCurrency, toType);
    if (!fromPriceUSD || isNaN(fromPriceUSD) || fromPriceUSD <= 0) {
        throw (0, error_1.createError)(400, `Price not available for ${fromCurrency} (${fromType})`);
    }
    if (!toPriceUSD || isNaN(toPriceUSD) || toPriceUSD <= 0) {
        throw (0, error_1.createError)(400, `Price not available for ${toCurrency} (${toType})`);
    }
    const midRate = (0, rate_math_1.crossMidRate)(fromPriceUSD, toPriceUSD);
    const clampedSpread = Math.min(Math.max(Number(spreadPercentage) || 0, 0), 100);
    return {
        rate: (0, rate_math_1.applyTransferSpread)(midRate, clampedSpread),
        midRate,
        fromPriceUSD,
        toPriceUSD,
        spreadPercentage: clampedSpread,
    };
};
exports.getCrossWalletRate = getCrossWalletRate;
