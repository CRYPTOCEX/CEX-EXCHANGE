/**
 * STOP-ORDER DOCTOR: which resting stops can still refuse a terminal write.
 *
 * THE DEFECT THIS IS THE AFTERMATH OF
 * ===================================
 * `stop_orders` used to be written by TWO CLOCKS. Cassandra and ScyllaDB stamp
 * a PLAIN statement with a timestamp from the DRIVER — the backend process's
 * own clock — and a LIGHTWEIGHT TRANSACTION with the Paxos BALLOT, from the
 * database's clock. A statement carrying `IF` cannot supply a client timestamp
 * at all. Conflict resolution is last-write-wins on those stamps, so while the
 * table mixed the two kinds of write, the order of a claim against the INSERT
 * that preceded it was decided by CLOCK SKEW rather than by program order.
 *
 * With the backend's clock ahead, the placement's `status='PENDING'` cell
 * outlived the `status='CANCELLING'` cell a cancel committed: the claim applied
 * and was told so, and was then shadowed by the row it followed. The next
 * conditional write read PENDING and refused — leaving a stop ARMED after its
 * reservation had already been released, able to fire against money nobody
 * holds.
 *
 * The table is all-Paxos now (`stopQueries.ts`: INSERT ... IF NOT EXISTS,
 * DELETE ... IF EXISTS, every status write conditional), so no NEW row can be
 * written this way.
 *
 * WHAT IS LEFT, AND WHY THIS SCRIPT EXISTS
 * ----------------------------------------
 * Rows already on disk keep the client-stamped cell they were written with. If
 * that stamp is in the FUTURE relative to the database's clock, a ballot can
 * still lose to it — so a stop resting across the upgrade can still refuse its
 * own cancellation, until real time passes the stamp. This names those rows and
 * says when each stops being at risk.
 *
 * IT NEVER WRITES. There is no `--apply` and no flag that mutates: it reads
 * `WRITETIME(status)`, compares it with the DATABASE's clock, and prints. What
 * to do about a row is a decision for a person who has looked.
 *
 * TWO THINGS THE OBVIOUS IMPLEMENTATION GETS WRONG
 * ------------------------------------------------
 *   1. `WRITETIME` IS NOT LEGAL ON A PARTITION-KEY COLUMN. The by-status view
 *      is `PRIMARY KEY ((status), "createdAt", id, "userId")`, so asking it for
 *      `WRITETIME(status)` is a ResponseError. The view is still the cheap way
 *      to FIND non-terminal rows; the writetime has to come from a follow-up
 *      read of the BASE table, where `status` is an ordinary column.
 *   2. THE COMPARISON MUST USE THE DATABASE'S CLOCK, not this script's. The
 *      whole defect is that the two disagree; a script that compared against
 *      its own `Date.now()` would be measuring the same skew it is looking for.
 *      `SELECT toUnixTimestamp(now()) FROM system.local` asks the coordinator.
 *
 * RUN IT
 * ------
 *   node backend/scripts/stop-order-doctor.mjs [--user <uuid>] [--json]
 */

import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { Client, auth } from "cassandra-driver";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.join(__dirname, "../../.env") });

const argv = process.argv;
const userIdx = argv.indexOf("--user");
const ONLY_USER = userIdx !== -1 ? argv[userIdx + 1] : null;
const AS_JSON = argv.includes("--json");

/** The states a stop can still be moved out of, and therefore still be refused in. */
const NON_TERMINAL = ["PENDING", "CANCELLING", "TRIGGERING"];

const scyllaKeyspace = process.env.SCYLLA_KEYSPACE || "trading";
// Same resolution order as scylla/client.ts and every sibling script:
// SCYLLA_CONNECT_POINTS is what the platform sets, SCYLLA_HOST is the fallback
// for an operator who set only that. Reading SCYLLA_HOST alone would send this
// to localhost on an install whose ScyllaDB lives elsewhere.
const scyllaConfig = {
  contactPoints: process.env.SCYLLA_CONNECT_POINTS
    ? process.env.SCYLLA_CONNECT_POINTS.split(",").map((p) => p.trim())
    : [process.env.SCYLLA_HOST || "localhost"],
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

/** Milliseconds on the DATABASE's clock. Never this process's. */
export async function serverNowMs(client = scyllaClient) {
  const rs = await client.execute('SELECT toUnixTimestamp(now()) AS "nowMs" FROM system.local');
  const raw = rs.rows?.[0]?.["nowMs"];
  // The driver hands a Long back for a bigint column.
  return typeof raw?.toNumber === "function" ? raw.toNumber() : Number(raw);
}

/**
 * Every non-terminal stop, from the by-status view.
 *
 * The view exists precisely so the monitor does not scan the base table, and it
 * is three single-partition reads rather than a full scan. It cannot answer for
 * the writetime — see the docblock — so each row is read back by its own key.
 */
export async function nonTerminalStops(client = scyllaClient) {
  const found = [];
  for (const status of NON_TERMINAL) {
    const rs = await client.execute(
      `SELECT "userId", "createdAt", id, symbol, "reservedCurrency", "reservedAmount"
         FROM ${scyllaKeyspace}.stop_orders_by_status WHERE status = ?`,
      [status],
      { prepare: true }
    );
    for (const row of rs.rows ?? []) {
      if (ONLY_USER && String(row.userId) !== ONLY_USER) continue;
      found.push({
        status,
        userId: String(row.userId),
        createdAt: row.createdAt,
        id: String(row.id),
        symbol: String(row.symbol ?? ""),
        reservedCurrency: String(row.reservedCurrency ?? ""),
        reservedAmount: Number(row.reservedAmount ?? 0),
      });
    }
  }
  return found;
}

/** The write timestamp of one row's `status` cell, in milliseconds, or null. */
export async function statusWrittenAtMs(stop, client = scyllaClient) {
  const rs = await client.execute(
    `SELECT WRITETIME(status) AS "wt" FROM ${scyllaKeyspace}.stop_orders
      WHERE "userId" = ? AND "createdAt" = ? AND id = ?`,
    [stop.userId, stop.createdAt, stop.id],
    { prepare: true }
  );
  const raw = rs.rows?.[0]?.["wt"];
  if (raw === null || raw === undefined) return null;
  // WRITETIME is MICROseconds since the epoch.
  const micros = typeof raw?.toNumber === "function" ? raw.toNumber() : Number(raw);
  return Math.round(micros / 1000);
}

async function main() {
  await scyllaClient.connect();
  const nowMs = await serverNowMs();
  const stops = await nonTerminalStops();

  const rows = [];
  for (const stop of stops) {
    const writtenMs = await statusWrittenAtMs(stop);
    // A row whose cell is stamped in the FUTURE can still beat a ballot, and it
    // stops being able to at exactly that moment.
    const aheadMs = writtenMs === null ? null : writtenMs - nowMs;
    rows.push({ ...stop, writtenMs, aheadMs, atRisk: aheadMs !== null && aheadMs > 0 });
  }

  const atRisk = rows.filter((r) => r.atRisk).sort((a, b) => b.aheadMs - a.aheadMs);

  if (AS_JSON) {
    console.log(JSON.stringify({ serverNowMs: nowMs, checked: rows.length, atRisk }, null, 2));
  } else {
    console.log(`Database clock now: ${new Date(nowMs).toISOString()} (asked of ScyllaDB, not of this process)`);
    console.log(`Non-terminal stops checked: ${rows.length}`);
    if (atRisk.length === 0) {
      console.log("");
      console.log("No stop carries a status cell stamped in the future.");
      console.log("Every resting stop can be cancelled and triggered normally.");
    } else {
      console.log("");
      console.log(`${atRisk.length} stop(s) carry a status cell stamped AHEAD of the database's clock.`);
      console.log("Until that moment passes, a conditional write to the row can be refused, which");
      console.log("means a cancel may release the reservation and leave the stop armed.");
      console.log("");
      for (const r of atRisk) {
        const clearsAt = new Date(r.writtenMs).toISOString();
        console.log(`  ${r.id}  ${r.status.padEnd(11)} ${r.symbol.padEnd(12)} user ${r.userId}`);
        console.log(
          `      stamped ${(r.aheadMs / 1000).toFixed(3)}s in the future; safe from ${clearsAt}; ` +
            `reservation ${r.reservedAmount} ${r.reservedCurrency}`
        );
      }
      console.log("");
      console.log("WHAT TO DO. Nothing, if you can wait: each row is safe from the time shown above,");
      console.log("which is bounded by how far the backend's clock ran ahead of the database's. If a");
      console.log("customer needs one cancelled sooner, cancel it and then CONFIRM the row reached a");
      console.log("terminal state -- the backend logs a STOP_ORDER warning naming the stop when a");
      console.log("conditional write does not apply. Fixing the clocks (NTP on both hosts) removes");
      console.log("the window for every remaining row at once.");
    }
  }

  await scyllaClient.shutdown();
}

// Importable for a test; runs only when invoked directly, as the sibling
// scripts do.
if (process.argv[1] && process.argv[1].endsWith("stop-order-doctor.mjs")) {
  main().catch(async (error) => {
    console.error(`stop-order-doctor failed: ${error?.message ?? error}`);
    try {
      await scyllaClient.shutdown();
    } catch {
      /* already down */
    }
    process.exit(1);
  });
}
