/**
 * Fix `staking_admin_activities.userId`: NOT NULL -> NULL  (STK-ACTIVITY-01)
 *
 * THE DEFECT
 * ----------
 * The staking reward cron records an audit row for every position it accrues or
 * settles, with `userId: null` because the actor is the system, not a person.
 * The MODEL has declared that column nullable for some time
 * (models/ext/staking/stakingAdminActivity.ts, with a comment saying exactly
 * why), but the DATABASE column is still `NOT NULL`.
 *
 * Every cron-written audit row therefore fails with
 *
 *     Failed to write audit for position <id>: Column 'userId' cannot be null
 *
 * The write is deliberately wrapped in a best-effort try/catch — an audit row
 * must never roll back a payout — so nothing breaks, no money is affected, and
 * the only symptom is one error line in the log. The consequence is quiet and
 * permanent: the staking activity feed contains admin actions only, and shows
 * NOTHING for the engine that actually moves most of the money. An operator
 * auditing "who credited this position" finds no record at all.
 *
 * WHY AUTO-SYNC WILL NEVER FIX THIS
 * ---------------------------------
 * This is the important part, and it is why a migration is REQUIRED rather than
 * merely convenient.
 *
 * `src/db.ts` runs a diff-based `sync({alter:true})`: it fingerprints every
 * column from the MODEL DEFINITION, stores that manifest in `.sync-hash`, and
 * on the next boot skips `changeColumn` for every column whose fingerprint is
 * unchanged. The fingerprint includes `allowNull`. It is compared
 * definition-against-definition and NEVER against what MySQL actually reports —
 * a deliberate choice, because reading types back out of MySQL is famously
 * lossy (`UUID` renders as `CHAR(36) BINARY` and reads back as `char(36)`,
 * `INTEGER` reads back as `int(11)`, MariaDB stores `JSON` as `longtext`).
 *
 * The cost of that choice is exactly this situation. Once the manifest has
 * recorded `allowNull: true` for this column — which it has, because the model
 * says so — the column counts as unchanged on every subsequent boot and the
 * ALTER is skipped forever. The database and the manifest disagree, and nothing
 * in the sync path can ever notice. Restarting the backend, deleting
 * `.sync-hash`, or setting `DB_SYNC=always` will not help on an install where
 * the original ALTER never landed.
 *
 * TWO THINGS MYSQL MAKES AWKWARD, BOTH LEARNED THE HARD WAY
 * ---------------------------------------------------------
 *  1. A column carrying a foreign key CANNOT be modified in place:
 *       Cannot change column 'userId': used in a foreign key constraint
 *     so the sequence must be DROP FK -> MODIFY -> re-ADD FK.
 *
 *  2. `MODIFY <col> CHAR(36) NULL` REPLACES THE WHOLE DEFINITION, including the
 *     collation, which then falls back to the table default. Here that silently
 *     rewrote `utf8mb4_bin` to the table's `utf8mb4_unicode_ci` while
 *     `user.id` stayed `utf8mb4_bin`, and re-adding the foreign key failed with
 *
 *       errno: 150 "Foreign key constraint is incorrectly formed"
 *
 *     — a mismatch error that names neither collation. The definition below is
 *     therefore rebuilt from what information_schema reports for the column,
 *     never hardcoded.
 *
 * BEHAVIOUR
 * ---------
 *   - DRY-RUN by default: reports what it WOULD change. No DDL is run.
 *   - Pass --apply to actually change the schema.
 *   - Fully IDEMPOTENT, and RECOVERABLE: it checks the column and the foreign
 *     key independently, so it also repairs the half-finished state where the
 *     column is already nullable but the FK is missing (which is what an
 *     earlier run that hit trap 2 leaves behind).
 *
 * USAGE
 *   Report:  node backend/scripts/fix-staking-activity-system-actor.mjs
 *   Apply:   node backend/scripts/fix-staking-activity-system-actor.mjs --apply
 *
 * Safe to run against a live database: relaxing NOT NULL to NULL widens what
 * the column accepts and cannot invalidate an existing row.
 */

import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { Sequelize, QueryTypes } from "sequelize";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.join(__dirname, "../../.env") });

const APPLY = process.argv.includes("--apply");

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

const TABLE = "staking_admin_activities";
const COLUMN = "userId";

/**
 * The foreign key this column is supposed to carry, matching `associate()` in
 * models/ext/staking/stakingAdminActivity.ts.
 *
 * Used ONLY when information_schema reports no existing constraint — i.e. when
 * re-adding one a previous interrupted run dropped. When a constraint IS
 * present its real rules are read and replayed instead, so an install whose FK
 * was deliberately tuned is never silently rewritten to these defaults.
 */
const EXPECTED_FK = {
  CONSTRAINT_NAME: `${TABLE}_ibfk_1`,
  REFERENCED_TABLE_NAME: "user",
  REFERENCED_COLUMN_NAME: "id",
  DELETE_RULE: "CASCADE",
  UPDATE_RULE: "CASCADE",
};

const quoteIdent = (name) => `\`${String(name).replace(/`/g, "``")}\``;

async function columnInfo(database) {
  const [row] = await sequelize.query(
    `SELECT COLUMN_TYPE, IS_NULLABLE, CHARACTER_SET_NAME, COLLATION_NAME
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = :database AND TABLE_NAME = :table AND COLUMN_NAME = :column`,
    {
      replacements: { database, table: TABLE, column: COLUMN },
      type: QueryTypes.SELECT,
    }
  );
  return row ?? null;
}

async function foreignKeys(database) {
  return sequelize.query(
    `SELECT k.CONSTRAINT_NAME, k.REFERENCED_TABLE_NAME, k.REFERENCED_COLUMN_NAME,
            r.DELETE_RULE, r.UPDATE_RULE
       FROM information_schema.KEY_COLUMN_USAGE k
       JOIN information_schema.REFERENTIAL_CONSTRAINTS r
         ON r.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA
        AND r.CONSTRAINT_NAME = k.CONSTRAINT_NAME
      WHERE k.TABLE_SCHEMA = :database
        AND k.TABLE_NAME = :table
        AND k.COLUMN_NAME = :column
        AND k.REFERENCED_TABLE_NAME IS NOT NULL`,
    {
      replacements: { database, table: TABLE, column: COLUMN },
      type: QueryTypes.SELECT,
    }
  );
}

/** The charset/collation of the column this FK points AT. */
async function referencedColumnInfo(database, fk) {
  const [row] = await sequelize.query(
    `SELECT COLUMN_TYPE, CHARACTER_SET_NAME, COLLATION_NAME
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = :database AND TABLE_NAME = :table AND COLUMN_NAME = :column`,
    {
      replacements: {
        database,
        table: fk.REFERENCED_TABLE_NAME,
        column: fk.REFERENCED_COLUMN_NAME,
      },
      type: QueryTypes.SELECT,
    }
  );
  return row ?? null;
}

/**
 * Rebuild the column definition, changing the nullability and pinning the
 * collation to the REFERENCED column's.
 *
 * Taking the collation from the referent rather than from the column's own
 * current value is deliberate, and it is what makes this script able to repair
 * itself. MySQL requires an FK column and its referent to share a collation;
 * `staking_admin_activities` defaults to `utf8mb4_unicode_ci` while `user.id`
 * is `utf8mb4_bin`, so a bare `MODIFY … CHAR(36) NULL` resets the column to the
 * table default and the FK can then never be re-added — errno 150, an error
 * that names neither collation. Reading the current column instead would
 * happily preserve that wrong value and fail again on every re-run.
 */
function buildDefinition(column, referent) {
  const charset = referent?.CHARACTER_SET_NAME ?? column.CHARACTER_SET_NAME;
  const collation = referent?.COLLATION_NAME ?? column.COLLATION_NAME;
  const parts = [column.COLUMN_TYPE];
  if (charset) parts.push(`CHARACTER SET ${charset}`);
  if (collation) parts.push(`COLLATE ${collation}`);
  parts.push("NULL");
  return parts.join(" ");
}

const dropSql = (name) =>
  `ALTER TABLE ${quoteIdent(TABLE)} DROP FOREIGN KEY ${quoteIdent(name)}`;

const addSql = (fk) =>
  `ALTER TABLE ${quoteIdent(TABLE)} ADD CONSTRAINT ${quoteIdent(fk.CONSTRAINT_NAME)}` +
  ` FOREIGN KEY (${quoteIdent(COLUMN)}) REFERENCES ${quoteIdent(fk.REFERENCED_TABLE_NAME)}` +
  ` (${quoteIdent(fk.REFERENCED_COLUMN_NAME)})` +
  ` ON DELETE ${fk.DELETE_RULE} ON UPDATE ${fk.UPDATE_RULE}`;

const modifySql = (definition) =>
  `ALTER TABLE ${quoteIdent(TABLE)} MODIFY ${quoteIdent(COLUMN)} ${definition}`;

async function main() {
  const database = sequelize.getDatabaseName();

  console.log("=".repeat(74));
  console.log("STK-ACTIVITY-01  staking_admin_activities.userId  NOT NULL -> NULL");
  console.log("=".repeat(74));
  console.log(`  database: ${database}`);
  console.log(`  mode:     ${APPLY ? "APPLY" : "DRY-RUN (pass --apply to change anything)"}`);
  console.log("");

  // 1. Does the table exist? An install without the staking addon has no rows
  //    to fix and must not be reported as a failure.
  const [table] = await sequelize.query(
    `SELECT TABLE_NAME FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = :database AND TABLE_NAME = :table`,
    { replacements: { database, table: TABLE }, type: QueryTypes.SELECT }
  );
  if (!table) {
    console.log(`  ${TABLE} does not exist on this database — nothing to do.`);
    console.log("  (the staking addon has never been installed here)");
    return 0;
  }

  const column = await columnInfo(database);
  if (!column) {
    console.log(`  ${TABLE}.${COLUMN} does not exist — schema is not what this`);
    console.log("  migration expects. Nothing changed; investigate before re-running.");
    return 1;
  }

  const existingFks = await foreignKeys(database);
  const nullable = column.IS_NULLABLE === "YES";

  console.log(
    `  column: ${COLUMN} ${column.COLUMN_TYPE}` +
      `${column.COLLATION_NAME ? ` COLLATE ${column.COLLATION_NAME}` : ""}` +
      ` ${nullable ? "NULL" : "NOT NULL"}`
  );
  if (existingFks.length === 0) {
    console.log("  foreign key: NONE");
  }
  for (const fk of existingFks) {
    console.log(
      `  foreign key: ${fk.CONSTRAINT_NAME} -> ${fk.REFERENCED_TABLE_NAME}.${fk.REFERENCED_COLUMN_NAME}` +
        ` (ON DELETE ${fk.DELETE_RULE}, ON UPDATE ${fk.UPDATE_RULE})`
    );
  }
  console.log("");

  // Whatever we drop must go back with the SAME rules. With no constraint
  // present there is nothing to read, so the model's declared intent is used.
  const fksToRestore = existingFks.length > 0 ? existingFks : [EXPECTED_FK];
  const referent = await referencedColumnInfo(database, fksToRestore[0]);
  if (!referent) {
    console.log(
      `  ${fksToRestore[0].REFERENCED_TABLE_NAME}.${fksToRestore[0].REFERENCED_COLUMN_NAME}` +
        " does not exist — cannot establish the foreign key. Nothing changed."
    );
    return 1;
  }
  const definition = buildDefinition(column, referent);

  // THREE facts, checked INDEPENDENTLY, which is what makes this recoverable.
  // An interrupted earlier run can leave the column nullable but with the wrong
  // collation and no foreign key, and a script that returned early on "already
  // nullable" would report that broken state as a success.
  const collationMismatch =
    !!referent.COLLATION_NAME &&
    !!column.COLLATION_NAME &&
    referent.COLLATION_NAME !== column.COLLATION_NAME;
  const needsColumn = !nullable || collationMismatch;
  const needsFk = existingFks.length === 0;

  if (collationMismatch) {
    console.log(
      `  collation mismatch: ${COLUMN} is ${column.COLLATION_NAME} but` +
        ` ${fksToRestore[0].REFERENCED_TABLE_NAME}.${fksToRestore[0].REFERENCED_COLUMN_NAME}` +
        ` is ${referent.COLLATION_NAME} — the foreign key cannot exist until they agree`
    );
    console.log("");
  }

  if (!needsColumn && !needsFk) {
    console.log("  nothing to do — the column is nullable and its foreign key is in place.");
    console.log("");
    await reportSystemRows();
    return 0;
  }

  const plan = [
    ...(needsColumn ? existingFks.map((fk) => dropSql(fk.CONSTRAINT_NAME)) : []),
    ...(needsColumn ? [modifySql(definition)] : []),
    ...(needsColumn || needsFk ? fksToRestore.map(addSql) : []),
  ];

  console.log(`  ${APPLY ? "running" : "would run"}:`);
  for (const sql of plan) console.log(`    ${sql}`);
  console.log("");

  if (!APPLY) {
    console.log("  DRY-RUN — nothing was changed. Re-run with --apply.");
    return 0;
  }

  // Track what has actually been dropped, so a failure part-way through can put
  // the constraints back. Leaving the table without its foreign key would be a
  // strictly worse outcome than the audit gap this migration is closing.
  const dropped = [];
  if (needsColumn) {
    try {
      for (const fk of existingFks) {
        await sequelize.query(dropSql(fk.CONSTRAINT_NAME));
        dropped.push(fk);
        console.log(`  dropped ${fk.CONSTRAINT_NAME}`);
      }
      await sequelize.query(modifySql(definition));
      console.log(`  modified ${COLUMN} -> ${definition}`);
    } catch (error) {
      console.log("");
      console.log(`  ALTER failed: ${error?.message || error}`);
      console.log("  restoring the foreign key(s) that were already dropped...");
      for (const fk of dropped) {
        try {
          await sequelize.query(addSql(fk));
          console.log(`  restored ${fk.CONSTRAINT_NAME}`);
        } catch (restoreError) {
          // Say exactly what is missing and how to put it back by hand. A silent
          // failure here leaves the table permanently unconstrained.
          console.log(
            `  COULD NOT RESTORE ${fk.CONSTRAINT_NAME}: ${restoreError?.message || restoreError}`
          );
          console.log(`  run this by hand:  ${addSql(fk)}`);
        }
      }
      return 1;
    }
  }

  // Re-add OUTSIDE the block above: by this point the column is already
  // correct, and a failure to re-add is reported on its own terms rather than
  // triggering a "restore" that would undo nothing useful. Re-running the
  // script picks the FK up again, because `needsFk` is evaluated independently.
  for (const fk of fksToRestore) {
    try {
      await sequelize.query(addSql(fk));
      console.log(`  added ${fk.CONSTRAINT_NAME} (ON DELETE ${fk.DELETE_RULE})`);
    } catch (error) {
      console.log("");
      console.log(
        `  the column is correct but ${fk.CONSTRAINT_NAME} could not be added: ${error?.message || error}`
      );
      console.log(`  run this by hand:  ${addSql(fk)}`);
      console.log("  (or simply re-run this script — it detects a missing foreign key on its own)");
      return 1;
    }
  }

  // Verify against information_schema rather than trusting the DDL: a MySQL
  // statement that reports success and leaves the schema as it was is exactly
  // the failure mode this whole migration exists to correct.
  const after = await columnInfo(database);
  const afterFks = await foreignKeys(database);
  if (after?.IS_NULLABLE !== "YES") {
    console.log("");
    console.log(`  FAILED — ${COLUMN} is still NOT NULL after the ALTER.`);
    return 1;
  }
  if (afterFks.length === 0) {
    console.log("");
    console.log("  FAILED — the foreign key is missing after the ALTER.");
    return 1;
  }

  console.log("");
  console.log(
    `  done — ${COLUMN} is ${after.COLUMN_TYPE}` +
      `${after.COLLATION_NAME ? ` COLLATE ${after.COLLATION_NAME}` : ""} NULL,` +
      ` foreign key ${afterFks[0].CONSTRAINT_NAME} in place.`
  );
  console.log("");
  await reportSystemRows();
  return 0;
}

/**
 * How many system-actor rows exist. Zero on a database that has only just been
 * fixed; the number grows from the next cron run onwards, which is the simplest
 * confirmation that the audit trail is actually recording again.
 */
async function reportSystemRows() {
  const [row] = await sequelize.query(
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN ${quoteIdent(COLUMN)} IS NULL THEN 1 ELSE 0 END) AS system_rows
     FROM ${quoteIdent(TABLE)}`,
    { type: QueryTypes.SELECT }
  );
  console.log(
    `  audit rows: ${row.total} total, ${row.system_rows ?? 0} written by the system (userId NULL)`
  );
  if (Number(row.system_rows ?? 0) === 0) {
    console.log(
      "  (zero is expected immediately after the fix — the next staking cron run starts recording)"
    );
  }
}

main()
  .then(async (code) => {
    // The FK's ON DELETE rule is a SEPARATE decision and is deliberately left
    // alone: this migration's job is to stop the cron losing audit rows, not to
    // change what happens to an admin's history when that admin is deleted.
    console.log("");
    console.log("  NOTE: the userId foreign key is ON DELETE CASCADE, so HARD-deleting an");
    console.log("  admin also deletes their staking audit rows. `user` is paranoid, so a");
    console.log("  normal deletion is a soft delete and does not trigger it. Changing that");
    console.log("  rule is a deliberate audit-policy decision and is out of scope here.");
    console.log("=".repeat(74));
    await sequelize.close();
    process.exit(code);
  })
  .catch(async (error) => {
    console.error("\nmigration failed:", error?.message || error);
    try {
      await sequelize.close();
    } catch {
      /* best effort */
    }
    process.exit(1);
  });
