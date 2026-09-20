/**
 * Unify the two wallet-address stores  (DEX Phase 0, B14 step 3)
 *
 * The platform kept a self-custody address in two unlinked places:
 *   - `provider_user` rows with provider = 'WALLET', written by the SIWE
 *     connect/login flow and therefore PROVEN by a signature; and
 *   - `user.walletAddress`, which nothing ever wrote and which ~11 NFT handlers
 *     read as a PAYOUT TARGET.
 *
 * As of this release `provider_user` is the write-side truth and
 * `user.walletAddress` is a denormalised mirror of the one primary WALLET link,
 * maintained by the model hooks in backend/models/access/providerUser.ts and
 * defended by the guard in backend/models/user.ts. This script makes an existing
 * database match that contract.
 *
 * Steps:
 *   0. Defensive DDL for isPrimary / chainId / verifiedAt and the composite
 *      unique index. Auto-sync normally creates these at boot; every statement
 *      is guarded by an INFORMATION_SCHEMA check so a re-run is a no-op.
 *   1. Lowercase every 0x-address in provider_user, matching the lowercasing
 *      set() the model now applies on write. Without this, reads that lowercase
 *      their needle depend on the table collation being case-insensitive.
 *   2. Mark the OLDEST WALLET link per user as isPrimary = 1 (TRUE or NULL,
 *      never FALSE — see the column comment).
 *   3. Mirror that address onto the user row.
 *   4. QUARANTINE. Any user.walletAddress with no provider_user WALLET row was
 *      never proven by a signature, and it is a payout target in
 *      nft/auction/[id]/settle/index.post.ts and
 *      nft/listing/[id]/buy/index.post.ts. Snapshot into
 *      dex_migration_quarantine, then null it.
 *
 * Idempotent: the DDL is existence-guarded, step 1 only touches rows that are
 * not already lowercase, step 2 only sets rows whose isPrimary IS NULL, step 3
 * only writes rows that differ, and step 4 has nothing left to find on a re-run.
 * There is no `down` — the quarantine table IS the undo record.
 *
 * DRY-RUN by default (reports what it WOULD change). Pass --apply to mutate.
 *   Report:  node scripts/unify-wallet-address-stores.mjs
 *   Apply:   node scripts/unify-wallet-address-stores.mjs --apply
 *
 * The dry-run report is a REQUIRED, REVIEWED ARTEFACT: paste it into
 * backend/tests/dex/RED-RUNS.md with the date and the observed row count before
 * running --apply on any populated database. There is no CI, so the artefact is
 * the review gate.
 *
 * After --apply, restart the backend so cached user rows are refreshed. The
 * behaviour change to watch for: every NFT handler that today takes its
 * `if (!walletAddress) throw` branch starts succeeding.
 */

import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { Sequelize, QueryTypes } from "sequelize";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.join(__dirname, "../../.env") });

const APPLY = process.argv.includes("--apply");

const PROVIDER_TABLE = "provider_user";
const USER_TABLE = "user";
const QUARANTINE_TABLE = "dex_migration_quarantine";
const PRIMARY_INDEX = "providerUserPrimaryPerProvider";

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

async function columnExists(table, column) {
  const rows = await sequelize.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = :schema AND TABLE_NAME = :table AND COLUMN_NAME = :column`,
    {
      replacements: { schema: DB_NAME, table, column },
      type: QueryTypes.SELECT,
    }
  );
  return rows.length > 0;
}

async function indexExists(table, index) {
  const rows = await sequelize.query(
    `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = :schema AND TABLE_NAME = :table AND INDEX_NAME = :index`,
    {
      replacements: { schema: DB_NAME, table, index },
      type: QueryTypes.SELECT,
    }
  );
  return rows.length > 0;
}

async function tableExists(table) {
  const rows = await sequelize.query(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = :schema AND TABLE_NAME = :table`,
    { replacements: { schema: DB_NAME, table }, type: QueryTypes.SELECT }
  );
  return rows.length > 0;
}

/** Runs DDL under --apply, prints the intent otherwise. */
async function ddl(label, sql) {
  if (APPLY) {
    await sequelize.query(sql);
    console.log(`       [APPLIED] ${label}`);
  } else {
    console.log(`       [WOULD RUN] ${sql}`);
  }
}

// --- Step 0 -------------------------------------------------------------
async function ensureSchema() {
  console.log("--- Step 0: schema ---");

  const columns = [
    ["isPrimary", "TINYINT(1) NULL DEFAULT NULL"],
    ["chainId", "INT NULL"],
    ["verifiedAt", "DATETIME NULL"],
  ];

  let allPresent = true;
  for (const [name, type] of columns) {
    if (await columnExists(PROVIDER_TABLE, name)) {
      console.log(`[SKIP] column \`${PROVIDER_TABLE}\`.\`${name}\` already exists.`);
      continue;
    }
    console.log(`[DDL]  column \`${PROVIDER_TABLE}\`.\`${name}\` is MISSING.`);
    await ddl(
      `added \`${name}\` ${type}`,
      `ALTER TABLE \`${PROVIDER_TABLE}\` ADD COLUMN \`${name}\` ${type}`
    );
    if (!APPLY) allPresent = false;
  }

  // The composite unique index is what enforces "at most one primary WALLET
  // link per user" in the DATABASE. It only holds because isPrimary is TRUE or
  // NULL and MySQL permits unlimited NULLs in a unique index; a FALSE would
  // make every non-primary row collide.
  if (!allPresent) {
    console.log(
      `[SKIP] index \`${PRIMARY_INDEX}\` — its columns do not exist yet (DRY-RUN). Re-run with --apply.`
    );
  } else if (await indexExists(PROVIDER_TABLE, PRIMARY_INDEX)) {
    console.log(`[SKIP] index \`${PRIMARY_INDEX}\` already exists.`);
  } else {
    console.log(`[DDL]  index \`${PRIMARY_INDEX}\` is MISSING.`);
    await ddl(
      `added UNIQUE index \`${PRIMARY_INDEX}\``,
      `CREATE UNIQUE INDEX \`${PRIMARY_INDEX}\` ON \`${PROVIDER_TABLE}\` (\`userId\`, \`provider\`, \`isPrimary\`)`
    );
  }

  if (await tableExists(QUARANTINE_TABLE)) {
    console.log(`[SKIP] table \`${QUARANTINE_TABLE}\` already exists.`);
  } else {
    console.log(`[DDL]  table \`${QUARANTINE_TABLE}\` is MISSING.`);
    await ddl(
      `created \`${QUARANTINE_TABLE}\``,
      `CREATE TABLE IF NOT EXISTS \`${QUARANTINE_TABLE}\` (
         id             CHAR(36)     NOT NULL PRIMARY KEY,
         userId         CHAR(36)     NOT NULL,
         walletAddress  VARCHAR(255) NULL,
         walletProvider VARCHAR(255) NULL,
         reason         VARCHAR(191) NOT NULL,
         createdAt      DATETIME     NOT NULL
       )`
    );
  }

  return allPresent;
}

// --- Step 1 -------------------------------------------------------------
async function lowercaseAddresses() {
  console.log("\n--- Step 1: normalise provider_user addresses to lowercase ---");

  // BINARY forces a case-SENSITIVE comparison regardless of the column's
  // collation — under the default utf8mb4_general_ci, `x <> LOWER(x)` is always
  // false and this would find nothing.
  const rows = await sequelize.query(
    `SELECT id, userId, providerUserId FROM \`${PROVIDER_TABLE}\`
       WHERE provider = 'WALLET'
         AND providerUserId REGEXP '^0x[0-9a-fA-F]{40}$'
         AND BINARY providerUserId <> BINARY LOWER(providerUserId)`,
    { type: QueryTypes.SELECT }
  );

  if (!rows.length) {
    console.log("[SKIP] every WALLET address is already lowercase.");
    return 0;
  }

  for (const r of rows) {
    console.log(
      `  ${r.providerUserId} -> ${r.providerUserId.toLowerCase()}  (user ${r.userId})`
    );
  }

  if (!APPLY) {
    console.log(`[WOULD UPDATE] ${rows.length} row(s).`);
    return rows.length;
  }

  // Deliberately NOT ignoring deletedAt: a soft-deleted row still occupies the
  // providerUserId UNIQUE index, so leaving it mixed-case would leave a
  // case-only duplicate of a live row behind on a binary collation.
  const [, meta] = await sequelize.query(
    `UPDATE \`${PROVIDER_TABLE}\`
        SET providerUserId = LOWER(providerUserId)
      WHERE provider = 'WALLET'
        AND providerUserId REGEXP '^0x[0-9a-fA-F]{40}$'
        AND BINARY providerUserId <> BINARY LOWER(providerUserId)`,
    { type: QueryTypes.UPDATE }
  );
  console.log(`[APPLIED] lowercased ${meta ?? rows.length} row(s).`);
  return rows.length;
}

// --- Step 2 -------------------------------------------------------------
async function markPrimaryLinks() {
  console.log("\n--- Step 2: mark the oldest WALLET link per user as primary ---");

  // Users who have at least one live WALLET link but no primary one yet.
  const candidates = await sequelize.query(
    `SELECT pu.id, pu.userId, pu.providerUserId, pu.createdAt
       FROM \`${PROVIDER_TABLE}\` pu
       JOIN (
         SELECT userId, MIN(createdAt) AS firstAt
           FROM \`${PROVIDER_TABLE}\`
          WHERE provider = 'WALLET' AND deletedAt IS NULL
          GROUP BY userId
       ) f ON f.userId = pu.userId AND f.firstAt = pu.createdAt
      WHERE pu.provider = 'WALLET'
        AND pu.deletedAt IS NULL
        AND pu.isPrimary IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM \`${PROVIDER_TABLE}\` p2
           WHERE p2.userId = pu.userId AND p2.provider = 'WALLET'
             AND p2.deletedAt IS NULL AND p2.isPrimary = 1
        )`,
    { type: QueryTypes.SELECT }
  );

  if (!candidates.length) {
    console.log("[SKIP] every user with a WALLET link already has a primary one.");
    return 0;
  }

  // MIN(createdAt) can tie when several links were created in the same second.
  // The composite unique index would reject the second row, so promote exactly
  // one per user and report the rest.
  const seen = new Set();
  const promote = [];
  let ties = 0;
  for (const c of candidates) {
    if (seen.has(c.userId)) {
      ties++;
      console.log(
        `[TIE]  user ${c.userId}: ${c.providerUserId} shares createdAt with the chosen link — left non-primary.`
      );
      continue;
    }
    seen.add(c.userId);
    promote.push(c);
    console.log(`  user ${c.userId} -> primary ${c.providerUserId}`);
  }

  if (!APPLY) {
    console.log(`[WOULD UPDATE] ${promote.length} row(s)${ties ? `, ${ties} tie(s) skipped` : ""}.`);
    return promote.length;
  }

  let updated = 0;
  for (const p of promote) {
    await sequelize.query(
      `UPDATE \`${PROVIDER_TABLE}\` SET isPrimary = 1 WHERE id = :id AND isPrimary IS NULL`,
      { replacements: { id: p.id }, type: QueryTypes.UPDATE }
    );
    updated++;
  }
  console.log(`[APPLIED] promoted ${updated} link(s)${ties ? `, ${ties} tie(s) skipped` : ""}.`);
  return updated;
}

// --- Step 3 -------------------------------------------------------------
async function mirrorOntoUser() {
  console.log("\n--- Step 3: mirror the primary link onto user.walletAddress ---");

  const rows = await sequelize.query(
    `SELECT u.id AS userId, u.walletAddress AS current, pu.providerUserId AS next
       FROM \`${USER_TABLE}\` u
       JOIN \`${PROVIDER_TABLE}\` pu
         ON pu.userId = u.id AND pu.provider = 'WALLET'
        AND pu.isPrimary = 1 AND pu.deletedAt IS NULL
      WHERE u.walletAddress IS NULL
         OR BINARY u.walletAddress <> BINARY pu.providerUserId`,
    { type: QueryTypes.SELECT }
  );

  if (!rows.length) {
    console.log("[SKIP] every mirror is already in sync.");
    return 0;
  }

  for (const r of rows) {
    console.log(`  user ${r.userId}: ${r.current ?? "NULL"} -> ${r.next}`);
  }

  if (!APPLY) {
    console.log(`[WOULD UPDATE] ${rows.length} user row(s).`);
    return rows.length;
  }

  await sequelize.query(
    `UPDATE \`${USER_TABLE}\` u
       JOIN \`${PROVIDER_TABLE}\` pu
         ON pu.userId = u.id AND pu.provider = 'WALLET'
        AND pu.isPrimary = 1 AND pu.deletedAt IS NULL
        SET u.walletAddress  = pu.providerUserId,
            u.walletProvider = COALESCE(u.walletProvider, 'WALLETCONNECT')
      WHERE u.walletAddress IS NULL
         OR BINARY u.walletAddress <> BINARY pu.providerUserId`,
    { type: QueryTypes.UPDATE }
  );
  console.log(`[APPLIED] mirrored ${rows.length} user row(s).`);
  return rows.length;
}

// --- Step 4 -------------------------------------------------------------
async function quarantineUnproven() {
  console.log("\n--- Step 4: quarantine unproven user.walletAddress values ---");

  const orphans = await sequelize.query(
    `SELECT u.id AS userId, u.email, u.walletAddress, u.walletProvider
       FROM \`${USER_TABLE}\` u
       LEFT JOIN \`${PROVIDER_TABLE}\` pu
         ON pu.userId = u.id AND pu.provider = 'WALLET' AND pu.deletedAt IS NULL
      WHERE u.walletAddress IS NOT NULL AND pu.id IS NULL`,
    { type: QueryTypes.SELECT }
  );

  if (!orphans.length) {
    console.log("[SKIP] no unproven addresses — nothing to quarantine.");
    return 0;
  }

  console.log(
    `!! ${orphans.length} user row(s) carry an address that NO signature ever proved.`
  );
  console.log("!! Each is a payout target in the NFT settle/buy handlers.\n");
  for (const o of orphans) {
    console.log(
      `  user ${o.userId} <${o.email ?? "no email"}>  ${o.walletAddress}  (${o.walletProvider ?? "no provider"})`
    );
  }

  if (!APPLY) {
    console.log(
      `\n[WOULD SNAPSHOT+NULL] ${orphans.length} row(s). Review this list before --apply.`
    );
    return orphans.length;
  }

  await sequelize.query(
    `INSERT INTO \`${QUARANTINE_TABLE}\` (id, userId, walletAddress, walletProvider, reason, createdAt)
     SELECT UUID(), u.id, u.walletAddress, u.walletProvider,
            'no providerUser WALLET row - address was never proven by a signature', NOW()
       FROM \`${USER_TABLE}\` u
       LEFT JOIN \`${PROVIDER_TABLE}\` pu
         ON pu.userId = u.id AND pu.provider = 'WALLET' AND pu.deletedAt IS NULL
      WHERE u.walletAddress IS NOT NULL AND pu.id IS NULL`,
    { type: QueryTypes.INSERT }
  );

  await sequelize.query(
    `UPDATE \`${USER_TABLE}\` u
       LEFT JOIN \`${PROVIDER_TABLE}\` pu
         ON pu.userId = u.id AND pu.provider = 'WALLET' AND pu.deletedAt IS NULL
        SET u.walletAddress = NULL, u.walletProvider = NULL
      WHERE u.walletAddress IS NOT NULL AND pu.id IS NULL`,
    { type: QueryTypes.UPDATE }
  );
  console.log(
    `\n[APPLIED] snapshotted and nulled ${orphans.length} row(s) into \`${QUARANTINE_TABLE}\`.`
  );
  return orphans.length;
}

async function main() {
  console.log("=".repeat(72));
  console.log(
    `Unify wallet address stores  (${APPLY ? "APPLY" : "DRY-RUN"})   ${new Date().toISOString()}`
  );
  console.log("=".repeat(72) + "\n");

  await sequelize.authenticate();

  const schemaReady = await ensureSchema();

  // Steps 1-4 read and write the new columns. In a DRY-RUN against a database
  // that has not booted the new models yet, those columns do not exist and every
  // query below would be a hard SQL error rather than a report.
  if (!schemaReady) {
    console.log(
      "\n[STOP] the new provider_user columns are not present yet. Boot the backend " +
        "once (auto-sync creates them) or re-run this script with --apply, then run " +
        "the dry-run again for a real report."
    );
    return;
  }

  const lowercased = await lowercaseAddresses();
  const promoted = await markPrimaryLinks();
  const mirrored = await mirrorOntoUser();
  const quarantined = await quarantineUnproven();

  console.log("\n" + "=".repeat(72));
  console.log(`addresses lowercased:        ${lowercased}`);
  console.log(`primary links promoted:      ${promoted}`);
  console.log(`user mirrors written:        ${mirrored}`);
  console.log(`unproven addresses removed:  ${quarantined}`);
  if (APPLY) {
    console.log("\nRestart the backend so cached user rows are refreshed.");
    if (quarantined > 0) {
      console.log(
        `The removed values are recoverable from \`${QUARANTINE_TABLE}\`; affected users must ` +
          "re-link through the SIWE connect flow."
      );
    }
  } else {
    console.log(
      "\nDRY-RUN — nothing written. Commit this report to backend/tests/dex/RED-RUNS.md, " +
        "then re-run with --apply."
    );
    if (promoted > 0) {
      // Each step reports against the CURRENT database, not against the state
      // the step before it would have produced. Until step 2 actually runs there
      // is no isPrimary row for step 3 to join to, so a dry-run under-reports
      // the mirror count. Say so rather than let a reviewer read "0" as "none
      // needed".
      console.log(
        `NOTE: steps 3-4 are measured against the database AS IT IS NOW. With ${promoted} ` +
          "primary link(s) still unpromoted, the real mirror count will be higher."
      );
    }
  }
  console.log("=".repeat(72));
}

main()
  .catch((e) => {
    console.error("unify-wallet-address-stores failed:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await sequelize.close();
    } catch {}
  });
