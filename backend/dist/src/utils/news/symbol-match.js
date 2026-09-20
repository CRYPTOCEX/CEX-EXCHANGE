"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QUOTE_ASSETS = exports.ASSET_NAMES = void 0;
exports.splitConcatenatedPair = splitConcatenatedPair;
exports.buildSymbolMatcher = buildSymbolMatcher;
exports.cryptoSymbolTerms = cryptoSymbolTerms;
exports.fxSymbolTerms = fxSymbolTerms;
exports.ASSET_NAMES = {
    BTC: ["Bitcoin"],
    ETH: ["Ethereum", "Ether"],
    SOL: ["Solana"],
    TRX: ["Tron"],
    XRP: ["Ripple"],
    DOGE: ["Dogecoin"],
    ADA: ["Cardano"],
    ZEC: ["Zcash"],
    LTC: ["Litecoin"],
    BNB: ["Binance Coin"],
    AVAX: ["Avalanche"],
    DOT: ["Polkadot"],
    MATIC: ["Polygon"],
    LINK: ["Chainlink"],
};
const MAX_TERM_LENGTH = 32;
function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function boundedPattern(term) {
    return `\\b${escapeRegExp(term).replace(/\s+/g, "\\s+")}\\b`;
}
exports.QUOTE_ASSETS = [
    "USDT", "USDC", "BUSD", "TUSD", "USD", "EUR", "BTC", "ETH", "BNB",
];
function splitConcatenatedPair(value) {
    const upper = String(value).trim().toUpperCase();
    for (const quote of exports.QUOTE_ASSETS) {
        if (upper.length > quote.length && upper.endsWith(quote)) {
            return [upper.slice(0, upper.length - quote.length), quote];
        }
    }
    return null;
}
function tagNamesTicker(tag, tickers) {
    const upper = String(tag !== null && tag !== void 0 ? tag : "").trim().toUpperCase();
    if (!upper)
        return false;
    const parts = upper.split(/[:_/\-]/).filter(Boolean);
    const candidates = new Set([upper, ...parts]);
    for (const part of parts) {
        const split = splitConcatenatedPair(part);
        if (split)
            candidates.add(split[0]);
    }
    return tickers.some((ticker) => candidates.has(ticker));
}
function buildSymbolMatcher(terms) {
    const tickers = Array.from(new Set(terms
        .map((term) => String(term).toUpperCase().replace(/[^A-Z0-9]/g, ""))
        .filter((term) => term.length > 0 && term.length <= MAX_TERM_LENGTH)));
    if (tickers.length === 0)
        return null;
    const tickerPatterns = tickers.map((t) => new RegExp(boundedPattern(t)));
    const namePatterns = tickers.flatMap((t) => { var _a; return ((_a = exports.ASSET_NAMES[t]) !== null && _a !== void 0 ? _a : []).map((name) => new RegExp(boundedPattern(name), "i")); });
    return {
        tickers,
        matches(story) {
            var _a, _b;
            const tags = Array.isArray(story.relatedSymbols) ? story.relatedSymbols : [];
            for (const tag of tags) {
                if (tagNamesTicker(tag, tickers))
                    return true;
            }
            const text = `${(_a = story.headline) !== null && _a !== void 0 ? _a : ""}\n${(_b = story.summary) !== null && _b !== void 0 ? _b : ""}`;
            if (!text.trim())
                return false;
            return (tickerPatterns.some((re) => re.test(text)) ||
                namePatterns.some((re) => re.test(text)));
        },
    };
}
function cryptoSymbolTerms(symbol) {
    var _a;
    const base = (_a = String(symbol).split("/")[0]) === null || _a === void 0 ? void 0 : _a.trim();
    return base ? [base] : [];
}
function fxSymbolTerms(symbol) {
    const legs = String(symbol)
        .split("/")
        .map((leg) => leg.trim())
        .filter(Boolean);
    if (legs.length === 0)
        return [];
    return legs.length > 1 ? [...legs, legs.join("")] : legs;
}
