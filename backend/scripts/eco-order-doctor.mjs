/**
 * Ecosystem Order Doctor
 *
 * READ-ONLY forensics for a single ecosystem order, across the four stores that
 * must agree about it plus the two MySQL tables that hold its money:
 *
 *   1. ecosystem.orders                 base table, partitioned by "userId"
 *   2. ecosystem.orders_by_symbol       MATERIALIZED VIEW ((symbol,"userId"), "createdAt", id)
 *   3. ecosystem.open_orders_by_market  the matcher's index — what the engine LOADS FROM
 *   4. ecosystem.orderbook              the aggregated level the customer sees
 *   5. wallet                           balance / inOrder
 *   6. transaction                      the ledger rows, keyed by idempotencyKey
 *
 * WHY THIS EXISTS. `fix-ecosystem-orders.mjs` answers "is this order funded". It
 * cannot answer the question that matters when an order is UNREACHABLE — resting
 * on the book, listed by the bot console, and absent from the customer's own
 * order panel with no door left to cancel it. That gap is a disagreement between
 * the six stores above, and every one of them has to be read to say which.
 *
 * The two readings that decide the diagnosis:
 *
 *   - THE VIEW ROW. The customer's symbol-scoped open list reads
 *     `orders_by_symbol` (utils/scylla/queries.ts, getOrders); the bot console
 *     reads the BASE table (hb/utils/tradingSnapshot.ts, loadOrders ->
 *     getEcoOrdersByUserId). "Visible in one, invisible in the other" is exactly
 *     the shape of a missing view row, and a lost Scylla view update is never
 *     retried by anything in this codebase.
 *
 *   - THE LEDGER ROWS. `eco_order_place_<orderId>_<side>_<walletId>` is written
 *     if and only if the placement hold actually ran. Its absence proves the
 *     order was never funded rather than drained — a different defect with a
 *     different fix.
 *
 * Also reports PHANTOM rows: rows in the user's partition with a NULL symbol,
 * which a partial CQL UPDATE bound to a "createdAt" that does not exist creates
 * instead of updating. Such a row is excluded from `orders_by_symbol` by the
 * view's own WHERE clause, so it is invisible to every symbol-scoped read while
 * every base-table read still returns it.
 *
 *     node backend/scripts/eco-order-doctor.mjs --order <uuid>
 *     node backend/scripts/eco-order-doctor.mjs --order <uuid> --user <uuid>   # skips the scan
 *     node backend/scripts/eco-order-doctor.mjs --open                         # every OPEN order
 *
 * Read-only: it issues no INSERT, UPDATE or DELETE. Retiring an order is
 * `fix-ecosystem-orders.mjs --execute`.
 */

import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { Client, auth } from "cassandra-driver";
import { Sequelize, QueryTypes } from "sequelize";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.join(__dirname, "../../.env") });

const argv = process.argv.slice(2);
const argOf = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : null;
};
const ORDER_ID = argOf("--order");
const USER_ID = argOf("--user");
const SCAN_OPEN = argv.includes("--open");

if (!ORDER_ID && !SCAN_OPEN) {
  console.error("Usage: node backend/scripts/eco-order-doctor.mjs --order <uuid> [--user <uuid>]");
  console.error("       node backend/scripts/eco-order-doctor.mjs --open");
  process.exit(1);
}

const ks = process.env.SCYLLA_KEYSPACE || "trading";

// SCYLLA_CONNECT_POINTS is what the platform actually sets; SCYLLA_HOST is kept
// as a fallback for an operator who set only that. Getting this wrong sends the
// script to localhost, where it reports a connection failure against a
// perfectly healthy cluster.
const scyllaConfig = {
  contactPoints: process.env.SCYLLA_CONNECT_POINTS
    ? process.env.SCYLLA_CONNECT_POINTS.split(",").map((p) => p.trim())
    : [process.env.SCYLLA_HOST || "localhost"],
  localDataCenter: process.env.SCYLLA_DATACENTER || "datacenter1",
  keyspace: ks,
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

/*
  SCALING HELPERS — MIRROR utils/blockchain.ts.

  `orders.price` is VARINT at the 1e18 fixed point; `orderbook.price` is a DOUBLE
  at human scale and it is a KEY COLUMN, so a key derived at the wrong scale
  selects nothing — and a SELECT that matches nothing is a perfectly good empty
  result rather than an error. removeTolerance's default digit count is 2, which
  is what createOrder applies to the price before storing it.
*/
const fromBigInt = (v) => (v == null ? null : Number(BigInt(v.toString())) / 1e18);
function removeTolerance(v, toleranceDigits = 2) {
  const b = BigInt(v.toString());
  const t = BigInt("1" + "0".repeat(toleranceDigits));
  return b < t ? b : (b / t) * t;
}
const orderbookPriceKey = (rawVarint) => fromBigInt(removeTolerance(BigInt(rawVarint)));

const hr = (c) => console.log((c || "=").repeat(78));
const yes = (b) => (b ? "YES" : "NO");

/** Find the base row without knowing its partition, if we have to. */
async function findBaseRow(orderId, userId) {
  if (userId) {
    const r = await scylla.execute(
      'SELECT * FROM ' + ks + '.orders WHERE "userId" = ?',
      [userId],
      { prepare: true }
    );
    return r.rows.find((x) => String(x.id) === orderId) || null;
  }
  // No partition key, so this is a cluster scan — deliberately. The doctor runs
  // once, by hand, about one order: the cost the platform refuses to pay on a
  // request path is the right cost to pay here.
  const r = await scylla.execute(
    'SELECT * FROM ' + ks + '.orders WHERE id = ? ALLOW FILTERING',
    [orderId],
    { prepare: true }
  );
  return r.rows[0] || null;
}

async function diagnose(base) {
  const orderId = String(base.id);
  const userId = String(base.userId);
  const symbol = base.symbol;
  const side = String(base.side || "").toUpperCase();
  const createdAt = base.createdAt;

  hr();
  console.log("ORDER " + orderId);
  hr();
  console.log("  user        " + userId);
  console.log("  symbol      " + (symbol == null ? "NULL  <-- PHANTOM ROW" : symbol));
  console.log("  side/type   " + (side || "NULL") + " / " + (base.type || "NULL"));
  console.log("  status      " + base.status);
  console.log(
    "  createdAt   " +
      (createdAt ? createdAt.toISOString() + "  (" + createdAt.getTime() + " ms)" : "NULL")
  );
  console.log("  updatedAt   " + (base.updatedAt ? base.updatedAt.toISOString() : "NULL"));
  console.log("  walletType  " + (base.walletType || "(null -> ECO)"));
  console.log("  botId       " + (base.botId || "-") + "      marketMakerId " + (base.marketMakerId || "-"));
  console.log("  price       " + fromBigInt(base.price));
  console.log("  amount      " + fromBigInt(base.amount));
  console.log("  filled      " + fromBigInt(base.filled));
  console.log("  remaining   " + fromBigInt(base.remaining));
  console.log("  cost        " + fromBigInt(base.cost));
  console.log("  fee         " + fromBigInt(base.fee) + " " + (base.feeCurrency || ""));
  console.log("");

  // ---------------------------------------------------------------- store 2
  // THE VIEW THE CUSTOMER'S PANEL READS. If the base row is here and this is
  // not, the order exists, rests and holds money — while the one list the
  // customer cancels from cannot see it.
  let mvRow = null;
  if (symbol) {
    const mv = await scylla.execute(
      'SELECT * FROM ' + ks + '.orders_by_symbol WHERE symbol = ? AND "userId" = ?',
      [symbol, userId],
      { prepare: true }
    );
    mvRow = mv.rows.find((x) => String(x.id) === orderId) || null;
  }
  console.log("[2] orders_by_symbol (MV — the customer's symbol-scoped panel)");
  if (!symbol) {
    console.log("    NOT APPLICABLE — a NULL symbol is excluded by the view's WHERE clause.");
  } else if (!mvRow) {
    console.log("    *** MISSING ***  base row present, view row absent.");
    console.log("    The panel reads this view (utils/scylla/queries.ts getOrders), so the");
    console.log("    order is invisible there while the bot console — which reads the base");
    console.log("    table — still lists it. Nothing in the platform repairs view drift.");
  } else {
    console.log("    present   status=" + mvRow.status + "  remaining=" + fromBigInt(mvRow.remaining));
    if (String(mvRow.status) !== String(base.status)) {
      console.log("    *** STALE ***  view says " + mvRow.status + ", base says " + base.status + ".");
    }
  }
  console.log("");

  // ---------------------------------------------------------------- store 3
  // WHAT THE MATCHING ENGINE LOADS FROM. A row here with status OPEN goes back
  // into the matching queue at every restart, whatever the base table says.
  let idxRow = null;
  if (symbol && side) {
    const idx = await scylla.execute(
      'SELECT * FROM ' + ks + '.open_orders_by_market WHERE symbol = ? AND side = ?',
      [symbol, side],
      { prepare: true }
    );
    idxRow = idx.rows.find((x) => String(x.id) === orderId) || null;
  }
  console.log("[3] open_orders_by_market (the matcher's index)");
  console.log(
    idxRow
      ? "    present   status=" + idxRow.status + "  price=" + idxRow.price + "  remaining=" + fromBigInt(idxRow.remaining)
      : "    absent    the engine will not reload this order"
  );
  console.log("");

  // ---------------------------------------------------------------- store 4
  console.log("[4] orderbook (the aggregated level everyone sees)");
  if (symbol && base.price != null) {
    const key = orderbookPriceKey(base.price);
    const obSide = side === "BUY" ? "BIDS" : "ASKS";
    const ob = await scylla.execute(
      'SELECT amount FROM ' + ks + '.orderbook WHERE symbol = ? AND price = ? AND side = ?',
      [symbol, key, obSide],
      { prepare: true }
    );
    console.log(
      ob.rows.length
        ? "    " + symbol + " " + obSide + " @ " + key + ": " + ob.rows[0].amount +
            "   (this order's remaining: " + fromBigInt(base.remaining) + ")"
        : "    no level at " + symbol + " " + obSide + " @ " + key
    );
  } else {
    console.log("    NOT APPLICABLE — no symbol/price on the row.");
  }
  console.log("");

  // ---------------------------------------------------------------- store 5
  console.log("[5] wallet");
  const walletType = base.walletType || "ECO";
  const lockCurrency =
    symbol && symbol.includes("/")
      ? side === "BUY"
        ? symbol.split("/")[1]
        : symbol.split("/")[0]
      : null;
  let wallet = null;
  if (lockCurrency) {
    const rows = await sequelize.query(
      "SELECT id, type, currency, balance, inOrder FROM wallet WHERE userId = ? AND currency = ? AND type = ?",
      { replacements: [userId, lockCurrency, walletType], type: QueryTypes.SELECT }
    );
    wallet = rows[0] || null;
  }
  if (!wallet) {
    console.log("    no " + walletType + " " + (lockCurrency || "?") + " wallet for this user");
  } else {
    const held = parseFloat(wallet.inOrder);
    const amount = fromBigInt(base.amount) || 0;
    const remaining = fromBigInt(base.remaining) || 0;
    const ratio = amount > 0 ? remaining / amount : 0;
    // Sized exactly as placeOrder sizes the hold: a BUY holds cost + fee, a SELL
    // holds the base amount. The faulty-order script compares against `cost`
    // alone, which UNDERSTATES a BUY's hold by its fee — good enough to detect
    // an underfunded order, wrong for a forensic report.
    const expected =
      side === "BUY"
        ? ((fromBigInt(base.cost) || 0) + (fromBigInt(base.fee) || 0)) * ratio
        : remaining;
    console.log(
      "    " + walletType + " " + lockCurrency + "  balance=" + wallet.balance + "  inOrder=" + wallet.inOrder
    );
    console.log("    hold this order should still carry: " + expected.toFixed(8) + " " + lockCurrency);
    console.log(
      "    shortfall: " + (expected - held).toFixed(8) +
        "   (inOrder is the wallet TOTAL across every open order)"
    );

    /*
      WHOSE HOLD IS THE REST OF THE POT?

      `inOrder` is one scalar per wallet with no per-order accounting, so a
      shortfall on THIS order says nothing about who the remainder belongs to.
      Before any repair releases it, the other OPEN orders drawing on the same
      wallet have to be named — `fix-ecosystem-orders.mjs` cannot do it for you,
      because it skips every row carrying `marketMakerId` or `botId` and a
      trading bot's orders are the OWNER'S orders, funded from this very wallet.
    */
    const partitionRows = await scylla.execute(
      'SELECT id, symbol, side, status, "remaining", cost, fee, "walletType" FROM ' +
        ks + '.orders WHERE "userId" = ?',
      [userId],
      { prepare: true }
    );
    const siblings = partitionRows.rows.filter((r) => {
      if (String(r.id) === orderId) return false;
      if (String(r.status ?? "").trim().toUpperCase() !== "OPEN") return false;
      if (!r.symbol || !r.symbol.includes("/")) return false;
      if ((r.walletType || "ECO") !== walletType) return false;
      const rSide = String(r.side || "").toUpperCase();
      const rCur = rSide === "BUY" ? r.symbol.split("/")[1] : r.symbol.split("/")[0];
      return rCur === lockCurrency;
    });
    console.log("");
    console.log("    other OPEN orders drawing on this same wallet:");
    if (!siblings.length) {
      console.log(
        "      none — the whole " + wallet.inOrder + " belongs to this order or to nothing"
      );
    } else {
      for (const r of siblings) {
        console.log(
          "      " + r.id + "  " + r.symbol + " " + String(r.side).toUpperCase() +
            "  needs ~" + (fromBigInt(r.cost) || fromBigInt(r.remaining) || 0).toFixed(8)
        );
      }
      console.log(
        "      *** the pot is SHARED — do not release the remainder without accounting for these ***"
      );
    }
  }
  console.log("");

  // ---------------------------------------------------------------- store 6
  // THE LEDGER SETTLES THE ARGUMENT. `eco_order_place_<id>_...` exists if and
  // only if the placement hold ran; `..._release` if something gave it back. An
  // order with no place row was never funded, which is a different defect from
  // one whose hold was released out from under it.
  console.log("[6] transaction ledger (idempotency keys naming this order)");
  // `transaction` has no currency column — the currency is the WALLET's, so it
  // is joined in. Deleted rows are included on purpose: the model is paranoid,
  // and a soft-deleted ledger row still explains where the money went.
  const txs = await sequelize.query(
    "SELECT t.id, t.type, t.status, t.amount, t.fee, w.currency, w.type AS walletType, " +
      "t.idempotencyKey, t.description, t.createdAt, t.deletedAt " +
      "FROM transaction t LEFT JOIN wallet w ON w.id = t.walletId " +
      "WHERE t.idempotencyKey LIKE ? ORDER BY t.createdAt ASC",
    { replacements: ["%" + orderId + "%"], type: QueryTypes.SELECT }
  );
  if (!txs.length) {
    console.log("    *** NONE ***  no ledger row names this order.");
    console.log("    The placement hold writes eco_order_place_" + orderId + "_<side>_<walletId>,");
    console.log("    so its absence means the hold NEVER RAN and the order has been resting");
    console.log("    unfunded since it was created.");
  } else {
    for (const t of txs) {
      console.log(
        "    " +
          (t.createdAt ? new Date(t.createdAt).toISOString() : "-") +
          "  " + String(t.type).padEnd(16) +
          " " + String(t.status).padEnd(10) +
          " " + t.amount + " " + (t.currency || "") +
          " " + (t.walletType || "") +
          "  " + t.idempotencyKey +
          (t.deletedAt ? "  [soft-deleted]" : "")
      );
    }
  }
  console.log("");

  // ------------------------------------------------------------- phantom rows
  // A partial UPDATE that binds a "createdAt" the partition does not hold does
  // not fail and does not update: it INSERTS. The result is a row with only the
  // SET columns populated, which the view drops (symbol IS NOT NULL) and every
  // base-table read still returns.
  const part = await scylla.execute(
    'SELECT id, "createdAt", symbol, side, status FROM ' + ks + '.orders WHERE "userId" = ?',
    [userId],
    { prepare: true }
  );
  const phantoms = part.rows.filter((r) => r.symbol == null);
  console.log("[7] phantom rows in this user's partition (symbol IS NULL)");
  if (!phantoms.length) {
    console.log("    none");
  } else {
    console.log("    *** " + phantoms.length + " *** — invisible to every symbol-scoped read,");
    console.log("    returned by every base-table read. See utils/scylla/cleanup.ts.");
    for (const p of phantoms.slice(0, 20)) {
      console.log(
        "    " + (p.createdAt ? p.createdAt.toISOString() : "-") + "  " + p.id + "  status=" + p.status
      );
    }
  }
  console.log("");

  // --------------------------------------------------------------- the verdict
  hr("-");
  console.log("VERDICT");
  hr("-");
  const inMv = Boolean(mvRow);
  const inIdx = Boolean(idxRow);
  console.log("  base table YES   view " + yes(inMv) + "   matcher index " + yes(inIdx));
  if (symbol && !inMv) {
    console.log("  UNREACHABLE: the customer's panel reads the view and cannot see this order.");
    console.log("  The per-order cancel route needs the row's timestamp as a query parameter");
    console.log("  (ecosystem/order/[id]/index.del.ts), so no panel row means no cancel.");
    console.log("  Cancel-all still reaches it — it page-walks the BASE table");
    console.log("  (getOpenOrdersByUserId), which is the one user-facing door that does.");
  }
  if (inMv && !inIdx) {
    console.log("  Listed but unmatched: the engine will not reload this order, so it can be");
    console.log("  cancelled and will never fill again.");
  }
  if (inIdx && String(base.status) === "OPEN") {
    console.log("  The engine WILL reload this order at the next restart. Releasing its funds");
    console.log("  without deleting the index row recreates it as unfunded resting liquidity.");
  }
  console.log("");
}

async function main() {
  hr();
  console.log("Ecosystem Order Doctor  (read-only)");
  hr();
  console.log("");
  await scylla.connect();
  await sequelize.authenticate();
  console.log("Connected. keyspace=" + ks + "  db=" + process.env.DB_NAME + "\n");

  if (SCAN_OPEN) {
    const r = await scylla.execute(
      "SELECT * FROM " + ks + ".orders WHERE status = 'OPEN' ALLOW FILTERING"
    );
    console.log(r.rows.length + " OPEN row(s) in the base table.\n");
    for (const row of r.rows) await diagnose(row);
  } else {
    const base = await findBaseRow(ORDER_ID, USER_ID);
    if (!base) {
      console.log("No row in " + ks + ".orders for " + ORDER_ID + ".");
      console.log("If the bot console still lists it, it is being served from the matcher's");
      console.log("in-memory book or from open_orders_by_market — check both.");
    } else {
      await diagnose(base);
    }
  }

  await scylla.shutdown();
  await sequelize.close();
}

main().catch(async (e) => {
  console.error("Doctor failed:", e);
  try {
    await scylla.shutdown();
    await sequelize.close();
  } catch (_) {}
  process.exit(1);
});
