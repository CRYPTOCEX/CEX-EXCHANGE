"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.baseWatchlistItemSchema = exports.baseTickerSchema = exports.baseOrderBookSchema = exports.baseOrderBookEntrySchema = exports.BAN_STATUS_KEY = void 0;
exports.saveBanStatus = saveBanStatus;
exports.loadBanStatus = loadBanStatus;
exports.formatWaitTime = formatWaitTime;
exports.handleBanStatus = handleBanStatus;
exports.extractBanTime = extractBanTime;
exports.handleExchangeError = handleExchangeError;
exports.filterSpotMarketSymbols = filterSpotMarketSymbols;
exports.fetchTickersSafe = fetchTickersSafe;
exports.readTickerPrice = readTickerPrice;
exports.sanitizeErrorMessage = sanitizeErrorMessage;
const schema_1 = require("@b/utils/schema");
const redis_1 = require("@b/utils/redis");
const console_1 = require("@b/utils/console");
const redis = redis_1.RedisSingleton.getInstance();
exports.BAN_STATUS_KEY = "exchange:ban_status";
const MAX_BAN_DURATION_MS = 24 * 60 * 60 * 1000;
function clampBanTime(unblockTime) {
    const now = Date.now();
    const parsed = Number(unblockTime);
    if (!Number.isFinite(parsed) || parsed <= now)
        return null;
    const clamped = Math.min(parsed, now + MAX_BAN_DURATION_MS);
    if (clamped !== parsed) {
        console_1.logger.warn("EXCHANGE", `Exchange reported an unblock time of ${parsed}, ${formatWaitTime(parsed - now)} away; clamping the ban to 24 hours`);
    }
    return clamped;
}
async function saveBanStatus(unblockTime) {
    const clamped = clampBanTime(unblockTime);
    if (clamped === null)
        return;
    await redis.set(exports.BAN_STATUS_KEY, String(clamped), "EX", Math.max(1, Math.ceil((clamped - Date.now()) / 1000)));
}
async function loadBanStatus() {
    const unblockTime = await redis.get(exports.BAN_STATUS_KEY);
    return unblockTime ? parseInt(unblockTime) : 0;
}
function formatWaitTime(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes} minutes and ${seconds} seconds`;
}
async function handleBanStatus(unblockTime) {
    if (Date.now() < unblockTime) {
        const waitTime = unblockTime - Date.now();
        console_1.logger.warn("EXCHANGE", `Exchange is banned for ${formatWaitTime(waitTime)} more`);
        return true;
    }
    return false;
}
function extractBanTime(errorMessage) {
    if (errorMessage.includes("IP banned until")) {
        const match = errorMessage.match(/until (\d+)/);
        if (match) {
            return clampBanTime(parseInt(match[1]));
        }
    }
    return null;
}
async function handleExchangeError(error, ExchangeManager) {
    const banTime = extractBanTime(error.message);
    if (banTime) {
        await saveBanStatus(banTime);
        return banTime;
    }
    await ExchangeManager.stopExchange();
    await new Promise((resolve) => setTimeout(resolve, 5000));
    return await ExchangeManager.startExchange();
}
async function filterSpotMarketSymbols(exchange, symbols) {
    if (!exchange.markets || Object.keys(exchange.markets).length === 0) {
        try {
            await exchange.loadMarkets();
        }
        catch (_a) {
        }
    }
    const valid = [];
    const skipped = [];
    for (const symbol of symbols) {
        if (!symbol || String(symbol).includes(":")) {
            skipped.push(symbol);
            continue;
        }
        const market = exchange.markets ? exchange.markets[symbol] : undefined;
        if (!market) {
            valid.push(symbol);
            continue;
        }
        if (market.spot === true || market.type === "spot" || (market.spot !== false && market.swap !== true && market.future !== true)) {
            valid.push(symbol);
        }
        else {
            skipped.push(symbol);
        }
    }
    if (!valid.length) {
        for (const symbol of symbols) {
            if (symbol && !String(symbol).includes(":"))
                valid.push(symbol);
        }
    }
    return { valid, skipped };
}
function readTickerPrice(raw) {
    if (!raw || typeof raw !== "object")
        return undefined;
    const n = (v) => {
        const x = Number(v);
        return Number.isFinite(x) && x > 0 ? x : undefined;
    };
    return n(raw.price) || n(raw.last) || n(raw.close) || n(raw.average) ||
        (n(raw.bid) && n(raw.ask) ? (n(raw.bid) + n(raw.ask)) / 2 : undefined) ||
        n(raw.info && raw.info.lastPrice) || n(raw.info && raw.info.last) || n(raw.info && raw.info.c);
}
async function fetchTickersSafe(exchange, symbols) {
    const list = Array.isArray(symbols) ? symbols.filter(Boolean) : [];
    const tryCall = async (fn, args) => {
        try {
            const data = args ? await fn.call(exchange, args) : await fn.call(exchange);
            if (data && typeof data === "object" && !Array.isArray(data))
                return data;
        }
        catch (_a) {
        }
        return null;
    };
    let data = null;
    if (list.length && exchange.has && exchange.has.fetchTickers) {
        data = await tryCall(exchange.fetchTickers, list);
    }
    if ((!data || !Object.keys(data).length) && exchange.has && exchange.has.fetchTickers) {
        data = await tryCall(exchange.fetchTickers);
    }
    if ((!data || !Object.keys(data).length) && list.length && exchange.has && exchange.has.fetchLastPrices) {
        data = await tryCall(exchange.fetchLastPrices, list);
    }
    if (!data)
        data = {};
    if (list.length) {
        const hits = list.filter((s) => data[s]);
        if (hits.length < Math.max(1, Math.floor(list.length * 0.2))) {
            const all = await tryCall(exchange.fetchTickers);
            if (all) {
                data = Object.assign({}, data, all);
            }
        }
        const missing = list.filter((s) => !data[s]);
        if (missing.length && missing.length <= 40 && exchange.has && exchange.has.fetchTicker) {
            for (const s of missing) {
                try {
                    const one = await exchange.fetchTicker(s);
                    if (one)
                        data[s] = one;
                }
                catch (_b) {
                }
            }
        }
        else if (missing.length && missing.length <= 40) {
            for (const s of missing) {
                const oneMap = await tryCall(exchange.fetchTickers, [s]);
                if (oneMap && oneMap[s])
                    data[s] = oneMap[s];
            }
        }
    }
    return data;
}
function sanitizeErrorMessage(errorMessage) {
    if (errorMessage == null) {
        return "An unknown error occurred";
    }
    if (errorMessage instanceof Error) {
        errorMessage = errorMessage.message;
    }
    if (typeof errorMessage === "string") {
        const keywordsToHide = ["kucoin", "binance", "okx"];
        let sanitizedMessage = errorMessage;
        keywordsToHide.forEach((keyword) => {
            const regex = new RegExp(keyword, "gi");
            sanitizedMessage = sanitizedMessage.replace(regex, "***");
        });
        return sanitizedMessage;
    }
    return errorMessage;
}
exports.baseOrderBookEntrySchema = {
    type: "array",
    items: {
        type: "number",
        description: "Order book entry consisting of price and volume",
    },
};
exports.baseOrderBookSchema = {
    asks: {
        type: "array",
        items: exports.baseOrderBookEntrySchema,
        description: "Asks are sell orders in the order book",
    },
    bids: {
        type: "array",
        items: exports.baseOrderBookEntrySchema,
        description: "Bids are buy orders in the order book",
    },
};
exports.baseTickerSchema = {
    symbol: (0, schema_1.baseStringSchema)("Trading symbol for the market pair"),
    bid: (0, schema_1.baseNumberSchema)("Current highest bid price"),
    ask: (0, schema_1.baseNumberSchema)("Current lowest ask price"),
    close: (0, schema_1.baseNumberSchema)("Last close price"),
    last: (0, schema_1.baseNumberSchema)("Most recent transaction price"),
    change: (0, schema_1.baseNumberSchema)("Price change percentage"),
    baseVolume: (0, schema_1.baseNumberSchema)("Volume of base currency traded"),
    quoteVolume: (0, schema_1.baseNumberSchema)("Volume of quote currency traded"),
};
exports.baseWatchlistItemSchema = {
    id: (0, schema_1.baseStringSchema)("Unique identifier for the watchlist item", undefined, undefined, false, undefined, "uuid"),
    userId: (0, schema_1.baseStringSchema)("User ID associated with the watchlist item", undefined, undefined, false, undefined, "uuid"),
    symbol: (0, schema_1.baseStringSchema)("Symbol of the watchlist item"),
    type: (0, schema_1.baseStringSchema)("Market family the symbol belongs to (SPOT, ECO or FUTURES)"),
};
