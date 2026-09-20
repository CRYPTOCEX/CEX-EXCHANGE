/**
 * Repair every DOUBLE-ENCODED `DataTypes.JSON` value in the database.
 *
 * ---------------------------------------------------------------------------
 * WHAT WENT WRONG, AND WHY THE CODE FIX ALONE IS NOT ENOUGH
 * ---------------------------------------------------------------------------
 * Several models used to call `JSON.stringify(value)` inside their setter on a
 * column Sequelize already serialises. The row therefore held the TEXT
 * `"{...}"` rather than the VALUE `{...}`.
 *
 * While the getter was equally tolerant nothing showed: it parsed the outer
 * layer and handed back an object. Fixing the setter changes that. New rows are
 * written single-encoded and read correctly, but every row written BEFORE the
 * fix is still double-encoded, and a single-parse getter now returns a STRING
 * for it.
 *
 * That is not cosmetic. Measured here: 32 of 33 `wallet.address` rows were
 * double-encoded, so after the setter fix the ecosystem transfer path could not
 * resolve a recipient address — the sender was DEBITED, the recipient received
 * 0.00000000 of 10, and no OUTGOING_TRANSFER ledger row was written. The code
 * fix and this repair have to ship together.
 *
 *   node backend/scripts/migration-json-column-unwrap.mjs           # dry run
 *   node backend/scripts/migration-json-column-unwrap.mjs --apply
 *
 * ---------------------------------------------------------------------------
 * HOW A ROW IS CHOSEN
 * ---------------------------------------------------------------------------
 * Detection is in JS, not SQL. These columns are LONGTEXT on MariaDB, so
 * `JSON_TYPE` is unavailable and `CAST(x AS JSON)` is a SYNTAX ERROR on 10.4 —
 * a MySQL-shaped migration fails outright here.
 *
 * A value is repaired ONLY when both hold:
 *   1. the stored text parses to a STRING (that is what double-encoding means);
 *   2. that inner string is ITSELF valid JSON.
 * Anything else is left exactly as it is, so this is idempotent and cannot
 * store junk. A column holding a legitimately string-valued JSON document is
 * protected by (2) only if the string is not itself JSON — which is why the
 * table below is an explicit ALLOW-LIST of columns known to hold objects or
 * arrays, rather than every JSON column in the schema.
 */
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

dotenv.config({
  path: join(dirname(dirname(dirname(fileURLToPath(import.meta.url)))), ".env"),
});

const APPLY = process.argv.includes("--apply");

/**
 * table -> [primary key column, ...json columns]
 *
 * Exactly the columns whose setters were double-stringifying. Nothing is
 * repaired that was not broken by that change.
 */
const TARGETS = [
  ["wallet", "id", ["address"]],
  ["user", "id", ["profile"]],
  ["deposit_method", "id", ["customFields"]],
  ["withdraw_method", "id", ["customFields"]],
  ["support_ticket", "id", ["messages", "tags"]],
  ["nft_activity", "id", ["metadata"]],
  ["nft_bid", "id", ["metadata"]],
  ["nft_collection", "id", ["metadata"]],
  ["nft_comment", "id", ["metadata"]],
  ["nft_dispute", "id", ["evidence", "metadata"]],
  ["nft_dispute_message", "id", ["attachments"]],
  ["nft_fractional", "id", ["metadata"]],
  ["nft_listing", "id", ["metadata"]],
  ["nft_marketplace", "id", ["metadata"]],
  ["nft_offer", "id", ["metadata"]],
  ["nft_royalty", "id", ["metadata"]],
  ["nft_sale", "id", ["metadata"]],
  ["nft_token", "id", ["attributes"]],
];

const conn = await mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME,
});

async function tableExists(table) {
  const [rows] = await conn.query(
    "SELECT 1 FROM information_schema.tables WHERE table_schema = ? AND table_name = ? LIMIT 1",
    [process.env.DB_NAME, table]
  );
  return rows.length > 0;
}

let totalBroken = 0;
let totalFixed = 0;

for (const [table, pk, fields] of TARGETS) {
  if (!(await tableExists(table))) continue;

  const [cols] = await conn.query(
    "SELECT column_name AS c FROM information_schema.columns WHERE table_schema = ? AND table_name = ?",
    [process.env.DB_NAME, table]
  );
  const present = fields.filter((f) => cols.some((c) => c.c === f));
  if (!present.length) continue;

  const select = [pk, ...present].map((c) => `\`${c}\``).join(", ");
  const [rows] = await conn.query(`SELECT ${select} FROM \`${table}\``);

  const repairs = [];
  for (const row of rows) {
    for (const field of present) {
      const value = row[field];
      if (typeof value !== "string") continue;

      /*
       * UNWRAP UNTIL IT IS STRUCTURE, not once.
       *
       * A value can be wrapped more than twice — a re-import that re-stringified
       * an already-stringified export stacks another layer each time. Unwrapping
       * a single layer left 271 of 308 rows still double-encoded on the first
       * pass here. The loop is bounded so a pathological value cannot spin, and
       * it stops the moment the parse yields an object or an array, which is the
       * shape the column is meant to hold.
       */
      let current = value;
      let layers = 0;
      let final = null;

      while (layers < 8) {
        let parsed;
        try {
          parsed = JSON.parse(current);
        } catch {
          break; // `current` is not JSON — whatever we have is as far as it goes
        }
        if (typeof parsed !== "string") {
          // `current` is the correctly-encoded text for this value.
          final = layers === 0 ? null : current;
          break;
        }
        current = parsed;
        layers++;
      }

      if (!final) continue; // already correct, or not repairable
      repairs.push({ id: row[pk], field, inner: final });
    }
  }

  if (!repairs.length) continue;
  totalBroken += repairs.length;

  // Never print the values: wallets hold chain addresses, profiles hold
  // postal addresses and phone data.
  const byField = {};
  for (const r of repairs) byField[r.field] = (byField[r.field] ?? 0) + 1;
  console.log(
    `${table}: ${repairs.length} double-encoded (` +
      Object.entries(byField)
        .map(([f, n]) => `${f}=${n}`)
        .join(", ") +
      ")"
  );

  if (APPLY) {
    for (const r of repairs) {
      await conn.query(
        `UPDATE \`${table}\` SET \`${r.field}\` = ? WHERE \`${pk}\` = ?`,
        [r.inner, r.id]
      );
      totalFixed++;
    }
  }
}

if (!totalBroken) {
  console.log("nothing to repair — no double-encoded values found");
} else if (!APPLY) {
  console.log(`\n${totalBroken} value(s) would be repaired. Re-run with --apply.`);
} else {
  console.log(`\nrepaired ${totalFixed} value(s)`);

  // Re-read and prove it, rather than trusting the UPDATE count.
  let remaining = 0;
  for (const [table, pk, fields] of TARGETS) {
    if (!(await tableExists(table))) continue;
    const [cols] = await conn.query(
      "SELECT column_name AS c FROM information_schema.columns WHERE table_schema = ? AND table_name = ?",
      [process.env.DB_NAME, table]
    );
    const present = fields.filter((f) => cols.some((c) => c.c === f));
    if (!present.length) continue;
    const [rows] = await conn.query(
      `SELECT ${present.map((c) => `\`${c}\``).join(", ")} FROM \`${table}\``
    );
    for (const row of rows) {
      for (const field of present) {
        const v = row[field];
        if (typeof v !== "string") continue;
        try {
          if (typeof JSON.parse(v) === "string") remaining++;
        } catch {
          /* not JSON */
        }
      }
    }
  }
  console.log(`verification: ${remaining} double-encoded value(s) remain`);
}

await conn.end();
