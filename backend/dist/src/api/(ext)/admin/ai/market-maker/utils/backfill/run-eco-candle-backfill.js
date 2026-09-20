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
exports.backfillEcoCandles = backfillEcoCandles;
const client_1 = __importStar(require("../scylla/client"));
const exchange_1 = __importDefault(require("@b/utils/exchange"));
const console_1 = require("@b/utils/console");
const candles_1 = require("@b/api/(ext)/ecosystem/utils/candles");
const eco_candle_backfill_1 = require("./eco-candle-backfill");
const PAGE_LIMIT = 500;
const MAX_PAGES = 400;
async function oldestCandleBucketMs(symbol, interval) {
    var _a;
    const result = await client_1.default.execute(`SELECT "createdAt" FROM ${client_1.scyllaKeyspace}.candles
       WHERE symbol = ? AND interval = ?
       ORDER BY "createdAt" ASC LIMIT 1`, [symbol, interval], { prepare: true });
    const row = (_a = result.rows) === null || _a === void 0 ? void 0 : _a[0];
    if (!(row === null || row === void 0 ? void 0 : row.createdAt))
        return null;
    const ms = new Date(row.createdAt).getTime();
    return Number.isFinite(ms) ? ms : null;
}
async function fetchProviderBars(exchange, symbol, interval, fromMs, toMs) {
    var _a;
    const intervalMs = candles_1.intervalDurations[interval];
    const out = [];
    let since = fromMs;
    for (let page = 0; page < MAX_PAGES && since <= toMs; page++) {
        const rows = await exchange.fetchOHLCV(symbol, interval, since, PAGE_LIMIT);
        if (!Array.isArray(rows) || rows.length === 0)
            break;
        for (const r of rows) {
            const [timestamp, open, high, low, close, volume] = r;
            out.push({
                timestamp: Number(timestamp),
                open: Number(open),
                high: Number(high),
                low: Number(low),
                close: Number(close),
                volume: Number(volume) || 0,
            });
        }
        const last = Number((_a = rows[rows.length - 1]) === null || _a === void 0 ? void 0 : _a[0]);
        if (!Number.isFinite(last))
            break;
        const next = last + intervalMs;
        if (next <= since)
            break;
        since = next;
    }
    return out;
}
async function backfillEcoCandles(params) {
    var _a;
    const { symbol, externalSymbol, interval } = params;
    const nowMs = (_a = params.nowMs) !== null && _a !== void 0 ? _a : Date.now();
    let oldest = null;
    try {
        oldest = await oldestCandleBucketMs(symbol, interval);
    }
    catch (error) {
        console_1.logger.error("AI_MM", `Backfill could not read the ${interval} head for ${symbol}`, error);
        return {
            interval,
            status: "REFUSED",
            reason: "Could not read the market's existing candles, so the safe window is unknown.",
            imported: 0,
        };
    }
    const window = (0, eco_candle_backfill_1.planBackfillWindow)({
        interval,
        nowMs,
        oldestExistingBucketMs: oldest,
        requestedFromMs: params.requestedFromMs,
    });
    if (window.status !== "OK") {
        return { interval, status: window.status, reason: window.reason, imported: 0 };
    }
    const exchange = await exchange_1.default.startExchange();
    if (!exchange) {
        return {
            interval,
            status: "REFUSED",
            reason: "No exchange provider is available. Enable one with working credentials before importing history.",
            imported: 0,
        };
    }
    const raw = await fetchProviderBars(exchange, externalSymbol, interval, window.fromMs, window.toMs);
    const bars = (0, eco_candle_backfill_1.selectImportableBars)(raw, window, interval);
    let imported = 0;
    for (const bar of bars) {
        if (!(bar.open > 0) ||
            !(bar.high > 0) ||
            !(bar.low > 0) ||
            !(bar.close > 0) ||
            bar.high < bar.low) {
            continue;
        }
        try {
            const at = new Date(bar.timestamp);
            await client_1.default.execute(`INSERT INTO ${client_1.scyllaKeyspace}.candles (
           symbol, interval, "createdAt", "updatedAt", open, high, low, close, volume
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                symbol,
                interval,
                at,
                at,
                bar.open,
                Math.max(bar.high, bar.open, bar.close),
                Math.min(bar.low, bar.open, bar.close),
                bar.close,
                bar.volume,
            ], { prepare: true });
            imported++;
        }
        catch (error) {
            console_1.logger.error("AI_MM", `Backfill failed to write ${symbol} ${interval} at ${new Date(bar.timestamp).toISOString()}`, error);
        }
    }
    console_1.logger.info("AI_MM", `Backfilled ${imported} ${interval} candles for ${symbol} from ${externalSymbol} ` +
        `(${new Date(window.fromMs).toISOString()} .. ${new Date(window.toMs).toISOString()})`);
    return {
        interval,
        status: "OK",
        imported,
        fromMs: window.fromMs,
        toMs: window.toMs,
    };
}
