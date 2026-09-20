/**
 * Reconcile Ecosystem inOrder Script
 *
 * Releases funds that are stuck in a wallet's `inOrder` (locked) balance with no
 * corresponding OPEN order — the residue left behind by the cancel-orphan and
 * BUY price-improvement leaks (see order/[id]/index.del.ts and matchmaking.ts).
 *
 * For every ECO wallet it recomputes the CORRECT inOrder as the sum of holds
 * attributable to the user's OPEN orders only:
 *   - BUY  (wallet currency == quote): remaining * limitPrice  ( = cost*remaining/amount )
 *   - SELL (wallet currency == base):  remaining              ( base held )
 * The positive difference (actual inOrder - expected) is the stranded amount and
 * is released back to the spendable balance. It NEVER debits balance or raises
 * inOrder, so a user with genuinely open orders can never be over-credited, and
 * an under-locked wallet (inOrder < expected) is only reported, never "fixed"
 * here (that is the job of fix-ecosystem-orders.mjs).
 *
 * Idempotent: it recomputes from current state, so a second run is a no-op.
 *
 * DRY-RUN by default (reports the exposure). Pass --apply to move funds.
 *   Report:  node scripts/reconcile-eco-inorder.mjs
 *   Apply:   node scripts/reconcile-eco-inorder.mjs --apply
 *   One user: node scripts/reconcile-eco-inorder.mjs --user <userId> [--apply]
 *
 * After --apply, restart the backend so cached wallet rows are refreshed.
 */

import { readScyllaPages } from "./scylla-pages.mjs";
import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { Client, auth } from "cassandra-driver";
import { Sequelize, DataTypes } from "sequelize";
import { reconcileFence, shardTierConfigured } from "./shard-probe.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.join(__dirname, "../../.env") });

const APPLY = process.argv.includes("--apply");
const userArgIdx = process.argv.indexOf("--user");
const ONLY_USER = userArgIdx !== -1 ? process.argv[userArgIdx + 1] : null;
// Ignore residue at or below this — sub-dust from bigint flooring is meaningless.
const TOLERANCE = 0.00000001; // 1e-8 (display precision)

const scyllaKeyspace = process.env.SCYLLA_KEYSPACE || "trading";
const scyllaConfig = {
  contactPoints: [process.env.SCYLLA_HOST || "localhost"],
  localDataCenter: process.env.SCYLLA_DATACENTER || "datacenter1",
  keyspace: scyllaKeyspace,
};
if (process.env.SCYLLA_USERNAME && process.env.SCYLLA_PASSWORD) {
  scyllaConfig.authProvider = new auth.PlainTextAuthProvider(
    process.env.SCYLLA_USERNAME,
    process.env.SCYLLA_PASSWORD
  );
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

const Wallet = sequelize.define(
  "wallet",
  {
    id: { type: DataTypes.UUID, primaryKey: true },
    userId: DataTypes.UUID,
    currency: DataTypes.STRING,
    type: DataTypes.STRING,
    balance: DataTypes.DECIMAL(30, 18),
    inOrder: DataTypes.DECIMAL(30, 18),
  },
  { tableName: "wallet", timestamps: false }
);

// Expected hold (human units) this OPEN order contributes to `currency`.
function expectedHoldForCurrency(row, currency) {
  const symbol = row.symbol;
  if (!symbol || !symbol.includes("/")) return 0;
  const [base, quote] = symbol.split("/");
  const remaining = BigInt(row.remaining?.toString() || "0");
  const amount = BigInt(row.amount?.toString() || "0");
  const cost = BigInt(row.cost?.toString() || "0");
  if (remaining <= 0n) return 0;

  if (row.side === "BUY" && quote === currency) {
    // quote held at the limit price for the unfilled remainder
    const fillRatio = amount > 0n ? Number(remaining) / Number(amount) : 0;
    return (Number(cost) / 1e18) * fillRatio;
  }
  if (row.side === "SELL" && base === currency) {
    return Number(remaining) / 1e18;
  }
  return 0;
}

async function main() {
  console.log("=".repeat(64));
  console.log(`Ecosystem inOrder Reconciliation  (${APPLY ? "APPLY" : "DRY-RUN"})`);
  if (ONLY_USER) console.log(`Scoped to user: ${ONLY_USER}`);
  console.log("=".repeat(64) + "\n");

  /*
   * THE RECONCILE FENCE (plans/done/ORDER-SCALE-10K.md WP-6.7).
   * ==========================================================================
   * Everything below computes what a wallet's inOrder OUGHT to be from the
   * OPEN orders in ScyllaDB, and --apply releases the difference.
   *
   * That is exactly right when one process owns the engine and writes Scylla
   * synchronously. It is DANGEROUS the moment a shard owns a symbol: Scylla
   * becomes a projection written after the fact, so an order that is live,
   * matchable and funded on a shard but not yet projected has no OPEN row —
   * and its hold is then indistinguishable from the stranded residue this
   * script exists to release. Releasing it frees the money backing a live
   * order, and the order goes on trading unfunded until settlement refuses it
   * and halts the symbol.
   *
   * So --apply asks the shards first, and refuses unless every one of them is
   * reachable, leading, and fully projected. A dry run is always allowed: it
   * moves nothing, and an operator needs to be able to look.
   */
  if (APPLY && (await shardTierConfigured())) {
    const fence = await reconcileFence();
    if (!fence.ok) {
      console.error("REFUSED: the shard tier is not in a state where holds may be released.\n");
      for (const reason of fence.reasons) console.error(`  - ${reason}`);
      console.error(
        "\nWhy this matters: this script decides a hold is stranded because ScyllaDB has no OPEN\n" +
          "order behind it. While a projection is behind, that is also true of orders that are LIVE\n" +
          "on a shard right now, and releasing those frees the money backing them.\n\n" +
          "What to do: wait for the projection to catch up and run it again, or quiesce the shards\n" +
          "(stop accepting, let the batcher and the projector drain) and then run it.\n" +
          "A DRY RUN is always allowed and shows the same exposure: drop --apply.\n"
      );
      process.exitCode = 2;
      return;
    }
    console.log(`Fence: ${fence.shards.length} shard(s) reachable, leading and fully projected.\n`);
  }

  await scyllaClient.connect();
  await sequelize.authenticate();

  // 1. Open orders grouped by user (skip bot/pool orders — they don't use user wallets)
  const orderQuery = `SELECT * FROM ${scyllaKeyspace}.orders WHERE status = 'OPEN' ALLOW FILTERING`;
  const scan = await readScyllaPages(scyllaClient, orderQuery);
  if (scan.truncated) {
    throw new Error(`REFUSED: incomplete OPEN-order scan (${scan.rows.length} rows, ${scan.pages} pages). No release or stranded-balance calculation is safe from this snapshot.`);
  }
  const orderRows = scan.rows.filter(
    (r) => !r.marketMakerId && !r.botId
  );
  const openByUser = new Map();
  for (const r of orderRows) {
    const uid = r.userId?.toString();
    if (!uid || uid === "00000000-0000-0000-0000-000000000000") continue;
    if (!openByUser.has(uid)) openByUser.set(uid, []);
    openByUser.get(uid).push(r);
  }

  // 2. ECO wallets with locked funds
  const where = { type: "ECO" };
  if (ONLY_USER) where.userId = ONLY_USER;
  const wallets = await Wallet.findAll({ where });

  let stranded = 0;
  let strandedTotalByCcy = {};
  let released = 0;
  const underLocked = [];

  for (const w of wallets) {
    const inOrder = parseFloat(w.inOrder?.toString() || "0");
    if (inOrder <= TOLERANCE) continue;

    const expected = (openByUser.get(w.userId) || []).reduce(
      (sum, r) => sum + expectedHoldForCurrency(r, w.currency),
      0
    );
    const surplus = inOrder - expected;

    if (surplus > TOLERANCE) {
      stranded++;
      strandedTotalByCcy[w.currency] = (strandedTotalByCcy[w.currency] || 0) + surplus;
      console.log(`[STRANDED] user ${w.userId}  ${w.currency}`);
      console.log(`           inOrder=${inOrder.toFixed(8)}  expected=${expected.toFixed(8)}  release=${surplus.toFixed(8)}`);

      if (APPLY) {
        // Compare the original decimal values before releasing: a changed wallet must be rescanned.
        const [, changed] = await sequelize.query(
          `UPDATE wallet SET balance = balance + ?, inOrder = inOrder - ? WHERE id = ? AND balance = ? AND inOrder = ? AND inOrder >= ?`,
          { replacements: [surplus, surplus, w.id, String(w.balance), String(w.inOrder), surplus] }
        );
        const affectedRows = typeof changed === "number" ? changed : changed?.affectedRows;
        if (affectedRows !== 1) throw new Error(`Wallet ${w.id} changed during reconciliation; stopped without releasing this wallet.`);
        released++;
        console.log(`           [RELEASED] ${surplus.toFixed(8)} ${w.currency} -> balance`);
      }
      console.log("");
    } else if (surplus < -TOLERANCE) {
      // inOrder is LESS than open orders require — a different (under-lock) defect.
      underLocked.push({ userId: w.userId, currency: w.currency, inOrder, expected, deficit: -surplus });
    }
  }

  console.log("=".repeat(64));
  console.log(`Wallets with stranded inOrder: ${stranded}`);
  for (const [ccy, total] of Object.entries(strandedTotalByCcy)) {
    console.log(`  ${ccy}: ${total.toFixed(8)} to release`);
  }
  if (APPLY) console.log(`Released ${released} wallet(s).`);
  else console.log(`DRY-RUN — no funds moved. Re-run with --apply to release.`);

  if (underLocked.length) {
    console.log("");
    console.log(`WARNING: ${underLocked.length} wallet(s) are UNDER-locked (inOrder < open-order requirement).`);
    console.log(`These are NOT touched here (would require debiting balance). Investigate with fix-ecosystem-orders.mjs:`);
    for (const u of underLocked) {
      console.log(`  user ${u.userId}  ${u.currency}: inOrder=${u.inOrder.toFixed(8)} expected=${u.expected.toFixed(8)} deficit=${u.deficit.toFixed(8)}`);
    }
  }
  console.log("=".repeat(64));
  if (APPLY && released > 0) console.log("\nIMPORTANT: restart the backend so cached wallet rows are refreshed.\n");
}

main()
  .catch((e) => { process.exitCode = 1; console.error("Reconciliation failed:", e); })
  .finally(async () => {
    try {
      await scyllaClient.shutdown();
      await sequelize.close();
    } catch {}
  });
