/**
 * Deduplicate kyc_application Script  (MODEL-06)
 *
 * Prepares the `kyc_application` table for a UNIQUE(userId, levelId) index by
 * collapsing duplicate applications. The model now declares the compound unique
 * index `UNIQUE_kyc_application_userId_levelId`; if duplicates exist when the
 * app next runs `sync({alter:true})`, the index creation FAILS with a
 * duplicate-key error. This script must run BEFORE that sync.
 *
 * For every (userId, levelId) group with more than one live (deletedAt IS NULL)
 * row, it keeps the row with the LATEST `updatedAt` (ties broken by the highest
 * `id`) and removes the rest. Because the table is paranoid (soft-delete), the
 * losers are SOFT-deleted (deletedAt = NOW()) rather than hard-deleted, so the
 * data is recoverable and the surviving row is the most recent application.
 *
 * Idempotent & safe to re-run:
 *   - If the UNIQUE index already exists, there is nothing to do (no-op).
 *   - Otherwise it only soft-deletes rows that are surplus to each group; a
 *     second run finds one row per group and changes nothing.
 *   - DDL/index discovery is driven by information_schema, never hardcoded.
 *
 * DRY-RUN by default (reports what it would soft-delete). Pass --apply to mutate.
 *   Report:  node scripts/deduplicate-kyc-applications.mjs
 *   Apply:   node scripts/deduplicate-kyc-applications.mjs --apply
 *
 * After --apply, update/restart the backend so `sync({alter:true})` creates the
 * UNIQUE index.
 */

import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { Sequelize, QueryTypes } from "sequelize";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.join(__dirname, "../../.env") });

const APPLY = process.argv.includes("--apply");

const TABLE_NAME = "kyc_application";
const INDEX_NAME = "UNIQUE_kyc_application_userId_levelId";

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

// Does a UNIQUE index already exist that covers exactly (userId, levelId)?
// Discovered from information_schema rather than assuming the index name.
async function findExistingUniqueIndex() {
  const rows = await sequelize.query(
    `SELECT INDEX_NAME, NON_UNIQUE, SEQ_IN_INDEX, COLUMN_NAME
       FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = :table
      ORDER BY INDEX_NAME, SEQ_IN_INDEX`,
    { type: QueryTypes.SELECT, replacements: { table: TABLE_NAME } }
  );

  // Group columns per index, preserving order.
  const byIndex = new Map();
  for (const r of rows) {
    if (!byIndex.has(r.INDEX_NAME)) {
      byIndex.set(r.INDEX_NAME, { nonUnique: r.NON_UNIQUE, cols: [] });
    }
    byIndex.get(r.INDEX_NAME).cols.push(r.COLUMN_NAME);
  }

  for (const [name, info] of byIndex) {
    const isUnique = Number(info.nonUnique) === 0;
    const matchesCols =
      info.cols.length === 2 &&
      info.cols[0] === "userId" &&
      info.cols[1] === "levelId";
    if (isUnique && matchesCols) return name;
  }
  return null;
}

async function tableExists() {
  const rows = await sequelize.query(
    `SELECT COUNT(*) AS c
       FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = :table`,
    { type: QueryTypes.SELECT, replacements: { table: TABLE_NAME } }
  );
  return Number(rows[0]?.c || 0) > 0;
}

async function main() {
  console.log("=".repeat(64));
  console.log(`KYC Application Deduplication  (${APPLY ? "APPLY" : "DRY-RUN"})`);
  console.log("=".repeat(64) + "\n");

  await sequelize.authenticate();

  if (!(await tableExists())) {
    console.log(`Table \`${TABLE_NAME}\` does not exist. Nothing to do.`);
    return;
  }

  // Idempotency guard: if a UNIQUE(userId, levelId) index already exists, the
  // table is already deduplicated and constrained — re-running is a no-op.
  const existingIndex = await findExistingUniqueIndex();
  if (existingIndex) {
    console.log(
      `UNIQUE(userId, levelId) index already exists ('${existingIndex}'). ` +
        `Table is already constrained — nothing to deduplicate.`
    );
    console.log("=".repeat(64));
    return;
  }

  // Identify duplicate groups among LIVE rows (paranoid soft-delete aware).
  const groups = await sequelize.query(
    `SELECT userId, levelId, COUNT(*) AS cnt
       FROM ${TABLE_NAME}
      WHERE deletedAt IS NULL
      GROUP BY userId, levelId
     HAVING COUNT(*) > 1`,
    { type: QueryTypes.SELECT }
  );

  if (groups.length === 0) {
    console.log("No duplicate (userId, levelId) groups found among live rows.");
    console.log(
      APPLY
        ? "Safe to create the UNIQUE index via app sync({alter:true})."
        : "DRY-RUN — nothing would change."
    );
    console.log("=".repeat(64));
    return;
  }

  let totalDuplicates = 0;

  for (const g of groups) {
    // Rows in this group, newest first; tie-break by id so it's deterministic.
    const rows = await sequelize.query(
      `SELECT id, status, updatedAt
         FROM ${TABLE_NAME}
        WHERE deletedAt IS NULL
          AND userId = :userId
          AND levelId = :levelId
        ORDER BY updatedAt DESC, id DESC`,
      {
        type: QueryTypes.SELECT,
        replacements: { userId: g.userId, levelId: g.levelId },
      }
    );

    const keep = rows[0];
    const losers = rows.slice(1);
    totalDuplicates += losers.length;

    console.log(
      `[DUP] user ${g.userId}  level ${g.levelId}  (${rows.length} live rows)`
    );
    console.log(
      `      KEEP   id=${keep.id} status=${keep.status} updatedAt=${keep.updatedAt}`
    );
    for (const l of losers) {
      console.log(
        `      REMOVE id=${l.id} status=${l.status} updatedAt=${l.updatedAt}`
      );
    }

    if (APPLY) {
      const loserIds = losers.map((l) => l.id);
      // Soft-delete (paranoid) the surplus rows. Re-guard deletedAt IS NULL so a
      // concurrent run can't double-stamp, keeping this idempotent.
      // Build one explicit positional placeholder per id so we never depend on
      // Sequelize's (version-dependent) array-expansion — N placeholders, N
      // scalar replacements. A silent no-op here would let the UNIQUE index fail.
      const placeholders = loserIds.map(() => "?").join(", ");
      await sequelize.query(
        `UPDATE ${TABLE_NAME}
            SET deletedAt = NOW()
          WHERE id IN (${placeholders})
            AND deletedAt IS NULL`,
        { replacements: loserIds }
      );
      console.log(`      [SOFT-DELETED] ${loserIds.length} row(s).`);
    }
    console.log("");
  }

  console.log("=".repeat(64));
  console.log(`Duplicate groups: ${groups.length}`);
  console.log(`Surplus rows to remove: ${totalDuplicates}`);
  if (APPLY) {
    console.log(
      `Soft-deleted ${totalDuplicates} duplicate row(s). ` +
        `Restart the backend so sync({alter:true}) creates the UNIQUE index.`
    );
  } else {
    console.log("DRY-RUN — no rows changed. Re-run with --apply to deduplicate.");
  }
  console.log("=".repeat(64));
}

main()
  .catch((e) => console.error("Deduplication failed:", e))
  .finally(async () => {
    try {
      await sequelize.close();
    } catch {}
  });
