/**
 * Retire Legacy Staking Pool Table & Duplicate FKs (MODEL-09)
 *
 * The database accumulated two staking-pool tables:
 *   - `staking_pool`  (singular) — legacy, unused, old schema, never queried
 *   - `staking_pools` (plural)   — canonical, used by all code & the model
 *                                   (backend/models/ext/staking/stakingPool.ts
 *                                    declares tableName: "staking_pools")
 *
 * It also accumulated DUPLICATE foreign-key constraints on `staking_positions`
 * (a Sequelize sync({alter:true}) re-run after manual constraint edits):
 *   - poolId -> staking_pools : staking_positions_ibfk_4934 (dup) & _ibfk_4935 (keep)
 *   - userId -> user          : staking_positions_ibfk_8062 (dup) & _ibfk_8063 (keep)
 *
 * Sequelize `alter` mode does NOT drop tables or redundant constraints, so this
 * standalone migration is the only clean way to retire them.
 *
 * This script:
 *   - Drops duplicate FK constraints on `staking_positions`, keeping exactly ONE
 *     constraint per referenced column (poolId->staking_pools, userId->user).
 *   - Drops the unused `staking_pool` (singular) table.
 *
 * It is FULLY IDEMPOTENT — every action is guarded by an information_schema
 * existence check and real constraint/table names are discovered at runtime
 * (never hardcoded), so re-running is a clean no-op.
 *
 * DRY-RUN by default (reports what it WOULD change). Pass --apply to mutate.
 *   Report:  node scripts/retire-staking-pool-legacy.mjs
 *   Apply:   node scripts/retire-staking-pool-legacy.mjs --apply
 *
 * Rollback: restore from backup; the legacy table can be recreated from
 * initial.sql if ever needed (low risk since it is never queried).
 */

import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { Sequelize } from "sequelize";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.join(__dirname, "../../.env") });

const APPLY = process.argv.includes("--apply");

const LEGACY_TABLE = "staking_pool"; // singular — the one to drop
const CANONICAL_TABLE = "staking_pools"; // plural — must NOT be touched
const POSITIONS_TABLE = "staking_positions";

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

const DB = process.env.DB_NAME || "platform";

async function tableExists(table) {
  const [rows] = await sequelize.query(
    `SELECT COUNT(*) AS n FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
    { replacements: [DB, table] }
  );
  return Number(rows[0]?.n || 0) > 0;
}

// All FK constraints on `table` that reference `refTable` via `column`, sorted
// by constraint name so the "keep" choice is deterministic.
async function foreignKeysFor(table, column, refTable) {
  const [rows] = await sequelize.query(
    `SELECT k.CONSTRAINT_NAME AS name
       FROM information_schema.KEY_COLUMN_USAGE k
      WHERE k.TABLE_SCHEMA = ?
        AND k.TABLE_NAME = ?
        AND k.COLUMN_NAME = ?
        AND k.REFERENCED_TABLE_NAME = ?
      ORDER BY k.CONSTRAINT_NAME ASC`,
    { replacements: [DB, table, column, refTable] }
  );
  return rows.map((r) => r.name);
}

async function dropConstraint(table, name) {
  // MySQL: dropping a FK does not drop its backing index, but that's harmless.
  await sequelize.query(
    `ALTER TABLE \`${table}\` DROP FOREIGN KEY \`${name}\``
  );
}

// Every FK constraint (in ANY table) that REFERENCES refTable. These must be
// dropped before refTable can be DROPped, else MySQL raises errno 1451
// ("Cannot delete or update a parent row"). Discovered generically so we catch
// stale references from legacy companion tables (staking_duration, staking_log,
// or anything else) without hardcoding them. DISTINCT collapses composite FKs.
async function inboundForeignKeys(refTable) {
  const [rows] = await sequelize.query(
    `SELECT DISTINCT TABLE_NAME AS tbl, CONSTRAINT_NAME AS name
       FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = ? AND REFERENCED_TABLE_NAME = ?
      ORDER BY TABLE_NAME, CONSTRAINT_NAME`,
    { replacements: [DB, refTable] }
  );
  return rows;
}

async function rowCount(table) {
  const [rows] = await sequelize.query("SELECT COUNT(*) AS n FROM `" + table + "`");
  return Number(rows[0]?.n || 0);
}

async function dropTable(table) {
  await sequelize.query(`DROP TABLE \`${table}\``);
}

async function main() {
  console.log("=".repeat(64));
  console.log(`Retire Legacy Staking Pool  (${APPLY ? "APPLY" : "DRY-RUN"})`);
  console.log("=".repeat(64) + "\n");

  await sequelize.authenticate();

  let plannedActions = 0;
  let appliedActions = 0;

  // ── Step 1: Drop duplicate FK constraints on staking_positions ────────────
  if (await tableExists(POSITIONS_TABLE)) {
    const fkGroups = [
      { column: "poolId", refTable: CANONICAL_TABLE },
      { column: "userId", refTable: "user" },
    ];

    for (const { column, refTable } of fkGroups) {
      const fks = await foreignKeysFor(POSITIONS_TABLE, column, refTable);
      if (fks.length === 0) {
        console.log(
          `[SKIP] No FK on ${POSITIONS_TABLE}.${column} -> ${refTable} (already removed or absent).`
        );
        continue;
      }
      if (fks.length === 1) {
        console.log(
          `[OK]   Single FK on ${POSITIONS_TABLE}.${column} -> ${refTable}: ${fks[0]} (no duplicates).`
        );
        continue;
      }
      // Keep the first (deterministic), drop the rest as duplicates.
      const [keep, ...dupes] = fks;
      console.log(
        `[DUP]  ${POSITIONS_TABLE}.${column} -> ${refTable}: keeping ${keep}, dropping ${dupes.length} duplicate(s).`
      );
      for (const name of dupes) {
        plannedActions++;
        if (APPLY) {
          await dropConstraint(POSITIONS_TABLE, name);
          appliedActions++;
          console.log(`       [DROPPED] FOREIGN KEY ${name}`);
        } else {
          console.log(`       [WOULD DROP] FOREIGN KEY ${name}`);
        }
      }
    }
  } else {
    console.log(`[SKIP] Table ${POSITIONS_TABLE} does not exist.`);
  }

  console.log("");

  // ── Step 2: Retire the legacy singular staking_pool table ─────────────────
  if (await tableExists(LEGACY_TABLE)) {
    // 2a. Drop any inbound FK constraints that point AT the legacy table, or
    //     MySQL refuses the DROP TABLE with errno 1451. In practice these come
    //     from other legacy companion tables (staking_duration, staking_log)
    //     that predate the canonical `staking_pools` and have no model/code in
    //     the current build. Dropping a FK *constraint* removes no data — it
    //     only lifts the dependency so the dead parent table can go.
    const inbound = await inboundForeignKeys(LEGACY_TABLE);
    if (inbound.length > 0) {
      console.log(
        `[DEP]  ${inbound.length} inbound FK(s) reference \`${LEGACY_TABLE}\` and block its drop:`
      );
      for (const { tbl, name } of inbound) {
        plannedActions++;
        if (APPLY) {
          await dropConstraint(tbl, name);
          appliedActions++;
          console.log(`       [DROPPED] FK ${name} on \`${tbl}\``);
        } else {
          console.log(`       [WOULD DROP] FK ${name} on \`${tbl}\``);
        }
      }
    }

    // 2b. Drop the legacy table itself — but ONLY when it is empty, so we never
    //     destroy data on an install where it was (unexpectedly) still in use.
    //     The premise of MODEL-09 is that it is unused; the guard makes that
    //     premise fail safe rather than catastrophic.
    const legacyRows = await rowCount(LEGACY_TABLE);
    if (legacyRows > 0) {
      console.log(
        `[WARN] Legacy table \`${LEGACY_TABLE}\` holds ${legacyRows} row(s) — NOT dropping (would lose data). ` +
          `Inbound FKs were lifted; review the rows and drop the table manually once confirmed safe.`
      );
    } else {
      plannedActions++;
      if (APPLY) {
        await dropTable(LEGACY_TABLE);
        appliedActions++;
        console.log(`[DROPPED] legacy table \`${LEGACY_TABLE}\` (was empty).`);
      } else {
        console.log(`[WOULD DROP] legacy empty table \`${LEGACY_TABLE}\`.`);
      }
    }
  } else {
    console.log(`[SKIP] Legacy table \`${LEGACY_TABLE}\` does not exist (already retired).`);
  }

  // ── Verification ──────────────────────────────────────────────────────────
  console.log("\n" + "-".repeat(64));
  const legacyStillThere = await tableExists(LEGACY_TABLE);
  const canonicalThere = await tableExists(CANONICAL_TABLE);
  console.log(`Verify: \`${LEGACY_TABLE}\` exists?    ${legacyStillThere ? "YES" : "no"}`);
  console.log(`Verify: \`${CANONICAL_TABLE}\` exists?   ${canonicalThere ? "YES" : "NO (!)"}`);
  if (!canonicalThere) {
    console.log(
      `WARNING: canonical table \`${CANONICAL_TABLE}\` is missing — this is unexpected. No data was touched on it by this script.`
    );
  }

  console.log("-".repeat(64));
  console.log("=".repeat(64));
  if (APPLY) {
    console.log(`Applied ${appliedActions}/${plannedActions} action(s).`);
  } else {
    console.log(
      plannedActions === 0
        ? `Nothing to do — database already clean (idempotent no-op).`
        : `DRY-RUN — ${plannedActions} action(s) pending. Re-run with --apply to execute.`
    );
  }
  console.log("=".repeat(64));
}

main()
  .catch((e) => {
    console.error("Retirement migration failed:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await sequelize.close();
    } catch {}
  });
