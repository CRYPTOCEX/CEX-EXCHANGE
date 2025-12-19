import {
  fromBigInt,
  fromBigIntMultiply,
  removeTolerance,
  toBigIntFloat,
} from "../blockchain";
import client from "./client";
import { types } from "cassandra-driver";
import { makeUuid } from "@b/utils/passwords";
import { MatchingEngine } from "../matchingEngine";
import { getWalletByUserIdAndCurrency, updateWalletBalance } from "../wallet";
import { getEcosystemToken } from "../tokens";
import { logger } from "@b/utils/console";
const scyllaKeyspace = process.env.SCYLLA_KEYSPACE || "trading";

// Cache for token decimals to avoid repeated database queries
const tokenDecimalsCache = new Map<string, number>();

/**
 * Get the tolerance digits for removeTolerance based on token decimals
 * Formula: toleranceDigits = 18 - decimals
 * This removes insignificant digits beyond the token's precision
 */
function getToleranceDigits(decimals: number): number {
  return 18 - decimals;
}

/**
 * Get token decimals from symbol (e.g., "BTC/USDT" -> BTC decimals)
 * Uses cache to avoid repeated database queries
 */
async function getSymbolDecimals(symbol: string): Promise<number> {
  const [baseCurrency] = symbol.split("/");

  // Check cache first
  if (tokenDecimalsCache.has(baseCurrency)) {
    return tokenDecimalsCache.get(baseCurrency)!;
  }

  try {
    // Try to get token info from various chains
    // We'll try common chains until we find the token
    const commonChains = ['ETH', 'BSC', 'MATIC', 'BTC', 'SOL'];

    for (const chain of commonChains) {
      try {
        const token = await getEcosystemToken(chain, baseCurrency);
        if (token && token.decimals !== undefined) {
          tokenDecimalsCache.set(baseCurrency, token.decimals);
          return token.decimals;
        }
      } catch (e) {
        // Token not found on this chain, continue to next
        continue;
      }
    }

    // If not found, default to 8 decimals (common for most crypto)
    logger.warn("SCYLLA", `Could not find decimals for ${baseCurrency}, defaulting to 8`);
    tokenDecimalsCache.set(baseCurrency, 8);
    return 8;
  } catch (error) {
    logger.error("SCYLLA", `Error fetching decimals for ${symbol}`, error);
    // Default to 8 decimals
    return 8;
  }
}

// Define a TypeScript interface for the "orders" table
export interface Order {
  id: string;
  userId: string;
  symbol: string;
  type: string;
  timeInForce?: string;
  side: string;
  price: bigint;
  average?: bigint;
  amount: bigint;
  filled: bigint;
  remaining: bigint;
  cost: bigint;
  trades: string;
  fee: bigint;
  feeCurrency: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  // AI Market Maker fields - if set, this order uses pool liquidity instead of user wallets
  marketMakerId?: string;  // AI Market Maker ID - indicates this is a bot order
  botId?: string;          // Specific bot that placed this order
}

export interface MatchedOrder {
  userId: string;
  symbol: string;
  side: string;
  price: bigint;
  updatedAt: Date;
  createdAt: Date;
  amount: bigint;
  id: string;
  filled?: bigint;
  remaining?: bigint;
  trades?: string;
}

// Define a TypeScript interface for the "candles" table
export interface Candle {
  symbol: string;
  interval: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  updatedAt: Date;
  createdAt: Date;
}

export interface OrderBook {
  bids: Record<string, bigint>;
  asks: Record<string, bigint>;
}

export interface OrderBookData {
  price: bigint;
  amount: bigint;
  side: string;
}

export interface OrderBookDatas {
  symbol: string;
  price: bigint;
  amount: bigint;
  side: string;
}

export async function query(q: string, params: any[] = []): Promise<any> {
  return client.execute(q, params, { prepare: true });
}

/**
 * Retrieves orders by user ID with pagination.
 * @param userId - The ID of the user whose orders are to be retrieved.
 * @param pageState - The page state for pagination. Default is null.
 * @param limit - The maximum number of orders to retrieve per page. Default is 10.
 * @returns A Promise that resolves with an array of orders and the next page state.
 */
export async function getOrdersByUserId(userId: string): Promise<Order[]> {
  const query = `
    SELECT * FROM ${scyllaKeyspace}.orders
    WHERE "userId" = ?
    ORDER BY "createdAt" DESC;
  `;
  const params = [userId];

  try {
    const result = await client.execute(query, params, { prepare: true });
    const orders = result.rows.map(mapRowToOrder);
    return orders;
  } catch (error) {
    logger.error("SCYLLA", `Failed to fetch orders by userId: ${error.message}`, error);
    throw new Error(`Failed to fetch orders by userId: ${error.message}`);
  }
}

function mapRowToOrder(row: any): Order {
  return {
    id: row.id,
    userId: row.userId,
    symbol: row.symbol,
    type: row.type,
    side: row.side,
    price: row.price,
    amount: row.amount,
    filled: row.filled,
    remaining: row.remaining,
    timeInForce: row.timeInForce,
    cost: row.cost,
    fee: row.fee,
    feeCurrency: row.feeCurrency,
    average: row.average,
    trades: row.trades,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    // AI Market Maker fields - for pool-based liquidity
    marketMakerId: row.marketMakerId,
    botId: row.botId,
  };
}

export function getOrderByUuid(
  userId: string,
  id: string,
  createdAt: string
): Promise<Order> {
  const query = `
    SELECT * FROM ${scyllaKeyspace}.orders
    WHERE "userId" = ? AND id = ? AND "createdAt" = ?;
  `;
  const params = [userId, id, createdAt];

  return client
    .execute(query, params, { prepare: true })
    .then((result) => result.rows[0])
    .then(mapRowToOrder);
}
export async function cancelOrderByUuid(
  userId: string,
  id: string,
  createdAt: string,
  symbol: string,
  price: bigint,
  side: string,
  amount: bigint
): Promise<any> {
  // IMPORTANT: First verify the order exists with this exact userId/createdAt/id combination
  // This prevents ScyllaDB from creating a new row with null fields when UPDATE is called
  // with a non-existent primary key (ScyllaDB's upsert behavior)
  const checkQuery = `
    SELECT id, symbol, status FROM ${scyllaKeyspace}.orders
    WHERE "userId" = ? AND "createdAt" = ? AND id = ?;
  `;
  const checkParams = [userId, new Date(createdAt), id];

  try {
    const checkResult = await client.execute(checkQuery, checkParams, { prepare: true });
    if (checkResult.rows.length === 0) {
      // Order doesn't exist with this userId - don't create a ghost record
      logger.warn("SCYLLA", `Order ${id} not found for user ${userId} at ${createdAt} - skipping cancellation to prevent ghost record`);
      return;
    }

    // Verify the order is not already cancelled
    const existingOrder = checkResult.rows[0];
    if (existingOrder.status === "CANCELED" || existingOrder.status === "CLOSED") {
      logger.debug("SCYLLA", `Order ${id} is already ${existingOrder.status} - skipping`);
      return;
    }
  } catch (checkError) {
    logger.error("SCYLLA", `Failed to check order existence: ${checkError.message}`, checkError);
    throw checkError;
  }

  const priceFormatted = fromBigInt(price);
  const orderbookSide = side === "BUY" ? "BIDS" : "ASKS";
  const orderbookAmount = await getOrderbookEntry(
    symbol,
    priceFormatted,
    orderbookSide
  );

  let orderbookQuery: string = "";
  let orderbookParams: any[] = [];
  if (orderbookAmount) {
    const newAmount = orderbookAmount - amount;

    if (newAmount <= BigInt(0)) {
      // Remove the order from the orderbook entirely
      orderbookQuery = `DELETE FROM ${scyllaKeyspace}.orderbook WHERE symbol = ? AND price = ? AND side = ?`;
      orderbookParams = [symbol, priceFormatted.toString(), orderbookSide];
    } else {
      // Update the orderbook with the reduced amount
      orderbookQuery = `UPDATE ${scyllaKeyspace}.orderbook SET amount = ? WHERE symbol = ? AND price = ? AND side = ?`;
      orderbookParams = [
        fromBigInt(newAmount).toString(),
        symbol,
        priceFormatted.toString(),
        orderbookSide,
      ];
    }
  } else {
    // This is expected when canceling AI market maker orders - the orderbook gets rebuilt regularly
    // Only log in development to reduce noise
    if (process.env.NODE_ENV === "development") {
      logger.debug("SCYLLA", `No orderbook entry found for symbol: ${symbol}, price: ${priceFormatted}, side: ${orderbookSide}`);
    }
  }

  // Instead of deleting the order, update its status
  // Keep the remaining amount to preserve partial fill information
  const currentTimestamp = new Date();
  const updateOrderQuery = `
    UPDATE ${scyllaKeyspace}.orders
    SET status = 'CANCELED', "updatedAt" = ?
    WHERE "userId" = ? AND id = ? AND "createdAt" = ?;
  `;
  const updateOrderParams = [currentTimestamp, userId, id, new Date(createdAt)];

  const batchQueries = orderbookQuery
    ? [
        { query: orderbookQuery, params: orderbookParams },
        { query: updateOrderQuery, params: updateOrderParams },
      ]
    : [{ query: updateOrderQuery, params: updateOrderParams }];

  try {
    await client.batch(batchQueries, { prepare: true });
  } catch (error) {
    logger.error("SCYLLA", `Failed to cancel order and update orderbook: ${error.message}`, error);
    throw new Error(
      `Failed to cancel order and update orderbook: ${error.message}`
    );
  }
}

export async function getOrderbookEntry(
  symbol: string,
  price: number,
  side: string
): Promise<any> {
  const query = `
    SELECT * FROM ${scyllaKeyspace}.orderbook
    WHERE symbol = ? AND price = ? AND side = ?;
  `;
  const params = [symbol, price, side];

  try {
    const result = await client.execute(query, params, { prepare: true });
    if (result.rows.length > 0) {
      const row = result.rows[0];
      return toBigIntFloat(row["amount"]);
    } else {
      // Orderbook entry may not exist for AI market maker orders - this is expected
      // The AI rebuilds the orderbook periodically, so entries come and go
      return null;
    }
  } catch (error) {
    logger.error("SCYLLA", `Failed to fetch orderbook entry: ${error.message}`, error);
    throw new Error(`Failed to fetch orderbook entry: ${error.message}`);
  }
}

/**
 * Creates a new order in the orders table.
 * @param order - The order object to be inserted into the table.
 * @returns A Promise that resolves when the order has been successfully inserted.
 */
export async function createOrder({
  userId,
  symbol,
  amount,
  price,
  cost,
  type,
  side,
  fee,
  feeCurrency,
  marketMakerId,
  botId,
}: {
  userId: string;
  symbol: string;
  amount: bigint;
  price: bigint;
  cost: bigint;
  type: string;
  side: string;
  fee: bigint;
  feeCurrency: string;
  // AI Market Maker - if provided, this order uses pool liquidity instead of user wallets
  marketMakerId?: string;
  botId?: string;
}): Promise<Order> {
  // CRITICAL VALIDATION: Prevent creating orders with null/undefined required fields
  // This prevents ScyllaDB from accepting incomplete data that creates corrupted records
  if (!userId || typeof userId !== 'string') {
    throw new Error('Cannot create order: userId is required and must be a valid string');
  }
  if (!symbol || typeof symbol !== 'string') {
    throw new Error('Cannot create order: symbol is required and must be a valid string');
  }
  if (!type || typeof type !== 'string') {
    throw new Error('Cannot create order: type is required and must be a valid string');
  }
  if (!side || typeof side !== 'string') {
    throw new Error('Cannot create order: side is required and must be a valid string');
  }
  if (!feeCurrency || typeof feeCurrency !== 'string') {
    throw new Error('Cannot create order: feeCurrency is required and must be a valid string');
  }
  if (typeof price !== 'bigint') {
    throw new Error('Cannot create order: price is required and must be a bigint');
  }
  if (typeof amount !== 'bigint') {
    throw new Error('Cannot create order: amount is required and must be a bigint');
  }
  if (typeof cost !== 'bigint') {
    throw new Error('Cannot create order: cost is required and must be a bigint');
  }
  if (typeof fee !== 'bigint') {
    throw new Error('Cannot create order: fee is required and must be a bigint');
  }

  const currentTimestamp = new Date();
  const query = `
    INSERT INTO ${scyllaKeyspace}.orders (id, "userId", symbol, type, "timeInForce", side, price, amount, filled, remaining, cost, fee, "feeCurrency", status, "createdAt", "updatedAt", "marketMakerId", "botId")
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `;
  const priceTolerance = removeTolerance(price);
  const amountTolerance = removeTolerance(amount);
  const costTolerance = removeTolerance(cost);
  const feeTolerance = removeTolerance(fee);
  const id = makeUuid();
  const params = [
    id,
    userId,
    symbol,
    type,
    "GTC",
    side,
    priceTolerance.toString(),
    amountTolerance.toString(),
    "0",
    amountTolerance.toString(),
    costTolerance.toString(),
    feeTolerance.toString(),
    feeCurrency,
    "OPEN",
    currentTimestamp,
    currentTimestamp,
    marketMakerId || null,
    botId || null,
  ];

  try {
    await client.execute(query, params, {
      prepare: true,
    });

    const newOrder: Order = {
      id,
      userId,
      symbol,
      type,
      timeInForce: "GTC",
      side,
      price: priceTolerance,
      amount: amountTolerance,
      filled: BigInt(0),
      remaining: amountTolerance,
      cost: costTolerance,
      fee: feeTolerance,
      feeCurrency,
      average: BigInt(0),
      trades: "",
      status: "OPEN",
      createdAt: currentTimestamp,
      updatedAt: currentTimestamp,
      // AI Market Maker metadata - passed through for matching engine
      marketMakerId,
      botId,
    };

    const matchingEngine = await MatchingEngine.getInstance();
    matchingEngine.addToQueue(newOrder);
    return newOrder;
  } catch (error) {
    logger.error("SCYLLA", `Failed to create order: ${error.message}`, error);
    throw new Error(`Failed to create order: ${error.message}`);
  }
}

export async function getHistoricalCandles(
  symbol: string,
  interval: string,
  from: number,
  to: number
): Promise<number[][]> {
  try {
    const query = `
      SELECT * FROM ${scyllaKeyspace}.candles
      WHERE symbol = ?
      AND interval = ?
      AND "createdAt" >= ?
      AND "createdAt" <= ?
      ORDER BY "createdAt" ASC;
    `;
    const params = [symbol, interval, new Date(from), new Date(to)];

    // Execute the query using your existing ScyllaDB client
    const result = await client.execute(query, params, { prepare: true });

    // Map the rows to Candle objects
    const candles: number[][] = result.rows.map((row) => [
      row.createdAt.getTime(),
      row.open,
      row.high,
      row.low,
      row.close,
      row.volume,
    ]);

    return candles;
  } catch (error) {
    throw new Error(`Failed to fetch historical candles: ${error.message}`);
  }
}

export async function getOrderBook(
  symbol: string
): Promise<{ asks: number[][]; bids: number[][] }> {
  const askQuery = `
    SELECT * FROM ${scyllaKeyspace}.orderbook
    WHERE symbol = ? AND side = 'ASKS'
    LIMIT 50;
  `;
  const bidQuery = `
    SELECT * FROM ${scyllaKeyspace}.orderbook
    WHERE symbol = ? AND side = 'BIDS'
    ORDER BY price DESC
    LIMIT 50;
  `;

  const [askRows, bidRows] = await Promise.all([
    client.execute(askQuery, [symbol], { prepare: true }),
    client.execute(bidQuery, [symbol], { prepare: true }),
  ]);

  const asks = askRows.rows.map((row) => [row.price, row.amount]);
  const bids = bidRows.rows.map((row) => [row.price, row.amount]);

  return { asks, bids };
}

/**
 * Retrieves all orders with status 'OPEN'.
 *
 * NOTE: We query from the base orders table instead of open_orders materialized view
 * because the view may not include marketMakerId and botId columns if it was created
 * before those columns were added via migrations. This is a Scylla/Cassandra limitation -
 * materialized views don't auto-update when base table schema changes.
 *
 * @returns A Promise that resolves with an array of open orders.
 */
export async function getAllOpenOrders(): Promise<any[]> {
  // The orderbook table has a composite partition key (symbol, side), so we need to
  // include both columns in SELECT DISTINCT to comply with Scylla/Cassandra requirements.
  // We query both BIDS and ASKS sides and extract unique symbols.
  const symbolsQuery = `
    SELECT DISTINCT symbol, side FROM ${scyllaKeyspace}.orderbook;
  `;

  try {
    const symbolsResult = await client.execute(symbolsQuery, [], { prepare: true });
    // Extract unique symbols from the results (since we get symbol,side pairs)
    const uniqueSymbols = new Set<string>();
    symbolsResult.rows.forEach(row => {
      if (row.symbol) {
        uniqueSymbols.add(row.symbol);
      }
    });
    const symbols = Array.from(uniqueSymbols);

    if (symbols.length === 0) {
      return [];
    }

    // Query orders table directly for each symbol to get all columns including marketMakerId, botId
    const allOrders: any[] = [];

    for (const symbol of symbols) {
      const query = `
        SELECT * FROM ${scyllaKeyspace}.orders
        WHERE status = 'OPEN' AND symbol = ?
        ALLOW FILTERING;
      `;

      try {
        const result = await client.execute(query, [symbol], { prepare: true });
        allOrders.push(...result.rows);
      } catch (err) {
        // Skip errors for individual symbols
        logger.warn("SCYLLA", `Failed to fetch open orders for symbol ${symbol}: ${err.message}`);
      }
    }

    return allOrders;
  } catch (error) {
    logger.error("SCYLLA", `Failed to fetch all open orders: ${error.message}`, error);
    throw new Error(`Failed to fetch all open orders: ${error.message}`);
  }
}

/**
 * Fetches the latest candle for each interval.
 * @param symbol - The trading pair symbol for which to fetch the candles.
 * @returns A Promise that resolves with a record containing the latest candle for each interval.
 */
/**
 * Fetches the latest candle for each interval.
 * @returns A Promise that resolves with an array of the latest candles.
 */
export async function getLastCandles(): Promise<Candle[]> {
  try {
    // Fetch the latest candle for each symbol and interval
    const query = `
      SELECT symbol, interval, open, high, low, close, volume, "createdAt", "updatedAt" 
      FROM ${scyllaKeyspace}.latest_candles;
    `;

    const result = await client.execute(query, [], { prepare: true });

    const latestCandles = result.rows.map((row) => {
      return {
        symbol: row.symbol,
        interval: row.interval,
        open: row.open,
        high: row.high,
        low: row.low,
        close: row.close,
        volume: row.volume,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
      };
    });

    return latestCandles;
  } catch (error) {
    logger.error("SCYLLA", `Failed to fetch latest candles: ${error.message}`, error);
    throw new Error(`Failed to fetch latest candles: ${error.message}`);
  }
}

export async function getYesterdayCandles(): Promise<{
  [symbol: string]: Candle[];
}> {
  try {
    // Calculate the date range for "yesterday"
    const endOfYesterday = new Date();
    endOfYesterday.setHours(0, 0, 0, 0);
    const startOfYesterday = new Date(
      endOfYesterday.getTime() - 24 * 60 * 60 * 1000
    );

    // Query to get candles for yesterday
    const query = `
      SELECT * FROM ${scyllaKeyspace}.latest_candles
      WHERE "createdAt" >= ? AND "createdAt" < ?;
    `;

    const result = await client.execute(
      query,
      [startOfYesterday.toISOString(), endOfYesterday.toISOString()],
      { prepare: true }
    );

    const yesterdayCandles: { [symbol: string]: Candle[] } = {};

    for (const row of result.rows) {
      // Only consider candles with a '1d' interval
      if (row.interval !== "1d") {
        continue;
      }

      const candle: Candle = {
        symbol: row.symbol,
        interval: row.interval,
        open: row.open,
        high: row.high,
        low: row.low,
        close: row.close,
        volume: row.volume,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
      };

      if (!yesterdayCandles[row.symbol]) {
        yesterdayCandles[row.symbol] = [];
      }

      yesterdayCandles[row.symbol].push(candle);
    }

    return yesterdayCandles;
  } catch (error) {
    logger.error("SCYLLA", `Failed to fetch yesterday's candles: ${error.message}`, error);
    throw new Error(`Failed to fetch yesterday's candles: ${error.message}`);
  }
}

export async function generateOrderUpdateQueries(
  ordersToUpdate: Order[]
): Promise<Array<{ query: string; params: any[] }>> {
  // Get unique symbols and fetch their decimals
  const symbols = [...new Set(ordersToUpdate.map(order => order.symbol))];
  const decimalsMap = new Map<string, number>();

  // Fetch decimals for all unique symbols in parallel
  await Promise.all(
    symbols.map(async (symbol) => {
      const decimals = await getSymbolDecimals(symbol);
      decimalsMap.set(symbol, decimals);
    })
  );

  const queries = ordersToUpdate.map((order) => {
    const decimals = decimalsMap.get(order.symbol) || 8;
    const toleranceDigits = getToleranceDigits(decimals);

    return {
      query: `
        UPDATE ${scyllaKeyspace}.orders
        SET filled = ?, remaining = ?, status = ?, "updatedAt" = ?, trades = ?
        WHERE "userId" = ? AND "createdAt" = ? AND id = ?;
      `,
      params: [
        // Use removeTolerance with dynamic tolerance based on token decimals
        // Formula: toleranceDigits = 18 - decimals
        // This removes insignificant trailing digits beyond the token's precision
        // while preserving small values (e.g., 0.00000001 for 8-decimal tokens)
        removeTolerance(order.filled, toleranceDigits).toString(),
        removeTolerance(order.remaining, toleranceDigits).toString(),
        order.status,
        new Date(),
        JSON.stringify(order.trades),
        order.userId,
        order.createdAt,
        order.id,
      ],
    };
  });
  return queries;
}

export async function fetchOrderBooks(): Promise<OrderBookDatas[] | null> {
  const query = `
    SELECT * FROM ${scyllaKeyspace}.orderbook;
  `;

  try {
    const result = await client.execute(query);
    return result.rows.map((row) => ({
      symbol: row.symbol,
      price: row.price,
      amount: row.amount,
      side: row.side,
    }));
  } catch (error) {
    logger.error("SCYLLA", `Failed to fetch order books: ${error.message}`, error);
    return null;
  }
}

export async function updateOrderBookInDB(
  symbol: string,
  price: number,
  amount: number,
  side: string
) {
  let query: string;
  let params: any[];

  if (amount > 0) {
    query = `
      INSERT INTO ${scyllaKeyspace}.orderbook (symbol, price, amount, side)
      VALUES (?, ?, ?, ?);
    `;
    params = [symbol, price, amount, side.toUpperCase()];
  } else {
    query = `
      DELETE FROM ${scyllaKeyspace}.orderbook
      WHERE symbol = ? AND price = ? AND side = ?;
    `;
    params = [symbol, price, side.toUpperCase()];
  }

  try {
    await client.execute(query, params, { prepare: true });
  } catch (error) {
    logger.error("SCYLLA", `Failed to update order book: ${error.message}`, error);
  }
}

export async function deleteAllMarketData(symbol: string) {
  // Step 1: Fetch the primary keys from the materialized view for orders
  const ordersResult = await client.execute(
    `
      SELECT "userId", "createdAt", id
      FROM ${scyllaKeyspace}.orders_by_symbol
      WHERE symbol = ?
      ALLOW FILTERING;
    `,
    [symbol],
    { prepare: true }
  );

  for (const row of ordersResult.rows) {
    await cancelAndRefundOrder(row.userId, row.id, row.createdAt);
  }

  const deleteOrdersQueries = ordersResult.rows.map((row) => ({
    query: `
      DELETE FROM ${scyllaKeyspace}.orders
      WHERE "userId" = ? AND "createdAt" = ? AND id = ?;
    `,
    params: [row.userId, row.createdAt, row.id],
  }));

  // Step 2: Fetch the primary keys for candles
  const candlesResult = await client.execute(
    `
      SELECT interval, "createdAt"
      FROM ${scyllaKeyspace}.candles
      WHERE symbol = ?;
    `,
    [symbol],
    { prepare: true }
  );

  const deleteCandlesQueries = candlesResult.rows.map((row) => ({
    query: `
      DELETE FROM ${scyllaKeyspace}.candles
      WHERE symbol = ? AND interval = ? AND "createdAt" = ?;
    `,
    params: [symbol, row.interval, row.createdAt],
  }));

  // Step 3: Fetch the primary keys for orderbook
  const sides = ["ASKS", "BIDS"];

  const deleteOrderbookQueries: Array<{ query: string; params: any[] }> = [];
  for (const side of sides) {
    const orderbookResult = await client.execute(
      `
        SELECT price
        FROM ${scyllaKeyspace}.orderbook
        WHERE symbol = ? AND side = ?;
      `,
      [symbol, side],
      { prepare: true }
    );

    const queries = orderbookResult.rows.map((row) => ({
      query: `
        DELETE FROM ${scyllaKeyspace}.orderbook
        WHERE symbol = ? AND side = ? AND price = ?;
      `,
      params: [symbol, side, row.price],
    }));

    deleteOrderbookQueries.push(...queries);
  }

  // Step 4: Combine all queries in a batch
  const batchQueries = [
    ...deleteOrdersQueries,
    ...deleteCandlesQueries,
    ...deleteOrderbookQueries,
  ];

  if (batchQueries.length === 0) {
    return;
  }

  // Step 5: Execute the batch queries
  try {
    await client.batch(batchQueries, { prepare: true });
  } catch (err) {
    logger.error("SCYLLA", `Failed to delete all market data: ${err.message}`, err);
  }
}

async function cancelAndRefundOrder(userId, id, createdAt) {
  const order = await getOrderByUuid(userId, id, createdAt);

  if (!order) {
    logger.warn("SCYLLA", `Order not found for UUID: ${id}`);
    return;
  }

  // Skip if order is not open or fully filled
  if (order.status !== "OPEN" || BigInt(order.remaining) === BigInt(0)) {
    return;
  }

  // Calculate refund amount based on remaining amount for partially filled orders
  const refundAmount =
    order.side === "BUY"
      ? fromBigIntMultiply(
          BigInt(order.remaining) + BigInt(order.fee),
          BigInt(order.price)
        )
      : fromBigInt(BigInt(order.remaining) + BigInt(order.fee));

  const walletCurrency =
    order.side === "BUY"
      ? order.symbol.split("/")[1]
      : order.symbol.split("/")[0];

  const wallet = await getWalletByUserIdAndCurrency(userId, walletCurrency);
  if (!wallet) {
    logger.warn("SCYLLA", `${walletCurrency} wallet not found for user ID: ${userId}`);
    return;
  }

  await updateWalletBalance(wallet, refundAmount, "add");
}

/**
 * Retrieves orders by user ID and symbol based on their status (open or non-open).
 * @param userId - The ID of the user whose orders are to be retrieved.
 * @param symbol - The symbol of the orders to be retrieved.
 * @param isOpen - A boolean indicating whether to fetch open orders (true) or non-open orders (false).
 * @returns A Promise that resolves with an array of orders.
 */
/**
 * Retrieves orders by user ID and symbol based on their status (open or non-open).
 * @param userId - The ID of the user whose orders are to be retrieved.
 * @param symbol - The symbol of the orders to be retrieved.
 * @param isOpen - A boolean indicating whether to fetch open orders (true) or non-open orders (false).
 * @returns A Promise that resolves with an array of orders.
 */
export async function getOrders(
  userId: string,
  symbol: string,
  isOpen: boolean
): Promise<any[]> {
  const query = `
    SELECT * FROM ${scyllaKeyspace}.orders_by_symbol
    WHERE symbol = ? AND "userId" = ?
    ORDER BY "createdAt" DESC;
  `;
  const params = [symbol, userId];

  try {
    const result = await client.execute(query, params, { prepare: true });
    return result.rows
      .map(mapRowToOrder)
      .filter((order) =>
        isOpen ? order.status === "OPEN" : order.status !== "OPEN"
      )
      .map((order) => ({
        ...order,
        amount: fromBigInt(order.amount),
        price: fromBigInt(order.price),
        cost: fromBigInt(order.cost),
        fee: fromBigInt(order.fee),
        filled: fromBigInt(order.filled),
        remaining: fromBigInt(order.remaining),
      }));
  } catch (error) {
    logger.error("SCYLLA", `Failed to fetch orders by userId and symbol: ${error.message}`, error);
    throw new Error(
      `Failed to fetch orders by userId and symbol: ${error.message}`
    );
  }
}

// Helper: Rollback order creation if wallet update fails after creation.
export async function rollbackOrderCreation(
  orderId: string,
  userId: string,
  createdAt: Date
) {
  const query = `
    DELETE FROM ${scyllaKeyspace}.orders
    WHERE "userId" = ? AND "createdAt" = ? AND id = ?;
  `;
  const params = [userId, createdAt, orderId];
  await client.execute(query, params, { prepare: true });
}

/**
 * Retrieves recent trades for a given symbol by extracting them from filled/closed orders
 * @param symbol - The trading pair symbol (e.g., "BTC/USDT")
 * @param limit - Maximum number of trades to return (default: 50)
 * @returns A Promise that resolves with an array of trade objects
 */
export async function getRecentTrades(
  symbol: string,
  limit: number = 50
): Promise<any[]> {
  try {
    // Query orders that have trades (filled or closed orders)
    // Note: orders_by_symbol has partition key (symbol, userId), so we need ALLOW FILTERING
    // to query by symbol alone. This is acceptable for trade history queries with LIMIT.
    const query = `
      SELECT id, "userId", symbol, side, price, filled, trades, "updatedAt"
      FROM ${scyllaKeyspace}.orders_by_symbol
      WHERE symbol = ?
      LIMIT ?
      ALLOW FILTERING;
    `;
    const params = [symbol, limit * 2]; // Fetch more to ensure we get enough trades

    const result = await client.execute(query, params, { prepare: true });

    // Extract and parse trades from orders
    const allTrades: any[] = [];

    for (const row of result.rows) {
      if (!row.trades || row.trades === '' || row.trades === '[]') {
        continue;
      }

      try {
        let trades;
        if (typeof row.trades === 'string') {
          trades = JSON.parse(row.trades);
          // Handle double-encoded JSON
          if (!Array.isArray(trades) && typeof trades === 'string') {
            trades = JSON.parse(trades);
          }
        } else if (Array.isArray(row.trades)) {
          trades = row.trades;
        } else {
          continue;
        }

        if (!Array.isArray(trades) || trades.length === 0) {
          continue;
        }

        // Add trades with proper formatting
        for (const trade of trades) {
          allTrades.push({
            id: trade.id || `${row.id}_${trade.timestamp}`,
            price: typeof trade.price === 'bigint' ? fromBigInt(trade.price) : trade.price,
            amount: typeof trade.amount === 'bigint' ? fromBigInt(trade.amount) : trade.amount,
            side: row.side.toLowerCase(), // 'buy' or 'sell'
            timestamp: trade.timestamp || row.updatedAt.getTime(),
          });
        }
      } catch (parseError) {
        logger.error("SCYLLA", `Failed to parse trades for order ${row.id}`, parseError);
        continue;
      }
    }

    // Sort by timestamp descending (most recent first) and limit
    const sortedTrades = allTrades
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);

    // Also fetch from dedicated trades table (includes AI trades)
    try {
      const tradesQuery = `
        SELECT id, price, amount, side, "createdAt", "isAiTrade"
        FROM ${scyllaKeyspace}.trades
        WHERE symbol = ?
        LIMIT ?
      `;
      const tradesResult = await client.execute(tradesQuery, [symbol, limit], { prepare: true });

      for (const row of tradesResult.rows) {
        sortedTrades.push({
          id: row.id?.toString() || `trade_${row.createdAt?.getTime()}`,
          price: row.price,
          amount: row.amount,
          side: row.side?.toLowerCase() || 'buy',
          timestamp: row.createdAt?.getTime() || Date.now(),
          isAiTrade: row.isAiTrade || false,
        });
      }

      // Re-sort after adding trades from dedicated table
      sortedTrades.sort((a, b) => b.timestamp - a.timestamp);
    } catch (tradesTableError) {
      // Trades table might not exist yet, ignore error
      logger.debug("SCYLLA", `Trades table query failed (may not exist yet): ${tradesTableError.message}`);
    }

    return sortedTrades.slice(0, limit);
  } catch (error) {
    logger.error("SCYLLA", `Failed to fetch recent trades for ${symbol}: ${error.message}`, error);
    throw new Error(`Failed to fetch recent trades: ${error.message}`);
  }
}

/**
 * Insert a trade record into the trades table
 * Used for both AI trades and real trades to display in recent trades
 *
 * @param symbol - Trading pair symbol
 * @param price - Trade price
 * @param amount - Trade amount
 * @param side - Trade side ('BUY' or 'SELL')
 * @param isAiTrade - Whether this is an AI trade
 */
export async function insertTrade(
  symbol: string,
  price: number,
  amount: number,
  side: "BUY" | "SELL",
  isAiTrade: boolean = false
): Promise<void> {
  try {
    const query = `
      INSERT INTO ${scyllaKeyspace}.trades (symbol, "createdAt", id, price, amount, side, "isAiTrade")
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const tradeId = types.Uuid.random();
    const now = new Date();

    await client.execute(
      query,
      [symbol, now, tradeId, price, amount, side.toUpperCase(), isAiTrade],
      { prepare: true }
    );
  } catch (error) {
    logger.error("SCYLLA", `Failed to insert trade for ${symbol}: ${error.message}`, error);
    // Don't throw - trade recording is not critical
  }
}

/**
 * Retrieves OHLCV (Open, High, Low, Close, Volume) data for a given symbol and interval
 * @param symbol - The trading pair symbol (e.g., "BTC/USDT")
 * @param interval - The candle interval (e.g., "1m", "5m", "1h", "1d")
 * @param limit - Maximum number of candles to return (default: 100)
 * @returns A Promise that resolves with an array of OHLCV arrays [timestamp, open, high, low, close, volume]
 */
export async function getOHLCV(
  symbol: string,
  interval: string,
  limit: number = 100
): Promise<number[][]> {
  try {
    const query = `
      SELECT open, high, low, close, volume, "createdAt"
      FROM ${scyllaKeyspace}.candles
      WHERE symbol = ? AND interval = ?
      ORDER BY "createdAt" DESC
      LIMIT ?;
    `;
    const params = [symbol, interval, limit];

    const result = await client.execute(query, params, { prepare: true });

    // Map to OHLCV format and reverse to get chronological order
    const ohlcv: number[][] = result.rows
      .map((row) => [
        row.createdAt.getTime(), // timestamp
        row.open,                 // open
        row.high,                 // high
        row.low,                  // low
        row.close,                // close
        row.volume,               // volume
      ])
      .reverse(); // Reverse to get oldest to newest

    return ohlcv;
  } catch (error) {
    logger.error("SCYLLA", `Failed to fetch OHLCV for ${symbol} ${interval}: ${error.message}`, error);
    throw new Error(`Failed to fetch OHLCV: ${error.message}`);
  }
}