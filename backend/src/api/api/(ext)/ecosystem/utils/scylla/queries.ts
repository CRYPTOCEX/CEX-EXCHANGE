import {
  fromBigInt,
  fromBigIntMultiply,
  removeTolerance,
  toBigIntFloat,
} from "../blockchain";
import client from "./client";
import { makeUuid } from "@b/utils/passwords";
import { MatchingEngine } from "../matchingEngine";
import { getWalletByUserIdAndCurrency, updateWalletBalance } from "../wallet";
const scyllaKeyspace = process.env.SCYLLA_KEYSPACE || "trading";

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
    return result.rows.map(mapRowToOrder);
  } catch (error) {
    console.error(`Failed to fetch orders by userId: ${error.message}`);
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
    console.warn(
      `No orderbook entry found for symbol: ${symbol}, price: ${priceFormatted}, side: ${orderbookSide}`
    );
  }

  // Instead of deleting the order, update its status and remaining amount
  const currentTimestamp = new Date();
  const updateOrderQuery = `
    UPDATE ${scyllaKeyspace}.orders
    SET status = 'CANCELED', "updatedAt" = ?, remaining = 0
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
    console.error(
      `Failed to cancel order and update orderbook: ${error.message}`
    );
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
      console.warn(
        `Orderbook entry not found for params: ${JSON.stringify(params)}`
      );
      return null;
    }
  } catch (error) {
    console.error(`Failed to fetch orderbook entry: ${error.message}`);
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
}): Promise<Order> {
  const currentTimestamp = new Date();
  const query = `
    INSERT INTO ${scyllaKeyspace}.orders (id, "userId", symbol, type, "timeInForce", side, price, amount, filled, remaining, cost, fee, "feeCurrency", status, "createdAt", "updatedAt")
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
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
    };

    const matchingEngine = await MatchingEngine.getInstance();
    matchingEngine.addToQueue(newOrder);
    return newOrder;
  } catch (error) {
    console.error(`Failed to create order: ${error.message}`);
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
 * @returns A Promise that resolves with an array of open orders.
 */
export async function getAllOpenOrders(): Promise<any[]> {
  const query = `
    SELECT * FROM ${scyllaKeyspace}.open_orders
    WHERE status = 'OPEN' ALLOW FILTERING;
  `;

  try {
    const result = await client.execute(query, [], { prepare: true });
    return result.rows;
  } catch (error) {
    console.error(`Failed to fetch all open orders: ${error.message}`);
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
    console.error(`Failed to fetch latest candles: ${error.message}`);
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
    console.error(`Failed to fetch yesterday's candles: ${error.message}`);
    throw new Error(`Failed to fetch yesterday's candles: ${error.message}`);
  }
}

export function generateOrderUpdateQueries(
  ordersToUpdate: Order[]
): Array<{ query: string; params: any[] }> {
  const queries = ordersToUpdate.map((order) => {
    return {
      query: `
        UPDATE ${scyllaKeyspace}.orders
        SET filled = ?, remaining = ?, status = ?, "updatedAt" = ?, trades = ?
        WHERE "userId" = ? AND "createdAt" = ? AND id = ?;
      `,
      params: [
        removeTolerance(order.filled).toString(),
        removeTolerance(order.remaining).toString(),
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
    console.error(`Failed to fetch order books: ${error.message}`);
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
    console.error(`Failed to update order book: ${error.message}`);
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
    console.error(`Failed to delete all market data: ${err.message}`);
  }
}

async function cancelAndRefundOrder(userId, id, createdAt) {
  const order = await getOrderByUuid(userId, id, createdAt);

  if (!order) {
    console.warn(`Order not found for UUID: ${id}`);
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
    console.warn(`${walletCurrency} wallet not found for user ID: ${userId}`);
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
    console.error(
      `Failed to fetch orders by userId and symbol: ${error.message}`
    );
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