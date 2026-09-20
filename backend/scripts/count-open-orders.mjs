/**
 * Count OPEN ecosystem orders, per symbol. Plain Node — no tsx, no dotenv, no
 * module aliases.
 *
 *     node backend/scripts/count-open-orders.mjs
 *
 * WHY A .mjs AND NOT THE .ts VERSION
 *
 * The .ts sibling needs `tsx -r dotenv/config -r ./module-alias-setup.ts`, and
 * every one of those is a dev dependency. This script exists to diagnose an
 * install that is BROKEN — a boot that OOMs, a half-installed node_modules — and
 * on such a box that invocation fails before it reaches any data:
 *
 *     Need to install the following packages: tsx@4.23.1
 *     Error: Cannot find module 'dotenv/config'
 *
 * A diagnostic that only runs on a healthy machine is no diagnostic. So this
 * parses .env itself and needs exactly ONE package — cassandra-driver — which is
 * a production dependency of the backend and therefore present on any install
 * that can run the ecosystem at all.
 *
 * WHAT IT MEASURES
 *
 * The matching engine loads EVERY open order into memory at boot
 * (`initializeOrders` -> `getAllOpenOrders`), one `ALLOW FILTERING` scan per
 * symbol, sequentially, normalising each row into an object with six BigInts and
 * two Dates. That is why the Extensions boot phase grows without bound and
 * eventually dies:
 *
 *     FATAL ERROR: Ineffective mark-compacts near heap limit
 *     7770.3 (7774.5) -> 7770.3 (7774.5) MB
 *
 * Mark-compact reclaiming nothing means the memory is RETAINED, so the only
 * question is how many rows. This answers it with COUNT(*) — measuring the set
 * without materialising it, since materialising it is the bug.
 *
 * Read-only. Touches nothing.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const BACKEND = path.resolve(HERE, "..");
const ROOT = path.resolve(BACKEND, "..");

/**
 * Minimal .env reader. Deliberately not dotenv — see the header. Handles
 * KEY=VALUE, optional quotes, comments and blank lines, which is all this file
 * needs from it.
 */
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

/** cassandra-driver from wherever this install actually keeps it. */
function loadDriver() {
  const candidates = [
    "cassandra-driver",
    path.join(BACKEND, "node_modules", "cassandra-driver"),
    path.join(ROOT, "node_modules", "cassandra-driver"),
  ];
  for (const candidate of candidates) {
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
const contactPoints = (env.SCYLLA_CONNECT_POINTS || "127.0.0.1")
  .split(",")
  .map((p) => p.trim())
  .filter(Boolean);
const localDataCenter = env.SCYLLA_DATACENTER || "datacenter1";

const client = new cassandra.Client({
  contactPoints,
  localDataCenter,
  keyspace,
  ...(env.SCYLLA_USERNAME
    ? {
        authProvider: new cassandra.auth.PlainTextAuthProvider(
          env.SCYLLA_USERNAME,
          env.SCYLLA_PASSWORD || ""
        ),
      }
    : {}),
  socketOptions: { readTimeout: 120000 },
});

function human(n) {
  return Number(n).toLocaleString();
}

async function main() {
  console.log(`\n  Connecting to ${contactPoints.join(",")} (keyspace ${keyspace})...`);
  await client.connect();

  // Symbols exactly the way the engine derives them: the orderbook table, which
  // getAllOpenOrders unions in so that orders on a DELETED market are still
  // loaded. Markets live in MySQL, which this script deliberately does not open
  // a second connection for — the orderbook union is enough to size the problem.
  const symbols = new Set();
  try {
    const res = await client.execute(`SELECT DISTINCT symbol, side FROM ${keyspace}.orderbook;`);
    for (const row of res.rows) if (row.symbol) symbols.add(row.symbol);
  } catch (error) {
    console.error(`  Could not enumerate orderbook symbols: ${error.message}`);
  }

  // Total first: ONE scan, and the number that actually decides the fix.
  let grandTotal = null;
  try {
    const res = await client.execute(
      `SELECT COUNT(*) AS c FROM ${keyspace}.orders WHERE status = 'OPEN' ALLOW FILTERING;`
    );
    grandTotal = Number(res.rows?.[0]?.c ?? 0);
  } catch (error) {
    console.error(`  Whole-table count failed (${error.message}); falling back to per-symbol.`);
  }

  const counts = [];
  for (const symbol of symbols) {
    try {
      const res = await client.execute(
        `SELECT COUNT(*) AS c FROM ${keyspace}.orders WHERE status = 'OPEN' AND symbol = ? ALLOW FILTERING;`,
        [symbol],
        { prepare: true }
      );
      counts.push({ symbol, open: Number(res.rows?.[0]?.c ?? 0) });
    } catch (error) {
      console.error(`    ${symbol}: ${error.message}`);
    }
  }

  counts.sort((a, b) => b.open - a.open);
  const perSymbolTotal = counts.reduce((sum, c) => sum + c.open, 0);
  const total = grandTotal ?? perSymbolTotal;

  console.log(`\n  OPEN ecosystem orders — ${symbols.size} symbol(s) in the orderbook\n`);
  for (const c of counts.slice(0, 25)) {
    if (c.open) console.log(`    ${String(human(c.open)).padStart(12)}  ${c.symbol}`);
  }
  const zero = counts.filter((c) => !c.open).length;
  if (zero) console.log(`    (${zero} symbol(s) with none)`);

  console.log(`\n    TOTAL OPEN: ${human(total)}`);

  // Conservative: a normalised order is an object of ~20 properties including
  // six BigInts and two Dates. 1-2 KB retained once V8 headers, the property
  // map, the queue array slot and the per-symbol index are counted.
  const lowGb = (total * 1024) / 1024 ** 3;
  const highGb = (total * 2048) / 1024 ** 3;
  console.log(
    `    Heap just to HOLD them: ~${lowGb.toFixed(2)}-${highGb.toFixed(2)} GB (cap is 7.78 GB)\n`
  );

  if (highGb > 4) {
    console.log(
      "    ► Large enough to explain the boot OOM on its own. The engine holds all\n" +
        "      of these at once, and the orderbook reconciliation walks the set again.\n"
    );
  } else if (total > 0) {
    console.log(
      "    ► NOT large enough to explain a 7.7 GB heap by itself. Something else in\n" +
        "      the Extensions phase is retaining memory — report this number back.\n"
    );
  }

  await client.shutdown();
}

main().catch(async (error) => {
  console.error(`\n  Failed: ${error.message}\n`);
  try {
    await client.shutdown();
  } catch {}
  process.exit(1);
});
