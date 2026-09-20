"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_SYMBOLS_PER_TICK = void 0;
exports.resolveSpotPrices = resolveSpotPrices;
exports.resolveEcoPrices = resolveEcoPrices;
exports.resolveFuturesPrices = resolveFuturesPrices;
exports.resolvePrices = resolvePrices;
exports.resolveOnePrice = resolveOnePrice;
const exchange_1 = __importDefault(require("@b/utils/exchange"));
const redis_1 = require("@b/utils/redis");
const console_1 = require("@b/utils/console");
const utils_1 = require("@b/api/exchange/utils");
const safe_imports_1 = require("@b/utils/safe-imports");
const TICKER_CACHE_KEY = "exchange:tickers";
exports.MAX_SYMBOLS_PER_TICK = 120;
const EMPTY = { prices: new Map() };
async function resolveSpotPrices(symbols) {
    var _a;
    if (!symbols.length)
        return EMPTY;
    const unblockTime = await (0, utils_1.loadBanStatus)();
    if (Date.now() < unblockTime) {
        return { prices: new Map(), note: "exchange rate-limit ban in force" };
    }
    let exchange;
    try {
        exchange = await exchange_1.default.startExchange();
    }
    catch (_b) {
        exchange = null;
    }
    if (!exchange)
        return fallbackToTickerCache(symbols, "exchange unavailable");
    try {
        const { valid, skipped } = await (0, utils_1.filterSpotMarketSymbols)(exchange, symbols);
        if (!valid.length) {
            return {
                prices: new Map(),
                note: `no spot market on the active exchange for ${skipped.join(", ")}`,
            };
        }
        const tickers = await exchange.fetchTickers(valid);
        if (!tickers || typeof tickers !== "object" || Array.isArray(tickers)) {
            throw new Error("Invalid ticker response from exchange");
        }
        const prices = new Map();
        for (const symbol of valid) {
            const last = Number((_a = tickers[symbol]) === null || _a === void 0 ? void 0 : _a.last);
            if (Number.isFinite(last) && last > 0)
                prices.set(symbol, last);
        }
        return {
            prices,
            note: skipped.length ? `skipped non-spot: ${skipped.join(", ")}` : undefined,
        };
    }
    catch (error) {
        try {
            const result = await (0, utils_1.handleExchangeError)(error, exchange_1.default);
            if (typeof result === "number")
                await (0, utils_1.saveBanStatus)(result);
        }
        catch (_c) {
        }
        return fallbackToTickerCache(symbols, (error === null || error === void 0 ? void 0 : error.message) || "fetch failed");
    }
}
async function fallbackToTickerCache(symbols, reason) {
    var _a;
    try {
        const raw = await redis_1.RedisSingleton.getInstance().get(TICKER_CACHE_KEY);
        if (!raw)
            return { prices: new Map(), note: reason };
        const cached = JSON.parse(raw);
        const prices = new Map();
        for (const symbol of symbols) {
            const last = Number((_a = cached === null || cached === void 0 ? void 0 : cached[symbol]) === null || _a === void 0 ? void 0 : _a.last);
            if (Number.isFinite(last) && last > 0)
                prices.set(symbol, last);
        }
        return {
            prices,
            note: `${reason}; used the ticker cache for ${prices.size} symbol(s)`,
        };
    }
    catch (_b) {
        return { prices: new Map(), note: reason };
    }
}
async function resolveEcoPrices(symbols) {
    if (!symbols.length)
        return EMPTY;
    const prices = new Map();
    for (const symbol of symbols) {
        try {
            const price = await (0, safe_imports_1.getEcosystemMarketPrice)(symbol);
            if (typeof price === "number" && Number.isFinite(price) && price > 0) {
                prices.set(symbol, price);
            }
        }
        catch (_a) {
        }
    }
    return { prices };
}
let fairMarkPrice = null;
let futuresMarkChecked = false;
function loadFairMarkPrice() {
    if (futuresMarkChecked)
        return fairMarkPrice;
    futuresMarkChecked = true;
    try {
        const mod = require("@b/api/(ext)/futures/utils/mark-price");
        if (typeof (mod === null || mod === void 0 ? void 0 : mod.fairMarkPrice) === "function")
            fairMarkPrice = mod.fairMarkPrice;
    }
    catch (_a) {
        fairMarkPrice = null;
    }
    return fairMarkPrice;
}
async function resolveFuturesPrices(symbols) {
    if (!symbols.length)
        return EMPTY;
    const mark = loadFairMarkPrice();
    if (!mark) {
        return { prices: new Map(), note: "futures extension not installed" };
    }
    const prices = new Map();
    for (const symbol of symbols) {
        try {
            const price = await mark(symbol);
            if (Number.isFinite(price) && price > 0)
                prices.set(symbol, price);
        }
        catch (_a) {
        }
    }
    return { prices };
}
async function resolvePrices(type, symbols) {
    const capped = symbols.slice(0, exports.MAX_SYMBOLS_PER_TICK);
    const note = symbols.length > capped.length
        ? `capped at ${exports.MAX_SYMBOLS_PER_TICK} of ${symbols.length} symbols`
        : undefined;
    const lookup = type === "ECO"
        ? await resolveEcoPrices(capped)
        : type === "FUTURES"
            ? await resolveFuturesPrices(capped)
            : await resolveSpotPrices(capped);
    if (!note)
        return lookup;
    return {
        prices: lookup.prices,
        note: lookup.note ? `${note}; ${lookup.note}` : note,
    };
}
async function resolveOnePrice(symbol, type) {
    var _a;
    try {
        const { prices } = await resolvePrices(type, [symbol]);
        return (_a = prices.get(symbol)) !== null && _a !== void 0 ? _a : null;
    }
    catch (error) {
        console_1.logger.warn("EXCHANGE", `Could not price ${symbol} (${type}) while arming an alert: ${error === null || error === void 0 ? void 0 : error.message}`);
        return null;
    }
}
