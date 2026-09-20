/**
 * Fix Ecosystem & Futures Candles Script
 *
 * This script finds and fixes candle issues in BOTH ecosystem and futures markets:
 * 1. Duplicate candles - Multiple candles for the same time period (overlapping)
 * 2. Price continuity - Open price doesn't match previous candle's close
 *
 * The overlapping issue occurs when:
 * - Multiple candles were created for the same normalized time period
 * - This causes visual overlap in the chart
 *
 * The price continuity issue occurs when:
 * - There's a gap in trading (no orders for some time)
 * - A new order comes in and creates a new candle
 * - The new candle's open price was incorrectly set to the trade price
 *   instead of the previous candle's close price
 *
 * Actions taken:
 * 1. For each symbol and interval, find duplicate candles and merge/delete them
 * 2. For remaining candles, fix open prices to match previous candle's close
 * 3. Recalculate high/low if needed
 *
 * Run from project root: pnpm fix:eco-candles
 * Or from backend: node scripts/fix-ecosystem-candles.mjs
 */

import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { Client, auth } from "cassandra-driver";

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file from project root (v5/.env)
config({ path: path.join(__dirname, "../../.env") });

// Initialize Scylla client
const scyllaKeyspace = process.env.SCYLLA_KEYSPACE || "trading";
const scyllaFuturesKeyspace = process.env.SCYLLA_FUTURES_KEYSPACE || "futures";
const scyllaUsername = process.env.SCYLLA_USERNAME;
const scyllaPassword = process.env.SCYLLA_PASSWORD;

const scyllaConfig = {
  contactPoints: [process.env.SCYLLA_HOST || "localhost"],
  localDataCenter: process.env.SCYLLA_DATACENTER || "datacenter1",
};

// Add authentication if credentials are provided
if (scyllaUsername && scyllaPassword) {
  scyllaConfig.authProvider = new auth.PlainTextAuthProvider(
    scyllaUsername,
    scyllaPassword
  );
}

const scyllaClient = new Client(scyllaConfig);

// All supported intervals
const intervals = [
  "1m", "3m", "5m", "15m", "30m",
  "1h", "2h", "4h", "6h", "12h",
  "1d", "3d", "1w"
];

// Interval durations in milliseconds
const intervalDurations = {
  "1m": 60 * 1000,
  "3m": 3 * 60 * 1000,
  "5m": 5 * 60 * 1000,
  "15m": 15 * 60 * 1000,
  "30m": 30 * 60 * 1000,
  "1h": 60 * 60 * 1000,
  "2h": 2 * 60 * 60 * 1000,
  "4h": 4 * 60 * 60 * 1000,
  "6h": 6 * 60 * 60 * 1000,
  "12h": 12 * 60 * 60 * 1000,
  "1d": 24 * 60 * 60 * 1000,
  "3d": 3 * 24 * 60 * 60 * 1000,
  "1w": 7 * 24 * 60 * 60 * 1000,
};

/**
 * Normalize a timestamp to the start of its candle period.
 */
function normalizeToIntervalBoundary(timestamp, interval) {
  const date = new Date(timestamp);

  switch (interval) {
    case "1w":
      const dayOfWeek = date.getUTCDay();
      date.setUTCDate(date.getUTCDate() - dayOfWeek);
      date.setUTCHours(0, 0, 0, 0);
      break;

    case "3d":
      const epochDays3 = Math.floor(date.getTime() / (3 * 24 * 60 * 60 * 1000));
      return epochDays3 * 3 * 24 * 60 * 60 * 1000;

    case "1d":
      date.setUTCHours(0, 0, 0, 0);
      break;

    case "12h":
      const hour12 = Math.floor(date.getUTCHours() / 12) * 12;
      date.setUTCHours(hour12, 0, 0, 0);
      break;

    case "6h":
      const hour6 = Math.floor(date.getUTCHours() / 6) * 6;
      date.setUTCHours(hour6, 0, 0, 0);
      break;

    case "4h":
      const hour4 = Math.floor(date.getUTCHours() / 4) * 4;
      date.setUTCHours(hour4, 0, 0, 0);
      break;

    case "2h":
      const hour2 = Math.floor(date.getUTCHours() / 2) * 2;
      date.setUTCHours(hour2, 0, 0, 0);
      break;

    case "1h":
      date.setUTCMinutes(0, 0, 0);
      break;

    case "30m":
      const min30 = Math.floor(date.getUTCMinutes() / 30) * 30;
      date.setUTCMinutes(min30, 0, 0);
      break;

    case "15m":
      const min15 = Math.floor(date.getUTCMinutes() / 15) * 15;
      date.setUTCMinutes(min15, 0, 0);
      break;

    case "5m":
      const min5 = Math.floor(date.getUTCMinutes() / 5) * 5;
      date.setUTCMinutes(min5, 0, 0);
      break;

    case "3m":
      const min3 = Math.floor(date.getUTCMinutes() / 3) * 3;
      date.setUTCMinutes(min3, 0, 0);
      break;

    case "1m":
      date.setUTCSeconds(0, 0);
      break;

    default:
      date.setUTCMilliseconds(0);
  }

  return date.getTime();
}

async function main() {
  console.log("=".repeat(60));
  console.log("Ecosystem & Futures Candles Fix Script");
  console.log("(Duplicates + Price Continuity)");
  console.log("=".repeat(60));
  console.log("");

  try {
    console.log("Connecting to ScyllaDB...");
    await scyllaClient.connect();
    console.log("Connected successfully.\n");

    // Process Ecosystem candles
    console.log("\n" + "=".repeat(60));
    console.log("PROCESSING ECOSYSTEM CANDLES");
    console.log("=".repeat(60));
    const ecoStats = await processKeyspace(scyllaKeyspace, "Ecosystem");

    // Process Futures candles
    console.log("\n" + "=".repeat(60));
    console.log("PROCESSING FUTURES CANDLES");
    console.log("=".repeat(60));
    const futuresStats = await processKeyspace(scyllaFuturesKeyspace, "Futures");

    // Final summary
    console.log("\n" + "=".repeat(60));
    console.log("FIX COMPLETE - SUMMARY");
    console.log("=".repeat(60));
    console.log("");
    console.log("ECOSYSTEM:");
    console.log(`  Scanned: ${ecoStats.scanned} candles`);
    console.log(`  Duplicates removed: ${ecoStats.duplicatesRemoved}`);
    console.log(`  Open prices fixed: ${ecoStats.openFixed}`);
    console.log("");
    console.log("FUTURES:");
    console.log(`  Scanned: ${futuresStats.scanned} candles`);
    console.log(`  Duplicates removed: ${futuresStats.duplicatesRemoved}`);
    console.log(`  Open prices fixed: ${futuresStats.openFixed}`);
    console.log("");
    console.log("TOTAL:");
    console.log(`  Scanned: ${ecoStats.scanned + futuresStats.scanned} candles`);
    console.log(`  Duplicates removed: ${ecoStats.duplicatesRemoved + futuresStats.duplicatesRemoved}`);
    console.log(`  Open prices fixed: ${ecoStats.openFixed + futuresStats.openFixed}`);
    console.log("");
    console.log("IMPORTANT: Restart your backend server now!");
    console.log("");

  } catch (error) {
    console.error("Script failed:", error);
  } finally {
    await cleanup();
  }
}

async function processKeyspace(keyspace, name) {
  let totalDuplicatesRemoved = 0;
  let totalOpenFixed = 0;
  let totalScanned = 0;

  try {
    // Check if keyspace exists
    const keyspaceQuery = `SELECT keyspace_name FROM system_schema.keyspaces WHERE keyspace_name = ?`;
    const keyspaceResult = await scyllaClient.execute(keyspaceQuery, [keyspace], { prepare: true });

    if (keyspaceResult.rows.length === 0) {
      console.log(`\n[${name}] Keyspace '${keyspace}' does not exist. Skipping.`);
      return { scanned: 0, duplicatesRemoved: 0, openFixed: 0 };
    }

    // Get all unique symbols from candles
    console.log(`\n[${name}] Fetching unique symbols from ${keyspace}.candles...`);
    const symbolsQuery = `SELECT DISTINCT symbol FROM ${keyspace}.candles`;
    const symbolsResult = await scyllaClient.execute(symbolsQuery);

    const symbols = [...new Set(symbolsResult.rows.map(r => r.symbol))];
    console.log(`[${name}] Found ${symbols.length} unique symbols.\n`);

    for (const symbol of symbols) {
      console.log(`\n[${name}] Processing symbol: ${symbol}`);
      console.log("-".repeat(40));

      for (const interval of intervals) {
        const { duplicatesRemoved, openFixed, scanned } = await fixCandlesForSymbolInterval(keyspace, symbol, interval, name);
        totalDuplicatesRemoved += duplicatesRemoved;
        totalOpenFixed += openFixed;
        totalScanned += scanned;
      }
    }

    console.log(`\n[${name}] Keyspace complete: ${totalScanned} scanned, ${totalDuplicatesRemoved} duplicates removed, ${totalOpenFixed} opens fixed`);

  } catch (error) {
    console.error(`[${name}] Error processing keyspace ${keyspace}:`, error.message);
  }

  return { scanned: totalScanned, duplicatesRemoved: totalDuplicatesRemoved, openFixed: totalOpenFixed };
}

async function fixCandlesForSymbolInterval(keyspace, symbol, interval, name) {
  let duplicatesRemoved = 0;
  let openFixed = 0;
  let scanned = 0;

  try {
    // Fetch all candles for this symbol and interval
    const query = `
      SELECT symbol, interval, "createdAt", "updatedAt", open, high, low, close, volume
      FROM ${keyspace}.candles
      WHERE symbol = ? AND interval = ?
    `;
    const result = await scyllaClient.execute(query, [symbol, interval], { prepare: true });

    if (result.rows.length === 0) {
      return { duplicatesRemoved: 0, openFixed: 0, scanned: 0 };
    }

    scanned = result.rows.length;

    // Map all candles
    const allCandles = result.rows.map(row => ({
      symbol: row.symbol,
      interval: row.interval,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
      open: parseFloat(row.open),
      high: parseFloat(row.high),
      low: parseFloat(row.low),
      close: parseFloat(row.close),
      volume: parseFloat(row.volume || 0),
    }));

    // Group candles by normalized time to find duplicates
    const candlesByNormalizedTime = new Map();

    for (const candle of allCandles) {
      const normalizedTime = normalizeToIntervalBoundary(candle.createdAt.getTime(), interval);
      const existing = candlesByNormalizedTime.get(normalizedTime);

      if (!existing) {
        candlesByNormalizedTime.set(normalizedTime, [candle]);
      } else {
        existing.push(candle);
      }
    }

    // Process duplicates - merge and delete extras
    for (const [normalizedTime, candles] of candlesByNormalizedTime.entries()) {
      if (candles.length > 1) {
        // Sort by createdAt to get chronological order
        candles.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

        console.log(`  [${interval}] Found ${candles.length} duplicates at ${new Date(normalizedTime).toISOString()}`);

        // Merge into first candle
        const keeper = candles[0];
        for (let i = 1; i < candles.length; i++) {
          const dup = candles[i];
          // Merge: expand high/low, use latest close, sum volume
          keeper.high = Math.max(keeper.high, dup.high);
          keeper.low = Math.min(keeper.low, dup.low);
          keeper.close = dup.close; // Use latest close
          keeper.volume += dup.volume;
        }

        // Update the keeper candle with merged values
        const updateQuery = `
          UPDATE ${keyspace}.candles
          SET open = ?, high = ?, low = ?, close = ?, volume = ?, "updatedAt" = ?
          WHERE symbol = ? AND interval = ? AND "createdAt" = ?
        `;
        await scyllaClient.execute(updateQuery, [
          keeper.open,
          keeper.high,
          keeper.low,
          keeper.close,
          keeper.volume,
          new Date(),
          symbol,
          interval,
          keeper.createdAt,
        ], { prepare: true });

        // Delete all duplicate candles except the keeper
        for (let i = 1; i < candles.length; i++) {
          const dup = candles[i];
          const deleteQuery = `
            DELETE FROM ${keyspace}.candles
            WHERE symbol = ? AND interval = ? AND "createdAt" = ?
          `;
          await scyllaClient.execute(deleteQuery, [
            symbol,
            interval,
            dup.createdAt,
          ], { prepare: true });

          duplicatesRemoved++;
          console.log(`           Deleted duplicate: ${dup.createdAt.toISOString()}`);
        }

        // Update the candlesByNormalizedTime to only have the keeper
        candlesByNormalizedTime.set(normalizedTime, [keeper]);
      }
    }

    // Now fix open price continuity on the deduplicated candles
    const uniqueCandles = Array.from(candlesByNormalizedTime.values())
      .map(arr => arr[0])
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    for (let i = 1; i < uniqueCandles.length; i++) {
      const prevCandle = uniqueCandles[i - 1];
      const currCandle = uniqueCandles[i];

      const expectedOpen = prevCandle.close;
      const actualOpen = currCandle.open;

      // Check if open price is incorrect
      const tolerance = 1e-10;
      if (Math.abs(actualOpen - expectedOpen) > tolerance) {
        const correctedOpen = expectedOpen;
        const correctedHigh = Math.max(currCandle.high, correctedOpen);
        const correctedLow = Math.min(currCandle.low, correctedOpen);

        console.log(`  [${interval}] Fixing open at ${currCandle.createdAt.toISOString()}`);
        console.log(`           Open: ${actualOpen.toFixed(8)} -> ${correctedOpen.toFixed(8)}`);

        const updateQuery = `
          UPDATE ${keyspace}.candles
          SET open = ?, high = ?, low = ?, "updatedAt" = ?
          WHERE symbol = ? AND interval = ? AND "createdAt" = ?
        `;

        await scyllaClient.execute(updateQuery, [
          correctedOpen,
          correctedHigh,
          correctedLow,
          new Date(),
          symbol,
          interval,
          currCandle.createdAt,
        ], { prepare: true });

        // Update local object for next iteration
        uniqueCandles[i].open = correctedOpen;
        uniqueCandles[i].high = correctedHigh;
        uniqueCandles[i].low = correctedLow;

        openFixed++;
      }
    }

    if (duplicatesRemoved > 0 || openFixed > 0) {
      console.log(`  [${interval}] Summary: ${duplicatesRemoved} duplicates removed, ${openFixed} opens fixed (of ${scanned} total)`);
    }

  } catch (error) {
    console.error(`  [${interval}] Error:`, error.message);
  }

  return { duplicatesRemoved, openFixed, scanned };
}

async function cleanup() {
  try {
    await scyllaClient.shutdown();
  } catch (e) {
    // Ignore cleanup errors
  }
}

main();
