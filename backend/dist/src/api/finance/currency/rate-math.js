"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.indexTickersByBaseAsset = exports.applyTransferSpread = exports.crossMidRate = void 0;
const crossMidRate = (fromPriceUSD, toPriceUSD) => fromPriceUSD / toPriceUSD;
exports.crossMidRate = crossMidRate;
const applyTransferSpread = (rate, spreadPercentage) => {
    const clampedSpread = Math.min(Math.max(Number(spreadPercentage) || 0, 0), 100);
    return rate * ((100 - clampedSpread) / 100);
};
exports.applyTransferSpread = applyTransferSpread;
const indexTickersByBaseAsset = (tickers) => {
    const byBase = new Map();
    for (const [symbol, ticker] of Object.entries(tickers !== null && tickers !== void 0 ? tickers : {})) {
        const base = symbol.split("/")[0];
        const last = Number(ticker === null || ticker === void 0 ? void 0 : ticker.last);
        if (!base || !Number.isFinite(last) || last <= 0)
            continue;
        if (!byBase.has(base) || symbol.endsWith("/USDT"))
            byBase.set(base, last);
    }
    return byBase;
};
exports.indexTickersByBaseAsset = indexTickersByBaseAsset;
