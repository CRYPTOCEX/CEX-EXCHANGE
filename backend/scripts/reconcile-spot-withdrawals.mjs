/**
 * Reconcile Spot Withdrawals  (CORE-FIN-03)
 *
 * Two-phase withdrawal state-machine safety net.
 *
 * The spot withdraw endpoint (api/finance/withdraw/spot/index.post.ts) commits the
 * wallet debit in its own DB transaction BEFORE it calls exchange.withdraw(). A process
 * crash between the debit commit and the exchange call (or between a successful exchange
 * call and the final status update) leaves a transaction in an intermediate state with
 * money already debited from the user. The runtime cron `reconcileSpotWithdrawals`
 * (backend/src/cron/jobs/wallet.ts) is the live recovery path; this script is the
 * one-time schema setup + a manual off-by-default recovery sweep for operators.
 *
 * It does TWO independent things:
 *
 *   1. SCHEMA SETUP (default action, idempotent):
 *        Adds the compound index `idx_txn_processing (type, status, createdAt)` on the
 *        `transaction` table so the reconciliation cron's lookup of stranded PROCESSING
 *        withdrawals is fast. Guarded by an INFORMATION_SCHEMA existence check, so a
 *        second run is a no-op.
 *
 *   2. STALE RECOVERY (opt-in, --recover-stale):
 *        Finds WITHDRAW transactions still in PROCESSING with NO referenceId that are
 *        older than the stale threshold (24h by default). These never reached the
 *        exchange (no referenceId was ever recorded), so the safe action is to mark them
 *        FAILED and refund the debited amount back to the user's SPOT wallet balance.
 *        The refund is idempotent: it reuses the SAME idempotency key the API's own
 *        error handler uses (`spot_withdraw_refund_<txId>`) and checks for an existing
 *        refund transaction first, so it never double-credits a user even if the API
 *        already refunded, or if this sweep is run twice.
 *
 *        IMPORTANT: This sweep cannot talk to the exchange. It ONLY recovers rows that
 *        have NO referenceId (i.e. the exchange was provably never called). Rows that
 *        DO carry a referenceId are left for the runtime cron, which queries the
 *        exchange for their real status. This avoids refunding a withdrawal that the
 *        exchange actually executed.
 *
 * DRY-RUN by default. Pass --apply to mutate.
 *   Setup (report):     node scripts/reconcile-spot-withdrawals.mjs
 *   Setup (apply):      node scripts/reconcile-spot-withdrawals.mjs --apply
 *   Recover (report):   node scripts/reconcile-spot-withdrawals.mjs --recover-stale
 *   Recover (apply):    node scripts/reconcile-spot-withdrawals.mjs --recover-stale --apply
 *   Custom threshold:   node scripts/reconcile-spot-withdrawals.mjs --recover-stale --stale-hours 48
 *
 * After --apply on the schema setup, restart the backend so cached metadata refreshes.
 */

import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { Sequelize, QueryTypes } from "sequelize";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.join(__dirname, "../../.env") });

const APPLY = process.argv.includes("--apply");
const RECOVER_STALE = process.argv.includes("--recover-stale");
const staleHoursIdx = process.argv.indexOf("--stale-hours");
const STALE_HOURS =
  staleHoursIdx !== -1 ? parseInt(process.argv[staleHoursIdx + 1], 10) || 24 : 24;

const TABLE = "transaction";
const WALLET_TABLE = "wallet";
const INDEX = "idx_txn_processing";

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

async function tableExists(schema, table) {
  const rows = await sequelize.query(
    `SELECT COUNT(*) AS count FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
    { replacements: [schema, table], type: QueryTypes.SELECT }
  );
  return Number(rows[0]?.count || 0) > 0;
}

async function indexExists(schema, table, index) {
  const rows = await sequelize.query(
    `SELECT COUNT(*) AS count FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    { replacements: [schema, table, index], type: QueryTypes.SELECT }
  );
  return Number(rows[0]?.count || 0) > 0;
}

// ---------------------------------------------------------------------------
// 1. SCHEMA SETUP: compound index idx_txn_processing (type, status, createdAt)
// ---------------------------------------------------------------------------
async function setupIndex(schema) {
  console.log("-".repeat(64));
  console.log(`Schema setup: compound index '${INDEX}' on '${TABLE}'`);
  console.log("-".repeat(64));

  if (!(await tableExists(schema, TABLE))) {
    console.log(`[ABORT] Table '${TABLE}' does not exist in '${schema}'.`);
    return 0;
  }

  if (await indexExists(schema, TABLE, INDEX)) {
    console.log(`[SKIP]  Index '${INDEX}' already exists on '${TABLE}'.`);
    return 0;
  }

  console.log(`[ADD]   INDEX '${INDEX}' (type, status, createdAt)`);
  if (APPLY) {
    await sequelize.query(
      `ALTER TABLE \`${TABLE}\` ADD INDEX \`${INDEX}\` (\`type\`, \`status\`, \`createdAt\`)`
    );
    console.log(`        -> index added.`);
  }
  return 1;
}

// ---------------------------------------------------------------------------
// 2. STALE RECOVERY: refund PROCESSING withdrawals with no referenceId
// ---------------------------------------------------------------------------
async function recoverStale(schema) {
  console.log("-".repeat(64));
  console.log(
    `Stale recovery: PROCESSING WITHDRAW with no referenceId older than ${STALE_HOURS}h`
  );
  console.log("-".repeat(64));

  if (
    !(await tableExists(schema, TABLE)) ||
    !(await tableExists(schema, WALLET_TABLE))
  ) {
    console.log(`[ABORT] Required tables missing in '${schema}'.`);
    return 0;
  }

  // Candidate stranded rows: never reached the exchange (referenceId IS NULL),
  // stuck in PROCESSING, and aged past the stale threshold. paranoid model =>
  // ignore soft-deleted rows.
  const candidates = await sequelize.query(
    `SELECT t.id, t.userId, t.walletId, t.amount, t.referenceId, t.createdAt, w.currency
       FROM \`${TABLE}\` t
       JOIN \`${WALLET_TABLE}\` w ON w.id = t.walletId
      WHERE t.type = 'WITHDRAW'
        AND t.status = 'PROCESSING'
        AND t.referenceId IS NULL
        AND t.deletedAt IS NULL
        AND t.createdAt < (NOW() - INTERVAL ? HOUR)
      ORDER BY t.createdAt ASC`,
    { replacements: [STALE_HOURS], type: QueryTypes.SELECT }
  );

  if (candidates.length === 0) {
    console.log(`[OK]    No stranded PROCESSING withdrawals found. Nothing to recover.`);
    return 0;
  }

  let recovered = 0;
  let skipped = 0;
  const refundedByCcy = {};

  for (const tx of candidates) {
    const amount = parseFloat(tx.amount?.toString() || "0");
    const refundIdempotencyKey = `spot_withdraw_refund_${tx.id}`;

    console.log(
      `[STRANDED] txn ${tx.id}  user ${tx.userId}  ${amount} ${tx.currency}  (created ${tx.createdAt})`
    );

    // Idempotency guard: if a refund for this withdrawal already exists (either the
    // API error handler ran, or a prior sweep), do NOT credit again. The API/wallet
    // service records the refund with this exact idempotencyKey.
    const existingRefund = await sequelize.query(
      `SELECT COUNT(*) AS count FROM \`${TABLE}\`
        WHERE idempotencyKey = ? AND deletedAt IS NULL`,
      { replacements: [refundIdempotencyKey], type: QueryTypes.SELECT }
    );
    const alreadyRefunded = Number(existingRefund[0]?.count || 0) > 0;

    if (alreadyRefunded) {
      // Refund already issued; just settle the original row's terminal status.
      console.log(`           refund already present (key=${refundIdempotencyKey}); marking FAILED only.`);
      skipped++;
      if (APPLY) {
        await sequelize.transaction(async (t) => {
          await sequelize.query(
            `UPDATE \`${TABLE}\` SET status = 'FAILED', updatedAt = NOW() WHERE id = ?`,
            { replacements: [tx.id], type: QueryTypes.UPDATE, transaction: t }
          );
        });
      }
      console.log("");
      continue;
    }

    console.log(
      `           [RECOVER] mark FAILED + refund ${amount} ${tx.currency} -> SPOT balance`
    );
    refundedByCcy[tx.currency] = (refundedByCcy[tx.currency] || 0) + amount;
    recovered++;

    if (APPLY) {
      await sequelize.transaction(async (t) => {
        // a. Credit the debited amount back to the user's wallet balance.
        await sequelize.query(
          `UPDATE \`${WALLET_TABLE}\` SET balance = balance + ?, updatedAt = NOW() WHERE id = ?`,
          { replacements: [amount, tx.walletId], type: QueryTypes.UPDATE, transaction: t }
        );

        // b. Record a REFUND transaction carrying the dedupe idempotencyKey so the
        //    runtime path (and a re-run of this sweep) recognises it as settled.
        await sequelize.query(
          `INSERT INTO \`${TABLE}\`
             (id, userId, walletId, type, status, amount, fee, description, metadata,
              referenceId, idempotencyKey, createdAt, updatedAt)
           VALUES
             (UUID(), ?, ?, 'REFUND', 'COMPLETED', ?, 0, ?, ?, ?, ?, NOW(), NOW())`,
          {
            replacements: [
              tx.userId,
              tx.walletId,
              amount,
              `Refund for stranded spot withdrawal ${tx.id} (reconcile-spot-withdrawals --recover-stale)`,
              JSON.stringify({
                operationType: "REFUND_WITHDRAWAL",
                originalTransactionId: tx.id,
                reason: `Stranded PROCESSING withdrawal recovered after ${STALE_HOURS}h with no exchange referenceId`,
              }),
              tx.id,
              refundIdempotencyKey,
            ],
            type: QueryTypes.INSERT,
            transaction: t,
          }
        );

        // c. Mark the original withdrawal FAILED.
        await sequelize.query(
          `UPDATE \`${TABLE}\` SET status = 'FAILED', updatedAt = NOW() WHERE id = ?`,
          { replacements: [tx.id], type: QueryTypes.UPDATE, transaction: t }
        );
      });
      console.log(`           [DONE] refunded and marked FAILED.`);
    }
    console.log("");
  }

  console.log(`Stranded withdrawals: ${candidates.length}`);
  console.log(`  to refund: ${recovered}   already-refunded (status fix only): ${skipped}`);
  for (const [ccy, total] of Object.entries(refundedByCcy)) {
    console.log(`  ${ccy}: ${total.toFixed(8)} to credit back`);
  }
  return recovered + skipped;
}

async function main() {
  console.log("=".repeat(64));
  console.log(
    `Reconcile Spot Withdrawals (CORE-FIN-03)  (${APPLY ? "APPLY" : "DRY-RUN"})`
  );
  if (RECOVER_STALE) console.log(`Mode: --recover-stale (threshold ${STALE_HOURS}h)`);
  else console.log(`Mode: schema setup`);
  console.log("=".repeat(64) + "\n");

  await sequelize.authenticate();
  const schema = sequelize.getDatabaseName();
  console.log(`Database: ${schema}\n`);

  let willChange = 0;

  // Schema setup always runs (it is the safe, idempotent default).
  willChange += await setupIndex(schema);
  console.log("");

  // Stale recovery only on explicit opt-in.
  if (RECOVER_STALE) {
    willChange += await recoverStale(schema);
    console.log("");
  }

  console.log("=".repeat(64));
  if (willChange === 0) {
    console.log("Nothing to change — already reconciled.");
  } else if (APPLY) {
    console.log(`Applied changes (${willChange} item(s) actioned).`);
    console.log(
      "\nIMPORTANT: restart the backend so cached wallet rows / metadata refresh.\n"
    );
  } else {
    console.log(
      `DRY-RUN — ${willChange} item(s) pending. Re-run with --apply to execute.`
    );
  }
  console.log("=".repeat(64));
}

main()
  .catch((e) => {
    console.error("Spot withdrawal reconciliation failed:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await sequelize.close();
    } catch {}
  });
