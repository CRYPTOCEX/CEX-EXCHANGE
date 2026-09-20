/**
 * Repair `user.profile` rows that were stored DOUBLE-ENCODED.
 *
 * `user.profile` is a `DataTypes.JSON` column and its setter used to call
 * `JSON.stringify(value)` before handing the value to Sequelize, which
 * serialises a JSON column itself. The row therefore held the TEXT `"{...}"`
 * rather than the VALUE `{...}`, and the getter — which parses exactly once —
 * returned a STRING. Every consumer reading `profile.bio` or
 * `profile.location` got undefined, so the data was invisible to the
 * application while sitting intact in the database.
 *
 * The setter is fixed, so nothing new is written this way. This repairs what is
 * already there.
 *
 *   node backend/scripts/migration-user-profile-json-unwrap.mjs          # dry run
 *   node backend/scripts/migration-user-profile-json-unwrap.mjs --apply
 *
 * Detection is done in JS rather than SQL on purpose: these columns are
 * LONGTEXT on MariaDB, so `JSON_TYPE` is not available, and `CAST(x AS JSON)`
 * is a SYNTAX ERROR on MariaDB 10.4.
 *
 * Only a value that parses to a STRING is touched. A row that already parses to
 * an object is left exactly as it is, so running this twice is safe.
 */
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

dotenv.config({ path: join(dirname(dirname(dirname(fileURLToPath(import.meta.url)))), ".env") });

const APPLY = process.argv.includes("--apply");

const conn = await mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME,
});

const [rows] = await conn.query("SELECT id, email, profile FROM user WHERE profile IS NOT NULL");

const broken = [];
for (const row of rows) {
  if (typeof row.profile !== "string") continue;
  let parsed;
  try {
    parsed = JSON.parse(row.profile);
  } catch {
    continue; // not JSON at all — not this migration's business
  }
  if (typeof parsed !== "string") continue; // already correct

  // The inner text must itself be valid JSON, or unwrapping would store junk.
  try {
    JSON.parse(parsed);
  } catch {
    console.log(`  SKIP ${row.email}: inner value is not valid JSON`);
    continue;
  }
  broken.push({ id: row.id, email: row.email, inner: parsed });
}

console.log(`rows with a profile: ${rows.length}`);
console.log(`double-encoded: ${broken.length}`);
for (const b of broken) {
  // Never print the profile itself — it holds addresses and phone data.
  console.log(`  ${b.email} (${b.inner.length} chars)`);
}

if (!APPLY) {
  console.log("\ndry run. re-run with --apply to repair.");
} else {
  let done = 0;
  for (const b of broken) {
    await conn.query("UPDATE user SET profile = ? WHERE id = ?", [b.inner, b.id]);
    done++;
  }
  console.log(`\nrepaired ${done} row(s)`);

  const [after] = await conn.query("SELECT profile FROM user WHERE profile IS NOT NULL");
  let still = 0;
  for (const row of after) {
    if (typeof row.profile !== "string") continue;
    try { if (typeof JSON.parse(row.profile) === "string") still++; } catch {}
  }
  console.log(`verification: ${still} double-encoded row(s) remain`);
}

await conn.end();
