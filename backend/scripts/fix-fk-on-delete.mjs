/**
 * Fix FK ON DELETE Rules: CASCADE -> RESTRICT / SET NULL  (MODEL-05)
 *
 * The `transaction` and `wallet` tables are paranoid (soft-delete), yet their
 * FKs to `user` (and transaction -> wallet) were created with ON DELETE CASCADE.
 * A user HARD delete therefore cascades and physically wipes the financial
 * ledger, destroying audit/reconciliation history. This migration re-points
 * those FKs to RESTRICT so a user with wallets/transactions cannot be deleted
 * until the ledger is archived. `user.roleId` -> `role` is switched to SET NULL
 * so deleting a role no longer cascade-deletes its users.
 *
 * Sequelize sync({alter:true}) CANNOT modify an existing FK's onDelete rule;
 * it must be DROPped and re-ADDed via raw SQL. That is what this script does.
 *
 * Behaviour:
 *   - DRY-RUN by default: only reports what it WOULD change. No DDL is run.
 *   - Pass --apply to actually drop/re-add the constraints.
 *   - Fully IDEMPOTENT: every change is guarded by an information_schema check.
 *     If a constraint already has the desired DELETE_RULE it is left untouched,
 *     so re-running (with or without --apply) is a no-op.
 *
 * Usage:
 *   Report:  node backend/scripts/fix-fk-on-delete.mjs
 *   Apply:   node backend/scripts/fix-fk-on-delete.mjs --apply
 *
 * Run AFTER deploying the updated model files and (ideally) BEFORE/while
 * restarting the backend so the schema matches the new onDelete rules.
 */

import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { Sequelize } from "sequelize";

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

/**
 * The FKs to re-point. `column`/`refTable`/`refColumn` are used to RE-ADD the
 * constraint with the correct definition after the old one is dropped. The
 * actual constraint NAME is discovered from information_schema (never hardcoded
 * into the DROP), so renames/upgrades don't break us. `name` is only used when
 * ADDing a fresh constraint.
 */
const FKS = [
  {
    table: "transaction",
    column: "userId",
    refTable: "user",
    refColumn: "id",
    onDelete: "RESTRICT",
    name: "transactionUserIdFkey",
  },
  {
    table: "transaction",
    column: "walletId",
    refTable: "wallet",
    refColumn: "id",
    onDelete: "RESTRICT",
    name: "transactionWalletIdFkey",
  },
  {
    table: "wallet",
    column: "userId",
    refTable: "user",
    refColumn: "id",
    onDelete: "RESTRICT",
    name: "walletUserIdFkey",
  },
  {
    table: "user",
    column: "roleId",
    refTable: "role",
    refColumn: "id",
    onDelete: "SET NULL",
    name: "userRoleIdFkey",
  },
];

/**
 * Discover the real FK constraint(s) on table.column. Returns an array of
 * { constraintName, deleteRule } (usually 0 or 1). DELETE_RULE comes from
 * REFERENTIAL_CONSTRAINTS so we can tell whether a fix is even needed.
 */
async function findFk(table, column) {
  const [rows] = await sequelize.query(
    `SELECT kcu.CONSTRAINT_NAME AS constraintName, rc.DELETE_RULE AS deleteRule
       FROM information_schema.KEY_COLUMN_USAGE kcu
       JOIN information_schema.REFERENTIAL_CONSTRAINTS rc
         ON rc.CONSTRAINT_SCHEMA = kcu.TABLE_SCHEMA
        AND rc.CONSTRAINT_NAME   = kcu.CONSTRAINT_NAME
      WHERE kcu.TABLE_SCHEMA = DATABASE()
        AND kcu.TABLE_NAME = ?
        AND kcu.COLUMN_NAME = ?
        AND kcu.REFERENCED_TABLE_NAME IS NOT NULL`,
    { replacements: [table, column] }
  );
  return rows;
}

// Does a constraint with this exact name already exist on the table?
async function constraintExists(table, name) {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
      WHERE CONSTRAINT_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND CONSTRAINT_NAME = ?
        AND CONSTRAINT_TYPE = 'FOREIGN KEY'
      LIMIT 1`,
    { replacements: [table, name] }
  );
  return rows.length > 0;
}

async function main() {
  console.log("=".repeat(64));
  console.log(`Fix FK ON DELETE Rules (MODEL-05)  (${APPLY ? "APPLY" : "DRY-RUN"})`);
  console.log("=".repeat(64) + "\n");

  await sequelize.authenticate();
  console.log("[OK] Connected to database\n");

  let toChange = 0;
  let changed = 0;
  let alreadyOk = 0;

  for (const fk of FKS) {
    const label = `${fk.table}.${fk.column} -> ${fk.refTable}(${fk.refColumn})`;
    const existing = await findFk(fk.table, fk.column);

    if (existing.length === 0) {
      // No FK at all. The model sync should create it, but re-add defensively
      // so the on-delete rule is correct even on a partially-built schema.
      console.log(`${label}`);
      console.log(`  current: <no FK>   desired: ON DELETE ${fk.onDelete}`);
      toChange++;
      if (APPLY) {
        if (await constraintExists(fk.table, fk.name)) {
          console.log(`  [SKIP] constraint ${fk.name} already exists (name clash); leaving as-is`);
        } else {
          await addFk(fk);
          console.log(`  [ADD] ${fk.name} ON DELETE ${fk.onDelete}`);
          changed++;
        }
      } else {
        console.log(`  [WOULD ADD] ${fk.name} ON DELETE ${fk.onDelete}`);
      }
      console.log("");
      continue;
    }

    for (const cur of existing) {
      const curRule = (cur.deleteRule || "").toUpperCase();
      const want = fk.onDelete.toUpperCase();
      // MySQL stores "RESTRICT" and "NO ACTION" equivalently; treat them as the
      // same effective behaviour so we don't churn a constraint that's already safe.
      const equivalent =
        curRule === want ||
        (want === "RESTRICT" && (curRule === "RESTRICT" || curRule === "NO ACTION"));

      console.log(`${label}  [constraint: ${cur.constraintName}]`);
      console.log(`  current: ON DELETE ${curRule || "?"}   desired: ON DELETE ${want}`);

      if (equivalent) {
        console.log(`  [OK] already safe — no change\n`);
        alreadyOk++;
        continue;
      }

      toChange++;
      if (APPLY) {
        await sequelize.query(
          `ALTER TABLE \`${fk.table}\` DROP FOREIGN KEY \`${cur.constraintName}\``
        );
        console.log(`  [DROP] ${cur.constraintName}`);
        // Re-add under the canonical name (or the existing one if it differs).
        const addName = (await constraintExists(fk.table, fk.name)) ? cur.constraintName : fk.name;
        await addFk({ ...fk, name: addName });
        console.log(`  [ADD] ${addName} ON DELETE ${want}`);
        changed++;
      } else {
        console.log(`  [WOULD DROP+ADD] -> ON DELETE ${want}`);
      }
      console.log("");
    }
  }

  console.log("=".repeat(64));
  console.log(`FKs already correct: ${alreadyOk}`);
  if (APPLY) {
    console.log(`FKs changed:         ${changed}`);
    if (changed > 0) {
      console.log("\nIMPORTANT: restart the backend so model sync sees the new FK rules.");
    }
  } else {
    console.log(`FKs needing change:  ${toChange}`);
    console.log(`\nDRY-RUN — no DDL executed. Re-run with --apply to perform the changes.`);
  }
  console.log("=".repeat(64));
}

// ADD a constraint with the desired ON DELETE rule (ON UPDATE CASCADE per models).
async function addFk(fk) {
  await sequelize.query(
    `ALTER TABLE \`${fk.table}\` ADD CONSTRAINT \`${fk.name}\`
       FOREIGN KEY (\`${fk.column}\`) REFERENCES \`${fk.refTable}\`(\`${fk.refColumn}\`)
       ON DELETE ${fk.onDelete} ON UPDATE CASCADE`
  );
}

main()
  .catch((e) => {
    console.error("\n[ERROR]", e.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await sequelize.close();
    } catch {}
  });
