import client, { aiMarketMakerKeyspace, scyllaKeyspace } from "./client";
import { makeUuid } from "@b/utils/passwords";
import { types } from "cassandra-driver";
import { logger } from "@b/utils/console";
import {
  createOrder as ecosystemCreateOrder,
  cancelOrderByUuid as ecosystemCancelOrder,
  updateOrderBookInDB as ecosystemUpdateOrderbook,
  insertTrade as ecosystemInsertTrade,
  Order as EcosystemOrder,
} from "@b/api/(ext)/ecosystem/utils/scylla/queries";
import {
  toBigIntFloat,
  fromBigInt,
  removeTolerance,
} from "@b/api/(ext)/ecosystem/utils/blockchain";

// ============================================
// Type Definitions
// ============================================

export interface AiBotOrder {
  marketId: string;
  botId: string;
  orderId: string;
  side: "BUY" | "SELL";
  type: "LIMIT" | "MARKET";
  price: bigint;
  amount: bigint;
  filledAmount: bigint;
  status: "OPEN" | "PARTIAL" | "FILLED" | "CANCELLED";
  purpose: "PRICE_PUSH" | "LIQUIDITY" | "SPREAD_MAINTENANCE" | "VOLATILITY";
  matchedWithBotId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AiBotTrade {
  marketId: string;
  tradeDate: Date;
  tradeTime: Date;
  tradeId: string;
  buyBotId: string;
  sellBotId: string;
  buyOrderId: string;
  sellOrderId: string;
  price: bigint;
  amount: bigint;
}

export interface AiPriceHistory {
  marketId: string;
  timestamp: Date;
  price: bigint;
  volume: bigint;
  isAiTrade: boolean;
  source: "AI" | "USER" | "EXTERNAL";
}

// ============================================
// Helper Functions
// ============================================

/**
 * Convert ScyllaDB varint value to BigInt
 * ScyllaDB returns varint as Long objects or strings depending on driver version
 */
function toBigIntSafe(value: any): bigint {
  if (value === null || value === undefined) {
    return BigInt(0);
  }
  if (typeof value === "bigint") {
    return value;
  }
  // Handle Long objects from cassandra-driver or string values
  return BigInt(value.toString());
}

function mapRowToOrder(row: any): AiBotOrder {
  return {
    marketId: row.market_id?.toString(),
    botId: row.bot_id?.toString(),
    orderId: row.order_id?.toString(),
    side: row.side,
    type: row.type,
    price: toBigIntSafe(row.price),
    amount: toBigIntSafe(row.amount),
    filledAmount: toBigIntSafe(row.filled_amount),
    status: row.status,
    purpose: row.purpose,
    matchedWithBotId: row.matched_with_bot_id?.toString(),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRowToTrade(row: any): AiBotTrade {
  return {
    marketId: row.market_id?.toString(),
    tradeDate: row.trade_date,
    tradeTime: row.trade_time,
    tradeId: row.trade_id?.toString(),
    buyBotId: row.buy_bot_id?.toString(),
    sellBotId: row.sell_bot_id?.toString(),
    buyOrderId: row.buy_order_id?.toString(),
    sellOrderId: row.sell_order_id?.toString(),
    price: toBigIntSafe(row.price),
    amount: toBigIntSafe(row.amount),
  };
}

function mapRowToPriceHistory(row: any): AiPriceHistory {
  return {
    marketId: row.market_id?.toString(),
    timestamp: row.timestamp,
    price: toBigIntSafe(row.price),
    volume: toBigIntSafe(row.volume),
    isAiTrade: row.is_ai_trade,
    source: row.source,
  };
}

// ============================================
// Bot Order Queries
// ============================================

/**
 * Insert a new bot order
 * Note: BigInt values must be converted to strings for ScyllaDB varint columns
 */
export async function insertBotOrder(order: Omit<AiBotOrder, "orderId" | "createdAt" | "updatedAt">): Promise<string> {
  const orderId = makeUuid();
  const now = new Date();

  const query = `
    INSERT INTO ${aiMarketMakerKeyspace}.ai_bot_orders (
      market_id, bot_id, order_id, side, type, price, amount,
      filled_amount, status, purpose, matched_with_bot_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  // Convert BigInt to string for ScyllaDB varint compatibility
  const params = [
    types.Uuid.fromString(order.marketId),
    types.Uuid.fromString(order.botId),
    types.Uuid.fromString(orderId),
    order.side,
    order.type,
    order.price.toString(),
    order.amount.toString(),
    order.filledAmount.toString(),
    order.status,
    order.purpose,
    order.matchedWithBotId ? types.Uuid.fromString(order.matchedWithBotId) : null,
    now,
    now,
  ];

  await client.execute(query, params, { prepare: true });
  return orderId;
}

/**
 * Update a bot order
 */
export async function updateBotOrder(
  marketId: string,
  orderId: string,
  createdAt: Date,
  updates: Partial<Pick<AiBotOrder, "filledAmount" | "status" | "matchedWithBotId">>
): Promise<void> {
  const setClauses: string[] = [];
  const params: any[] = [];

  if (updates.filledAmount !== undefined) {
    setClauses.push("filled_amount = ?");
    // Convert BigInt to string for ScyllaDB varint compatibility
    params.push(updates.filledAmount.toString());
  }
  if (updates.status !== undefined) {
    setClauses.push("status = ?");
    params.push(updates.status);
  }
  if (updates.matchedWithBotId !== undefined) {
    setClauses.push("matched_with_bot_id = ?");
    params.push(types.Uuid.fromString(updates.matchedWithBotId));
  }

  setClauses.push("updated_at = ?");
  params.push(new Date());

  params.push(types.Uuid.fromString(marketId));
  params.push(createdAt);
  params.push(types.Uuid.fromString(orderId));

  const query = `
    UPDATE ${aiMarketMakerKeyspace}.ai_bot_orders
    SET ${setClauses.join(", ")}
    WHERE market_id = ? AND created_at = ? AND order_id = ?
  `;

  await client.execute(query, params, { prepare: true });
}

/**
 * Get orders by market
 */
export async function getBotOrdersByMarket(
  marketId: string,
  limit: number = 100
): Promise<AiBotOrder[]> {
  const query = `
    SELECT * FROM ${aiMarketMakerKeyspace}.ai_bot_orders
    WHERE market_id = ?
    LIMIT ?
  `;

  const result = await client.execute(
    query,
    [types.Uuid.fromString(marketId), limit],
    { prepare: true }
  );

  return result.rows.map(mapRowToOrder);
}

/**
 * Get orders by bot
 */
export async function getBotOrdersByBot(
  botId: string,
  limit: number = 100
): Promise<AiBotOrder[]> {
  const query = `
    SELECT * FROM ${aiMarketMakerKeyspace}.ai_bot_orders_by_bot
    WHERE bot_id = ?
    LIMIT ?
  `;

  const result = await client.execute(
    query,
    [types.Uuid.fromString(botId), limit],
    { prepare: true }
  );

  return result.rows.map(mapRowToOrder);
}

/**
 * Get open orders by market
 */
export async function getOpenBotOrders(marketId: string): Promise<AiBotOrder[]> {
  const query = `
    SELECT * FROM ${aiMarketMakerKeyspace}.ai_bot_open_orders
    WHERE status = 'OPEN' AND market_id = ?
  `;

  const result = await client.execute(
    query,
    [types.Uuid.fromString(marketId)],
    { prepare: true }
  );

  return result.rows.map(mapRowToOrder);
}

/**
 * Cancel a bot order
 */
export async function cancelBotOrder(
  marketId: string,
  orderId: string,
  createdAt: Date
): Promise<void> {
  await updateBotOrder(marketId, orderId, createdAt, { status: "CANCELLED" });
}

// ============================================
// Bot Trade Queries
// ============================================

/**
 * Insert a new bot trade
 */
export async function insertBotTrade(
  trade: Omit<AiBotTrade, "tradeId" | "tradeDate" | "tradeTime">
): Promise<string> {
  const tradeId = makeUuid();
  const now = new Date();
  const tradeDate = new types.LocalDate(now.getFullYear(), now.getMonth() + 1, now.getDate());

  const query = `
    INSERT INTO ${aiMarketMakerKeyspace}.ai_bot_trades (
      market_id, trade_date, trade_time, trade_id, buy_bot_id, sell_bot_id,
      buy_order_id, sell_order_id, price, amount
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  // Convert BigInt to string for ScyllaDB varint compatibility
  const params = [
    types.Uuid.fromString(trade.marketId),
    tradeDate,
    now,
    types.Uuid.fromString(tradeId),
    types.Uuid.fromString(trade.buyBotId),
    types.Uuid.fromString(trade.sellBotId),
    types.Uuid.fromString(trade.buyOrderId),
    types.Uuid.fromString(trade.sellOrderId),
    trade.price.toString(),
    trade.amount.toString(),
  ];

  try {
    await client.execute(query, params, { prepare: true });
    // Trade inserted successfully - log only in verbose mode
  } catch (error) {
    logger.error("AI_MM", `Failed to insert trade for market ${trade.marketId}: ${error}`);
    throw error;
  }
  return tradeId;
}

/**
 * Get trades by market for a specific date
 */
export async function getBotTradesByMarket(
  marketId: string,
  date: Date,
  limit: number = 100
): Promise<AiBotTrade[]> {
  const tradeDate = new types.LocalDate(date.getFullYear(), date.getMonth() + 1, date.getDate());

  const query = `
    SELECT * FROM ${aiMarketMakerKeyspace}.ai_bot_trades
    WHERE market_id = ? AND trade_date = ?
    LIMIT ?
  `;

  const result = await client.execute(
    query,
    [types.Uuid.fromString(marketId), tradeDate, limit],
    { prepare: true }
  );

  return result.rows.map(mapRowToTrade);
}

/**
 * Get trades for a market within a time range
 */
export async function getBotTradesInRange(
  marketId: string,
  startDate: Date,
  endDate: Date,
  limit: number = 1000
): Promise<AiBotTrade[]> {
  const trades: AiBotTrade[] = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate && trades.length < limit) {
    const dayTrades = await getBotTradesByMarket(marketId, currentDate, limit - trades.length);
    trades.push(...dayTrades);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return trades;
}

/**
 * Get daily trade volume for a market
 */
export async function getDailyTradeVolume(
  marketId: string,
  date: Date
): Promise<bigint> {
  const trades = await getBotTradesByMarket(marketId, date, 10000);
  return trades.reduce((sum, trade) => sum + trade.amount, BigInt(0));
}

// ============================================
// Price History Queries
// ============================================

/**
 * Insert a price history record
 */
export async function insertPriceHistory(
  history: Omit<AiPriceHistory, "timestamp">
): Promise<void> {
  const query = `
    INSERT INTO ${aiMarketMakerKeyspace}.ai_price_history (
      market_id, timestamp, price, volume, is_ai_trade, source
    ) VALUES (?, ?, ?, ?, ?, ?)
  `;

  // Convert BigInt to string for ScyllaDB varint compatibility
  const params = [
    types.Uuid.fromString(history.marketId),
    new Date(),
    history.price.toString(),
    history.volume.toString(),
    history.isAiTrade,
    history.source,
  ];

  await client.execute(query, params, { prepare: true });
}

/**
 * Get price history for a market
 */
export async function getPriceHistory(
  marketId: string,
  limit: number = 100
): Promise<AiPriceHistory[]> {
  const query = `
    SELECT * FROM ${aiMarketMakerKeyspace}.ai_price_history
    WHERE market_id = ?
    LIMIT ?
  `;

  const result = await client.execute(
    query,
    [types.Uuid.fromString(marketId), limit],
    { prepare: true }
  );

  return result.rows.map(mapRowToPriceHistory);
}

/**
 * Get price history within a time range
 */
export async function getPriceHistoryInRange(
  marketId: string,
  startTime: Date,
  endTime: Date,
  limit: number = 1000
): Promise<AiPriceHistory[]> {
  const query = `
    SELECT * FROM ${aiMarketMakerKeyspace}.ai_price_history
    WHERE market_id = ? AND timestamp >= ? AND timestamp <= ?
    LIMIT ?
  `;

  const result = await client.execute(
    query,
    [types.Uuid.fromString(marketId), startTime, endTime, limit],
    { prepare: true }
  );

  return result.rows.map(mapRowToPriceHistory);
}

/**
 * Get the latest price for a market
 */
export async function getLatestPrice(marketId: string): Promise<AiPriceHistory | null> {
  const query = `
    SELECT * FROM ${aiMarketMakerKeyspace}.ai_price_history
    WHERE market_id = ?
    LIMIT 1
  `;

  const result = await client.execute(
    query,
    [types.Uuid.fromString(marketId)],
    { prepare: true }
  );

  if (result.rows.length === 0) {
    return null;
  }

  return mapRowToPriceHistory(result.rows[0]);
}

/**
 * Calculate price volatility (standard deviation) over a period
 */
export async function calculateVolatility(
  marketId: string,
  minutes: number = 60
): Promise<number> {
  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - minutes * 60 * 1000);

  const history = await getPriceHistoryInRange(marketId, startTime, endTime, 1000);

  if (history.length < 2) {
    return 0;
  }

  // Convert prices to numbers and calculate percentage changes
  const prices = history.map((h) => Number(h.price));
  const returns: number[] = [];

  for (let i = 1; i < prices.length; i++) {
    if (prices[i - 1] !== 0) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
  }

  if (returns.length === 0) {
    return 0;
  }

  // Calculate standard deviation
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const squaredDiffs = returns.map((r) => Math.pow(r - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / returns.length;

  return Math.sqrt(variance) * 100; // Return as percentage
}

// ============================================
// Ecosystem Integration (Real Liquidity Layer)
// ============================================

// NOTE: Bot orders now use Pool Liquidity instead of fake user/wallets
// The matching engine detects bot orders via marketMakerId and uses
// the AI Market Maker Pool balance for trades instead of user wallets.
// This eliminates the need for creating fake AI users or wallets.

/**
 * Real Liquidity Order - represents an order placed in ecosystem
 */
export interface RealLiquidityOrder {
  id: string;
  aiBotOrderId: string;  // Link to AI layer order
  ecosystemOrderId: string;  // Link to ecosystem order
  symbol: string;
  side: "BUY" | "SELL";
  price: bigint;
  amount: bigint;
  status: "OPEN" | "PARTIAL" | "FILLED" | "CANCELLED";
  createdAt: Date;
}

/**
 * Place an order in the real ecosystem layer
 * This creates an actual order that real users can trade against
 * Bot orders use pool liquidity - no user/wallet needed
 *
 * @param symbol - Trading pair (e.g., "BTC/USDT")
 * @param side - Order side ("BUY" or "SELL")
 * @param price - Order price (as bigint)
 * @param amount - Order amount (as bigint)
 * @param aiBotOrderId - Reference to the AI layer order
 * @param marketMakerId - The AI Market Maker ID (for pool liquidity)
 * @param botId - The specific bot placing this order
 * @returns The created ecosystem order
 */
export async function placeRealOrder(
  symbol: string,
  side: "BUY" | "SELL",
  price: bigint,
  amount: bigint,
  aiBotOrderId: string,
  marketMakerId: string,
  botId: string
): Promise<EcosystemOrder> {
  // Parse symbol to get base and quote currencies
  const [baseCurrency, quoteCurrency] = symbol.split("/");

  // Use the botId as the userId - it's a valid UUID and the matching engine
  // will identify this as a bot order via the marketMakerId field
  // This ensures Scylla gets a valid UUID while we can still track the bot
  const userId = botId;

  // Calculate cost for both BUY and SELL orders
  // BUY: cost in quote currency = price * amount
  // SELL: cost in base currency = amount (since we're selling base currency)
  // Both need proper cost calculation for the ecosystem order
  const cost = (price * amount) / BigInt(10 ** 18);

  // Fee is 0 for AI orders (internal system orders)
  const fee = BigInt(0);
  const feeCurrency = side === "BUY" ? quoteCurrency : baseCurrency;

  // Create order in ecosystem with marketMakerId/botId for pool-based matching
  const order = await ecosystemCreateOrder({
    userId,
    symbol,
    amount,
    price,
    cost,
    type: "LIMIT",
    side,
    fee,
    feeCurrency,
    // AI Market Maker metadata - matching engine uses this to identify bot orders
    marketMakerId,
    botId,
  });

  // Track this in our AI layer for reference
  await trackRealLiquidityOrder({
    aiBotOrderId,
    ecosystemOrderId: order.id,
    symbol,
    side,
    price,
    amount,
  });

  return order;
}

/**
 * Cancel a real ecosystem order
 *
 * @param ecosystemOrderId - The ecosystem order ID
 * @param userId - User ID of the order owner
 * @param createdAt - Order creation timestamp
 * @param symbol - Trading pair
 * @param price - Order price
 * @param side - Order side
 * @param amount - Remaining amount to cancel
 */
export async function cancelRealOrder(
  ecosystemOrderId: string,
  userId: string,
  createdAt: string,
  symbol: string,
  price: bigint,
  side: "BUY" | "SELL",
  amount: bigint
): Promise<void> {
  await ecosystemCancelOrder(
    userId,
    ecosystemOrderId,
    createdAt,
    symbol,
    price,
    side,
    amount
  );

  // Update tracking
  await updateRealLiquidityOrderStatus(ecosystemOrderId, "CANCELLED");
}

/**
 * Track a real liquidity order in AI layer
 */
async function trackRealLiquidityOrder(params: {
  aiBotOrderId: string;
  ecosystemOrderId: string;
  symbol: string;
  side: "BUY" | "SELL";
  price: bigint;
  amount: bigint;
}): Promise<void> {
  const query = `
    INSERT INTO ${aiMarketMakerKeyspace}.ai_real_liquidity_orders (
      ai_order_id, ecosystem_order_id, symbol, side, price, amount, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  // Convert BigInt to string for ScyllaDB varint compatibility
  await client.execute(
    query,
    [
      types.Uuid.fromString(params.aiBotOrderId),
      types.Uuid.fromString(params.ecosystemOrderId),
      params.symbol,
      params.side,
      params.price.toString(),
      params.amount.toString(),
      "OPEN",
      new Date(),
    ],
    { prepare: true }
  );
}

/**
 * Update real liquidity order status
 */
async function updateRealLiquidityOrderStatus(
  ecosystemOrderId: string,
  status: "OPEN" | "PARTIAL" | "FILLED" | "CANCELLED"
): Promise<void> {
  const query = `
    UPDATE ${aiMarketMakerKeyspace}.ai_real_liquidity_orders
    SET status = ?
    WHERE ecosystem_order_id = ?
  `;

  await client.execute(
    query,
    [status, types.Uuid.fromString(ecosystemOrderId)],
    { prepare: true }
  );
}

/**
 * Sync AI trade to ecosystem orderbook display
 * For AI-to-AI trades, this creates simulated liquidity around the trade price
 * to show realistic market depth
 *
 * @param symbol - Trading pair
 * @param price - Trade price (as number)
 * @param amount - Trade amount (as number)
 * @param side - Trade side
 */
export async function syncOrderbookFromAiTrade(
  symbol: string,
  price: number,
  amount: number,
  _side: "BUY" | "SELL"
): Promise<void> {
  // For AI trades, we REPLACE the entire orderbook with fresh entries around the trade price
  // This prevents accumulation of stale/corrupted entries
  //
  // IMPORTANT: In orderbook terminology:
  // - BIDS = buy orders = people wanting to BUY at prices BELOW current price
  // - ASKS = sell orders = people wanting to SELL at prices ABOVE current price
  // The ecosystem uses "BIDS" and "ASKS" as side values

  // First, clear existing orderbook entries for this symbol
  await clearOrderbookForSymbol(symbol);

  // Calculate spread levels (0.1% to 0.5% from trade price)
  const spreadLevels = [0.001, 0.002, 0.003, 0.004, 0.005];

  // Create BIDS (buy orders) BELOW the trade price - these show in green on left side
  for (const spread of spreadLevels) {
    const bidPrice = price * (1 - spread);
    const bidAmount = amount * (0.5 + Math.random() * 1.0); // 50-150% of trade amount
    await ecosystemUpdateOrderbook(symbol, bidPrice, bidAmount, "BIDS");
  }

  // Create ASKS (sell orders) ABOVE the trade price - these show in red on right side
  for (const spread of spreadLevels) {
    const askPrice = price * (1 + spread);
    const askAmount = amount * (0.5 + Math.random() * 1.0); // 50-150% of trade amount
    await ecosystemUpdateOrderbook(symbol, askPrice, askAmount, "ASKS");
  }
}

/**
 * Sync AI trade to ecosystem recent trades display
 * This inserts the trade into the trades table so it appears in the UI
 *
 * @param symbol - Trading pair
 * @param price - Trade price
 * @param amount - Trade amount
 * @param side - Trade side
 */
export async function syncTradeToEcosystem(
  symbol: string,
  price: number,
  amount: number,
  side: "BUY" | "SELL"
): Promise<void> {
  await ecosystemInsertTrade(symbol, price, amount, side, true);
}

/**
 * Clear old candle data for a symbol
 * Use this when initializing AI market maker to prevent chart gaps from old price data
 *
 * @param symbol - Trading pair to clear
 */
export async function clearCandlesForSymbol(symbol: string): Promise<void> {
  const intervals = ["1m", "5m", "15m", "30m", "1h", "4h", "1d"];

  for (const interval of intervals) {
    try {
      // Get all candles for this symbol/interval
      const query = `
        SELECT "createdAt" FROM ${scyllaKeyspace}.candles
        WHERE symbol = ? AND interval = ?
      `;

      const result = await client.execute(query, [symbol, interval], { prepare: true });

      // Delete each candle entry
      for (const row of result.rows) {
        const deleteQuery = `
          DELETE FROM ${scyllaKeyspace}.candles
          WHERE symbol = ? AND interval = ? AND "createdAt" = ?
        `;
        await client.execute(deleteQuery, [symbol, interval, row.createdAt], { prepare: true });
      }

      if (result.rows.length > 0) {
        logger.info("AI_MM", `Cleared ${result.rows.length} ${interval} candles for ${symbol}`);
      }
    } catch (error) {
      logger.error("AI_MM", `Failed to clear ${interval} candles for ${symbol}: ${error}`);
    }
  }
}

/**
 * Clear all orderbook entries for a symbol
 * Use this when initializing or resetting an AI market maker market
 *
 * @param symbol - Trading pair to clear
 */
export async function clearOrderbookForSymbol(symbol: string): Promise<void> {
  const sides = ["BIDS", "ASKS"];
  let totalCleared = 0;

  for (const side of sides) {
    // First get all prices for this symbol/side
    const query = `
      SELECT price FROM ${scyllaKeyspace}.orderbook
      WHERE symbol = ? AND side = ?
    `;

    try {
      const result = await client.execute(query, [symbol, side], { prepare: true });

      // Delete each entry
      for (const row of result.rows) {
        const deleteQuery = `
          DELETE FROM ${scyllaKeyspace}.orderbook
          WHERE symbol = ? AND side = ? AND price = ?
        `;
        await client.execute(deleteQuery, [symbol, side, row.price], { prepare: true });
        totalCleared++;
      }

      logger.info("AI_MM", `Cleared ${result.rows.length} ${side} orderbook entries for ${symbol}`);
    } catch (error) {
      logger.error("AI_MM", `Failed to clear orderbook for ${symbol} ${side}: ${error}`);
    }
  }

  // Also clear from orderbook_by_symbol materialized view's base table if exists
  // The view should update automatically when base table entries are deleted
  logger.info("AI_MM", `Total cleared: ${totalCleared} orderbook entries for ${symbol}`);
}

/**
 * Force clear ALL orderbook entries for a symbol - more aggressive version
 * Uses ALLOW FILTERING to find any stray entries
 */
export async function forceCleanOrderbook(symbol: string): Promise<number> {
  let totalCleared = 0;

  try {
    // Get ALL entries for this symbol from the orderbook_by_symbol view
    const query = `
      SELECT symbol, side, price FROM ${scyllaKeyspace}.orderbook_by_symbol
      WHERE symbol = ?
    `;

    const result = await client.execute(query, [symbol], { prepare: true });
    logger.info("AI_MM", `Found ${result.rows.length} total orderbook entries to clear for ${symbol}`);

    for (const row of result.rows) {
      try {
        const deleteQuery = `
          DELETE FROM ${scyllaKeyspace}.orderbook
          WHERE symbol = ? AND side = ? AND price = ?
        `;
        await client.execute(deleteQuery, [row.symbol, row.side, row.price], { prepare: true });
        totalCleared++;
      } catch (deleteErr) {
        logger.error("AI_MM", `Failed to delete entry: ${deleteErr}`);
      }
    }

    logger.info("AI_MM", `Force cleared ${totalCleared} orderbook entries for ${symbol}`);
    return totalCleared;
  } catch (error) {
    logger.error("AI_MM", `Force clean orderbook failed for ${symbol}: ${error}`);

    // Fallback to regular clear
    await clearOrderbookForSymbol(symbol);
    return -1;
  }
}

/**
 * Get the latest candle close price for a symbol
 * Used to initialize AI market maker at the last known price for chart continuity
 *
 * @param symbol - Trading pair
 * @returns The last close price or null if no candles exist
 */
export async function getLastCandleClosePrice(symbol: string): Promise<number | null> {
  try {
    // Query the most recent 1m candle (most granular)
    const query = `
      SELECT close FROM ${scyllaKeyspace}.candles
      WHERE symbol = ? AND interval = '1m'
      ORDER BY "createdAt" DESC
      LIMIT 1
    `;

    const result = await client.execute(query, [symbol], { prepare: true });

    if (result.rows.length > 0 && result.rows[0].close != null) {
      return result.rows[0].close;
    }

    return null;
  } catch (error) {
    logger.error("AI_MM", `Failed to get last candle price for ${symbol}: ${error}`);
    return null;
  }
}

/**
 * Update ecosystem candles with AI trade data
 * This ensures AI trades are reflected in price charts
 *
 * IMPORTANT: New candles use previous candle's close as their open price
 * to create continuous chart display without gaps
 *
 * @param symbol - Trading pair
 * @param price - Trade price
 * @param volume - Trade volume
 */
export async function syncCandlesFromAiTrade(
  symbol: string,
  price: number,
  volume: number
): Promise<void> {
  const intervals = ["1m", "5m", "15m", "30m", "1h", "4h", "1d"];
  const now = new Date();

  for (const interval of intervals) {
    const candleTime = getCandleTime(now, interval);

    try {
      // First check if candle exists for this time period
      const checkQuery = `
        SELECT open, high, low, close, volume FROM ${scyllaKeyspace}.candles
        WHERE symbol = ? AND interval = ? AND "createdAt" = ?
      `;

      const existingResult = await client.execute(
        checkQuery,
        [symbol, interval, candleTime],
        { prepare: true }
      );

      if (existingResult.rows.length > 0) {
        // Candle exists - update it
        const existing = existingResult.rows[0];
        const newHigh = Math.max(existing.high, price);
        const newLow = Math.min(existing.low, price);
        const newVolume = (existing.volume || 0) + volume;

        const updateQuery = `
          UPDATE ${scyllaKeyspace}.candles
          SET high = ?, low = ?, close = ?, volume = ?, "updatedAt" = ?
          WHERE symbol = ? AND interval = ? AND "createdAt" = ?
        `;

        await client.execute(
          updateQuery,
          [newHigh, newLow, price, newVolume, now, symbol, interval, candleTime],
          { prepare: true }
        );
      } else {
        // New candle - get previous candle's close to use as open
        const prevCandleTime = getPreviousCandleTime(candleTime, interval);
        const prevQuery = `
          SELECT close FROM ${scyllaKeyspace}.candles
          WHERE symbol = ? AND interval = ? AND "createdAt" = ?
        `;

        const prevResult = await client.execute(
          prevQuery,
          [symbol, interval, prevCandleTime],
          { prepare: true }
        );

        // Use previous close as open, or current price if no previous candle
        const openPrice = prevResult.rows.length > 0 ? prevResult.rows[0].close : price;

        const insertQuery = `
          INSERT INTO ${scyllaKeyspace}.candles (
            symbol, interval, "createdAt", "updatedAt", open, high, low, close, volume
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        await client.execute(
          insertQuery,
          [
            symbol,
            interval,
            candleTime,
            now,
            openPrice,  // Open = previous candle's close
            Math.max(openPrice, price),  // High = max of open and current price
            Math.min(openPrice, price),  // Low = min of open and current price
            price,  // Close = current price
            volume
          ],
          { prepare: true }
        );
      }
    } catch (error) {
      logger.error("AI_MM", `Failed to sync candle for ${symbol} ${interval}: ${error}`);
    }
  }
}

/**
 * Get the previous candle's timestamp based on interval
 */
function getPreviousCandleTime(currentTime: Date, interval: string): Date {
  const prevTime = new Date(currentTime);

  switch (interval) {
    case "1m":
      prevTime.setMinutes(prevTime.getMinutes() - 1);
      break;
    case "5m":
      prevTime.setMinutes(prevTime.getMinutes() - 5);
      break;
    case "15m":
      prevTime.setMinutes(prevTime.getMinutes() - 15);
      break;
    case "30m":
      prevTime.setMinutes(prevTime.getMinutes() - 30);
      break;
    case "1h":
      prevTime.setHours(prevTime.getHours() - 1);
      break;
    case "4h":
      prevTime.setHours(prevTime.getHours() - 4);
      break;
    case "1d":
      prevTime.setDate(prevTime.getDate() - 1);
      break;
    default:
      prevTime.setMinutes(prevTime.getMinutes() - 1);
  }

  return prevTime;
}

/**
 * Helper to calculate candle timestamp based on interval
 */
function getCandleTime(date: Date, interval: string): Date {
  const time = new Date(date);

  switch (interval) {
    case "1m":
      time.setSeconds(0, 0);
      break;
    case "5m":
      time.setMinutes(Math.floor(time.getMinutes() / 5) * 5, 0, 0);
      break;
    case "15m":
      time.setMinutes(Math.floor(time.getMinutes() / 15) * 15, 0, 0);
      break;
    case "30m":
      time.setMinutes(Math.floor(time.getMinutes() / 30) * 30, 0, 0);
      break;
    case "1h":
      time.setMinutes(0, 0, 0);
      break;
    case "4h":
      time.setHours(Math.floor(time.getHours() / 4) * 4, 0, 0, 0);
      break;
    case "1d":
      time.setHours(0, 0, 0, 0);
      break;
    default:
      time.setMinutes(0, 0, 0);
  }

  return time;
}

/**
 * Get AI real liquidity orders by symbol
 */
export async function getRealLiquidityOrdersBySymbol(
  symbol: string,
  status?: "OPEN" | "PARTIAL" | "FILLED" | "CANCELLED"
): Promise<RealLiquidityOrder[]> {
  let query = `
    SELECT * FROM ${aiMarketMakerKeyspace}.ai_real_liquidity_orders
    WHERE symbol = ?
  `;
  const params: any[] = [symbol];

  if (status) {
    query += ` AND status = ?`;
    params.push(status);
  }

  query += ` ALLOW FILTERING`;

  const result = await client.execute(query, params, { prepare: true });

  return result.rows.map((row) => ({
    id: row.ai_order_id?.toString(),
    aiBotOrderId: row.ai_order_id?.toString(),
    ecosystemOrderId: row.ecosystem_order_id?.toString(),
    symbol: row.symbol,
    side: row.side,
    price: toBigIntSafe(row.price),
    amount: toBigIntSafe(row.amount),
    status: row.status,
    createdAt: row.created_at,
  }));
}

/**
 * Calculate the split between AI-only and real liquidity orders
 * Based on the realLiquidityPercent setting
 *
 * @param totalAmount - Total amount to split
 * @param realLiquidityPercent - Percentage for real orders (0-100)
 * @returns Object with aiAmount and realAmount
 */
export function calculateLiquiditySplit(
  totalAmount: bigint,
  realLiquidityPercent: number
): { aiAmount: bigint; realAmount: bigint } {
  // Clamp percentage between 0 and 100
  const percent = Math.max(0, Math.min(100, realLiquidityPercent));

  // Calculate real amount (with proper bigint math)
  const realAmount = (totalAmount * BigInt(Math.round(percent * 100))) / BigInt(10000);
  const aiAmount = totalAmount - realAmount;

  return { aiAmount, realAmount };
}

/**
 * Get bot trade statistics from Scylla
 * Aggregates trade count and volume per bot for a given market
 *
 * @param marketId - The market maker ID
 * @returns Map of botId -> stats
 */
export async function getBotTradeStats(
  marketId: string
): Promise<Map<string, { tradeCount: number; totalVolume: number }>> {
  const statsMap = new Map<string, { tradeCount: number; totalVolume: number }>();

  // Query bot trade stats for market

  try {
    // Query trades for the last 7 days
    const dates: types.LocalDate[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(new types.LocalDate(date.getFullYear(), date.getMonth() + 1, date.getDate()));
    }

    // Query trades for each date
    for (const tradeDate of dates) {
      const query = `
        SELECT buy_bot_id, sell_bot_id, price, amount
        FROM ${aiMarketMakerKeyspace}.ai_bot_trades
        WHERE market_id = ? AND trade_date = ?
      `;

      const result = await client.execute(
        query,
        [types.Uuid.fromString(marketId), tradeDate],
        { prepare: true }
      );

      for (const row of result.rows) {
        // Count trades for buy bot
        const buyBotId = row.buy_bot_id?.toString();
        if (buyBotId) {
          const existing = statsMap.get(buyBotId) || { tradeCount: 0, totalVolume: 0 };
          existing.tradeCount++;
          existing.totalVolume += Number(toBigIntSafe(row.amount)) / 1e18;
          statsMap.set(buyBotId, existing);
        }

        // Count trades for sell bot
        const sellBotId = row.sell_bot_id?.toString();
        if (sellBotId) {
          const existing = statsMap.get(sellBotId) || { tradeCount: 0, totalVolume: 0 };
          existing.tradeCount++;
          existing.totalVolume += Number(toBigIntSafe(row.amount)) / 1e18;
          statsMap.set(sellBotId, existing);
        }
      }
    }
  } catch (error) {
    logger.error("AI_MM", `Failed to get bot trade stats for market ${marketId}: ${error}`);
  }

  return statsMap;
}

/**
 * Debug function to get ALL trades from Scylla across all markets
 * Use this to verify data exists and inspect stored market_id values
 */
export async function debugGetAllTrades(limit: number = 50): Promise<any[]> {
  try {
    // We can't easily query without partition key, but we can try with ALLOW FILTERING
    // Note: This is inefficient and should only be used for debugging
    const query = `
      SELECT market_id, trade_date, trade_time, buy_bot_id, sell_bot_id, price, amount
      FROM ${aiMarketMakerKeyspace}.ai_bot_trades
      LIMIT ?
      ALLOW FILTERING
    `;

    const result = await client.execute(query, [limit], { prepare: true });

    // Debug: found result.rows.length trades in Scylla

    return result.rows.map((row) => ({
      marketId: row.market_id?.toString(),
      tradeDate: row.trade_date?.toString(),
      tradeTime: row.trade_time,
      buyBotId: row.buy_bot_id?.toString(),
      sellBotId: row.sell_bot_id?.toString(),
      price: row.price?.toString(),
      amount: row.amount?.toString(),
    }));
  } catch (error) {
    logger.error("AI_MM", `DEBUG: Failed to get all trades: ${error}`);
    return [];
  }
}

/**
 * Get recent bot trades for a market (for WebSocket updates)
 * Returns the most recent trades across all recent dates
 *
 * @param marketId - The ecosystem market ID
 * @param limit - Maximum number of trades to return
 */
export async function getRecentBotTrades(
  marketId: string,
  limit: number = 20
): Promise<Array<{
  id: string;
  price: string;
  amount: string;
  buyBotId: string;
  sellBotId: string;
  createdAt: Date;
}>> {
  const trades: Array<{
    id: string;
    price: string;
    amount: string;
    buyBotId: string;
    sellBotId: string;
    createdAt: Date;
  }> = [];

  try {
    // Query trades for the last 7 days
    const dates: types.LocalDate[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(new types.LocalDate(date.getFullYear(), date.getMonth() + 1, date.getDate()));
    }

    for (const tradeDate of dates) {
      if (trades.length >= limit) break;

      const query = `
        SELECT trade_id, trade_time, buy_bot_id, sell_bot_id, price, amount
        FROM ${aiMarketMakerKeyspace}.ai_bot_trades
        WHERE market_id = ? AND trade_date = ?
        ORDER BY trade_time DESC
        LIMIT ?
      `;

      const result = await client.execute(
        query,
        [types.Uuid.fromString(marketId), tradeDate, limit - trades.length],
        { prepare: true }
      );

      for (const row of result.rows) {
        trades.push({
          id: row.trade_id?.toString() || "",
          price: (Number(toBigIntSafe(row.price)) / 1e18).toFixed(8),
          amount: (Number(toBigIntSafe(row.amount)) / 1e18).toFixed(8),
          buyBotId: row.buy_bot_id?.toString() || "",
          sellBotId: row.sell_bot_id?.toString() || "",
          createdAt: row.trade_time,
        });
      }
    }

    // Sort by createdAt descending (most recent first)
    trades.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return trades.slice(0, limit);
  } catch (error) {
    logger.error("AI_MM", `Failed to get recent bot trades for market ${marketId}: ${error}`);
    return [];
  }
}

/**
 * Get total trade count and volume for a market from Scylla
 */
export async function getMarketTradeStats(
  marketId: string
): Promise<{ tradeCount: number; totalVolume: number }> {
  let tradeCount = 0;
  let totalVolume = 0;

  try {
    // Query trades for last 7 days
    const dates: types.LocalDate[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(new types.LocalDate(date.getFullYear(), date.getMonth() + 1, date.getDate()));
    }

    for (const tradeDate of dates) {
      const query = `
        SELECT price, amount
        FROM ${aiMarketMakerKeyspace}.ai_bot_trades
        WHERE market_id = ? AND trade_date = ?
      `;

      const result = await client.execute(
        query,
        [types.Uuid.fromString(marketId), tradeDate],
        { prepare: true }
      );

      for (const row of result.rows) {
        tradeCount++;
        totalVolume += Number(toBigIntSafe(row.amount)) / 1e18;
      }
    }
  } catch (error) {
    logger.error("AI_MM", `Failed to get market trade stats for ${marketId}: ${error}`);
  }

  return { tradeCount, totalVolume };
}

// ============================================
// Cleanup Functions for Market Maker Deletion
// ============================================

/**
 * Delete all AI bot orders for a market from ScyllaDB
 * @param marketId - The ecosystem market ID
 */
export async function deleteAiBotOrdersByMarket(marketId: string): Promise<number> {
  let deletedCount = 0;

  try {
    // First get all orders for this market
    const selectQuery = `
      SELECT order_id, created_at FROM ${aiMarketMakerKeyspace}.ai_bot_orders
      WHERE market_id = ?
    `;

    const result = await client.execute(
      selectQuery,
      [types.Uuid.fromString(marketId)],
      { prepare: true }
    );

    // Delete each order
    for (const row of result.rows) {
      const deleteQuery = `
        DELETE FROM ${aiMarketMakerKeyspace}.ai_bot_orders
        WHERE market_id = ? AND created_at = ? AND order_id = ?
      `;

      await client.execute(
        deleteQuery,
        [types.Uuid.fromString(marketId), row.created_at, row.order_id],
        { prepare: true }
      );
      deletedCount++;
    }

    logger.info("AI_MM", `Cleanup: Deleted ${deletedCount} bot orders for market ${marketId}`);
  } catch (error) {
    logger.error("AI_MM", `Cleanup: Failed to delete bot orders for market ${marketId}: ${error}`);
  }

  return deletedCount;
}

/**
 * Delete all AI bot trades for a market from ScyllaDB
 * @param marketId - The ecosystem market ID
 */
export async function deleteAiBotTradesByMarket(marketId: string): Promise<number> {
  let deletedCount = 0;

  try {
    // Query trades for the last 365 days to ensure we get all historical data
    const dates: types.LocalDate[] = [];
    for (let i = 0; i < 365; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(new types.LocalDate(date.getFullYear(), date.getMonth() + 1, date.getDate()));
    }

    for (const tradeDate of dates) {
      // Get all trades for this date
      const selectQuery = `
        SELECT trade_time, trade_id FROM ${aiMarketMakerKeyspace}.ai_bot_trades
        WHERE market_id = ? AND trade_date = ?
      `;

      const result = await client.execute(
        selectQuery,
        [types.Uuid.fromString(marketId), tradeDate],
        { prepare: true }
      );

      // Delete each trade
      for (const row of result.rows) {
        const deleteQuery = `
          DELETE FROM ${aiMarketMakerKeyspace}.ai_bot_trades
          WHERE market_id = ? AND trade_date = ? AND trade_time = ? AND trade_id = ?
        `;

        await client.execute(
          deleteQuery,
          [types.Uuid.fromString(marketId), tradeDate, row.trade_time, row.trade_id],
          { prepare: true }
        );
        deletedCount++;
      }
    }

    logger.info("AI_MM", `Cleanup: Deleted ${deletedCount} bot trades for market ${marketId}`);
  } catch (error) {
    logger.error("AI_MM", `Cleanup: Failed to delete bot trades for market ${marketId}: ${error}`);
  }

  return deletedCount;
}

/**
 * Delete all AI price history for a market from ScyllaDB
 * @param marketId - The ecosystem market ID
 */
export async function deleteAiPriceHistoryByMarket(marketId: string): Promise<number> {
  let deletedCount = 0;

  try {
    // Get all price history entries for this market
    const selectQuery = `
      SELECT timestamp FROM ${aiMarketMakerKeyspace}.ai_price_history
      WHERE market_id = ?
    `;

    const result = await client.execute(
      selectQuery,
      [types.Uuid.fromString(marketId)],
      { prepare: true }
    );

    // Delete each entry
    for (const row of result.rows) {
      const deleteQuery = `
        DELETE FROM ${aiMarketMakerKeyspace}.ai_price_history
        WHERE market_id = ? AND timestamp = ?
      `;

      await client.execute(
        deleteQuery,
        [types.Uuid.fromString(marketId), row.timestamp],
        { prepare: true }
      );
      deletedCount++;
    }

    logger.info("AI_MM", `Cleanup: Deleted ${deletedCount} price history entries for market ${marketId}`);
  } catch (error) {
    logger.error("AI_MM", `Cleanup: Failed to delete price history for market ${marketId}: ${error}`);
  }

  return deletedCount;
}

/**
 * Delete all real liquidity order tracking records for a symbol
 * @param symbol - Trading pair symbol (e.g., "BTC/USDT")
 */
export async function deleteRealLiquidityOrdersBySymbol(symbol: string): Promise<number> {
  let deletedCount = 0;

  try {
    // Get all real liquidity orders for this symbol
    const selectQuery = `
      SELECT ai_order_id, ecosystem_order_id FROM ${aiMarketMakerKeyspace}.ai_real_liquidity_orders
      WHERE symbol = ?
      ALLOW FILTERING
    `;

    const result = await client.execute(selectQuery, [symbol], { prepare: true });

    // Delete each entry
    for (const row of result.rows) {
      const deleteQuery = `
        DELETE FROM ${aiMarketMakerKeyspace}.ai_real_liquidity_orders
        WHERE ecosystem_order_id = ?
      `;

      await client.execute(
        deleteQuery,
        [row.ecosystem_order_id],
        { prepare: true }
      );
      deletedCount++;
    }

    logger.info("AI_MM", `Cleanup: Deleted ${deletedCount} real liquidity order records for ${symbol}`);
  } catch (error) {
    logger.error("AI_MM", `Cleanup: Failed to delete real liquidity orders for ${symbol}: ${error}`);
  }

  return deletedCount;
}

/**
 * Get all open ecosystem order IDs placed by bots for a symbol
 * @param symbol - Trading pair symbol
 * @returns Array of ecosystem order IDs that need to be cancelled
 */
export async function getOpenBotEcosystemOrderIds(symbol: string): Promise<string[]> {
  const orderIds: string[] = [];

  try {
    const query = `
      SELECT ecosystem_order_id FROM ${aiMarketMakerKeyspace}.ai_real_liquidity_orders
      WHERE symbol = ? AND status = 'OPEN'
      ALLOW FILTERING
    `;

    const result = await client.execute(query, [symbol], { prepare: true });

    for (const row of result.rows) {
      if (row.ecosystem_order_id) {
        orderIds.push(row.ecosystem_order_id.toString());
      }
    }

    logger.info("AI_MM", `Cleanup: Found ${orderIds.length} open bot orders for ${symbol}`);
  } catch (error) {
    logger.error("AI_MM", `Cleanup: Failed to get open bot orders for ${symbol}: ${error}`);
  }

  return orderIds;
}

/**
 * Comprehensive cleanup of all AI market maker data for a market maker
 * Call this when deleting a market maker
 *
 * @param marketId - The ecosystem market ID
 * @param symbol - Trading pair symbol
 * @returns Cleanup statistics
 */
export async function cleanupMarketMakerData(
  marketId: string,
  symbol: string
): Promise<{
  ordersDeleted: number;
  tradesDeleted: number;
  priceHistoryDeleted: number;
  realLiquidityOrdersDeleted: number;
  orderbookEntriesCleared: number;
}> {
  logger.info("AI_MM", `Cleanup: Starting cleanup for market ${marketId} (${symbol})`);

  // Delete AI bot orders
  const ordersDeleted = await deleteAiBotOrdersByMarket(marketId);

  // Delete AI bot trades
  const tradesDeleted = await deleteAiBotTradesByMarket(marketId);

  // Delete price history
  const priceHistoryDeleted = await deleteAiPriceHistoryByMarket(marketId);

  // Delete real liquidity order tracking
  const realLiquidityOrdersDeleted = await deleteRealLiquidityOrdersBySymbol(symbol);

  // Clear orderbook entries for this symbol
  const orderbookEntriesCleared = await forceCleanOrderbook(symbol);

  logger.info("AI_MM", `Cleanup: Completed cleanup for ${symbol}: orders=${ordersDeleted}, trades=${tradesDeleted}, priceHistory=${priceHistoryDeleted}, realLiquidityOrders=${realLiquidityOrdersDeleted}, orderbookEntries=${orderbookEntriesCleared}`);

  return {
    ordersDeleted,
    tradesDeleted,
    priceHistoryDeleted,
    realLiquidityOrdersDeleted,
    orderbookEntriesCleared,
  };
}
