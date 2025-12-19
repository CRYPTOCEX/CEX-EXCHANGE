import client, { scyllaKeyspace, initialize as initializeEcosystem } from "@b/api/(ext)/ecosystem/utils/scylla/client";
import { logger } from "@b/utils/console";

// AI Market Maker uses the same keyspace as ecosystem trading
// This ensures all AI market maker data is in the same keyspace as ecosystem orders
export const aiMarketMakerKeyspace = scyllaKeyspace;

// Re-export ecosystem client for use in queries
export { client, scyllaKeyspace };

// Table creation queries for AI Market Maker
const aiMarketMakerTableQueries = [
  // AI Bot Orders - tracks all orders placed by AI bots
  `CREATE TABLE IF NOT EXISTS ${aiMarketMakerKeyspace}.ai_bot_orders (
    market_id UUID,
    bot_id UUID,
    order_id UUID,
    side TEXT,
    type TEXT,
    price VARINT,
    amount VARINT,
    filled_amount VARINT,
    status TEXT,
    purpose TEXT,
    matched_with_bot_id UUID,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    PRIMARY KEY ((market_id), created_at, order_id)
  ) WITH CLUSTERING ORDER BY (created_at DESC, order_id ASC);`,

  // AI Bot Trades - tracks executed trades between bots
  `CREATE TABLE IF NOT EXISTS ${aiMarketMakerKeyspace}.ai_bot_trades (
    market_id UUID,
    trade_date DATE,
    trade_time TIMESTAMP,
    trade_id UUID,
    buy_bot_id UUID,
    sell_bot_id UUID,
    buy_order_id UUID,
    sell_order_id UUID,
    price VARINT,
    amount VARINT,
    PRIMARY KEY ((market_id, trade_date), trade_time, trade_id)
  ) WITH CLUSTERING ORDER BY (trade_time DESC, trade_id ASC);`,

  // AI Price History - tracks price movements for AI decision making
  `CREATE TABLE IF NOT EXISTS ${aiMarketMakerKeyspace}.ai_price_history (
    market_id UUID,
    timestamp TIMESTAMP,
    price VARINT,
    volume VARINT,
    is_ai_trade BOOLEAN,
    source TEXT,
    PRIMARY KEY ((market_id), timestamp)
  ) WITH CLUSTERING ORDER BY (timestamp DESC);`,

  // AI Real Liquidity Orders - tracks AI orders placed in ecosystem (real layer)
  // Links AI orders to ecosystem orders for hybrid mode
  `CREATE TABLE IF NOT EXISTS ${aiMarketMakerKeyspace}.ai_real_liquidity_orders (
    ai_order_id UUID,
    ecosystem_order_id UUID,
    bot_id UUID,
    market_id UUID,
    symbol TEXT,
    side TEXT,
    price VARINT,
    amount VARINT,
    filled_amount VARINT,
    status TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    PRIMARY KEY ((ecosystem_order_id))
  );`,

  // Bot Real Trades - tracks trades between AI bots and REAL users
  // This is where we calculate actual P&L
  `CREATE TABLE IF NOT EXISTS ${aiMarketMakerKeyspace}.ai_bot_real_trades (
    bot_id UUID,
    trade_date DATE,
    trade_time TIMESTAMP,
    trade_id UUID,
    market_id UUID,
    symbol TEXT,
    side TEXT,
    price VARINT,
    amount VARINT,
    fee VARINT,
    is_maker BOOLEAN,
    counterparty_user_id UUID,
    pnl VARINT,
    PRIMARY KEY ((bot_id, trade_date), trade_time, trade_id)
  ) WITH CLUSTERING ORDER BY (trade_time DESC, trade_id ASC);`,
];

// Materialized views for efficient queries
const aiMarketMakerViewQueries = [
  // Orders by bot - useful for tracking individual bot performance
  `CREATE MATERIALIZED VIEW IF NOT EXISTS ${aiMarketMakerKeyspace}.ai_bot_orders_by_bot AS
  SELECT * FROM ${aiMarketMakerKeyspace}.ai_bot_orders
  WHERE bot_id IS NOT NULL AND market_id IS NOT NULL AND created_at IS NOT NULL AND order_id IS NOT NULL
  PRIMARY KEY ((bot_id), created_at, order_id, market_id)
  WITH CLUSTERING ORDER BY (created_at DESC, order_id ASC);`,

  // Open orders - for quick lookup of active orders
  `CREATE MATERIALIZED VIEW IF NOT EXISTS ${aiMarketMakerKeyspace}.ai_bot_open_orders AS
  SELECT * FROM ${aiMarketMakerKeyspace}.ai_bot_orders
  WHERE status = 'OPEN' AND market_id IS NOT NULL AND created_at IS NOT NULL AND order_id IS NOT NULL
  PRIMARY KEY ((status, market_id), created_at, order_id)
  WITH CLUSTERING ORDER BY (created_at DESC, order_id ASC);`,

  // Real liquidity orders by AI order ID - for linking back to AI layer
  `CREATE MATERIALIZED VIEW IF NOT EXISTS ${aiMarketMakerKeyspace}.ai_real_liquidity_orders_by_ai_order AS
  SELECT * FROM ${aiMarketMakerKeyspace}.ai_real_liquidity_orders
  WHERE ai_order_id IS NOT NULL AND ecosystem_order_id IS NOT NULL
  PRIMARY KEY ((ai_order_id), ecosystem_order_id);`,
];

let initialized = false;

/**
 * Initialize AI Market Maker tables in Scylla
 * Should be called during application startup
 *
 * This function:
 * 1. Ensures ecosystem Scylla is initialized first
 * 2. Creates AI-specific tables in the same keyspace
 * 3. Creates materialized views for efficient queries
 */
export async function initializeAiMarketMakerTables(): Promise<void> {
  if (initialized) {
    return;
  }

  try {
    // Ensure ecosystem Scylla is initialized first
    // This is required because AI Market Maker depends on ecosystem
    await initializeEcosystem();

    // Create AI-specific tables
    for (const query of aiMarketMakerTableQueries) {
      try {
        await client.execute(query);
      } catch (err: any) {
        // Ignore "already exists" errors
        if (!err.message?.includes("already exists")) {
          logger.error("AI_MARKET_MAKER", "Failed to create table in ScyllaDB", err);
        }
      }
    }

    // Create materialized views
    for (const query of aiMarketMakerViewQueries) {
      try {
        await client.execute(query);
      } catch (err: any) {
        // Ignore "already exists" errors
        if (!err.message?.includes("already exists")) {
          logger.error("AI_MARKET_MAKER", "Failed to create materialized view in ScyllaDB", err);
        }
      }
    }

    initialized = true;
    logger.groupItem("AI_MM", "Database tables initialized", "success");
  } catch (error) {
    logger.groupItem("AI_MM", `Failed to initialize database tables: ${error instanceof Error ? error.message : error}`, "error");
    throw error;
  }
}

/**
 * Check if AI Market Maker tables are initialized
 */
export function isInitialized(): boolean {
  return initialized;
}

export default client;
