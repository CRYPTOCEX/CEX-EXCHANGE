/**
 * Backfill, verify and repair `open_orders_by_market` — the book-ordered index
 * of OPEN ecosystem orders.
 *
 *     node backend/scripts/eco-open-orders-index.mjs               # verify only
 *     node backend/scripts/eco-open-orders-index.mjs --apply       # backfill/repair
 *     node backend/scripts/eco-open-orders-index.mjs --apply --prune
 *     node backend/scripts/eco-open-orders-index.mjs --symbol=BTC/USDT
 *
 * DRY RUN BY DEFAULT, per this repo's convention for anything that writes.
 * Without `--apply` it reads both tables, reports every disagreement, and exits
 * non-zero if it found any — which is what makes it usable as a deployment gate.
 *
 * ---------------------------------------------------------------------------
 * WHAT IT IS FOR
 * ---------------------------------------------------------------------------
 *
 * The matching engine can load open orders from either
 *
 *   `orders`                    a cluster-wide ALLOW FILTERING scan (legacy)
 *   `open_orders_by_market`     two single-partition reads — THE DEFAULT
 *
 * The second only tells the truth if the index actually mirrors the ledger. The
 * backend maintains that mirror on the write path and backfills itself the first
 * time the flag is switched on, so on a healthy install this script has nothing
 * to do. It exists for the cases where that is not enough:
 *
 *   - proving the index is correct on a live install with real customer orders —
 *     the engine reads it by default, so this is the command that answers
 *     "is it right?" without waiting for the server to notice;
 *   - repairing after an incident that broke the invariant (a Scylla node down
 *     mid-batch, a restore from an older snapshot of one table than the other);
 *   - answering "is it safe yet?" with a number instead of an opinion.
 *
 * ---------------------------------------------------------------------------
 * WHY PLAIN NODE
 * ---------------------------------------------------------------------------
 *
 * Same reason as count-open-orders.mjs: `tsx -r dotenv/config -r
 * ./module-alias-setup.ts` needs three dev dependencies, and this script has to
 * run on an install that is BROKEN — a half-finished `pnpm install`, a boot that
 * OOMs. A diagnostic that only runs on a healthy machine is no diagnostic. So it
 * parses .env itself and needs exactly one package, cassandra-driver, which is a
 * production dependency of the backend.
 *
 * The cost is that the CQL below is a SECOND copy of what
 * `utils/scylla/open-orders-index.ts` writes, and copies drift. That is guarded
 * rather than hoped about: assertSchema() reads the live table definition out of
 * system_schema and refuses to run if the column set or the primary key is not
 * what this file was written against. Drift then fails loudly on the next run
 * instead of quietly writing rows with a column missing.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const BACKEND = path.resolve(HERE, "..");
const ROOT = path.resolve(BACKEND, "..");

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const PRUNE = args.includes("--prune");
/**
 * Record the backfill as complete WITHOUT re-scanning.
 *
 * For the case where the index has already been proven correct — a `--apply`
 * run from a build that predates marker writing, or a verify pass that came
 * back clean — and all that is missing is the row the backend actually reads.
 * Re-running the whole backfill to set one boolean would cost another full
 * pass over the orders ledger for nothing.
 */
const MARK = args.includes("--mark");
const ONLY_SYMBOL = (args.find((a) => a.startsWith("--symbol=")) || "").slice(9);
const VERBOSE = args.includes("--verbose");

/** Minimal .env reader. Deliberately not dotenv — see the header. */
function readEnv() {
  const out = {};
  for (const candidate of [path.join(ROOT, ".env"), path.join(BACKEND, ".env")]) {
    if (!fs.existsSync(candidate)) continue;
    for (const line of fs.readFileSync(candidate, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in out)) out[key] = value;
    }
    break;
  }
  return { ...out, ...process.env };
}

const env = readEnv();

function loadDriver() {
  for (const candidate of [
    "cassandra-driver",
    path.join(BACKEND, "node_modules", "cassandra-driver"),
    path.join(ROOT, "node_modules", "cassandra-driver"),
  ]) {
    try {
      return require(candidate);
    } catch {
      /* next */
    }
  }
  console.error(
    "\n  Could not load cassandra-driver from backend/node_modules or the root.\n" +
      "  Repair the install first:  pnpm install\n"
  );
  process.exit(1);
}

const cassandra = loadDriver();

const keyspace = env.SCYLLA_KEYSPACE || "trading";
const TABLE = "open_orders_by_market";
const contactPoints = (env.SCYLLA_CONNECT_POINTS || "127.0.0.1")
  .split(",")
  .map((p) => p.trim())
  .filter(Boolean);

const client = new cassandra.Client({
  contactPoints,
  localDataCenter: env.SCYLLA_DATACENTER || "datacenter1",
  ...(env.SCYLLA_USERNAME
    ? {
        authProvider: new cassandra.auth.PlainTextAuthProvider(
          env.SCYLLA_USERNAME,
          env.SCYLLA_PASSWORD || ""
        ),
      }
    : {}),
  // Long, because a repair on a large install is a full scan per symbol and the
  // default 12s read timeout turns a slow-but-working repair into a crash loop.
  socketOptions: { readTimeout: 300000 },
});

const SIDES = ["BUY", "SELL"];

/**
 * Columns this script writes, in bind order. Must match INDEX_COLUMNS in
 * utils/scylla/open-orders-index.ts — assertSchema() below proves it.
 */
const COLUMNS = [
  "symbol",
  "side",
  "price",
  '"createdAt"',
  "id",
  '"userId"',
  "type",
  '"timeInForce"',
  "average",
  "amount",
  "filled",
  "remaining",
  "cost",
  "trades",
  "fee",
  '"feeCurrency"',
  "status",
  '"updatedAt"',
  '"marketMakerId"',
  '"botId"',
  '"walletType"',
];

const INSERT = `INSERT INTO ${keyspace}.${TABLE} (${COLUMNS.join(", ")}) VALUES (${COLUMNS.map(
  () => "?"
).join(", ")});`;

const DELETE = `DELETE FROM ${keyspace}.${TABLE}
  WHERE symbol = ? AND side = ? AND price = ? AND "createdAt" = ? AND id = ?;`;

function human(n) {
  return Number(n).toLocaleString();
}

/**
 * Refuse to run against a table that is not the one this file was written for.
 *
 * The failure this prevents is specific and silent: if the backend adds a column
 * to the index and this script does not, `--apply` rewrites every row with that
 * column set to null — and because an INSERT here is an upsert on the full
 * primary key, it does so without any error at all. A repair that quietly
 * deletes data is worse than no repair.
 */
async function assertSchema() {
  const cols = await client.execute(
    `SELECT column_name, kind, position FROM system_schema.columns
      WHERE keyspace_name = ? AND table_name = ?;`,
    [keyspace, TABLE],
    { prepare: true }
  );

  if (!cols.rows.length) {
    console.error(
      `\n  ${keyspace}.${TABLE} does not exist.\n\n` +
        `  It is created at boot by the backend (utils/scylla/client.ts). Start the\n` +
        `  backend once against this cluster, then re-run.\n`
    );
    process.exit(1);
  }

  const actual = new Set(cols.rows.map((r) => r.column_name));
  const expected = COLUMNS.map((c) => c.replace(/"/g, ""));
  const missing = expected.filter((c) => !actual.has(c));
  const extra = [...actual].filter((c) => !expected.includes(c));

  if (missing.length || extra.length) {
    console.error(
      `\n  ${keyspace}.${TABLE} does not match what this script expects.\n` +
        (missing.length ? `    missing here: ${missing.join(", ")}\n` : "") +
        (extra.length ? `    unknown to this script: ${extra.join(", ")}\n` : "") +
        `\n  Refusing to run: an INSERT is an upsert, so writing with a stale column\n` +
        `  list would blank the columns it does not know about. Update this script\n` +
        `  and utils/scylla/open-orders-index.ts together.\n`
    );
    process.exit(1);
  }

  // The clustering order is the whole reason this table exists. A table created
  // by an older build, or by hand, could carry the right columns in the wrong
  // order and still answer every query — just not in matching order.
  const partition = cols.rows
    .filter((r) => r.kind === "partition_key")
    .sort((a, b) => a.position - b.position)
    .map((r) => r.column_name)
    .join(",");
  const clustering = cols.rows
    .filter((r) => r.kind === "clustering")
    .sort((a, b) => a.position - b.position)
    .map((r) => r.column_name)
    .join(",");

  if (partition !== "symbol,side" || clustering !== "price,createdAt,id") {
    console.error(
      `\n  ${keyspace}.${TABLE} has the wrong primary key.\n` +
        `    partition:  ${partition}   (expected symbol,side)\n` +
        `    clustering: ${clustering}   (expected price,createdAt,id)\n\n` +
        `  Price-time priority is PHYSICAL row order in this table; a different key\n` +
        `  changes which orders fill first. Drop the table and let the backend\n` +
        `  recreate it, then re-run with --apply.\n`
    );
    process.exit(1);
  }
}

/**
 * Every symbol that could hold an order, from all three places one can appear.
 *
 * THE MARKET LIST IS IN MYSQL AND THIS SCRIPT DOES NOT OPEN IT — that is the
 * price of running on a broken install (see the header). So the market list is
 * reconstructed from Scylla, and it has to be reconstructed COMPLETELY: a symbol
 * this misses is a symbol whose orders go unverified and unrepaired, and the
 * script would then print "clean" over the exact case an operator is checking
 * for.
 *
 *   `orders_by_symbol`  — every symbol that has ANY order, ever. This is the
 *                         authoritative one. DISTINCT works because that view is
 *                         partitioned by (symbol, "userId"), and DISTINCT is only
 *                         legal on partition-key columns.
 *   `orderbook`         — a symbol whose orders were all closed but whose
 *                         aggregated levels linger.
 *   the index itself    — a symbol removed from everything else, so its stale
 *                         index rows can still be pruned.
 *
 * Relying on `orderbook` alone was the first version of this function and it was
 * wrong: on a cluster with an empty orderbook it reported "No symbols found.
 * Nothing to do." while open orders sat in the ledger unindexed.
 */
async function enumerateSymbols() {
  if (ONLY_SYMBOL) return [ONLY_SYMBOL];
  const symbols = new Set();

  const sources = [
    { cql: `SELECT DISTINCT symbol, "userId" FROM ${keyspace}.orders_by_symbol;`, what: "orders" },
    { cql: `SELECT DISTINCT symbol, side FROM ${keyspace}.orderbook;`, what: "orderbook" },
    { cql: `SELECT DISTINCT symbol, side FROM ${keyspace}.${TABLE};`, what: "index" },
  ];

  let anySucceeded = false;
  for (const source of sources) {
    try {
      const res = await client.execute(source.cql);
      for (const row of res.rows) if (row.symbol) symbols.add(row.symbol);
      anySucceeded = true;
    } catch (error) {
      console.error(`  Could not enumerate symbols from ${source.what}: ${error.message}`);
    }
  }

  if (!anySucceeded) {
    console.error(
      "\n  Every symbol source failed. Refusing to report a result: an empty symbol\n" +
        "  list is indistinguishable from a clean index, and reporting the second\n" +
        "  when it is the first is how a broken index gets signed off as a healthy one.\n"
    );
    process.exit(1);
  }

  return [...symbols].sort();
}

/** Every OPEN order for a symbol, out of the ledger. Paged. */
async function ledgerOpenOrders(symbol) {
  const rows = [];
  let pageState;
  do {
    const result = await client.execute(
      `SELECT * FROM ${keyspace}.orders WHERE status = 'OPEN' AND symbol = ? ALLOW FILTERING;`,
      [symbol],
      { prepare: true, fetchSize: 2000, pageState }
    );
    rows.push(...result.rows);
    pageState = result.pageState;
  } while (pageState);
  return rows;
}

/** Every index row for a symbol. Paged, both sides. */
async function indexRows(symbol) {
  const rows = [];
  for (const side of SIDES) {
    let pageState;
    do {
      const result = await client.execute(
        `SELECT * FROM ${keyspace}.${TABLE} WHERE symbol = ? AND side = ?;`,
        [symbol, side],
        { prepare: true, fetchSize: 2000, pageState }
      );
      rows.push(...result.rows);
      pageState = result.pageState;
    } while (pageState);
  }
  return rows;
}

function varint(value) {
  return value === null || value === undefined ? null : value.toString();
}

function insertParams(row) {
  return [
    row.symbol,
    String(row.side).toUpperCase(),
    varint(row.price),
    row.createdAt,
    row.id,
    row.userId,
    row.type,
    row.timeInForce ?? null,
    varint(row.average),
    varint(row.amount),
    varint(row.filled),
    varint(row.remaining),
    varint(row.cost),
    row.trades ?? null,
    varint(row.fee),
    row.feeCurrency,
    row.status,
    row.updatedAt ?? row.createdAt,
    row.marketMakerId ?? null,
    row.botId ?? null,
    row.walletType ?? "ECO",
  ];
}

/** Send statements in bounded UNLOGGED batches — every one is idempotent. */
async function writeChunked(statements, chunk = 100) {
  for (let i = 0; i < statements.length; i += chunk) {
    await client.batch(statements.slice(i, i + chunk), {
      prepare: true,
      logged: false,
    });
  }
}

/**
 * The fields whose disagreement between the two tables would change matching.
 *
 * NOT every column: `updatedAt` moves on its own on both sides and comparing it
 * would report a difference on every partially filled order forever, which
 * trains an operator to ignore the report. These are the ones a mismatch in
 * would actually fill the wrong order or fill it for the wrong amount.
 */
function compareRow(ledger, index) {
  const diffs = [];
  const check = (name, a, b) => {
    const left = a === null || a === undefined ? null : a.toString();
    const right = b === null || b === undefined ? null : b.toString();
    if (left !== right) diffs.push(`${name}: ledger=${left} index=${right}`);
  };
  check("price", ledger.price, index.price);
  check("side", ledger.side, index.side);
  check("remaining", ledger.remaining, index.remaining);
  check("filled", ledger.filled, index.filled);
  check("amount", ledger.amount, index.amount);
  check("status", ledger.status, index.status);
  check("type", ledger.type, index.type);
  check("userId", ledger.userId, index.userId);
  check("walletType", ledger.walletType ?? "ECO", index.walletType ?? "ECO");
  check("createdAt", ledger.createdAt?.getTime(), index.createdAt?.getTime());
  return diffs;
}

async function main() {
  console.log(
    `\n  ${keyspace}.${TABLE} — ${MARK ? "MARK BACKFILL COMPLETE" : APPLY ? "REPAIR" : "VERIFY (dry run)"}` +
      `${PRUNE ? " +prune" : ""}\n  cluster ${contactPoints.join(",")}\n`
  );

  await client.connect();
  await assertSchema();

  if (MARK) {
    await client.execute(
      `INSERT INTO ${keyspace}.eco_index_state (name, value, "updatedAt") VALUES (?, ?, ?);`,
      ["open_orders_by_market:backfill", "done", new Date()],
      { prepare: true }
    );
    console.log(
      `  Backfill marked complete.\n\n` +
        `  The next backend start loads open orders from the index — two partition reads\n` +
        `  per market — instead of a cluster-wide ALLOW FILTERING scan of the orders\n` +
        `  table. Restart the backend to pick it up.\n\n` +
        `  This wrote a marker and NOTHING ELSE. If you have not verified the index\n` +
        `  against the ledger, do that first:  pnpm eco:index:check\n`
    );
    await client.shutdown();
    return;
  }

  const symbols = await enumerateSymbols();
  if (!symbols.length) {
    console.log("  No symbols found. Nothing to do.\n");
    await client.shutdown();
    return;
  }

  let totalOpen = 0;
  let totalIndexed = 0;
  let totalMissing = 0;
  let totalStale = 0;
  let totalMismatched = 0;
  let totalWritten = 0;
  let totalPruned = 0;

  for (const symbol of symbols) {
    const ledger = await ledgerOpenOrders(symbol);
    const index = await indexRows(symbol);

    const ledgerById = new Map(ledger.map((r) => [String(r.id), r]));
    const indexById = new Map(index.map((r) => [String(r.id), r]));

    // Un-indexable rows are reported separately: they are corrupted orders (see
    // utils/scylla/cleanup.ts), not index defects, and counting them as
    // "missing" would make the index look permanently broken.
    const unindexable = ledger.filter(
      (r) => !r.symbol || !r.side || r.price === null || !r.createdAt || !r.id
    );

    const missing = [...ledgerById.values()].filter(
      (r) => !indexById.has(String(r.id)) && !unindexable.includes(r)
    );
    const stale = [...indexById.values()].filter((r) => !ledgerById.has(String(r.id)));

    const mismatched = [];
    for (const [id, ledgerRow] of ledgerById) {
      const indexRow = indexById.get(id);
      if (!indexRow) continue;
      const diffs = compareRow(ledgerRow, indexRow);
      if (diffs.length) mismatched.push({ id, diffs });
    }

    totalOpen += ledger.length;
    totalIndexed += index.length;
    totalMissing += missing.length;
    totalStale += stale.length;
    totalMismatched += mismatched.length;

    const clean = !missing.length && !stale.length && !mismatched.length;
    const flag = clean ? "ok " : "!! ";
    console.log(
      `  ${flag}${symbol.padEnd(18)} ledger-open=${String(human(ledger.length)).padStart(9)}` +
        `  indexed=${String(human(index.length)).padStart(9)}` +
        (missing.length ? `  MISSING=${human(missing.length)}` : "") +
        (stale.length ? `  STALE=${human(stale.length)}` : "") +
        (mismatched.length ? `  MISMATCH=${human(mismatched.length)}` : "") +
        (unindexable.length ? `  corrupted=${human(unindexable.length)}` : "")
    );

    if (VERBOSE) {
      for (const m of mismatched.slice(0, 10)) {
        console.log(`        ${m.id}  ${m.diffs.join("; ")}`);
      }
      for (const r of unindexable.slice(0, 10)) {
        console.log(
          `        ${r.id}  un-indexable (side=${r.side} price=${r.price} createdAt=${r.createdAt})`
        );
      }
    }

    if (!APPLY) continue;

    // Rewrite every OPEN order. An INSERT here is an upsert on the full primary
    // key, so this repairs both the missing rows and the mismatched ones in one
    // pass and is safe to re-run.
    const writes = [...ledgerById.values()]
      .filter((r) => !unindexable.includes(r))
      .map((r) => ({ query: INSERT, params: insertParams(r) }));
    await writeChunked(writes);
    totalWritten += writes.length;

    if (PRUNE && stale.length) {
      const deletes = stale.map((r) => ({
        query: DELETE,
        params: [r.symbol, r.side, varint(r.price), r.createdAt, r.id],
      }));
      await writeChunked(deletes);
      totalPruned += deletes.length;
    }
  }

  console.log(
    `\n  ledger OPEN: ${human(totalOpen)}   indexed: ${human(totalIndexed)}\n` +
      `  missing from index: ${human(totalMissing)}   stale in index: ${human(totalStale)}` +
      `   mismatched: ${human(totalMismatched)}\n`
  );

  if (APPLY) {
    console.log(
      `  wrote ${human(totalWritten)} row(s)` +
        (PRUNE ? `, pruned ${human(totalPruned)}` : "") +
        `.\n  Re-run WITHOUT --apply to confirm the index is now clean.\n`
    );
    if (!PRUNE && totalStale) {
      console.log(
        `  ${human(totalStale)} stale row(s) were left in place. They are orders that are no\n` +
          `  longer OPEN; the matcher skips them (it filters on status), but they cost\n` +
          `  memory at boot. Re-run with --prune to remove them.\n`
      );
    }

    // RECORD COMPLETION, or this whole run bought the operator nothing.
    //
    // The backend does not decide "is the index usable?" by looking at the
    // index — it reads one marker row in eco_index_state, written only by its
    // own background backfill when that finishes. This script rebuilt every
    // row and left that marker untouched, so the very next boot still called
    // isBackfillComplete() -> false, still fell back to the cluster-wide
    // ALLOW FILTERING scan, and still started its own background rebuild of
    // the index this run had just finished building.
    //
    // That is precisely the trap an operator hits on a large install: the
    // build runs in the background and only records completion at the END, so
    // a backend that keeps restarting never finishes it, and the documented
    // repair — this script — could not break the cycle either.
    //
    // Only for a FULL pass. `--symbol=` repairs one market and proves nothing
    // about the rest, so it must not claim the whole backfill is done.
    if (!ONLY_SYMBOL) {
      try {
        await client.execute(
          `INSERT INTO ${keyspace}.eco_index_state (name, value, "updatedAt") VALUES (?, ?, ?);`,
          ["open_orders_by_market:backfill", "done", new Date()],
          { prepare: true }
        );
        console.log(
          `  Marked the backfill complete. The next backend start reads open orders from\n` +
            `  the index instead of scanning the orders table — restart it to pick this up.\n`
        );
      } catch (error) {
        console.log(
          `  ! Rows are written, but the completion marker could not be set (${error.message}).\n` +
            `    The backend will keep reading the ledger at boot and rebuilding the index in\n` +
            `    the background until it can write that marker itself.\n`
        );
      }
    } else {
      console.log(
        `  --symbol was used, so the backfill is NOT marked complete: one market says\n` +
          `  nothing about the others. Run without --symbol to finish the job.\n`
      );
    }

    await client.shutdown();
    return;
  }

  if (totalMissing || totalStale || totalMismatched) {
    console.log(
      `  THE INDEX DISAGREES WITH THE LEDGER — repair it.\n\n` +
        `  ${human(totalMissing)} OPEN order(s) are absent from the index. The matching engine\n` +
        `  reads that index by DEFAULT, so an order missing from it is invisible to the\n` +
        `  matcher while it is still OPEN, still holding the customer's funds, and still\n` +
        `  shown in the book.\n\n` +
        `  The server defends itself against this: it samples the index against the ledger\n` +
        `  at every start and falls back to the old table scan when it comes up short, so\n` +
        `  the orders are being served — slowly. This is the repair:\n\n` +
        `      pnpm eco:index:repair\n` +
        `      pnpm eco:index:check      (confirm, then restart the backend)\n\n` +
        `  To stay on the old scan deliberately, set ECO_BOOK_SOURCE=legacy in .env.\n`
    );
    await client.shutdown();
    process.exit(1);
  }

  // ROWS ARE NOT THE WHOLE STORY. The backend does not inspect the index to
  // decide whether it may use it — it reads ONE marker row. A perfectly correct
  // index with no marker is still ignored: every boot falls back to the
  // cluster-wide ALLOW FILTERING scan and then rebuilds the index it already
  // has. That state reported "Index matches the ledger on every symbol.
  // Nothing to do." while the operator's backend was scanning 704,353 orders on
  // every start, which is the least useful true sentence this script could
  // print. Check the marker and say so.
  let marked = false;
  try {
    const state = await client.execute(
      `SELECT value FROM ${keyspace}.eco_index_state WHERE name = ?;`,
      ["open_orders_by_market:backfill"],
      { prepare: true }
    );
    marked = state.rows?.[0]?.value === "done";
  } catch {
    /* treated as "not marked" — the advice below is harmless if it is wrong */
  }

  if (!marked) {
    console.log(
      `  Index matches the ledger on every symbol — but the backfill is NOT marked\n` +
        `  complete, so the backend still ignores it.\n\n` +
        `  It decides by reading one marker row in ${keyspace}.eco_index_state, not by\n` +
        `  looking at the index. Until that row says "done", every start pays the full\n` +
        `  cluster-wide scan and then rebuilds this index in the background.\n\n` +
        `  Mark it (the rows are already proven correct, so this is safe):\n\n` +
        `      pnpm eco:index:mark\n\n` +
        `  Then restart the backend.\n`
    );
    await client.shutdown();
    process.exit(1);
  }

  console.log(
    `  Index matches the ledger on every symbol, and the backfill is marked complete.\n\n` +
      `  Nothing to do — the matching engine reads this index by default, loading open\n` +
      `  orders with two partition reads per market instead of a cluster-wide scan, in\n` +
      `  price-time order, and without re-sorting them.\n`
  );
  await client.shutdown();
}

main().catch(async (error) => {
  console.error(`\n  Failed: ${error.message}\n`);
  if (VERBOSE) console.error(error);
  try {
    await client.shutdown();
  } catch {}
  process.exit(1);
});
