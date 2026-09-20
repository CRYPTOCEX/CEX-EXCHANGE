"use strict";

/**
 * `staking_admin_activities.userId`: NOT NULL -> NULL  (STK-ACTIVITY-01)
 *
 * THE SYMPTOM
 * -----------
 * Every staking cron run logs, once per position it paid:
 *
 *     [STAKING] Failed to write the audit row for position <id> — this cron run
 *     will not appear in the staking activity feed. ...: Column 'userId' cannot
 *     be null
 *
 * The cron writes an audit row with `userId: null` because the actor is the
 * SYSTEM, not a person. The model has declared that column nullable for some
 * time (models/ext/staking/stakingAdminActivity.ts, with a comment saying
 * exactly why); the DATABASE column on installs created before that is still
 * `NOT NULL`.
 *
 * The write is deliberately best-effort — an audit row must never roll back a
 * payout — so no money is affected. The cost is quiet and permanent: the
 * staking activity feed contains admin actions only and shows NOTHING from the
 * engine that moves most of the money, so "who credited this position" has no
 * answer at all.
 *
 * WHY THE AUTO-SYNC WILL NEVER FIX IT
 * -----------------------------------
 * `src/db.ts` runs a diff-based `sync({alter:true})` that fingerprints columns
 * from the MODEL DEFINITION into `.sync-hash` and skips `changeColumn` for
 * every column whose fingerprint is unchanged. The fingerprint includes
 * `allowNull`, and it is compared definition-against-definition, never against
 * what MySQL actually reports — a deliberate choice, because reading types back
 * out of MySQL is lossy. Once the manifest recorded `allowNull: true` here, the
 * column counts as unchanged on every subsequent boot and the ALTER is skipped
 * for ever. Restarting, deleting `.sync-hash` or setting `DB_SYNC=always` does
 * not help.
 *
 * A repair script has existed at
 * `backend/scripts/fix-staking-activity-system-actor.mjs` (dry-run by default,
 * `--apply` to change anything, and it prints far more diagnostics than this).
 * Nothing ran it, which is why the log line above is still arriving. `pnpm
 * updator` runs `db:seed:all`, so putting the repair here is what makes it
 * actually reach installs. The script stays as the manual/diagnostic entry
 * point.
 *
 * TWO THINGS MYSQL MAKES AWKWARD, BOTH LEARNED THE HARD WAY
 * ---------------------------------------------------------
 *  1. A column carrying a foreign key CANNOT be modified in place
 *     ("Cannot change column 'userId': used in a foreign key constraint"), so
 *     the sequence is DROP FK -> MODIFY -> re-ADD FK.
 *
 *  2. `MODIFY <col> CHAR(36) NULL` REPLACES THE WHOLE DEFINITION, including the
 *     collation, which then falls back to the table default. Here that rewrites
 *     `utf8mb4_bin` to the table's `utf8mb4_unicode_ci` while `user.id` stays
 *     `utf8mb4_bin`, and re-adding the foreign key fails with errno 150,
 *     "Foreign key constraint is incorrectly formed" — an error that names
 *     neither collation. The definition below is therefore rebuilt from what
 *     information_schema reports for the REFERENCED column.
 *
 * Idempotent, and recoverable: the column and the foreign key are checked
 * independently, so a half-finished earlier attempt (column already nullable,
 * FK missing) is repaired rather than reported as a success. Safe on a live
 * database — relaxing NOT NULL to NULL widens what the column accepts and
 * cannot invalidate an existing row.
 */

const TABLE = "staking_admin_activities";
const COLUMN = "userId";

/** Matches `associate()` in models/ext/staking/stakingAdminActivity.ts. */
const EXPECTED_FK = {
  CONSTRAINT_NAME: `${TABLE}_ibfk_1`,
  REFERENCED_TABLE_NAME: "user",
  REFERENCED_COLUMN_NAME: "id",
  DELETE_RULE: "CASCADE",
  UPDATE_RULE: "CASCADE",
};

const quoteIdent = (name) => `\`${String(name).replace(/`/g, "``")}\``;

const dropSql = (name) =>
  `ALTER TABLE ${quoteIdent(TABLE)} DROP FOREIGN KEY ${quoteIdent(name)}`;

const addSql = (fk) =>
  `ALTER TABLE ${quoteIdent(TABLE)} ADD CONSTRAINT ${quoteIdent(fk.CONSTRAINT_NAME)}` +
  ` FOREIGN KEY (${quoteIdent(COLUMN)}) REFERENCES ${quoteIdent(fk.REFERENCED_TABLE_NAME)}` +
  ` (${quoteIdent(fk.REFERENCED_COLUMN_NAME)})` +
  ` ON DELETE ${fk.DELETE_RULE} ON UPDATE ${fk.UPDATE_RULE}`;

const modifySql = (definition) =>
  `ALTER TABLE ${quoteIdent(TABLE)} MODIFY ${quoteIdent(COLUMN)} ${definition}`;

module.exports = {
  async up(queryInterface) {
    const sequelize = queryInterface.sequelize;
    const database = sequelize.getDatabaseName();
    const select = (sql, replacements) =>
      sequelize.query(sql, { replacements, type: sequelize.QueryTypes.SELECT });

    // An install without the staking addon has nothing to fix and must not be
    // reported as a failure. `pnpm updator` runs db:seed:all, so this must
    // never be the thing that fails a seed run.
    try {
      const [table] = await select(
        `SELECT TABLE_NAME FROM information_schema.TABLES
          WHERE TABLE_SCHEMA = :database AND TABLE_NAME = :table`,
        { database, table: TABLE }
      );
      if (!table) {
        console.log(
          `[staking-activity-system-actor] ${TABLE} is not present — skipping`
        );
        return;
      }

      const [column] = await select(
        `SELECT COLUMN_TYPE, IS_NULLABLE, CHARACTER_SET_NAME, COLLATION_NAME
           FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = :database AND TABLE_NAME = :table AND COLUMN_NAME = :column`,
        { database, table: TABLE, column: COLUMN }
      );
      if (!column) {
        console.log(
          `[staking-activity-system-actor] ${TABLE}.${COLUMN} does not exist — ` +
            "the schema is not what this repair expects; nothing changed"
        );
        return;
      }

      const existingFks = await select(
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
        { database, table: TABLE, column: COLUMN }
      );

      // Whatever is dropped must go back with the SAME rules; with no
      // constraint present there is nothing to read, so the model's declared
      // intent is used. An install whose FK was deliberately tuned is never
      // silently rewritten to the defaults.
      const fksToRestore = existingFks.length > 0 ? existingFks : [EXPECTED_FK];

      const [referent] = await select(
        `SELECT COLUMN_TYPE, CHARACTER_SET_NAME, COLLATION_NAME
           FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = :database AND TABLE_NAME = :table AND COLUMN_NAME = :column`,
        {
          database,
          table: fksToRestore[0].REFERENCED_TABLE_NAME,
          column: fksToRestore[0].REFERENCED_COLUMN_NAME,
        }
      );
      if (!referent) {
        console.log(
          `[staking-activity-system-actor] ${fksToRestore[0].REFERENCED_TABLE_NAME}.` +
            `${fksToRestore[0].REFERENCED_COLUMN_NAME} does not exist — nothing changed`
        );
        return;
      }

      const nullable = column.IS_NULLABLE === "YES";
      // Take the collation from the REFERENT, not from the column's own current
      // value: that is what makes this able to repair an earlier attempt that
      // reset the column to the table default and could then never re-add the
      // foreign key.
      const collationMismatch =
        !!referent.COLLATION_NAME &&
        !!column.COLLATION_NAME &&
        referent.COLLATION_NAME !== column.COLLATION_NAME;
      const needsColumn = !nullable || collationMismatch;
      const needsFk = existingFks.length === 0;

      if (!needsColumn && !needsFk) {
        console.log(
          "[staking-activity-system-actor] nothing to do — the column is nullable " +
            "and its foreign key is in place"
        );
        return;
      }

      const parts = [column.COLUMN_TYPE];
      const charset = referent.CHARACTER_SET_NAME ?? column.CHARACTER_SET_NAME;
      const collation = referent.COLLATION_NAME ?? column.COLLATION_NAME;
      if (charset) parts.push(`CHARACTER SET ${charset}`);
      if (collation) parts.push(`COLLATE ${collation}`);
      parts.push("NULL");
      const definition = parts.join(" ");

      // Track what was dropped so a failure part-way can put it back: leaving
      // the table with no foreign key is strictly worse than the audit gap this
      // is closing. Deliberately NOT wrapped in a transaction — MySQL DDL is
      // implicitly committed, so a transaction here would only be a lie about
      // atomicity.
      const dropped = [];
      if (needsColumn) {
        try {
          for (const fk of existingFks) {
            await sequelize.query(dropSql(fk.CONSTRAINT_NAME));
            dropped.push(fk);
          }
          await sequelize.query(modifySql(definition));
        } catch (error) {
          console.log(
            `[staking-activity-system-actor] ALTER failed: ${error?.message || error}`
          );
          for (const fk of dropped) {
            try {
              await sequelize.query(addSql(fk));
              console.log(
                `[staking-activity-system-actor] restored ${fk.CONSTRAINT_NAME}`
              );
            } catch (restoreError) {
              console.log(
                `[staking-activity-system-actor] COULD NOT RESTORE ` +
                  `${fk.CONSTRAINT_NAME}: ${restoreError?.message || restoreError}`
              );
              console.log(
                `[staking-activity-system-actor] run this by hand: ${addSql(fk)}`
              );
            }
          }
          return;
        }
      }

      for (const fk of fksToRestore) {
        try {
          await sequelize.query(addSql(fk));
        } catch (error) {
          console.log(
            `[staking-activity-system-actor] the column is correct but ` +
              `${fk.CONSTRAINT_NAME} could not be added: ${error?.message || error}`
          );
          console.log(
            `[staking-activity-system-actor] run this by hand: ${addSql(fk)} ` +
              "(or re-run the seeders — a missing foreign key is detected on its own)"
          );
          return;
        }
      }

      // Verify against information_schema rather than trusting the DDL: a MySQL
      // statement that reports success and leaves the schema as it was is
      // exactly the failure mode this repair exists to correct.
      const [after] = await select(
        `SELECT IS_NULLABLE FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = :database AND TABLE_NAME = :table AND COLUMN_NAME = :column`,
        { database, table: TABLE, column: COLUMN }
      );
      if (after?.IS_NULLABLE !== "YES") {
        console.log(
          `[staking-activity-system-actor] FAILED — ${COLUMN} is still NOT NULL after the ALTER`
        );
        return;
      }

      console.log(
        `[staking-activity-system-actor] ${TABLE}.${COLUMN} is now nullable — the ` +
          "staking cron can record its audit trail again"
      );
    } catch (error) {
      // Never fail the seed run over an audit-trail repair.
      console.log(
        `[staking-activity-system-actor] skipped: ${error?.message || error}`
      );
    }
  },

  async down() {
    // Deliberately irreversible. Putting NOT NULL back would break the staking
    // cron's audit write again, and any system-actor rows written since would
    // make the ALTER fail anyway.
  },
};
