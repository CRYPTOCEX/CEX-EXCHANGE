/**
 * Relax the wallet address lookup index  (custody rework, 6.7.6)
 *
 * `wallet.addressLookupKey` is a SHA-256 of the wallet's FIRST address and
 * backs the O(1) reverse lookup on the withdrawal path. It was created UNIQUE
 * by scripts/add-wallet-address-lookup.mjs (and by the model's index list).
 *
 * Under the ecosystem's `per_user` address model every currency wallet of one
 * user carries the SAME address on every EVM chain, so several rows share one
 * key by design. A UNIQUE index makes the second wallet's address write fail —
 * the user's USDT wallet is issued, their USDC wallet is not.
 *
 * The backend relaxes this index itself on its next schema sync (db.ts
 * `relaxUniqueIndexes`). This script is for installs that boot with
 * `DB_SYNC=none`, or that want to apply it ahead of the restart.
 *
 * Idempotent: reads INFORMATION_SCHEMA.STATISTICS and does nothing when the
 * index is already non-unique.
 *
 * DRY-RUN by default. Pass --apply to mutate.
 *   Report:  node scripts/relax-wallet-address-lookup.mjs
 *   Apply:   node scripts/relax-wallet-address-lookup.mjs --apply
 */

import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { Sequelize, QueryTypes } from "sequelize";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.join(__dirname, "../../.env") });

const APPLY = process.argv.includes("--apply");

const TABLE = "wallet";
const COLUMN = "addressLookupKey";
const INDEX = "walletAddressLookupKey";
const DB_NAME = process.env.DB_NAME || "platform";

const sequelize = new Sequelize(
  DB_NAME,
  process.env.DB_USER || "root",
  process.env.DB_PASSWORD || "",
  {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "3306"),
    dialect: "mysql",
    logging: false,
  }
);

async function indexState() {
  const rows = await sequelize.query(
    `SELECT INDEX_NAME, NON_UNIQUE, COLUMN_NAME
       FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = :db AND TABLE_NAME = :table AND INDEX_NAME = :index`,
    { replacements: { db: DB_NAME, table: TABLE, index: INDEX }, type: QueryTypes.SELECT }
  );
  if (!rows.length) return { present: false, unique: false };
  return { present: true, unique: rows.some((r) => Number(r.NON_UNIQUE) === 0) };
}

async function main() {
  await sequelize.authenticate();
  const state = await indexState();

  if (!state.present) {
    console.log(`[relax-wallet-address-lookup] ${TABLE}.${INDEX} is absent — nothing to relax.`);
    console.log(`  The backend creates it (non-unique) on its next schema sync. To create it now: --apply`);
    if (APPLY) {
      await sequelize.query(`ALTER TABLE \`${TABLE}\` ADD INDEX \`${INDEX}\` (\`${COLUMN}\`)`);
      console.log(`  Created ${INDEX} (non-unique).`);
    }
    return;
  }

  if (!state.unique) {
    console.log(`[relax-wallet-address-lookup] ${TABLE}.${INDEX} is already non-unique — nothing to do.`);
    return;
  }

  console.log(`[relax-wallet-address-lookup] ${TABLE}.${INDEX} is UNIQUE and must become a plain index.`);
  if (!APPLY) {
    console.log(`  Dry run. Re-run with --apply to execute:`);
    console.log(`    ALTER TABLE \`${TABLE}\` DROP INDEX \`${INDEX}\`, ADD INDEX \`${INDEX}\` (\`${COLUMN}\`)`);
    return;
  }

  await sequelize.query(
    `ALTER TABLE \`${TABLE}\` DROP INDEX \`${INDEX}\`, ADD INDEX \`${INDEX}\` (\`${COLUMN}\`)`
  );
  const after = await indexState();
  if (after.present && !after.unique) {
    console.log(`  Done: ${INDEX} is now a plain index.`);
  } else {
    console.error(`  ALTER ran but the index does not read back as non-unique — inspect INFORMATION_SCHEMA.STATISTICS.`);
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(`[relax-wallet-address-lookup] failed: ${error?.message || error}`);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
