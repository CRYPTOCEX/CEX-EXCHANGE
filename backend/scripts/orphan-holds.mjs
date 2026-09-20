/**
 * ORPHAN HOLD SWEEPER (plans/done/ORDER-SCALE-10K.md WP-6.7).
 *
 * THE FAILURE THIS FINDS, WHICH NOTHING ELSE CAN
 * ==============================================
 * A placement takes the customer's money and then records the order. Between
 * those two steps there is a window, and a process that dies inside it leaves a
 * HOLD WITH NO ORDER: the `transaction` row exists, `inOrder` is raised, and
 * there is nothing anywhere that says what the money is for.
 *
 * The two tools that already exist both key off ScyllaDB ORDERS, so neither can
 * see it:
 *
 *   - `reconcile-eco-inorder.mjs` compares a wallet's inOrder against its OPEN
 *     orders and releases the surplus. It would in fact release this — which is
 *     right — but only in aggregate, and only if the operator is willing to run
 *     the tool that moves money in bulk.
 *   - `fix-ecosystem-orders.mjs` retires under-funded OPEN orders. There is no
 *     order here to retire.
 *
 * This one names the individual rows, so an operator can look at each, decide,
 * and release exactly that hold with its own key — a surgical instrument beside
 * the other two, which are blunt ones.
 *
 * IT NEVER WRITES. Not with --apply, not with a flag: there is no flag. It
 * prints the `releaseOnly` call an operator can run per row after reading it.
 * Money is released by a person who has looked, or by the bulk tool behind its
 * fence; never by a sweep that decided on its own.
 *
 * TWO KEY SHAPES THAT MUST NOT BE CONFUSED
 * ----------------------------------------
 *   HOLD      eco_order_place_<orderId>_<side>_<walletId>
 *   ROLLBACK  eco_order_place_rollback_<orderId>_<side>_<walletId>_release
 *
 * The second is the placement rollback's RELEASE — the proof that a failed
 * placement already gave the money back. It matches `eco_order_place_%`
 * character for character at the front, so a naive LIKE reports every correctly
 * rolled-back placement as an orphan. Both it and the ordinary
 * `<hold key>_release` row are what clears a hold here.
 *
 * SHARDS
 * ------
 * With a shard owning a symbol, ScyllaDB is a projection that lags it. An order
 * live on a shard and not yet projected has no OPEN row, so its hold looks
 * exactly like an orphan. The shards are therefore ASKED (scripts/
 * shard-probe.mjs), and a shard that cannot be reached makes the whole answer
 * untrustworthy — so the run says so and reports nothing, rather than handing
 * an operator a list of live orders to release.
 *
 *   node scripts/orphan-holds.mjs                # the last 24 hours
 *   node scripts/orphan-holds.mjs --hours 72
 *   node scripts/orphan-holds.mjs --all          # every hold ever taken
 *   node scripts/orphan-holds.mjs --user <id>
 */

import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { Client, auth } from "cassandra-driver";
import { Sequelize, QueryTypes } from "sequelize";
import { shardOpenOrders, shardTierConfigured, shardCount } from "./shard-probe.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.join(__dirname, "../../.env") });

const argv = process.argv;
const ALL = argv.includes("--all");
const hoursIdx = argv.indexOf("--hours");
const HOURS = hoursIdx !== -1 ? Number(argv[hoursIdx + 1]) : 24;
const userIdx = argv.indexOf("--user");
const ONLY_USER = userIdx !== -1 ? argv[userIdx + 1] : null;

const scyllaKeyspace = process.env.SCYLLA_KEYSPACE || "trading";
// SCYLLA_CONNECT_POINTS is what the platform actually sets (scylla/client.ts
// and every sibling script). SCYLLA_HOST is kept as a fallback so an operator
// who set only that still connects. Reading SCYLLA_HOST alone sent this tool
// to localhost:9042 on every install whose Scylla lives elsewhere — where it
// either fails to connect or, worse, reads a DIFFERENT cluster and reports
// live orders as orphaned holds.
const scyllaConfig = {
  contactPoints: process.env.SCYLLA_CONNECT_POINTS
    ? process.env.SCYLLA_CONNECT_POINTS.split(",").map((p) => p.trim())
    : [process.env.SCYLLA_HOST || "localhost"],
  localDataCenter: process.env.SCYLLA_DATACENTER || "datacenter1",
  keyspace: scyllaKeyspace,
};
if (process.env.SCYLLA_USERNAME && process.env.SCYLLA_PASSWORD) {
  scyllaConfig.authProvider = new auth.PlainTextAuthProvider(process.env.SCYLLA_USERNAME, process.env.SCYLLA_PASSWORD);
}
const scyllaClient = new Client(scyllaConfig);

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

/** `eco_order_place_<uuid>_<side>_<walletId>` -> its parts, or null. */
function parseHoldKey(key) {
  const match = /^eco_order_place_([0-9a-fA-F-]{36})_(buy|sell)_(.+)$/.exec(key);
  if (!match) return null;
  return { orderId: match[1], side: match[2], walletId: match[3] };
}

async function main() {
  console.log("=".repeat(72));
  console.log("Ecosystem orphan-hold sweep  (REPORT ONLY — this script never writes)");
  console.log(`Window: ${ALL ? "every hold ever taken" : `the last ${HOURS} hour(s)`}`);
  if (ONLY_USER) console.log(`Scoped to user: ${ONLY_USER}`);
  console.log("=".repeat(72) + "\n");

  await scyllaClient.connect();
  await sequelize.authenticate();

  /*
   * THE HOLDS. Deliberately NOT `LIKE 'eco_order_place_%'` alone: that pattern
   * also matches every `eco_order_place_rollback_..._release` row, which is the
   * proof a failed placement gave the money back, and reporting those as
   * orphans would send an operator to release money that was released.
   */
  const params = { prefix: "eco_order_place_%", rollback: "eco_order_place_rollback_%", release: "%_release" };
  let where = "t.idempotencyKey LIKE :prefix AND t.idempotencyKey NOT LIKE :rollback AND t.idempotencyKey NOT LIKE :release";
  if (!ALL) {
    where += " AND t.createdAt >= :since";
    params.since = new Date(Date.now() - HOURS * 3600_000);
  }
  if (ONLY_USER) {
    where += " AND t.userId = :userId";
    params.userId = ONLY_USER;
  }

  const holds = await sequelize.query(
    `SELECT t.id, t.userId, t.walletId, t.amount, t.idempotencyKey, t.createdAt, w.currency, w.type AS walletType
       FROM transaction t
       LEFT JOIN wallet w ON w.id = t.walletId
      WHERE ${where}
      ORDER BY t.createdAt ASC`,
    { type: QueryTypes.SELECT, replacements: params }
  );
  console.log(`${holds.length} placement hold(s) in the window.\n`);
  if (holds.length === 0) return finish();

  /*
   * THE RELEASES. One query rather than one per hold: a release row is the
   * hold's own key with `_release` appended (wallet.ts derives it), and the
   * rollback's is its own shape. Either one clears the hold.
   */
  const keys = holds.map((h) => h.idempotencyKey);
  const releaseKeys = keys.map((k) => `${k}_release`);
  const rollbackKeys = keys
    .map((k) => parseHoldKey(k))
    .filter(Boolean)
    .map((p) => `eco_order_place_rollback_${p.orderId}_${p.side}_${p.walletId}_release`);
  const releasedRows = await sequelize.query(
    `SELECT idempotencyKey FROM transaction WHERE idempotencyKey IN (:keys)`,
    { type: QueryTypes.SELECT, replacements: { keys: [...releaseKeys, ...rollbackKeys] } }
  );
  const released = new Set(releasedRows.map((r) => r.idempotencyKey));

  /*
   * THE CANCEL AND REFUND RELEASES. A cancelled order's hold is given back
   * under a DIFFERENT key entirely (`eco_order_cancel_<orderId>_<walletId>
   * _release`, and `eco_order_refund_...` on the Scylla path), so a hold whose
   * order was cancelled long ago must not be reported either. Keyed by order
   * id, because the wallet id in those keys is the same one.
   */
  const orderIds = [...new Set(holds.map((h) => parseHoldKey(h.idempotencyKey)?.orderId).filter(Boolean))];
  /*
   * CHUNKED PREFIX MATCHES, NOT ONE GIANT REGEXP.
   *
   * This used to build `^eco_order_(cancel|refund)_(id1|id2|...)_` and hand it
   * to `REGEXP`. Under `--all` that alternation carries every ecosystem order
   * id the install has ever placed: MariaDB's PCRE2 refuses a pattern past
   * roughly 64 KB (about 1,700 ids), and MySQL's ICU path instead trips
   * `regexp_time_limit` because every non-matching row backtracks the whole
   * alternation. Either way the tool an operator was sent to by the runbook
   * dies with a driver error.
   *
   * A chunked `LIKE ... OR LIKE ...` uses the same index prefix, is bounded,
   * and degrades linearly instead of exploding.
   */
  const cancelledOrders = new Set();
  const CHUNK = 200;
  for (let i = 0; i < orderIds.length; i += CHUNK) {
    const chunk = orderIds.slice(i, i + CHUNK);
    const clauses = [];
    const binds = {};
    chunk.forEach((id, n) => {
      clauses.push(`t.idempotencyKey LIKE :c${n}`, `t.idempotencyKey LIKE :r${n}`);
      binds[`c${n}`] = `eco_order_cancel_${id}\_%`;
      binds[`r${n}`] = `eco_order_refund_${id}\_%`;
    });
    const rows = await sequelize.query(
      `SELECT idempotencyKey FROM transaction t WHERE ${clauses.join(" OR ")}`,
      { type: QueryTypes.SELECT, replacements: binds }
    );
    for (const row of rows) {
      const m = /^eco_order_(?:cancel|refund)_([0-9a-fA-F-]{36})_/.exec(row.idempotencyKey);
      if (m) cancelledOrders.add(m[1]);
    }
  }

  // THE ORDERS THE PROJECTION KNOWS.
  const projected = new Map();
  for (const id of orderIds) {
    const rows = (await scyllaClient.execute(`SELECT id, status FROM ${scyllaKeyspace}.orders WHERE id = ? ALLOW FILTERING`, [id], { prepare: true })).rows;
    if (rows.length > 0) projected.set(id, String(rows[0].status));
  }

  /*
   * THE ORDERS THE SHARDS KNOW. The authority when the projection lags. A
   * shard that cannot be reached ends the run: a partial open set would make
   * every order it holds look orphaned, and the whole point of this tool is to
   * be trusted about individual rows.
   */
  const shardHeld = new Set();
  if (await shardTierConfigured()) {
    const users = [...new Set(holds.map((h) => String(h.userId)))];
    try {
      for (const userId of users) {
        for (const order of await shardOpenOrders(userId)) shardHeld.add(String(order.id));
      }
      console.log(`Asked ${shardCount()} shard(s): ${shardHeld.size} order(s) are live on a shard right now.\n`);
    } catch (error) {
      console.error(`REFUSED: a shard could not be asked what it holds (${error.message}).\n`);
      console.error(
        "Every order that shard is matching would be reported as an orphaned hold, and releasing one\n" +
          "would free the money behind a live order. Start the shards, or run this on a quiesced tier.\n"
      );
      process.exitCode = 2;
      return finish();
    }
  }

  const orphans = [];
  for (const hold of holds) {
    const parsed = parseHoldKey(hold.idempotencyKey);
    if (!parsed) continue;
    if (released.has(`${hold.idempotencyKey}_release`)) continue;
    if (released.has(`eco_order_place_rollback_${parsed.orderId}_${parsed.side}_${parsed.walletId}_release`)) continue;
    if (cancelledOrders.has(parsed.orderId)) continue;
    if (shardHeld.has(parsed.orderId)) continue;
    const status = projected.get(parsed.orderId);
    if (status === "OPEN") continue; // a live order, correctly funded
    orphans.push({ ...hold, ...parsed, projectedStatus: status ?? null });
  }

  if (orphans.length === 0) {
    console.log("No orphaned placement holds. Every hold in the window has an order or a release behind it.\n");
    return finish();
  }

  console.log(`${orphans.length} ORPHANED HOLD(S) — money is locked with no order behind it:\n`);
  const byCurrency = {};
  for (const o of orphans) {
    const amount = Number(o.amount ?? 0);
    byCurrency[o.currency ?? "?"] = (byCurrency[o.currency ?? "?"] ?? 0) + amount;
    console.log(
      `  ${new Date(o.createdAt).toISOString()}  user ${o.userId}  ${amount} ${o.currency ?? "?"} (${o.walletType ?? "?"})\n` +
        `      order ${o.orderId} ${o.projectedStatus === null ? "DOES NOT EXIST in the projection" : `is ${o.projectedStatus}`}\n` +
        `      key   ${o.idempotencyKey}`
    );
  }
  console.log("\nTotal locked, by currency:");
  for (const [ccy, total] of Object.entries(byCurrency)) console.log(`  ${total} ${ccy}`);

  console.log(
    "\nTO RELEASE ONE, after looking at it: use the wallet service's release-only path with the\n" +
      "hold's OWN key, so a retry can never mint —\n\n" +
      "    updateWalletBalance(wallet, <amount>, \"add\", \"<the key above>\", undefined, true)\n\n" +
      "The runbook step is plans/done/order-scale/runbooks.md, 'Orphan hold release'. This script will\n" +
      "not do it for you: a hold with no order is a symptom, and the crash that produced it should\n" +
      "be understood before the evidence is cleared.\n"
  );
  return finish();
}

async function finish() {
  await scyllaClient.shutdown().catch(() => {});
  await sequelize.close().catch(() => {});
}

main().catch(async (error) => {
  console.error(`orphan-holds failed: ${error?.message}`);
  console.error(error);
  process.exitCode = 1;
  await finish();
});
