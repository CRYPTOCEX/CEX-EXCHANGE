/**
 * Rebuild `initial.sql` — the schema a FRESH install imports before it seeds.
 *
 *   pnpm initial-sql          rewrite initial.sql from the models
 *   pnpm initial-sql:check    fail if initial.sql no longer matches the models
 *
 * ---------------------------------------------------------------------------
 * WHY THIS EXISTS
 * ---------------------------------------------------------------------------
 * `initial.sql` was a hand-kept mysqldump of somebody's database. Nothing tied
 * it to `backend/models/**`, so every model added after the last dump was simply
 * absent from it — 83 tables by the time this script was written, including
 * `withdraw_gateway`, `admin_audit_log`, every `dex_*`, every `fx_*`, every
 * `trading_bot_*` and the whole AI-support tree.
 *
 * On an EXISTING install that drift is invisible: the backend runs an `alter`
 * sync at boot (see `src/db.ts`), so a missing table is created the first time
 * the server starts. On a FRESH install it is not invisible at all, because the
 * install order is
 *
 *     import initial.sql  ->  pnpm seed  ->  build  ->  pnpm start
 *                                                       ^ first sync happens HERE
 *
 * — the seeders run against the imported dump and NOTHING ELSE. A seeder that
 * touches a table the dump forgot does not degrade, it throws, and because
 * `sequelize-cli db:seed:all` aborts the whole run on the first error it takes
 * every later seeder down with it:
 *
 *     == 20260802000001-transfi-withdraw-gateway: migrating =======
 *     ERROR: Table 'zervex.withdraw_gateway' doesn't exist
 *     ELIFECYCLE  Command failed with exit code 1.
 *
 * That install ended with no DEX tokens, no AI-support persona and no repaired
 * ticket statuses, none of which is mentioned anywhere in the output.
 *
 * ---------------------------------------------------------------------------
 * HOW IT WORKS
 * ---------------------------------------------------------------------------
 * The models are the only authority on the schema, so the dump is taken FROM
 * them rather than from anyone's database: create a throwaway database, let
 * `initModels` + `sequelize.sync()` build it, read `SHOW CREATE TABLE` back, and
 * drop it again. Nothing touches the working database — the script refuses to
 * run if the scratch name collides with `DB_NAME`.
 *
 * The output is byte-comparable between runs (tables alphabetical, no dump
 * timestamp, `AUTO_INCREMENT=<n>` stripped), which is what makes `--check`
 * usable as a gate rather than a coin toss.
 *
 * ---------------------------------------------------------------------------
 * WHAT IS DELIBERATELY PRESERVED
 * ---------------------------------------------------------------------------
 * Three tables in the shipped dump have no model behind them any more:
 * `binary_duration`, `faq` (the live model is `faqs`) and `staking_pool` (the
 * live model is `staking_pools`). They are retained verbatim in
 * `initial-sql-legacy.sql` and merged into the output, so a fresh install and a
 * long-lived upgraded install still have the same set of tables —
 * `backend/scripts/retire-staking-pool-legacy.mjs` exists precisely because rows
 * can still be sitting in one of them. Retiring one for real means deleting its
 * block from that file in the same change that removes its last reader.
 */

import fs from "fs";
import path from "path";
import { Sequelize } from "sequelize";
import { initModels } from "@db/init";

const ARGV = process.argv.slice(2);
const arg = (name: string, dflt: string) => {
  const hit = ARGV.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : dflt;
};
const CHECK = ARGV.includes("--check");
const KEEP = ARGV.includes("--keep");

const ROOT = path.resolve(__dirname, "..", "..");
const OUT = path.resolve(ROOT, arg("out", "initial.sql"));
const SCRATCH = arg("database", "bicrypto_initial_sql_build");

/**
 * Tables the shipped dump carries that no model creates, kept verbatim in a
 * sidecar file rather than inline so they are reviewable as SQL. Order is
 * irrelevant (the header disables FK checks); they are merged into the
 * alphabetical list so the file reads as one schema.
 */
const LEGACY_SQL = path.join(__dirname, "initial-sql-legacy.sql");

function legacyTables(): Map<string, string> {
  const found = new Map<string, string>();
  if (!fs.existsSync(LEGACY_SQL)) return found;
  const text = fs.readFileSync(LEGACY_SQL, "utf8").replace(/\r\n/g, "\n");
  // Each block runs from its CREATE TABLE to the `;` that closes it. Splitting
  // on `;` alone would cut inside a COMMENT or an ENUM member.
  for (const match of text.matchAll(/CREATE TABLE `([^`]+)`[\s\S]*?\n\) [^\n;]*;/g)) {
    found.set(match[1], match[0].replace(/;$/, ""));
  }
  return found;
}

const HEADER = `/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
`;

const FOOTER = `/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
`;

function block(table: string, ddl: string): string {
  return (
    `DROP TABLE IF EXISTS \`${table}\`;\n` +
    `/*!40101 SET @saved_cs_client     = @@character_set_client */;\n` +
    `/*!40101 SET character_set_client = utf8 */;\n` +
    `${ddl};\n` +
    `/*!40101 SET character_set_client = @saved_cs_client */;\n`
  );
}

/**
 * `SHOW CREATE TABLE` reports the CURRENT auto-increment counter, which is a
 * property of the rows a table happens to hold and not of its schema. Left in,
 * it would make the file differ between two runs for no reason and turn
 * `--check` into noise.
 */
function normalize(ddl: string): string {
  return ddl.replace(/ AUTO_INCREMENT=\d+/g, "").replace(/\r\n/g, "\n").trim();
}

function connectionOptions(database: string) {
  return {
    host: process.env.DB_HOST as string,
    dialect: "mysql" as const,
    port: Number(process.env.DB_PORT) || 3306,
    logging: false as const,
    dialectOptions: { charset: "utf8mb4" },
    // Must mirror src/db.ts. These defaults decide the CHARSET/COLLATE clause on
    // every table sync creates, so a difference here is a difference in the
    // shipped schema.
    define: { charset: "utf8mb4", collate: "utf8mb4_unicode_ci" },
  };
}

async function main() {
  for (const key of ["DB_HOST", "DB_USER", "DB_NAME"]) {
    if (!process.env[key]) {
      console.error(`Missing ${key}. This script reads the root .env for a server to build against.`);
      process.exit(1);
    }
  }
  if (SCRATCH === process.env.DB_NAME) {
    console.error(
      `Refusing to run: the scratch database (${SCRATCH}) is your DB_NAME. It gets DROPPED.`
    );
    process.exit(1);
  }

  // A connection with no database selected, used only to create and drop the
  // scratch schema.
  const admin = new Sequelize("", process.env.DB_USER as string, process.env.DB_PASSWORD || "", {
    ...connectionOptions(""),
  });

  console.log(`Building schema in scratch database \`${SCRATCH}\`…`);
  await admin.query(`DROP DATABASE IF EXISTS \`${SCRATCH}\``);
  await admin.query(
    `CREATE DATABASE \`${SCRATCH}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );

  const sequelize = new Sequelize(
    SCRATCH,
    process.env.DB_USER as string,
    process.env.DB_PASSWORD || "",
    connectionOptions(SCRATCH)
  );

  /*
   * Every exit from here on goes through this, including the failure ones. A
   * half-built scratch schema left on a developer's server is not harmful, but
   * it IS confusing — the next run drops and recreates it, so a leftover is
   * indistinguishable from a run still in progress.
   */
  const cleanup = async () => {
    try {
      await sequelize.close();
    } catch {
      // Already closed, or never opened. The drop below is what matters.
    }
    try {
      if (!KEEP) await admin.query(`DROP DATABASE IF EXISTS \`${SCRATCH}\``);
      await admin.close();
    } catch {
      console.warn(`Could not drop the scratch database \`${SCRATCH}\`. Drop it by hand.`);
    }
  };

  /*
   * An addon whose API tree is absent makes `initModels` drop that addon's
   * models with a `[MODELS] Skipping` warning — correct at runtime, fatal here.
   * Dumping from a machine missing an addon would silently ship a schema with
   * that addon's tables removed, which is the exact class of bug this file
   * exists to end. So: catch the warning, refuse to write.
   */
  const skipped: string[] = [];
  const warn = console.warn;
  console.warn = (...args: any[]) => {
    const first = String(args[0] ?? "");
    if (first.startsWith("[MODELS] Skipping")) skipped.push(first);
    warn(...args);
  };

  initModels(sequelize);
  console.warn = warn;

  if (skipped.length) {
    console.error(
      `\nRefusing to write ${path.basename(OUT)}: ${skipped.length} addon model group(s) were ` +
        `skipped, so this machine cannot produce a complete schema. Install the missing addon ` +
        `source trees and re-run.`
    );
    await cleanup();
    process.exit(1);
  }

  const ddl = new Map<string, string>();
  let fromModels = 0;
  try {
    // FK checks off for the duration: sync creates tables in model-registration
    // order, not dependency order, so a table can reference one that does not
    // exist yet. Identical to what mysqldump's own header does on import.
    await sequelize.query("SET FOREIGN_KEY_CHECKS = 0");
    await sequelize.sync();
    await sequelize.query("SET FOREIGN_KEY_CHECKS = 1");

    const rows: any[] = await sequelize.query("SHOW TABLES", { type: "SELECT" as any });
    const tables = rows.map((r) => Object.values(r)[0] as string);

    for (const table of tables) {
      const [row]: any[] = await sequelize.query(`SHOW CREATE TABLE \`${table}\``, {
        type: "SELECT" as any,
      });
      ddl.set(table, normalize(row["Create Table"]));
    }
    fromModels = ddl.size;
  } finally {
    await cleanup();
  }

  for (const [table, sql] of legacyTables()) {
    if (!ddl.has(table)) ddl.set(table, normalize(sql));
  }

  const body = [...ddl.keys()]
    .sort()
    .map((t) => block(t, ddl.get(t) as string))
    .join("");

  const contents = HEADER + body + FOOTER;

  const previous = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8").replace(/\r\n/g, "\n") : "";

  if (CHECK) {
    if (previous === contents) {
      console.log(`${path.basename(OUT)} matches the models (${ddl.size} tables).`);
      process.exit(0);
    }
    const had = new Set([...previous.matchAll(/CREATE TABLE `([^`]+)`/g)].map((m) => m[1]));
    const now = new Set(ddl.keys());
    const added = [...now].filter((t) => !had.has(t)).sort();
    const removed = [...had].filter((t) => !now.has(t)).sort();
    console.error(`\n${path.basename(OUT)} is out of date — the models no longer match it.`);
    if (added.length) console.error(`  missing from the file (${added.length}): ${added.join(", ")}`);
    if (removed.length) console.error(`  in the file with no model (${removed.length}): ${removed.join(", ")}`);
    if (!added.length && !removed.length)
      console.error("  same tables, changed columns/indexes.");
    console.error(`\nRun \`pnpm initial-sql\` and commit the result.\n`);
    process.exit(1);
  }

  fs.writeFileSync(OUT, contents, "utf8");
  console.log(
    `Wrote ${path.relative(ROOT, OUT)} — ${ddl.size} tables ` +
      `(${fromModels} from models, ${ddl.size - fromModels} legacy).`
  );
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
