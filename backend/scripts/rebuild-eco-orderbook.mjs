/**
 * Rebuild Ecosystem Orderbook Script
 *
 * NON-DESTRUCTIVE repair for a "stuck" ecosystem market: recomputes every
 * aggregated `orderbook` price level from the ACTUAL open orders and fixes the
 * differences. Unlike clean-eco-market.mjs (which wipes the market), this keeps
 * orders, trades, candles and user funds completely untouched — it only makes
 * the displayed/aggregated book agree with the orders table.
 *
 * Fixes exactly the three ways the book can diverge:
 *   GHOST    — a level exists in `orderbook` with no backing OPEN order  -> DELETE
 *   MISSING  — an OPEN order has no level in `orderbook`                 -> INSERT
 *   MISMATCH — level amount != sum(remaining) of OPEN orders at price    -> UPDATE
 *
 * This is the same reconciliation the matching engine's syncOrderbookWithOrders()
 * runs at boot and every 5 minutes — but that routine derives "open orders" from
 * the engine's IN-MEMORY queue and skips AI-managed symbols, so this script (which
 * reads the orders table directly) is the authority when the two disagree.
 *
 * It also reports ecosystem levels that were STRANDED IN THE FUTURES KEYSPACE by
 * the unqualified-CQL defect: one Scylla session serves both keyspaces, `USE` only
 * retargets a single pooled connection, and unqualified `orderbook` writes were
 * therefore landing in `futures.orderbook` about half the time.
 *
 * IMPORTANT — AI market makers: for a symbol with an ACTIVE aiMarketMaker the
 * book is maintained by the AI WITHOUT real order rows, so rebuilding from
 * orders would wipe its quotes. Such symbols are SKIPPED unless --include-ai.
 *
 * DRY RUN by default. Pass --execute to apply.
 *
 * Usage (from backend/):
 *   node scripts/rebuild-eco-orderbook.mjs                    # all symbols, dry run
 *   node scripts/rebuild-eco-orderbook.mjs ETH/USDT           # one symbol, dry run
 *   node scripts/rebuild-eco-orderbook.mjs ETH/USDT --execute # apply
 * Flags:
 *   --execute      apply changes (default is dry run)
 *   --include-ai   also rebuild symbols that have an ACTIVE AI market maker
 *
 * AFTER RUNNING: restart the backend (pm2 restart / touch a .ts in dev). The
 * matching engine holds the book and the open-order queue in process memory and
 * will keep broadcasting its stale copy until it reboots.
 */

import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { Client, auth } from "cassandra-driver";
import { Sequelize } from "sequelize";
import BigNumber from "bignumber.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.join(__dirname, "../../.env") });

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith("--")));
const symbolArg = args.find((a) => !a.startsWith("--"));

const EXECUTE = flags.has("--execute");
const INCLUDE_AI = flags.has("--include-ai");
const ONLY_SYMBOL = symbolArg ? symbolArg.toUpperCase() : null;

if (symbolArg && !symbolArg.includes("/")) {
  console.error("Usage: node scripts/rebuild-eco-orderbook.mjs [CURRENCY/PAIR] [--execute] [--include-ai]");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Scaling helpers — MUST mirror backend/src/api/(ext)/ecosystem/utils/blockchain.ts
// exactly, or the rebuilt price doubles won't collide with the existing rows and
// we'd create duplicate levels instead of fixing them.
// ---------------------------------------------------------------------------
const toBigIntFloat = (n) => BigInt(new BigNumber(n).shiftedBy(18).toFixed(0));
const fromBigInt = (v) => new BigNumber(v.toString()).shiftedBy(-18).toNumber();
function removeTolerance(v, toleranceDigits = 2) {
  const b = new BigNumber(v.toString());
  const t = new BigNumber(10).pow(toleranceDigits);
  if (b.isLessThan(t)) return v;
  return BigInt(b.dividedToIntegerBy(t).multipliedBy(t).toFixed());
}

// ---------------------------------------------------------------------------
// Connections
// ---------------------------------------------------------------------------
const scyllaKeyspace = process.env.SCYLLA_KEYSPACE || "trading";
const scyllaFuturesKeyspace = process.env.SCYLLA_FUTURES_KEYSPACE || "futures";
const contactPoints = process.env.SCYLLA_CONNECT_POINTS
  ? process.env.SCYLLA_CONNECT_POINTS.split(",").map((p) => p.trim())
  : [process.env.SCYLLA_HOST || "localhost"];

const scyllaConfig = {
  contactPoints,
  localDataCenter: process.env.SCYLLA_DATACENTER || "datacenter1",
  keyspace: scyllaKeyspace,
};
if (process.env.SCYLLA_USERNAME && process.env.SCYLLA_PASSWORD) {
  scyllaConfig.authProvider = new auth.PlainTextAuthProvider(
    process.env.SCYLLA_USERNAME,
    process.env.SCYLLA_PASSWORD
  );
}
const scylla = new Client(scyllaConfig);

const sequelize = new Sequelize(
  process.env.DB_NAME || "platform",
  process.env.DB_USER || "root",
  process.env.DB_PASSWORD || "",
  {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "3306"),
    dialect: "mysql",
    logging: false,
  }
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function pagedAll(query, params) {
  const rows = [];
  let pageState;
  do {
    const rs = await scylla.execute(query, params, {
      prepare: true,
      fetchSize: 1000,
      pageState,
    });
    rows.push(...rs.rows);
    pageState = rs.pageState;
  } while (pageState);
  return rows;
}

/** Symbols whose orderbook is driven by an ACTIVE AI market maker (no real orders). */
async function getAiSymbols() {
  try {
    const [rows] = await sequelize.query(
      `SELECT m.currency, m.pair
         FROM ai_market_maker amm
         JOIN ecosystem_market m ON m.id = amm.marketId
        WHERE amm.status = 'ACTIVE'`
    );
    return new Set(rows.map((r) => `${r.currency}/${r.pair}`));
  } catch (e) {
    console.log(`  (could not read AI market makers: ${e.message} — assuming none)`);
    return new Set();
  }
}

const bi = (v) => BigInt(v?.toString() || "0");

/**
 * Levels sitting in `futures.orderbook` for a symbol that is an ECOSYSTEM market
 * and NOT a futures market. Those can only have got there via the unqualified-CQL
 * defect (an ecosystem write served by a pooled connection whose keyspace was
 * `futures`). They are invisible to the ecosystem UI but show up as phantom
 * liquidity on the futures side.
 *
 * The "and NOT a futures market" condition is the safety rail: a symbol traded on
 * BOTH is left completely alone, because we cannot tell a misrouted row from real
 * futures liquidity.
 */
async function findStrandedFuturesRows() {
  let ecoSymbols = new Set();
  let futuresSymbols = new Set();
  try {
    const [ecoRows] = await sequelize.query(
      `SELECT currency, pair FROM ecosystem_market`
    );
    ecoSymbols = new Set(ecoRows.map((r) => `${r.currency}/${r.pair}`));
    const [futRows] = await sequelize.query(
      `SELECT currency, pair FROM futures_market`
    );
    futuresSymbols = new Set(futRows.map((r) => `${r.currency}/${r.pair}`));
  } catch (e) {
    console.log(`  (could not read market tables: ${e.message} — skipping cross-keyspace check)`);
    return [];
  }

  let rows;
  try {
    rows = await pagedAll(
      `SELECT symbol, side, price, amount FROM ${scyllaFuturesKeyspace}.orderbook`,
      []
    );
  } catch (e) {
    console.log(`  (could not read ${scyllaFuturesKeyspace}.orderbook: ${e.message})`);
    return [];
  }

  return rows.filter(
    (r) => r.symbol && ecoSymbols.has(r.symbol) && !futuresSymbols.has(r.symbol)
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log("=".repeat(64));
  console.log("Ecosystem Orderbook Rebuild" + (ONLY_SYMBOL ? ` — ${ONLY_SYMBOL}` : " — ALL SYMBOLS"));
  console.log(`Mode: ${EXECUTE ? "EXECUTE" : "DRY RUN (no changes)"}   AI symbols: ${INCLUDE_AI ? "included" : "skipped"}`);
  console.log("=".repeat(64));

  await scylla.connect();
  await sequelize.authenticate();
  console.log(`Connected (scylla keyspace: ${scyllaKeyspace}).\n`);

  const aiSymbols = await getAiSymbols();
  if (aiSymbols.size > 0) {
    console.log(`AI market maker symbols: ${Array.from(aiSymbols).join(", ")}\n`);
  }

  // ---- Build the TRUE book from OPEN orders ------------------------------
  // Keyed by `${symbol}|${side}|${priceBigIntString}` so price comparison is
  // exact-integer, never float.
  const orderRows = ONLY_SYMBOL
    ? await pagedAll(
        `SELECT symbol, side, status, price, remaining, "marketMakerId", "botId" FROM ${scyllaKeyspace}.orders_by_symbol WHERE symbol = ? ALLOW FILTERING`,
        [ONLY_SYMBOL]
      )
    : await pagedAll(
        `SELECT symbol, side, status, price, remaining, "marketMakerId", "botId" FROM ${scyllaKeyspace}.orders`,
        []
      );

  const trueBook = new Map(); // key -> { symbol, side, priceKey, amount: bigint }
  let openCount = 0;
  for (const r of orderRows) {
    if (r.status !== "OPEN") continue;
    const remaining = bi(r.remaining);
    if (remaining <= 0n) continue;
    if (!r.symbol || !r.symbol.includes("/")) continue;
    openCount++;
    const side = String(r.side || "").toUpperCase() === "BUY" ? "BIDS" : "ASKS";
    const priceKey = removeTolerance(bi(r.price)).toString();
    const key = `${r.symbol}|${side}|${priceKey}`;
    const prev = trueBook.get(key);
    if (prev) {
      prev.amount += remaining;
    } else {
      trueBook.set(key, { symbol: r.symbol, side, priceKey, amount: remaining });
    }
  }
  console.log(`Scanned ${orderRows.length} order rows -> ${openCount} OPEN with remaining > 0 -> ${trueBook.size} true price levels\n`);

  // ---- Read the CURRENT book --------------------------------------------
  // Symbols must come from the UNION of the orders table AND the orderbook's own
  // partitions. Deriving them from orders alone would make a symbol whose orders
  // are ALL gone invisible — which is precisely the pure-ghost case this script
  // exists to find. `SELECT DISTINCT` over the partition key enumerates the
  // orderbook partitions cheaply.
  let symbols;
  if (ONLY_SYMBOL) {
    symbols = [ONLY_SYMBOL];
  } else {
    const fromOrders = orderRows.map((r) => r.symbol).filter((s) => s && s.includes("/"));
    const distinct = await scylla.execute(
      `SELECT DISTINCT symbol, side FROM ${scyllaKeyspace}.orderbook`,
      [],
      { prepare: true }
    );
    const fromBook = distinct.rows.map((r) => r.symbol).filter((s) => s && s.includes("/"));
    symbols = Array.from(new Set([...fromOrders, ...fromBook]));
    const orphanSymbols = fromBook.filter((s) => !fromOrders.includes(s));
    if (orphanSymbols.length) {
      console.log(
        `Symbols with orderbook levels but NO orders at all: ${Array.from(new Set(orphanSymbols)).join(", ")}`
      );
    }
  }

  const currentBook = new Map(); // key -> { rawPrice (double as stored), amount: bigint }
  for (const symbol of symbols) {
    for (const side of ["ASKS", "BIDS"]) {
      const rows = await pagedAll(
        `SELECT price, amount FROM ${scyllaKeyspace}.orderbook WHERE symbol = ? AND side = ?`,
        [symbol, side]
      );
      for (const row of rows) {
        const priceKey = removeTolerance(toBigIntFloat(Number(row.price))).toString();
        const key = `${symbol}|${side}|${priceKey}`;
        const existing = currentBook.get(key);
        if (existing) {
          // Two stored doubles collapsing to one logical price — a duplicate-row
          // defect. Keep both raw prices so we can delete the stale one.
          existing.amount += toBigIntFloat(Number(row.amount));
          existing.rawPrices.push(row.price);
        } else {
          currentBook.set(key, {
            symbol,
            side,
            priceKey,
            amount: toBigIntFloat(Number(row.amount)),
            rawPrices: [row.price],
          });
        }
      }
    }
  }
  console.log(`Current book has ${currentBook.size} price levels across ${symbols.length} symbol(s)\n`);

  // ---- Diff --------------------------------------------------------------
  const ghosts = [];
  const missing = [];
  const mismatches = [];
  const duplicates = [];

  for (const [key, cur] of currentBook) {
    if (aiSymbols.has(cur.symbol) && !INCLUDE_AI) continue;
    if (cur.rawPrices.length > 1) duplicates.push(cur);
    const truth = trueBook.get(key);
    if (!truth) {
      ghosts.push(cur);
    } else if (truth.amount !== cur.amount) {
      mismatches.push({ ...cur, correct: truth.amount });
    }
  }
  for (const [key, truth] of trueBook) {
    if (aiSymbols.has(truth.symbol) && !INCLUDE_AI) continue;
    if (!currentBook.has(key)) missing.push(truth);
  }

  const fmt = (b) => fromBigInt(b);
  const price = (k) => fromBigInt(BigInt(k));

  if (ghosts.length) {
    console.log(`GHOST LEVELS (in book, no backing OPEN order) — ${ghosts.length}:`);
    for (const g of ghosts) {
      console.log(`  ${g.symbol.padEnd(12)} ${g.side.padEnd(5)} @ ${price(g.priceKey)}  amount ${fmt(g.amount)}   -> DELETE`);
    }
    console.log("");
  }
  if (missing.length) {
    console.log(`MISSING LEVELS (OPEN orders with no book level) — ${missing.length}:`);
    for (const m of missing) {
      console.log(`  ${m.symbol.padEnd(12)} ${m.side.padEnd(5)} @ ${price(m.priceKey)}  should be ${fmt(m.amount)}   -> INSERT`);
    }
    console.log("");
  }
  if (mismatches.length) {
    console.log(`AMOUNT MISMATCHES — ${mismatches.length}:`);
    for (const m of mismatches) {
      console.log(`  ${m.symbol.padEnd(12)} ${m.side.padEnd(5)} @ ${price(m.priceKey)}  book ${fmt(m.amount)} != orders ${fmt(m.correct)}   -> UPDATE`);
    }
    console.log("");
  }
  if (duplicates.length) {
    console.log(`DUPLICATE PRICE ROWS (same logical price stored as >1 double) — ${duplicates.length}:`);
    for (const d of duplicates) {
      console.log(`  ${d.symbol.padEnd(12)} ${d.side.padEnd(5)} raw prices: ${d.rawPrices.join(", ")}`);
    }
    console.log("");
  }

  // ---- Ecosystem levels stranded in the futures keyspace -------------------
  const stranded = (await findStrandedFuturesRows()).filter(
    (r) => !ONLY_SYMBOL || r.symbol === ONLY_SYMBOL
  );
  if (stranded.length) {
    console.log(
      `STRANDED IN ${scyllaFuturesKeyspace.toUpperCase()} KEYSPACE (ecosystem-only symbols written to the wrong keyspace) — ${stranded.length}:`
    );
    for (const s of stranded) {
      console.log(`  ${s.symbol.padEnd(12)} ${String(s.side).padEnd(5)} @ ${s.price}  amount ${s.amount}   -> DELETE`);
    }
    console.log("");
  }

  const totalIssues =
    ghosts.length + missing.length + mismatches.length + stranded.length;
  if (totalIssues === 0) {
    console.log("Orderbook is already consistent with open orders. Nothing to do.");
    return;
  }

  // ---- Crossed-book check (the actual user-visible "stuck market" symptom) --
  for (const symbol of symbols) {
    if (aiSymbols.has(symbol) && !INCLUDE_AI) continue;
    let bestBid = null;
    let bestAsk = null;
    for (const [, cur] of currentBook) {
      if (cur.symbol !== symbol) continue;
      const p = BigInt(cur.priceKey);
      if (cur.side === "BIDS" && (bestBid === null || p > bestBid)) bestBid = p;
      if (cur.side === "ASKS" && (bestAsk === null || p < bestAsk)) bestAsk = p;
    }
    if (bestBid !== null && bestAsk !== null && bestBid >= bestAsk) {
      console.log(
        `CROSSED BOOK on ${symbol}: best bid ${fromBigInt(bestBid)} >= best ask ${fromBigInt(bestAsk)} ` +
          `— this market cannot be traded normally until rebuilt.`
      );
      console.log("");
    }
  }

  if (!EXECUTE) {
    console.log("=".repeat(64));
    console.log(`DRY RUN — ${totalIssues} issue(s) found, nothing changed.`);
    console.log("Re-run with --execute to apply.");
    return;
  }

  // ---- Apply --------------------------------------------------------------
  console.log("=".repeat(64));
  console.log("Applying fixes...\n");
  let applied = 0;

  for (const g of ghosts) {
    // Delete by the EXACT stored double(s) so the row key matches byte-for-byte.
    for (const raw of g.rawPrices) {
      await scylla.execute(
        `DELETE FROM ${scyllaKeyspace}.orderbook WHERE symbol = ? AND side = ? AND price = ?`,
        [g.symbol, g.side, raw],
        { prepare: true }
      );
    }
    applied++;
    console.log(`  [DELETED] ${g.symbol} ${g.side} @ ${price(g.priceKey)}`);
  }

  for (const m of mismatches) {
    // Collapse any duplicate raw-price rows into ONE canonical row.
    for (const raw of m.rawPrices) {
      await scylla.execute(
        `DELETE FROM ${scyllaKeyspace}.orderbook WHERE symbol = ? AND side = ? AND price = ?`,
        [m.symbol, m.side, raw],
        { prepare: true }
      );
    }
    await scylla.execute(
      `INSERT INTO ${scyllaKeyspace}.orderbook (symbol, side, price, amount) VALUES (?, ?, ?, ?)`,
      [m.symbol, m.side, price(m.priceKey), fmt(m.correct)],
      { prepare: true }
    );
    applied++;
    console.log(`  [FIXED]   ${m.symbol} ${m.side} @ ${price(m.priceKey)} -> ${fmt(m.correct)}`);
  }

  for (const m of missing) {
    await scylla.execute(
      `INSERT INTO ${scyllaKeyspace}.orderbook (symbol, side, price, amount) VALUES (?, ?, ?, ?)`,
      [m.symbol, m.side, price(m.priceKey), fmt(m.amount)],
      { prepare: true }
    );
    applied++;
    console.log(`  [ADDED]   ${m.symbol} ${m.side} @ ${price(m.priceKey)} -> ${fmt(m.amount)}`);
  }

  for (const s of stranded) {
    await scylla.execute(
      `DELETE FROM ${scyllaFuturesKeyspace}.orderbook WHERE symbol = ? AND side = ? AND price = ?`,
      [s.symbol, s.side, s.price],
      { prepare: true }
    );
    applied++;
    console.log(`  [UNSTRANDED] ${scyllaFuturesKeyspace}.orderbook ${s.symbol} ${s.side} @ ${s.price}`);
  }

  console.log("");
  console.log("=".repeat(64));
  console.log(`Applied ${applied} fix(es).`);
  console.log("NOW RESTART THE BACKEND (pm2 restart / touch a .ts in dev) — the matching");
  console.log("engine holds the book and open-order queue in memory and will otherwise keep");
  console.log("broadcasting (and re-writing) its stale copy.");
}

main()
  .catch((err) => {
    console.error("FAILED:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await scylla.shutdown().catch(() => {});
    await sequelize.close().catch(() => {});
  });
