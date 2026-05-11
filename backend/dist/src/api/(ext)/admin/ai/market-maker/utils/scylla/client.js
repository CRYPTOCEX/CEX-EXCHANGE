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
exports.scyllaKeyspace = exports.client = exports.aiMarketMakerKeyspace = void 0;
exports.initializeAiMarketMakerTables = initializeAiMarketMakerTables;
exports.isInitialized = isInitialized;
const client_1 = __importStar(require("@b/api/(ext)/ecosystem/utils/scylla/client"));
exports.client = client_1.default;
Object.defineProperty(exports, "scyllaKeyspace", { enumerable: true, get: function () { return client_1.scyllaKeyspace; } });
const console_1 = require("@b/utils/console");
exports.aiMarketMakerKeyspace = client_1.scyllaKeyspace;
const aiMarketMakerTableQueries = [
    `CREATE TABLE IF NOT EXISTS ${exports.aiMarketMakerKeyspace}.ai_bot_orders (
    market_id UUID,
    bot_id UUID,
    order_id UUID,
    side TEXT,
    type TEXT,
    price DECIMAL,
    amount DECIMAL,
    filled_amount DECIMAL,
    status TEXT,
    purpose TEXT,
    matched_with_bot_id UUID,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    PRIMARY KEY ((market_id), created_at, order_id)
  ) WITH CLUSTERING ORDER BY (created_at DESC, order_id ASC);`,
    `CREATE TABLE IF NOT EXISTS ${exports.aiMarketMakerKeyspace}.ai_bot_trades (
    market_id UUID,
    trade_date DATE,
    trade_time TIMESTAMP,
    trade_id UUID,
    buy_bot_id UUID,
    sell_bot_id UUID,
    buy_order_id UUID,
    sell_order_id UUID,
    price DECIMAL,
    amount DECIMAL,
    PRIMARY KEY ((market_id, trade_date), trade_time, trade_id)
  ) WITH CLUSTERING ORDER BY (trade_time DESC, trade_id ASC);`,
    `CREATE TABLE IF NOT EXISTS ${exports.aiMarketMakerKeyspace}.ai_price_history (
    market_id UUID,
    timestamp TIMESTAMP,
    price DECIMAL,
    volume DECIMAL,
    is_ai_trade BOOLEAN,
    source TEXT,
    PRIMARY KEY ((market_id), timestamp)
  ) WITH CLUSTERING ORDER BY (timestamp DESC);`,
    `CREATE TABLE IF NOT EXISTS ${exports.aiMarketMakerKeyspace}.ai_real_liquidity_orders (
    ai_order_id UUID,
    ecosystem_order_id UUID,
    bot_id UUID,
    market_id UUID,
    symbol TEXT,
    side TEXT,
    price DECIMAL,
    amount DECIMAL,
    filled_amount DECIMAL,
    status TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    PRIMARY KEY ((ecosystem_order_id))
  );`,
    `CREATE TABLE IF NOT EXISTS ${exports.aiMarketMakerKeyspace}.ai_bot_real_trades (
    bot_id UUID,
    trade_date DATE,
    trade_time TIMESTAMP,
    trade_id UUID,
    market_id UUID,
    symbol TEXT,
    side TEXT,
    price DECIMAL,
    amount DECIMAL,
    fee DECIMAL,
    is_maker BOOLEAN,
    counterparty_user_id UUID,
    pnl DECIMAL,
    PRIMARY KEY ((bot_id, trade_date), trade_time, trade_id)
  ) WITH CLUSTERING ORDER BY (trade_time DESC, trade_id ASC);`,
];
const aiMarketMakerViewQueries = [
    `CREATE MATERIALIZED VIEW IF NOT EXISTS ${exports.aiMarketMakerKeyspace}.ai_bot_orders_by_bot AS
  SELECT * FROM ${exports.aiMarketMakerKeyspace}.ai_bot_orders
  WHERE bot_id IS NOT NULL AND market_id IS NOT NULL AND created_at IS NOT NULL AND order_id IS NOT NULL
  PRIMARY KEY ((bot_id), created_at, order_id, market_id)
  WITH CLUSTERING ORDER BY (created_at DESC, order_id ASC);`,
    `CREATE MATERIALIZED VIEW IF NOT EXISTS ${exports.aiMarketMakerKeyspace}.ai_bot_open_orders AS
  SELECT * FROM ${exports.aiMarketMakerKeyspace}.ai_bot_orders
  WHERE status = 'OPEN' AND market_id IS NOT NULL AND created_at IS NOT NULL AND order_id IS NOT NULL
  PRIMARY KEY ((status, market_id), created_at, order_id)
  WITH CLUSTERING ORDER BY (created_at DESC, order_id ASC);`,
    `CREATE MATERIALIZED VIEW IF NOT EXISTS ${exports.aiMarketMakerKeyspace}.ai_real_liquidity_orders_by_ai_order AS
  SELECT * FROM ${exports.aiMarketMakerKeyspace}.ai_real_liquidity_orders
  WHERE ai_order_id IS NOT NULL AND ecosystem_order_id IS NOT NULL
  PRIMARY KEY ((ai_order_id), ecosystem_order_id);`,
];
let initialized = false;
async function initializeAiMarketMakerTables() {
    var _a, _b;
    if (initialized) {
        return;
    }
    try {
        await (0, client_1.initialize)();
        for (const query of aiMarketMakerTableQueries) {
            try {
                await client_1.default.execute(query);
            }
            catch (err) {
                if (!((_a = err.message) === null || _a === void 0 ? void 0 : _a.includes("already exists"))) {
                    console_1.logger.error("AI_MARKET_MAKER", "Failed to create table in ScyllaDB", err);
                }
            }
        }
        for (const query of aiMarketMakerViewQueries) {
            try {
                await client_1.default.execute(query);
            }
            catch (err) {
                if (!((_b = err.message) === null || _b === void 0 ? void 0 : _b.includes("already exists"))) {
                    console_1.logger.error("AI_MARKET_MAKER", "Failed to create materialized view in ScyllaDB", err);
                }
            }
        }
        initialized = true;
        console_1.logger.groupItem("AI_MM", "Database tables initialized", "success");
    }
    catch (error) {
        console_1.logger.groupItem("AI_MM", `Failed to initialize database tables: ${error instanceof Error ? error.message : error}`, "error");
        throw error;
    }
}
function isInitialized() {
    return initialized;
}
exports.default = client_1.default;
