"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NEWS_PROVIDER_CREDENTIALS = exports.RSS_MAX_FEEDS = exports.CRYPTOPANIC_FILTERS = exports.CRYPTOCOMPARE_CATEGORIES = exports.FINNHUB_CATEGORIES = void 0;
exports.FINNHUB_CATEGORIES = ["general", "forex", "crypto", "merger"];
exports.CRYPTOCOMPARE_CATEGORIES = [
    "BTC",
    "ETH",
    "Trading",
    "Market",
    "Regulation",
    "Mining",
    "Exchange",
    "Blockchain",
    "Technology",
    "Business",
    "Altcoin",
    "Wallet",
];
exports.CRYPTOPANIC_FILTERS = [
    "rising",
    "hot",
    "bullish",
    "bearish",
    "important",
    "lol",
];
exports.RSS_MAX_FEEDS = 20;
exports.NEWS_PROVIDER_CREDENTIALS = {
    finnhub: ["APP_FINNHUB_API_KEY"],
    cryptocompare: ["APP_CRYPTOCOMPARE_API_KEY"],
    cryptopanic: ["APP_CRYPTOPANIC_API_KEY"],
    rss: [],
};
