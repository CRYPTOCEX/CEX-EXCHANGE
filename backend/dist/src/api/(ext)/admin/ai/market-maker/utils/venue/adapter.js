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
exports.venueAdapter = venueAdapter;
exports.venueKeyspace = venueKeyspace;
const console_1 = require("@b/utils/console");
async function safeImport(path) {
    try {
        return (await Promise.resolve(`${path}`).then(s => __importStar(require(s))));
    }
    catch (error) {
        console_1.logger.debug("AI_MM", `Optional module ${path} unavailable`, error);
        return null;
    }
}
function ecosystemAdapter() {
    const client = require("@b/api/(ext)/ecosystem/utils/scylla/client");
    return {
        venue: "ECO",
        keyspace: client.scyllaKeyspace,
        hasTradeFeed: true,
        async writeLevel(symbol, price, amount, side, ttlSeconds) {
            var _a;
            const queries = await safeImport("@b/api/(ext)/ecosystem/utils/scylla/queries");
            await ((_a = queries === null || queries === void 0 ? void 0 : queries.updateOrderBookInDB) === null || _a === void 0 ? void 0 : _a.call(queries, symbol, price, amount, side, ttlSeconds));
        },
        async invalidateBook(symbol) {
            var _a, _b;
            try {
                const ws = await safeImport("@b/api/(ext)/ecosystem/market/index.ws");
                (_a = ws === null || ws === void 0 ? void 0 : ws.clearOrderbookCache) === null || _a === void 0 ? void 0 : _a.call(ws, symbol);
                await ((_b = ws === null || ws === void 0 ? void 0 : ws.forceOrderbookBroadcast) === null || _b === void 0 ? void 0 : _b.call(ws, symbol));
            }
            catch (error) {
                console_1.logger.debug("AI_MM", `Orderbook cache invalidation skipped for ${symbol}`, error);
            }
        },
        async insertTrade(symbol, price, amount, side) {
            var _a;
            const queries = await safeImport("@b/api/(ext)/ecosystem/utils/scylla/queries");
            await ((_a = queries === null || queries === void 0 ? void 0 : queries.insertTrade) === null || _a === void 0 ? void 0 : _a.call(queries, symbol, price, amount, side, true));
        },
    };
}
function futuresAdapter() {
    const client = require("@b/api/(ext)/ecosystem/utils/scylla/client");
    return {
        venue: "FUTURES",
        keyspace: client.scyllaFuturesKeyspace,
        hasTradeFeed: false,
        async writeLevel(symbol, price, amount, side, ttlSeconds) {
            var _a;
            const queries = await safeImport("@b/api/(ext)/futures/utils/queries/orderbook");
            await ((_a = queries === null || queries === void 0 ? void 0 : queries.updateOrderBookInDB) === null || _a === void 0 ? void 0 : _a.call(queries, symbol, price, amount, side, ttlSeconds));
        },
        async invalidateBook(symbol) {
            void symbol;
        },
        async insertTrade(symbol) {
            void symbol;
        },
    };
}
const adapters = new Map();
function venueAdapter(venue) {
    const existing = adapters.get(venue);
    if (existing)
        return existing;
    const built = venue === "FUTURES" ? futuresAdapter() : ecosystemAdapter();
    adapters.set(venue, built);
    return built;
}
function venueKeyspace(venue) {
    return venueAdapter(venue).keyspace;
}
