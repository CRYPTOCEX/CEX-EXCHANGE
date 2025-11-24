// Safe import for ecosystem modules
let client: any;
let scyllaFuturesKeyspace: any;
try {
  const module = require("@b/api/(ext)/ecosystem/utils/scylla/client");
  client = module.default;
  scyllaFuturesKeyspace = module.scyllaFuturesKeyspace;
} catch (e) {
  // Ecosystem extension not available
}
import { makeUuid } from "@b/utils/passwords";
import { uuidToString } from "./order";

export interface FuturesPosition {
  id: string;
  userId: string;
  symbol: string;
  side: string;
  entryPrice: bigint;
  amount: bigint;
  leverage: number;
  unrealizedPnl: bigint;
  stopLossPrice?: bigint;
  takeProfitPrice?: bigint;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function getPosition(
  userId: string,
  symbol: string,
  side: string
): Promise<FuturesPosition | null> {
  if (!client || !scyllaFuturesKeyspace) {
    throw new Error("Ecosystem extension not available");
  }

  const query = `
    SELECT * FROM ${scyllaFuturesKeyspace}.positions_by_symbol
    WHERE symbol = ? AND "userId" = ? AND side = ? AND status = 'OPEN' ALLOW FILTERING;
  `;
  const params = [symbol, userId, side];

  try {
    const result = await client.execute(query, params, { prepare: true });
    if (result.rows.length > 0) {
      const row = result.rows[0];
      return {
        id: uuidToString(row.id),
        userId: uuidToString(row.userId),
        symbol: row.symbol,
        side: row.side,
        entryPrice: BigInt(row.entryPrice),
        amount: BigInt(row.amount),
        leverage: Number(row.leverage),
        unrealizedPnl: BigInt(row.unrealizedPnl),
        stopLossPrice: row.stopLossPrice
          ? BigInt(row.stopLossPrice)
          : undefined,
        takeProfitPrice: row.takeProfitPrice
          ? BigInt(row.takeProfitPrice)
          : undefined,
        status: row.status,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
      };
    }
    return null;
  } catch (error) {
    console.error(`Failed to fetch position: ${error.message}`);
    throw new Error(`Failed to fetch position: ${error.message}`);
  }
}

export async function getPositions(
  userId: string,
  symbol?: string,
  status?: string
): Promise<FuturesPosition[]> {
  if (!client || !scyllaFuturesKeyspace) {
    throw new Error("Ecosystem extension not available");
  }

  let query = `
    SELECT * FROM ${scyllaFuturesKeyspace}.position
    WHERE "userId" = ?
  `;
  const params: any[] = [userId];

  if (symbol) {
    query += ` AND symbol = ?`;
    params.push(symbol);
  }

  if (status) {
    query += ` AND status = ?`;
    params.push(status);
  }

  query += ` ALLOW FILTERING;`;

  try {
    const result = await client.execute(query, params, { prepare: true });
    return result.rows.map((row) => ({
      id: uuidToString(row.id),
      userId: uuidToString(row.userId),
      symbol: row.symbol,
      side: row.side,
      entryPrice: BigInt(row.entryPrice),
      amount: BigInt(row.amount),
      leverage: Number(row.leverage),
      unrealizedPnl: BigInt(row.unrealizedPnl),
      stopLossPrice: row.stopLossPrice ? BigInt(row.stopLossPrice) : undefined,
      takeProfitPrice: row.takeProfitPrice
        ? BigInt(row.takeProfitPrice)
        : undefined,
      status: row.status,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    }));
  } catch (error) {
    console.error(`Failed to fetch positions: ${error.message}`);
    throw new Error(`Failed to fetch positions: ${error.message}`);
  }
}

export async function getAllOpenPositions(): Promise<FuturesPosition[]> {
  if (!client || !scyllaFuturesKeyspace) {
    throw new Error("Ecosystem extension not available");
  }

  const query = `
    SELECT * FROM ${scyllaFuturesKeyspace}.position WHERE status = 'OPEN' ALLOW FILTERING;
  `;

  try {
    const result = await client.execute(query, [], { prepare: true });
    return result.rows.map((row) => ({
      id: uuidToString(row.id),
      userId: uuidToString(row.userId),
      symbol: row.symbol,
      side: row.side,
      entryPrice: BigInt(row.entryPrice),
      amount: BigInt(row.amount),
      leverage: Number(row.leverage),
      unrealizedPnl: BigInt(row.unrealizedPnl),
      stopLossPrice: row.stopLossPrice ? BigInt(row.stopLossPrice) : undefined,
      takeProfitPrice: row.takeProfitPrice
        ? BigInt(row.takeProfitPrice)
        : undefined,
      status: row.status,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    }));
  } catch (error) {
    console.error(`Failed to fetch open positions: ${error.message}`);
    throw new Error(`Failed to fetch open positions: ${error.message}`);
  }
}

export async function createPosition(
  userId: string,
  symbol: string,
  side: string,
  entryPrice: bigint,
  amount: bigint,
  leverage: number,
  unrealizedPnl: bigint,
  stopLossPrice?: bigint,
  takeProfitPrice?: bigint
): Promise<void> {
  if (!client || !scyllaFuturesKeyspace) {
    throw new Error("Ecosystem extension not available");
  }

  const query = `
    INSERT INTO ${scyllaFuturesKeyspace}.position (id, "userId", symbol, side, "entryPrice", amount, leverage, "unrealizedPnl", "stopLossPrice", "takeProfitPrice", status, "createdAt", "updatedAt")
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', ?, ?);
  `;
  const params = [
    makeUuid(),
    userId,
    symbol,
    side,
    entryPrice.toString(),
    amount.toString(),
    leverage,
    unrealizedPnl.toString(),
    stopLossPrice?.toString() || null,
    takeProfitPrice?.toString() || null,
    new Date(),
    new Date(),
  ];

  try {
    await client.execute(query, params, { prepare: true });
  } catch (error) {
    console.error(`Failed to create position: ${error.message}`);
    throw new Error(`Failed to create position: ${error.message}`);
  }
}

export async function updatePositionInDB(
  userId: string,
  id: string,
  entryPrice: bigint,
  amount: bigint,
  unrealizedPnl: bigint,
  stopLossPrice?: bigint,
  takeProfitPrice?: bigint
): Promise<void> {
  if (!client || !scyllaFuturesKeyspace) {
    throw new Error("Ecosystem extension not available");
  }

  const query = `
    UPDATE ${scyllaFuturesKeyspace}.position
    SET "entryPrice" = ?, amount = ?, "unrealizedPnl" = ?, "stopLossPrice" = ?, "takeProfitPrice" = ?, "updatedAt" = ?
    WHERE "userId" = ? AND id = ?;
  `;
  const params = [
    entryPrice.toString(),
    amount.toString(),
    unrealizedPnl.toString(),
    stopLossPrice?.toString() || null,
    takeProfitPrice?.toString() || null,
    new Date(),
    userId,
    id,
  ];

  try {
    await client.execute(query, params, { prepare: true });
  } catch (error) {
    console.error(`Failed to update position: ${error.message}`);
    throw new Error(`Failed to update position: ${error.message}`);
  }
}

export async function updatePositionStatus(
  userId: string,
  id: string,
  status: string
): Promise<void> {
  if (!client || !scyllaFuturesKeyspace) {
    throw new Error("Ecosystem extension not available");
  }

  const query = `
    UPDATE ${scyllaFuturesKeyspace}.position
    SET status = ?, "updatedAt" = ?
    WHERE "userId" = ? AND id = ?;
  `;
  const params = [status, new Date(), userId, id];

  try {
    await client.execute(query, params, { prepare: true });
  } catch (error) {
    console.error(`Failed to update position status: ${error.message}`);
    throw new Error(`Failed to update position status: ${error.message}`);
  }
}
