/**
 * ECO-TOKEN-JSON — un-double-encode `ecosystem_token.fee` and `.limits`.
 *
 * WHAT IS WRONG
 * -------------
 * Every row in this table stores those two columns as a JSON *string containing
 * JSON*, not as a JSON object. Measured on a live install:
 *
 *     SELECT COUNT(*), SUM(JSON_TYPE(fee)='STRING'), SUM(JSON_TYPE(fee)='OBJECT')
 *     FROM ecosystem_token;
 *     -> 5531 rows, 13 of 13 fee values STRING, 0 OBJECT
 *     -> 14 of 14 limits values STRING, 0 OBJECT
 *
 *     fee    = "{\"min\":1,\"percentage\":1}"
 *     limits = "{\"deposit\":{...},\"withdraw\":{...}}"
 *
 * Not one row in the table is stored correctly.
 *
 * WHERE IT COMES FROM
 * -------------------
 * Three admin writers hand an already-serialised string to a DataTypes.JSON
 * column, which serialises it a second time:
 *
 *   api/(ext)/admin/ecosystem/token/[id]/index.put.ts   fee: JSON.stringify(fee)
 *   api/(ext)/admin/ecosystem/token/index.post.ts       fee: JSON.stringify(fee)
 *   api/(ext)/admin/ecosystem/token/import.post.ts      typeof fee === "object" ? JSON.stringify(fee) : fee
 *
 * Those are fixed separately. This script repairs the rows they already wrote.
 *
 * WHY IT HAS NOT BROKEN ANYTHING YET, AND WHY IT STILL MATTERS
 * -----------------------------------------------------------
 * `models/ext/ecosystem/ecosystemToken.ts` defines getters that call
 * `parseJsonColumn`, which parses UP TO TWICE — so every consumer reaching the
 * column through the model currently sees the right object, and the withdrawal
 * fee is charged correctly today. This is not a live money defect.
 *
 * It is a trap with no margin left. The getter's loop is `for (let i = 0; i < 2
 * && typeof parsed === "string"; i++)`, so exactly one extra layer is tolerated
 * and a third would return null — which the withdraw path reads as "no fee
 * configured" and charges ZERO. `import.post.ts` can produce that third layer
 * today: it re-stringifies only when the incoming value is an object, so
 * re-importing a token whose `fee` arrives as a string stores it as-is on top of
 * the existing wrapping. Any consumer that reads the column WITHOUT the model
 * getter — a raw query, a rebuilt model, a JSON export — sees a string and gets
 * `undefined` for every field.
 *
 * MARIADB, NOT MYSQL
 * ------------------
 * This install is MariaDB 10.4, where a JSON column is LONGTEXT with a CHECK
 * constraint and `CAST(x AS JSON)` DOES NOT EXIST — it is a syntax error. The
 * portable repair is `JSON_UNQUOTE`, which strips exactly one layer:
 *
 *     JSON_UNQUOTE('"{\"min\":1}"')            -> {"min":1}   (JSON_TYPE OBJECT)
 *
 * On MySQL the same statement is also correct: a string assigned to a JSON
 * column is parsed, not re-wrapped.
 *
 * IDEMPOTENT: the WHERE clause selects only rows whose JSON_TYPE is still
 * STRING, so a second run touches nothing. Rows that are already objects, NULL,
 * or empty are left alone.
 *
 * SAFE: refuses to write anything whose unquoted form does not parse back to an
 * object, so a genuinely-string value can never be silently destroyed.
 *
 * DRY-RUN by default.
 *   Report:  node scripts/migration-eco-token-json-unwrap.mjs
 *   Apply:   node scripts/migration-eco-token-json-unwrap.mjs --apply
 *
 * After --apply, nothing needs restarting: the model getter already tolerates
 * both shapes, which is precisely why this can be repaired without downtime.
 */

import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { Sequelize, QueryTypes } from "sequelize";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
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

const TABLE = "ecosystem_token";
const COLUMNS = ["fee", "limits"];

async function tableExists(tableName) {
  const rows = await sequelize.query(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    { replacements: [tableName], type: QueryTypes.SELECT }
  );
  return rows.length > 0;
}

/** Does `raw`, once unquoted, parse to a plain object? */
function unwrapsToObject(unquoted) {
  if (typeof unquoted !== "string" || unquoted.length === 0) return false;
  try {
    const parsed = JSON.parse(unquoted);
    return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed);
  } catch {
    return false;
  }
}

async function main() {
  console.log(`\nECO-TOKEN-JSON — ${APPLY ? "APPLY" : "DRY RUN"}\n`);
  console.log(`  database: ${process.env.DB_NAME} @ ${process.env.DB_HOST}`);

  const [{ v: version }] = await sequelize.query("SELECT VERSION() AS v", {
    type: QueryTypes.SELECT,
  });
  console.log(`  server:   ${version}\n`);

  if (!(await tableExists(TABLE))) {
    console.log(`  ${TABLE} does not exist on this install — nothing to do.\n`);
    await sequelize.close();
    return;
  }

  let totalWrapped = 0;
  let totalRepaired = 0;
  let totalRefused = 0;

  for (const column of COLUMNS) {
    // JSON_TYPE returns STRING only for the double-encoded rows; an object row
    // returns OBJECT and is skipped, which is what makes this re-runnable.
    const rows = await sequelize.query(
      `SELECT id, currency, chain,
              JSON_UNQUOTE(\`${column}\`) AS unquoted
         FROM \`${TABLE}\`
        WHERE \`${column}\` IS NOT NULL
          AND JSON_TYPE(\`${column}\`) = 'STRING'`,
      { type: QueryTypes.SELECT }
    );

    console.log(`  ${column}: ${rows.length} double-encoded row(s)`);
    totalWrapped += rows.length;

    for (const row of rows) {
      if (!unwrapsToObject(row.unquoted)) {
        totalRefused++;
        console.log(
          `    REFUSED ${row.currency}/${row.chain} — unquoting does not yield an object ` +
            `(${JSON.stringify(String(row.unquoted).slice(0, 80))}). Left untouched.`
        );
        continue;
      }

      if (!APPLY) {
        console.log(`    would fix ${row.currency}/${row.chain} -> ${row.unquoted}`);
        totalRepaired++;
        continue;
      }

      // Re-derive in SQL rather than writing back the JS-side string: it keeps
      // the value byte-identical to what the column already holds, minus exactly
      // one layer of quoting.
      await sequelize.query(
        `UPDATE \`${TABLE}\`
            SET \`${column}\` = JSON_UNQUOTE(\`${column}\`)
          WHERE id = ?
            AND JSON_TYPE(\`${column}\`) = 'STRING'`,
        { replacements: [row.id], type: QueryTypes.UPDATE }
      );
      totalRepaired++;
      console.log(`    fixed ${row.currency}/${row.chain} -> ${row.unquoted}`);
    }
  }

  console.log("");
  if (APPLY) {
    // Prove it, rather than reporting the count we intended to write.
    for (const column of COLUMNS) {
      const [{ still }] = await sequelize.query(
        `SELECT COUNT(*) AS still FROM \`${TABLE}\`
          WHERE \`${column}\` IS NOT NULL AND JSON_TYPE(\`${column}\`) = 'STRING'`,
        { type: QueryTypes.SELECT }
      );
      console.log(`  verify ${column}: ${still} still double-encoded`);
    }
  }
  console.log(
    `\n  ${totalWrapped} wrapped, ${totalRepaired} ${APPLY ? "repaired" : "repairable"}, ` +
      `${totalRefused} refused\n`
  );
  if (!APPLY && totalRepaired > 0) {
    console.log("  Re-run with --apply to write these changes.\n");
  }

  await sequelize.close();
}

main().catch(async (error) => {
  console.error("\nECO-TOKEN-JSON failed:", error?.message ?? error);
  await sequelize.close().catch(() => undefined);
  process.exit(1);
});
