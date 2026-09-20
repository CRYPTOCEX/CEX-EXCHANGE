/**
 * Ledger Archive Script (plans/done/ORDER-SCALE-10K.md WP-4.4)
 *
 * The manual face of the scheduled job in src/cron/ledger-archive.ts: copies
 * `transaction` rows older than the retention window into
 * `transaction_archive`, their `wallet_audit_log` rows into
 * `wallet_audit_log_archive`, and hard-deletes them from the live tables, in
 * batches, one transaction per batch. It runs the SAME job body against the
 * SAME model files (loaded through tsx), so what this tool does is exactly
 * what the cron does; only the database it is pointed at and the numbers on
 * the command line differ.
 *
 * What never moves, and why, is in the job's header: a transaction that is
 * not COMPLETED, CANCELLED or FAILED; a transaction some other table points
 * at with a foreign key (admin_profit, invoice, the gateway tables, discovered
 * from information_schema); an audit row whose transaction is still live.
 *
 * DRY-RUN by default (reports what would move). Pass --apply to move rows.
 *   Report:   node scripts/ledger-archive.mjs --db <name>
 *   Apply:    node scripts/ledger-archive.mjs --db <name> --apply
 *   Options:  --after-days N   rows older than N days (default ECO_LEDGER_ARCHIVE_AFTER_DAYS, then 400)
 *             --batch N        transactions per batch (default ECO_LEDGER_ARCHIVE_BATCH, then 1000)
 *             --max N          rows per table this run, 0 for unbounded (default: unbounded here; the cron caps at ECO_LEDGER_ARCHIVE_MAX_PER_RUN)
 *             --ensure-tables  create the two archive tables from the models when absent (what DB_SYNC does on boot)
 *             --json <file>    also write the report as JSON
 *
 * --db defaults to DB_NAME in the repo .env and the name is printed before
 * anything runs; on a dry run nothing is written to any table.
 *
 * Idempotent: a run interrupted anywhere leaves a state the next run
 * completes (the copy is primary-key idempotent and the delete names only
 * rows the archive holds). After --apply on a database the conservation
 * runner (scripts/ledger-conservation.mjs) judges live and archive as one
 * ledger.
 */

import { config } from "dotenv";
import path from "path";
import { pathToFileURL, fileURLToPath } from "url";
import { writeFileSync } from "fs";
import { createRequire } from "module";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.join(__dirname, "../../.env"), quiet: true });

const require = createRequire(import.meta.url);
const { Sequelize } = require("sequelize");

function parseArgs(argv) {
  const args = {
    db: null,
    apply: false,
    afterDays: null,
    batch: null,
    max: 0,
    ensureTables: false,
    json: null,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      const v = argv[++i];
      if (v === undefined) usage(`${a} needs a value`);
      return v;
    };
    if (a === "--db") args.db = next();
    else if (a === "--apply") args.apply = true;
    else if (a === "--dry-run") args.apply = false;
    else if (a === "--after-days") args.afterDays = Number(next());
    else if (a === "--batch") args.batch = Number(next());
    else if (a === "--max") args.max = Number(next());
    else if (a === "--ensure-tables") args.ensureTables = true;
    else if (a === "--json") args.json = next();
    else if (a === "--help" || a === "-h") args.help = true;
    else usage(`unknown argument ${a}`);
  }
  return args;
}

function usage(message) {
  if (message) console.error(`error: ${message}\n`);
  console.error(
    [
      "usage: node scripts/ledger-archive.mjs [--db <name>] [--apply | --dry-run] [--after-days N] [--batch N] [--max N]",
      "         [--ensure-tables] [--json <file>]",
      "  --db             database to archive (default DB_NAME from .env). Printed before anything runs.",
      "  --apply          move rows. Without it this is a DRY RUN that writes nothing.",
      "  --after-days N   rows older than N days move (default ECO_LEDGER_ARCHIVE_AFTER_DAYS, then 400).",
      "  --batch N        transactions per batch and per MySQL transaction (default ECO_LEDGER_ARCHIVE_BATCH, then 1000).",
      "  --max N          rows per table this run; 0 for unbounded (default 0).",
      "  --ensure-tables  create transaction_archive and wallet_audit_log_archive from the models when absent.",
      "  --json <file>    write the report as JSON as well.",
    ].join("\n")
  );
  process.exit(message ? 2 : 0);
}

async function loadJob() {
  // The job and the models are TypeScript with tsconfig path aliases; tsx
  // (backend devDependency) resolves both without a build step.
  const tsconfig = path.join(__dirname, "../tsconfig.json");
  const esm = await import("tsx/esm/api");
  const cjs = await import("tsx/cjs/api");
  // Both hooks: the job is imported as ESM here, but tsconfig says CommonJS,
  // so everything it requires goes through Node's CJS loader.
  const unregisterEsm = esm.register({ tsconfig });
  const unregisterCjs = cjs.register({ tsconfig });
  const unregister = () => {
    unregisterCjs();
    unregisterEsm();
  };
  // The `@b` / `@db` aliases the way module-alias-setup.ts gives them to every
  // TS script in package.json (`tsx -r ./module-alias-setup.ts`): tsx's own
  // path mapping does not cover a CommonJS require of an alias, which is what
  // the compiled job emits, and that setup file cannot be required from an
  // ES module, so the two aliases are registered here with the same roots.
  require("module-alias").addAliases({
    "@b": path.join(__dirname, "../src"),
    "@db": path.join(__dirname, "../models"),
  });
  const load = async (relative) => import(pathToFileURL(path.join(__dirname, relative)).href);
  // A CommonJS-compiled module reached through import(): its exports sit on
  // `default`, and a TS `export default` sits one level below that.
  const namespace = (mod) => (mod.default && typeof mod.default === "object" && !mod.default.initModel ? mod.default : mod);
  const model = (mod) => (typeof mod.default?.initModel === "function" ? mod.default : mod.default?.default);
  const job = namespace(await load("../src/cron/ledger-archive.ts"));
  const transaction = model(await load("../models/finance/transaction.ts"));
  const transactionArchive = model(await load("../models/finance/transactionArchive.ts"));
  const walletAuditLog = model(await load("../models/finance/walletAuditLog.ts"));
  const walletAuditLogArchive = model(await load("../models/finance/walletAuditLogArchive.ts"));
  for (const [name, cls] of Object.entries({ transaction, transactionArchive, walletAuditLog, walletAuditLogArchive })) {
    if (typeof cls?.initModel !== "function") throw new Error(`models/finance/${name}.ts did not load as a model class`);
  }
  if (typeof job.runLedgerArchive !== "function") throw new Error("src/cron/ledger-archive.ts did not load");
  return { job, models: { transaction, transactionArchive, walletAuditLog, walletAuditLogArchive }, unregister };
}

/**
 * `CREATE TABLE ... LIKE` the live table, then keep only PRIMARY and the
 * createdAt index the model declares. LIKE copies every column definition
 * byte for byte, collation and CHECK constraint included, and copies no
 * foreign key, so this is the exact mirror of THIS install's live table. The
 * model-driven path (DB_SYNC on boot) creates the same columns from
 * models/finance/*Archive.ts with the schema's default collation, which on an
 * install whose `transaction` table predates utf8mb4_unicode_ci differs in
 * collation alone; the bytes a row carries are the same either way.
 */
async function ensureArchiveTable(sequelize, liveTable, archiveTable, archiveModel) {
  const q = (s) => `\`${s}\``;
  await sequelize.query(`CREATE TABLE IF NOT EXISTS ${q(archiveTable)} LIKE ${q(liveTable)}`);
  const keep = new Set(["PRIMARY"]);
  const wanted = (archiveModel.options.indexes || []).filter((i) => i.name !== "PRIMARY");
  for (const i of wanted) keep.add(i.name);
  const [indexes] = await sequelize.query(`SHOW INDEX FROM ${q(archiveTable)}`);
  const present = [...new Set(indexes.map((r) => r.Key_name))];
  for (const name of present) {
    if (!keep.has(name)) await sequelize.query(`ALTER TABLE ${q(archiveTable)} DROP INDEX ${q(name)}`);
  }
  for (const i of wanted) {
    if (present.includes(i.name)) continue;
    const cols = i.fields.map((f) => q(typeof f === "string" ? f : f.name)).join(", ");
    await sequelize.query(`ALTER TABLE ${q(archiveTable)} ADD INDEX ${q(i.name)} (${cols})`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) usage();
  const db = args.db || process.env.DB_NAME;
  if (!db) usage("no --db and no DB_NAME in .env");

  const { job, models: modelClasses, unregister } = await loadJob();
  const config = job.readLedgerArchiveConfig(process.env);
  const afterDays = args.afterDays ?? config.afterDays;
  const batch = args.batch ?? config.batch;
  const maxPerRun = args.max > 0 ? Math.floor(args.max) : Number.POSITIVE_INFINITY;
  if (!Number.isInteger(afterDays) || afterDays < 1) usage(`--after-days must be a positive integer, got ${afterDays}`);
  if (!Number.isInteger(batch) || batch < 1) usage(`--batch must be a positive integer, got ${batch}`);
  const cutoff = job.cutoffFor(afterDays, new Date());

  console.log("=".repeat(64));
  console.log(`Ledger Archive  (${args.apply ? "APPLY" : "DRY-RUN"})`);
  console.log(`database:   ${db}`);
  console.log(`cutoff:     rows created before ${cutoff.toISOString()} (${afterDays} days)`);
  console.log(`batch:      ${batch} transactions per MySQL transaction`);
  console.log(`max/table:  ${Number.isFinite(maxPerRun) ? maxPerRun : "unbounded"}`);
  console.log("=".repeat(64) + "\n");

  const sequelize = new Sequelize(db, process.env.DB_USER || "root", process.env.DB_PASSWORD || "", {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "3306", 10),
    dialect: "mysql",
    logging: false,
    define: { charset: "utf8mb4", collate: "utf8mb4_unicode_ci" },
  });
  const models = {};
  for (const [name, cls] of Object.entries(modelClasses)) models[name] = cls.initModel(sequelize);

  try {
    await sequelize.authenticate();
    const queryInterface = sequelize.getQueryInterface();
    const pairs = [
      ["transactionArchive", "transaction"],
      ["walletAuditLogArchive", "walletAuditLog"],
    ];
    for (const [archiveName, liveName] of pairs) {
      const table = models[archiveName].getTableName();
      const exists = await queryInterface.tableExists(table);
      if (exists) continue;
      if (!args.ensureTables) {
        console.error(`error: table ${table} does not exist in ${db}. Pass --ensure-tables (or boot the backend once with model sync on).`);
        process.exit(2);
      }
      await ensureArchiveTable(sequelize, models[liveName].getTableName(), table, models[archiveName]);
      console.log(`created ${table} as a mirror of ${models[liveName].getTableName()} (PRIMARY plus createdAt index)`);
    }

    const referrers = await job.discoverTransactionReferrers({ models, sequelize }, models.transaction.getTableName());
    console.log(
      `foreign keys onto transaction (rows they reference never move): ${
        referrers.map((r) => `${r.table}.${r.column}`).join(", ") || "none"
      }\n`
    );

    const report = await job.runLedgerArchive(
      { models, sequelize },
      {
        cutoff,
        batch,
        maxPerRun,
        dryRun: !args.apply,
        referrers,
        onBatch: (p) => console.log(`  ${p.table}: ${p.archived} archived, ${p.skipped} skipped after ${p.batches} batch(es)`),
      }
    );

    console.log("\n" + job.describeReport(report));
    const t = report.transaction;
    const a = report.walletAuditLog;
    console.log(
      `\n${args.apply ? "moved" : "would move"}: ${t.archived} transaction row(s) (${t.skipped} declined: ` +
        `non-terminal status or referenced) and ${a.archived} audit row(s) ` +
        `(${a.withTransaction} with their transaction, ${a.withoutTransaction} without one, ${a.orphaned} orphaned)`
    );
    if (!t.exhausted || !a.exhausted) console.log("more rows remain: run again (or raise --max).");
    if (args.json) {
      writeFileSync(args.json, JSON.stringify({ ...report, db, afterDays, apply: args.apply }, null, 2));
      console.log(`report written to ${args.json}`);
    }
  } finally {
    await sequelize.close();
    unregister();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Ledger archive failed:", error);
    process.exit(1);
  });
