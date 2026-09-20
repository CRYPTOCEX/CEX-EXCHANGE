"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeWatchlistType = normalizeWatchlistType;
exports.assertWatchableSymbol = assertWatchableSymbol;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
function normalizeWatchlistType(raw) {
    const value = String(raw !== null && raw !== void 0 ? raw : "SPOT").toUpperCase();
    return value === "FUTURES" || value === "ECO" ? value : "SPOT";
}
async function assertWatchableSymbol(symbol, type) {
    if (typeof symbol !== "string" || !symbol.trim()) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Missing required parameters: symbol." });
    }
    const trimmed = symbol.trim().toUpperCase();
    if (!/^[A-Z0-9._-]{1,20}\/[A-Z0-9._-]{1,20}$/.test(trimmed)) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Invalid symbol. Expected the form BASE/QUOTE, e.g. BTC/USDT.",
        });
    }
    const [currency, pair] = trimmed.split("/");
    const exists = await marketExists(currency, pair, type);
    if (!exists) {
        throw (0, error_1.createError)({
            statusCode: 404,
            message: `No ${type.toLowerCase()} market for ${trimmed}`,
        });
    }
    return trimmed;
}
async function marketExists(currency, pair, type) {
    if (type === "FUTURES") {
        const futures = db_1.models.futuresMarket;
        if (!futures)
            return true;
        return (await futures.count({ where: { currency, pair } })) > 0;
    }
    if (type === "ECO") {
        const eco = db_1.models.ecosystemMarket;
        if (!eco)
            return true;
        return (await eco.count({ where: { currency, pair } })) > 0;
    }
    return (await db_1.models.exchangeMarket.count({ where: { currency, pair } })) > 0;
}
