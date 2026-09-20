/**
 * Add Wallet Address Lookup Key Script  (ECOSYS-10)
 *
 * Eliminates the O(N) full-table scan on the hot withdrawal path. The old
 * `findWalletByAddress()` loaded EVERY ECO wallet and linearly searched the
 * parsed JSON `address` column for a match. This script provisions the
 * `addressLookupKey` column + `walletAddressLookupKey` UNIQUE index (sync may
 * already have created them) and BACKFILLS the hash for existing ECO wallets so
 * the indexed `findOne({ addressLookupKey })` lookup actually finds legacy rows.
 *
 * The lookup key MUST match exactly what the model setter computes
 * (backend/models/finance/wallet.ts): SHA256(hex) of the FIRST address in the
 * parsed JSON object — i.e. Object.values(address)[0].address.
 *
 * Idempotent:
 *   - Column / index DDL is guarded by INFORMATION_SCHEMA existence checks, so a
 *     re-run that finds them present is a no-op.
 *   - Backfill only touches rows WHERE addressLookupKey IS NULL, so already
 *     populated rows are skipped on subsequent runs.
 *
 * DRY-RUN by default (reports what it WOULD change). Pass --apply to mutate.
 *   Report:  node scripts/add-wallet-address-lookup.mjs
 *   Apply:   node scripts/add-wallet-address-lookup.mjs --apply
 *
 * After --apply, restart the backend so cached wallet rows are refreshed.
 */

import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { createHash } from "crypto";
import { Sequelize, DataTypes, QueryTypes } from "sequelize";

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

const Wallet = sequelize.define(
  "wallet",
  {
    id: { type: DataTypes.UUID, primaryKey: true },
    type: DataTypes.STRING,
    address: DataTypes.JSON,
    addressLookupKey: DataTypes.STRING(64),
  },
  { tableName: TABLE, timestamps: false }
);

// Mirror of the model setter: hash the FIRST address in the parsed JSON object.
function deriveLookupKey(rawAddress) {
  if (!rawAddress) return null;
  let parsed = rawAddress;
  if (typeof rawAddress === "string") {
    try {
      parsed = JSON.parse(rawAddress);
    } catch {
      return null;
    }
  }
  if (!parsed || typeof parsed !== "object") return null;
  const first = Object.values(parsed)[0];
  if (!first || typeof first.address !== "string") return null;
  return createHash("sha256").update(first.address).digest("hex");
}

async function columnExists() {
  const rows = await sequelize.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = :schema AND TABLE_NAME = :table AND COLUMN_NAME = :column`,
    {
      replacements: { schema: DB_NAME, table: TABLE, column: COLUMN },
      type: QueryTypes.SELECT,
    }
  );
  return rows.length > 0;
}

async function indexExists() {
  const rows = await sequelize.query(
    `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = :schema AND TABLE_NAME = :table AND INDEX_NAME = :index`,
    {
      replacements: { schema: DB_NAME, table: TABLE, index: INDEX },
      type: QueryTypes.SELECT,
    }
  );
  return rows.length > 0;
}

async function main() {
  console.log("=".repeat(64));
  console.log(`Wallet addressLookupKey backfill  (${APPLY ? "APPLY" : "DRY-RUN"})`);
  console.log("=".repeat(64) + "\n");

  await sequelize.authenticate();

  // --- Step 1: column DDL (idempotent via INFORMATION_SCHEMA) -------------
  let hasColumn = await columnExists();
  if (hasColumn) {
    console.log(`[SKIP] column \`${COLUMN}\` already exists.`);
  } else {
    console.log(`[DDL]  column \`${COLUMN}\` is MISSING.`);
    if (APPLY) {
      await sequelize.query(
        `ALTER TABLE \`${TABLE}\` ADD COLUMN \`${COLUMN}\` VARCHAR(64) NULL`
      );
      console.log(`       [APPLIED] added column \`${COLUMN}\` VARCHAR(64) NULL`);
      hasColumn = true;
    } else {
      console.log(`       [WOULD ADD] ALTER TABLE \`${TABLE}\` ADD COLUMN \`${COLUMN}\` VARCHAR(64) NULL`);
    }
  }

  // --- Step 2: unique index DDL (idempotent) ------------------------------
  // Only meaningful if the column exists (or will after apply).
  if (hasColumn) {
    const hasIndex = await indexExists();
    if (hasIndex) {
      console.log(`[SKIP] index \`${INDEX}\` already exists.`);
    } else {
      console.log(`[DDL]  index \`${INDEX}\` is MISSING.`);
      if (APPLY) {
        // Plain, not UNIQUE (6.7.6): under the ecosystem's per_user address
        // model every currency wallet of one user shares one key by design.
        await sequelize.query(
          `ALTER TABLE \`${TABLE}\` ADD INDEX \`${INDEX}\` (\`${COLUMN}\`)`
        );
        console.log(`       [APPLIED] added index \`${INDEX}\` (${COLUMN})`);
      } else {
        console.log(`       [WOULD ADD] ALTER TABLE \`${TABLE}\` ADD INDEX \`${INDEX}\` (${COLUMN})`);
      }
    }
  } else {
    console.log(`[SKIP] index \`${INDEX}\` — defer until column exists (re-run with --apply).`);
  }

  // --- Step 3: backfill addressLookupKey for ECO wallets ------------------
  // Only when the column actually exists in the live schema. In a DRY-RUN
  // where the column does not yet exist, we cannot read/write it, so report
  // intent and stop.
  if (!hasColumn) {
    console.log(`\n[BACKFILL] skipped — column not present yet (DRY-RUN). Re-run with --apply.`);
    summary({ scanned: 0, toUpdate: 0, updated: 0, skippedNoAddr: 0, collisions: 0 });
    return;
  }

  // Pull ECO wallets that still need a key. Re-run safe: IS NULL guard.
  const wallets = await Wallet.findAll({
    where: { type: "ECO", addressLookupKey: null },
  });

  let scanned = 0;
  let toUpdate = 0;
  let updated = 0;
  let skippedNoAddr = 0;
  let collisions = 0;
  const seenKeys = new Map(); // key -> walletId (detect dupes within this batch)

  for (const w of wallets) {
    scanned++;
    if (w.address === null || w.address === undefined) {
      skippedNoAddr++;
      continue;
    }
    const key = deriveLookupKey(w.address);
    if (!key) {
      skippedNoAddr++;
      continue;
    }

    // Shared keys are expected (per_user address model) and the index is not
    // unique, so nothing is skipped; the count is reported for information.
    if (seenKeys.has(key)) collisions++;
    seenKeys.set(key, w.id);
    toUpdate++;

    if (APPLY) {
      try {
        await sequelize.query(
          `UPDATE \`${TABLE}\` SET \`${COLUMN}\` = :key WHERE id = :id AND \`${COLUMN}\` IS NULL`,
          { replacements: { key, id: w.id }, type: QueryTypes.UPDATE }
        );
        updated++;
      } catch (e) {
        collisions++;
        console.log(`[ERROR] wallet ${w.id}: ${e?.message || e} — skipped.`);
      }
    }
  }

  summary({ scanned, toUpdate, updated, skippedNoAddr, collisions });
}

function summary({ scanned, toUpdate, updated, skippedNoAddr, collisions }) {
  console.log("\n" + "=".repeat(64));
  console.log(`ECO wallets needing a key (scanned): ${scanned}`);
  console.log(`  with a derivable primary address:  ${toUpdate}`);
  console.log(`  no/invalid address (skipped):      ${skippedNoAddr}`);
  if (collisions) console.log(`  collisions/errors (skipped):       ${collisions}`);
  if (APPLY) {
    console.log(`Updated rows: ${updated}`);
  } else {
    console.log(`DRY-RUN — nothing written. Re-run with --apply to backfill.`);
  }
  console.log("=".repeat(64));
  if (APPLY && updated > 0) {
    console.log("\nIMPORTANT: restart the backend so cached wallet rows are refreshed.\n");
  }
}

main()
  .catch((e) => {
    console.error("addressLookupKey backfill failed:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await sequelize.close();
    } catch {}
  });
