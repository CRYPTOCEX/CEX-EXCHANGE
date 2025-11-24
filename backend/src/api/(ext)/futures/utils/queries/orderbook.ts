// Safe import for ecosystem modules
let fromBigInt: any;
let removeTolerance: any;
let toBigIntFloat: any;
let client: any;
let scyllaFuturesKeyspace: any;
let OrderBookDatas: any;
try {
  const blockchainModule = require("@b/api/(ext)/ecosystem/utils/blockchain");
  fromBigInt = blockchainModule.fromBigInt;
  removeTolerance = blockchainModule.removeTolerance;
  toBigIntFloat = blockchainModule.toBigIntFloat;

  const clientModule = require("@b/api/(ext)/ecosystem/utils/scylla/client");
  client = clientModule.default;
  scyllaFuturesKeyspace = clientModule.scyllaFuturesKeyspace;

  const queriesModule = require("@b/api/(ext)/ecosystem/utils/scylla/queries");
  OrderBookDatas = queriesModule.OrderBookDatas;
} catch (e) {
  // Ecosystem extension not available
}
import { logError } from "@b/utils/logger";
import { FuturesOrder } from "./order";

export type OrderBookSide = "bids" | "asks";

export async function query(q: string, params: any[] = []): Promise<any> {
  if (!client) {
    throw new Error("Ecosystem extension not available");
  }
  return client.execute(q, params, { prepare: true });
}

export async function getOrderbookEntry(
  symbol: string,
  price: number,
  side: string
): Promise<any> {
  if (!client || !scyllaFuturesKeyspace || !toBigIntFloat) {
    throw new Error("Ecosystem extension not available");
  }

  const query = `
    SELECT * FROM ${scyllaFuturesKeyspace}.orderbook
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
    console.error(`Failed to fetch futures orderbook entry: ${error.message}`);
    throw new Error(
      `Failed to fetch futures orderbook entry: ${error.message}`
    );
  }
}

export async function getOrderBook(
  symbol: string
): Promise<{ asks: number[][]; bids: number[][] }> {
  if (!client || !scyllaFuturesKeyspace) {
    throw new Error("Ecosystem extension not available");
  }

  const askQuery = `
    SELECT * FROM ${scyllaFuturesKeyspace}.orderbook
    WHERE symbol = ? AND side = 'ASKS'
    LIMIT 50;
  `;
  const bidQuery = `
    SELECT * FROM ${scyllaFuturesKeyspace}.orderbook
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

export async function fetchOrderBooks(): Promise<any[] | null> {
  if (!client || !scyllaFuturesKeyspace) {
    throw new Error("Ecosystem extension not available");
  }

  const query = `
    SELECT * FROM ${scyllaFuturesKeyspace}.orderbook;
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
    console.error(`Failed to fetch futures order books: ${error.message}`);
    return null;
  }
}

export async function updateOrderBookInDB(
  symbol: string,
  price: number,
  amount: number,
  side: string
) {
  if (!client || !scyllaFuturesKeyspace) {
    throw new Error("Ecosystem extension not available");
  }

  let query: string;
  let params: any[];

  if (amount > 0) {
    query = `
      INSERT INTO ${scyllaFuturesKeyspace}.orderbook (symbol, price, amount, side)
      VALUES (?, ?, ?, ?);
    `;
    params = [symbol, price, amount, side.toUpperCase()];
  } else {
    query = `
      DELETE FROM ${scyllaFuturesKeyspace}.orderbook
      WHERE symbol = ? AND price = ? AND side = ?;
    `;
    params = [symbol, price, side.toUpperCase()];
  }

  try {
    await client.execute(query, params, { prepare: true });
  } catch (error) {
    console.error(`Failed to update futures order book: ${error.message}`);
  }
}

export async function fetchExistingAmounts(
  symbol: string
): Promise<Record<OrderBookSide, Record<string, bigint>>> {
  if (!client || !scyllaFuturesKeyspace || !removeTolerance || !toBigIntFloat) {
    throw new Error("Ecosystem extension not available");
  }

  try {
    const result = await client.execute(
      `SELECT price, side, amount FROM ${scyllaFuturesKeyspace}.orderbook_by_symbol WHERE symbol = ?;`,
      [symbol]
    );
    const symbolOrderBook = { bids: {}, asks: {} };

    result.rows.forEach((row) => {
      const side: OrderBookSide = row.side === "BIDS" ? "bids" : "asks";
      const priceStr = removeTolerance(toBigIntFloat(row.price)).toString();
      symbolOrderBook[side][priceStr] = removeTolerance(
        toBigIntFloat(row.amount)
      );
    });

    return symbolOrderBook;
  } catch (error) {
    logError("fetch_existing_amounts", error, __filename);
    console.error(`Failed to fetch existing amounts for ${symbol}:`, error);
    throw new Error(`Failed to fetch existing amounts for ${symbol}`);
  }
}

export async function updateSingleOrderBook(
  order: FuturesOrder,
  operation: "add" | "subtract"
) {
  if (!client || !scyllaFuturesKeyspace || !removeTolerance || !toBigIntFloat || !fromBigInt) {
    throw new Error("Ecosystem extension not available");
  }

  try {
    const result = await client.execute(
      `SELECT price, side, amount FROM ${scyllaFuturesKeyspace}.orderbook_by_symbol WHERE symbol = ?;`,
      [order.symbol]
    );

    const symbolOrderBook = { bids: {}, asks: {} };
    result.rows.forEach((row) => {
      const side = row.side === "BIDS" ? "bids" : "asks";
      symbolOrderBook[side][
        removeTolerance(toBigIntFloat(row.price)).toString()
      ] = removeTolerance(toBigIntFloat(row.amount));
    });

    const side = order.side === "BUY" ? "bids" : "asks";
    const price = removeTolerance(BigInt(order.price));

    const existingAmount: bigint =
      symbolOrderBook[side][price.toString()] || BigInt(0);
    let newAmount: bigint = BigInt(0);
    if (operation === "add") {
      newAmount = existingAmount + removeTolerance(BigInt(order.amount));
    } else if (operation === "subtract") {
      newAmount = existingAmount - removeTolerance(BigInt(order.amount));
    }

    if (newAmount > BigInt(0)) {
      await client.execute(
        `INSERT INTO ${scyllaFuturesKeyspace}.orderbook (symbol, price, side, amount) VALUES (?, ?, ?, ?)`,
        [
          order.symbol,
          fromBigInt(price),
          order.side === "BUY" ? "BIDS" : "ASKS",
          fromBigInt(newAmount),
        ]
      );
      symbolOrderBook[side][price.toString()] = newAmount;
    } else {
      await client.execute(
        `DELETE FROM ${scyllaFuturesKeyspace}.orderbook WHERE symbol = ? AND price = ? AND side = ?`,
        [
          order.symbol,
          fromBigInt(price),
          order.side === "BUY" ? "BIDS" : "ASKS",
        ]
      );
      delete symbolOrderBook[side][price.toString()];
    }
    return symbolOrderBook;
  } catch (err) {
    logError("update_single_order_book", err, __filename);
    console.error("Failed to update order book in database:", err);
    throw new Error("Failed to update order book in database");
  }
}

export function generateOrderBookUpdateQueries(
  mappedOrderBook: Record<
    string,
    Record<"bids" | "asks", Record<string, number>>
  >
): Array<{ query: string; params: any[] }> {
  if (!scyllaFuturesKeyspace || !fromBigInt || !removeTolerance) {
    throw new Error("Ecosystem extension not available");
  }

  const queries: Array<{ query: string; params: any[] }> = [];

  for (const [symbol, sides] of Object.entries(mappedOrderBook)) {
    for (const [side, priceAmountMap] of Object.entries(sides)) {
      if (Object.keys(priceAmountMap).length === 0) {
        queries.push({
          query: `DELETE FROM ${scyllaFuturesKeyspace}.orderbook WHERE symbol = ? AND side = ?`,
          params: [symbol, side.toUpperCase()],
        });
        continue;
      }
      for (const [price, amount] of Object.entries(priceAmountMap)) {
        if (amount > BigInt(0)) {
          queries.push({
            query: `UPDATE ${scyllaFuturesKeyspace}.orderbook SET amount = ? WHERE symbol = ? AND price = ? AND side = ?`,
            params: [
              fromBigInt(removeTolerance(BigInt(amount))),
              symbol,
              fromBigInt(removeTolerance(BigInt(price))),
              side.toUpperCase(),
            ],
          });
        } else {
          queries.push({
            query: `DELETE FROM ${scyllaFuturesKeyspace}.orderbook WHERE symbol = ? AND price = ? AND side = ?`,
            params: [
              symbol,
              fromBigInt(removeTolerance(BigInt(price))),
              side.toUpperCase(),
            ],
          });
        }
      }
    }
  }
  return queries;
}
