// Safe import for ecosystem modules
let client: any;
let scyllaFuturesKeyspace: any;
let Candle: any;
try {
  const clientModule = require("@b/api/(ext)/ecosystem/utils/scylla/client");
  client = clientModule.default;
  scyllaFuturesKeyspace = clientModule.scyllaFuturesKeyspace;

  const queriesModule = require("@b/api/(ext)/ecosystem/utils/scylla/queries");
  Candle = queriesModule.Candle;
} catch (e) {
  // Ecosystem extension not available
}

export async function getHistoricalCandles(
  symbol: string,
  interval: string,
  from: number,
  to: number
): Promise<number[][]> {
  if (!client || !scyllaFuturesKeyspace) {
    throw new Error("Ecosystem extension not available");
  }

  try {
    const query = `
      SELECT * FROM ${scyllaFuturesKeyspace}.candles
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
    throw new Error(
      `Failed to fetch historical futures candles: ${error.message}`
    );
  }
}

/**
 * Fetches the latest futures candle for each interval.
 * @returns A Promise that resolves with an array of the latest futures candles.
 */
export async function getLastCandles(): Promise<any[]> {
  if (!client || !scyllaFuturesKeyspace) {
    throw new Error("Ecosystem extension not available");
  }

  try {
    // Fetch the latest candle for each symbol and interval
    const query = `
      SELECT symbol, interval, open, high, low, close, volume, "createdAt", "updatedAt" 
      FROM ${scyllaFuturesKeyspace}.latest_candles;
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
    console.error(`Failed to fetch latest futures candles: ${error.message}`);
    throw new Error(`Failed to fetch latest futures candles: ${error.message}`);
  }
}

export async function getYesterdayCandles(): Promise<{
  [symbol: string]: any[];
}> {
  if (!client || !scyllaFuturesKeyspace) {
    throw new Error("Ecosystem extension not available");
  }

  try {
    // Calculate the date range for "yesterday"
    const endOfYesterday = new Date();
    endOfYesterday.setHours(0, 0, 0, 0);
    const startOfYesterday = new Date(
      endOfYesterday.getTime() - 24 * 60 * 60 * 1000
    );

    // Query to get futures candles for yesterday
    const query = `
      SELECT * FROM ${scyllaFuturesKeyspace}.latest_candles
      WHERE "createdAt" >= ? AND "createdAt" < ?;
    `;

    const result = await client.execute(
      query,
      [startOfYesterday.toISOString(), endOfYesterday.toISOString()],
      { prepare: true }
    );

    const yesterdayCandles: { [symbol: string]: any[] } = {};

    for (const row of result.rows) {
      // Only consider candles with a '1d' interval
      if (row.interval !== "1d") {
        continue;
      }

      const candle: any = {
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
    console.error(
      `Failed to fetch yesterday's futures candles: ${error.message}`
    );
    throw new Error(
      `Failed to fetch yesterday's futures candles: ${error.message}`
    );
  }
}
