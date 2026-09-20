/**
 * ECOSYS-09 — Worst-Case Hold audit columns for the ecosystem `orders` table.
 *
 * Market BUY orders used to hold only `amount × bestAsk + fee` (top-of-book), but
 * the matching engine can fill across deeper book levels. When the average fill
 * price exceeds the best ask, settlement fails its "insufficient locked funds"
 * guard and the trade is silently dropped, stranding the hold in `inOrder`.
 *
 * The runtime fix (in order/index.post.ts + matchmaking.ts, handled by other
 * agents) computes a WORST-CASE hold by walking the book. This script adds the
 * two optional AUDIT columns the fix references so the data lines up:
 *
 *   - maxSlippageBasisPoints : max slippage tolerance in basis points (500 = 5%)
 *   - actualFillPrice        : actual average fill price recorded after settlement
 *
 * IMPORTANT — STORAGE ENGINE
 * --------------------------
 * Ecosystem orders live in ScyllaDB / Cassandra (keyspace `trading`, table
 * `orders`), NOT in MySQL. There is no MySQL `ecosystemOrder` table, so the
 * INFORMATION_SCHEMA-based MySQL ALTERs in the plan do not apply to the real
 * schema. This script therefore targets the Scylla `orders` table with CQL,
 * mirroring the in-app migration pattern in
 *   backend/src/api/(ext)/ecosystem/utils/scylla/client.ts (runMigrations()).
 * The column identifiers (`maxSlippageBasisPoints`, `actualFillPrice`) are kept
 * EXACTLY as the plan specifies so the application code lines up.
 *
 * IDEMPOTENCY
 * -----------
 * CQL has no INFORMATION_SCHEMA. We read `system_schema.columns` to discover
 * which columns already exist (for an accurate DRY-RUN report), and on --apply
 * use `ALTER TABLE ... ADD` guarded by catching the "already exists" /
 * "Invalid column" errors Scylla returns — so a second run is a no-op.
 *
 * DRY-RUN by default (reports exactly what it would change). Pass --apply to mutate.
 *   Report:  node scripts/migration-ecosys-09-worst-case-hold.mjs
 *   Apply:   node scripts/migration-ecosys-09-worst-case-hold.mjs --apply
 *
 * After --apply, restart the backend so the model picks up the new columns.
 */

import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { Client, auth } from "cassandra-driver";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.join(__dirname, "../../.env") });

const APPLY = process.argv.includes("--apply");

const TABLE = "orders";
const KEYSPACE = process.env.SCYLLA_KEYSPACE || "trading";

// New audit columns, keyed by the EXACT identifiers the ECOSYS-09 fix references.
// `maxSlippageBasisPoints` mirrors the plan's INT default 500 (5%).
// `actualFillPrice` is the post-settlement average fill price; DECIMAL is the
// CQL equivalent of the plan's DECIMAL(30,18) (CQL DECIMAL is arbitrary precision).
const COLUMNS = [
  { name: "maxSlippageBasisPoints", cqlType: "INT" },
  { name: "actualFillPrice", cqlType: "DECIMAL" },
];

const scyllaConfig = {
  contactPoints: [process.env.SCYLLA_HOST || "localhost"],
  localDataCenter: process.env.SCYLLA_DATACENTER || "datacenter1",
  keyspace: KEYSPACE,
};
if (process.env.SCYLLA_USERNAME && process.env.SCYLLA_PASSWORD) {
  scyllaConfig.authProvider = new auth.PlainTextAuthProvider(
    process.env.SCYLLA_USERNAME,
    process.env.SCYLLA_PASSWORD
  );
}
const client = new Client(scyllaConfig);

async function tableExists() {
  const rows = (
    await client.execute(
      `SELECT table_name FROM system_schema.tables
       WHERE keyspace_name = ? AND table_name = ?`,
      [KEYSPACE, TABLE],
      { prepare: true }
    )
  ).rows;
  return rows.length > 0;
}

async function existingColumns() {
  const rows = (
    await client.execute(
      `SELECT column_name FROM system_schema.columns
       WHERE keyspace_name = ? AND table_name = ?`,
      [KEYSPACE, TABLE],
      { prepare: true }
    )
  ).rows;
  // Cassandra lowercases unquoted identifiers in system tables, but identifiers
  // created with quotes (as the orders table uses) keep their case. Compare
  // case-sensitively against the quoted names we will create.
  return new Set(rows.map((r) => r.column_name));
}

async function main() {
  console.log("=".repeat(64));
  console.log(
    `ECOSYS-09 worst-case-hold audit columns on '${KEYSPACE}.${TABLE}'  (${APPLY ? "APPLY" : "DRY-RUN"})`
  );
  console.log("=".repeat(64) + "\n");

  await client.connect();
  console.log(`Keyspace: ${KEYSPACE}\n`);

  if (!(await tableExists())) {
    console.log(
      `[ABORT] Table '${TABLE}' does not exist in keyspace '${KEYSPACE}'. Nothing to do.`
    );
    console.log(
      "        (Has the ecosystem ScyllaDB schema been initialized yet?)"
    );
    console.log("=".repeat(64));
    return;
  }

  const present = await existingColumns();
  let willChange = 0;

  for (const col of COLUMNS) {
    if (present.has(col.name)) {
      console.log(`[SKIP]  Column "${col.name}" already exists on '${TABLE}'.`);
      continue;
    }

    willChange++;
    console.log(`[ADD]   Column "${col.name}" ${col.cqlType}`);
    if (APPLY) {
      try {
        // Quoted identifier preserves camelCase, matching the orders schema.
        await client.execute(
          `ALTER TABLE ${KEYSPACE}.${TABLE} ADD "${col.name}" ${col.cqlType}`
        );
        console.log(`        -> column added.`);
      } catch (err) {
        const msg = err?.message || String(err);
        // Re-running can race with another initializer; treat "already exists"
        // and "Invalid column" as benign no-ops (matches client.ts runMigrations).
        if (
          msg.includes("already exists") ||
          msg.includes("conflicts with an existing column")
        ) {
          console.log(`        -> already present (concurrent add); skipped.`);
        } else {
          throw err;
        }
      }
    }
  }

  console.log("\n" + "=".repeat(64));
  if (willChange === 0) {
    console.log("Schema already up to date — nothing to change.");
  } else if (APPLY) {
    console.log(`Applied ${willChange} change(s).`);
    console.log(
      "\nIMPORTANT: restart the backend so the model picks up the new columns.\n"
    );
  } else {
    console.log(
      `DRY-RUN — ${willChange} change(s) pending. Re-run with --apply to execute.`
    );
  }
  console.log("=".repeat(64));
}

main()
  .catch((e) => {
    console.error("ECOSYS-09 migration failed:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await client.shutdown();
    } catch {}
  });
