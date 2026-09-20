/**
 * Survey and cancel accumulated AI MARKET-MAKER orders in the ecosystem book.
 *
 *     node backend/scripts/eco-mm-orders.mjs                    # survey only
 *     node backend/scripts/eco-mm-orders.mjs --symbol=MASH/USDT
 *     node backend/scripts/eco-mm-orders.mjs --apply            # cancel them
 *     node backend/scripts/eco-mm-orders.mjs --apply --keep=200 # leave 200 newest per side
 *
 * DRY RUN BY DEFAULT, per this repo's convention for anything that writes.
 *
 * WHY THIS EXISTS. The AI market maker had no quote-refresh cycle: every print
 * appended a new resting LIMIT order to the real ecosystem book and nothing
 * reliably removed the previous one. Combined with a restart-adoption bug that
 * cancelled under the wrong partition key — and a sweep that dropped orders from
 * tracking whether or not the cancel worked — one live market accumulated
 * 704,353 OPEN orders. The engine no longer does that, but the orders already
 * resting have to be cleared, and nothing in the product could do it: the
 * addon's own "cleanup" (deleteAiBotOrdersByMarket) only deletes rows from the
 * AI-side mirror table and never touches the ecosystem book at all.
 *
 * WHY IT IS SAFE TO CANCEL THESE, AND ONLY THESE
 *
 * AI market-maker orders hold NO customer funds. placeRealOrder writes them with
 * `userId = botId`, `marketMakerId` and `botId` set, `fee = 0`, and settles
 * fills from the market-maker pool — "Bot orders use pool liquidity, no wallet
 * locking needed". So cancelling one moves no wallet balance, and this script
 * performs ZERO MySQL writes. Attempting a refund here would CREATE money.
 *
 * That is also why the selector matters more than anything else in this file: a
 * real user's order looks identical apart from `marketMakerId`/`botId` being
 * null, and cancelling one of those without releasing its hold WOULD strand a
 * customer's funds in `inOrder`. Every row is re-read and re-checked
 * individually before it is touched — see cancellable().
 *
 * RUN IT WITH THE BACKEND STOPPED. Cancelling underneath a live matching engine
 * races its settlement: the engine can be filling an order between this script
 * reading it and cancelling it. The check is advisory (it cannot see a backend
 * on another host) — heed it.
 */

import fs from "fs";
import path from "path";
import net from "net";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..", "..");

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const ONLY_SYMBOL = (args.find((a) => a.startsWith("--symbol=")) || "").slice(9);
/** Leave this many of the NEWEST orders per side per market in place. */
const KEEP = (() => {
  const raw = (args.find((a) => a.startsWith("--keep=")) || "").slice(7);
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 ? n : 0;
})();
const PAGE_SIZE = 2000;
/** Cancels between pauses, so a live-ish cluster is not saturated. */
const CANCEL_CHUNK = 200;
const PAUSE_MS = 50;

// --------------------------------------------------------------------------
// env + driver, resolved the same way the other operator scripts do
// --------------------------------------------------------------------------

function readEnv() {
  const envPath = path.join(rootDir, ".env");
  const out = {};
  if (!fs.existsSync(envPath)) return out;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

const env = { ...readEnv(), ...process.env };
const keyspace = env.SCYLLA_KEYSPACE || "trading";
const contactPoints = (env.SCYLLA_CONNECT_POINTS || "127.0.0.1:9042")
  .split(",")
  .map((s) => s.trim());
const datacenter = env.SCYLLA_DATACENTER || "datacenter1";

function loadDriver() {
  const candidates = [
    path.join(rootDir, "node_modules", "cassandra-driver"),
    path.join(rootDir, "backend", "node_modules", "cassandra-driver"),
    "cassandra-driver",
  ];
  for (const c of candidates) {
    try {
      return require(c);
    } catch {
      /* next */
    }
  }
  console.error(
    "\n  Could not load cassandra-driver. Run `pnpm install` first.\n"
  );
  process.exit(1);
}

const { createRequire } = await import("module");
const require = createRequire(import.meta.url);
const cassandra = loadDriver();

const clientConfig = {
  contactPoints,
  localDataCenter: datacenter,
  socketOptions: { readTimeout: 120000 },
};
if (env.SCYLLA_USERNAME && env.SCYLLA_PASSWORD) {
  clientConfig.authProvider = new cassandra.auth.PlainTextAuthProvider(
    env.SCYLLA_USERNAME,
    env.SCYLLA_PASSWORD
  );
}
const client = new cassandra.Client(clientConfig);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const human = (n) => n.toLocaleString("en-US");

// --------------------------------------------------------------------------
// safety
// --------------------------------------------------------------------------

function portOpen(port, host = "127.0.0.1", timeoutMs = 500) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;
    const done = (v) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(v);
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));
    socket.connect(port, host);
  });
}

/**
 * Is this row an AI market-maker order that is safe to cancel?
 *
 * Deliberately paranoid and re-checked per row rather than trusted from the
 * paged scan: this is the ONLY thing standing between a cleanup and cancelling
 * a customer's funded order without releasing its hold.
 */
function cancellable(row) {
  if (!row) return { ok: false, why: "missing row" };
  if (row.status !== "OPEN") return { ok: false, why: `status ${row.status}` };
  // The whole safety argument. A real user's order has both of these null.
  const hasMaker = row.marketMakerId != null && String(row.marketMakerId).length > 0;
  const hasBot = row.botId != null && String(row.botId).length > 0;
  if (!hasMaker && !hasBot) return { ok: false, why: "not a bot order (no marketMakerId/botId)" };
  // A bot order that has taken a fill has moved pool balances; leave it for the
  // engine so the settlement path stays the only thing that reasons about it.
  const filled = Number(row.filled ?? 0);
  if (filled > 0) return { ok: false, why: "partially filled" };
  if (!row.id || !row.userId || !row.createdAt) return { ok: false, why: "incomplete key" };
  return { ok: true };
}

// --------------------------------------------------------------------------
// work
// --------------------------------------------------------------------------

async function symbolsToScan() {
  if (ONLY_SYMBOL) return [ONLY_SYMBOL];
  const found = new Set();
  for (const cql of [
    `SELECT DISTINCT symbol, side FROM ${keyspace}.open_orders_by_market;`,
    `SELECT DISTINCT symbol, side FROM ${keyspace}.orderbook;`,
  ]) {
    try {
      const result = await client.execute(cql);
      for (const row of result.rows) if (row.symbol) found.add(row.symbol);
    } catch {
      /* a table that is not there tells us nothing; try the next */
    }
  }
  return [...found].sort();
}

/**
 * Every OPEN bot order for a symbol, streamed.
 *
 * Read from the ledger, not the index: the ledger is the source of truth, it
 * carries `status`, `filled`, `marketMakerId` and `botId` — the fields the
 * safety check needs — and it is what a cancel has to agree with.
 */
async function* openBotOrders(symbol) {
  let pageState;
  do {
    const result = await client.execute(
      `SELECT id, "userId", symbol, side, price, amount, filled, status,
              "createdAt", "marketMakerId", "botId"
         FROM ${keyspace}.orders
        WHERE status = 'OPEN' AND symbol = ? ALLOW FILTERING;`,
      [symbol],
      { prepare: true, fetchSize: PAGE_SIZE, pageState }
    );
    pageState = result.pageState;
    yield result.rows;
  } while (pageState);
}

async function main() {
  console.log(
    `\n  AI market-maker orders — ${APPLY ? "CANCEL" : "SURVEY (dry run)"}` +
      `${KEEP ? `, keeping ${KEEP} newest per side` : ""}\n` +
      `  cluster ${contactPoints.join(",")}  keyspace ${keyspace}\n`
  );

  if (APPLY) {
    const backendUp = await portOpen(Number(env.NEXT_PUBLIC_BACKEND_PORT) || 4000);
    if (backendUp) {
      console.log(
        `  REFUSING TO RUN: something is listening on the backend port.\n\n` +
          `  Cancelling underneath a live matching engine races its settlement — it can be\n` +
          `  filling an order between this script reading it and cancelling it. Stop the\n` +
          `  platform first:\n\n` +
          `      pnpm stop\n\n` +
          `  then re-run, then \`pnpm start\`.\n`
      );
      await client.shutdown();
      process.exit(1);
    }
  }

  await client.connect();

  const symbols = await symbolsToScan();
  if (!symbols.length) {
    console.log("  No symbols found. Nothing to do.\n");
    await client.shutdown();
    return;
  }

  let grandBot = 0;
  let grandUser = 0;
  let grandCancelled = 0;
  let grandSkipped = 0;

  for (const symbol of symbols) {
    let bot = 0;
    let user = 0;
    let cancelled = 0;
    const skipReasons = new Map();
    /** Newest-first retention buffer, per side, when --keep is used. */
    const kept = { BUY: [], SELL: [] };

    for await (const page of openBotOrders(symbol)) {
      const batch = [];

      for (const row of page) {
        const verdict = cancellable(row);
        if (!verdict.ok) {
          if (verdict.why.startsWith("not a bot order")) user++;
          else skipReasons.set(verdict.why, (skipReasons.get(verdict.why) || 0) + 1);
          continue;
        }
        bot++;

        if (KEEP > 0) {
          const side = String(row.side).toUpperCase() === "BUY" ? "BUY" : "SELL";
          const bucket = kept[side];
          bucket.push(row);
          bucket.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          // Anything past the newest KEEP falls through to be cancelled.
          if (bucket.length <= KEEP) continue;
          batch.push(bucket.pop());
          continue;
        }

        batch.push(row);
      }

      if (!APPLY || !batch.length) continue;

      for (let i = 0; i < batch.length; i += CANCEL_CHUNK) {
        const chunk = batch.slice(i, i + CANCEL_CHUNK);
        // One logged batch per chunk: each order's status write and its index
        // DELETE must land together, or the matcher reloads a cancelled order
        // as live liquidity on the next boot.
        const statements = [];
        for (const row of chunk) {
          statements.push({
            query: `UPDATE ${keyspace}.orders SET status = 'CANCELED', "updatedAt" = ?
                     WHERE "userId" = ? AND id = ? AND "createdAt" = ?;`,
            params: [new Date(), row.userId, row.id, row.createdAt],
          });
          statements.push({
            query: `DELETE FROM ${keyspace}.open_orders_by_market
                     WHERE symbol = ? AND side = ? AND price = ? AND "createdAt" = ? AND id = ?;`,
            params: [row.symbol, row.side, row.price, row.createdAt, row.id],
          });
        }
        await client.batch(statements, { prepare: true });
        cancelled += chunk.length;
        if (PAUSE_MS) await sleep(PAUSE_MS);
      }
    }

    grandBot += bot;
    grandUser += user;
    grandCancelled += cancelled;
    for (const n of skipReasons.values()) grandSkipped += n;

    if (bot || user) {
      console.log(
        `  ${symbol.padEnd(18)} bot-open=${String(human(bot)).padStart(9)}` +
          `   user-open=${String(human(user)).padStart(9)}` +
          (APPLY ? `   cancelled=${String(human(cancelled)).padStart(9)}` : "")
      );
      for (const [why, n] of skipReasons) {
        console.log(`      skipped ${human(n)}: ${why}`);
      }
    }
  }

  console.log(
    `\n  bot orders open: ${human(grandBot)}   user orders (untouched): ${human(grandUser)}` +
      `   skipped: ${human(grandSkipped)}\n`
  );

  if (APPLY) {
    console.log(
      `  Cancelled ${human(grandCancelled)} AI market-maker order(s).\n\n` +
        `  No wallet balances were changed — bot orders hold no customer funds (they\n` +
        `  settle from the market-maker pool), so there is nothing to refund.\n\n` +
        `  NOW REBUILD THE AGGREGATED BOOK. This script did not touch \`orderbook\`, so\n` +
        `  every level those orders contributed is still displayed. Do NOT rely on the\n` +
        `  engine's reconciler to clear them: it only reconciles levels inside the\n` +
        `  resident window, so on a market deep enough to need this cleanup the levels\n` +
        `  outside that window would stay as phantom liquidity — and the market-BUY hold\n` +
        `  calculation reads that book.\n\n` +
        `      pnpm rebuild:eco-orderbook\n` +
        `      pnpm eco:index:check\n` +
        `      pnpm start\n`
    );
  } else if (grandBot > 0) {
    console.log(
      `  Nothing was changed. To cancel these, stop the platform and run:\n\n` +
        `      pnpm stop\n` +
        `      pnpm eco:mm:orders:clean\n` +
        `      pnpm rebuild:eco-orderbook\n` +
        `      pnpm start\n\n` +
        `  Add --keep=N to leave the N newest per side per market in place.\n`
    );
  } else {
    console.log(`  No AI market-maker orders are resting. Nothing to do.\n`);
  }

  await client.shutdown();
}

main().catch(async (error) => {
  console.error(`\n  FAILED: ${error?.message}\n`);
  try {
    await client.shutdown();
  } catch {
    /* already down */
  }
  process.exit(1);
});
