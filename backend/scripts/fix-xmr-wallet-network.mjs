/**
 * Fix XMR Wallet Network Label Script
 *
 * The per-chain `network` value inside the wallet.address JSON is stamped ONCE
 * at wallet creation from XMR_NETWORK env. Wallets created while the env said
 * "mainnet" (or before it was set) keep that label forever, even though
 * monero-wallet-rpc actually minted a stagenet/testnet address — so the UI
 * (/finance/wallet modal, deposit page "send only on the X network" text)
 * shows the wrong network. The address prefix is ground truth:
 *   mainnet 4/8, stagenet 5/7, testnet 9/A/B.
 *
 * This script rewrites the stored XMR network label to match the address
 * prefix. It is purely cosmetic-data repair: no backend logic reads the
 * stored label (withdrawal validation & monitors use env), and no address
 * strings change, so addressLookupKey stays valid.
 *
 * Encoding note: wallet.address rows are stored DOUBLE-stringified (model
 * setter stringifies + DataTypes.JSON stringifies again). This script decodes
 * by parsing until it reaches an object, then re-encodes to the SAME depth,
 * so each row keeps exactly the encoding it had.
 *
 * DRY-RUN by default (reports what it WOULD change). Pass --apply to mutate.
 *   Report:  node scripts/fix-xmr-wallet-network.mjs
 *   Apply:   node scripts/fix-xmr-wallet-network.mjs --apply
 *
 * After --apply, restart the backend so cached wallet rows are refreshed.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------------------------
// Portable dependency + .env resolution.
//
// On a production box the directory layout rarely matches the repo (this file
// often ends up at e.g. /home/<acct>/public_html/scripts/). A bare
// `import ... from "sequelize"` then dies with ERR_MODULE_NOT_FOUND because
// Node only walks up from THIS file's location and finds no
// node_modules/sequelize; the old hard-coded `../../.env` misses too.
//
// So we resolve everything at runtime: search for node_modules/<pkg> and .env
// upward from both the script dir and the cwd (plus a `backend/` sibling at
// each level, for deployments that keep the backend in a subfolder). Only Node
// built-ins are imported statically, so the script can never fail to load.
// ---------------------------------------------------------------------------
function* candidateRoots() {
  const seen = new Set();
  for (const start of [__dirname, process.cwd()]) {
    let dir = start;
    while (dir && !seen.has(dir)) {
      seen.add(dir);
      yield dir;
      yield path.join(dir, "backend");
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
}

function requireFrom(pkgName) {
  // Fast path: resolvable from this file's own module tree.
  try {
    return createRequire(import.meta.url)(pkgName);
  } catch {}
  // Fallback: find a node_modules/<pkg> up-tree and require it from there.
  for (const root of candidateRoots()) {
    const pkgJson = path.join(root, "node_modules", pkgName, "package.json");
    if (fs.existsSync(pkgJson)) {
      return createRequire(pkgJson)(pkgName);
    }
  }
  return null;
}

const sequelizePkg = requireFrom("sequelize");
if (!sequelizePkg) {
  console.error(
    "\nERROR: could not locate the 'sequelize' package.\n" +
      "Run this script from a directory that has node_modules/sequelize (the\n" +
      "backend root), or copy it there first, e.g.:\n" +
      "    cd /path/to/backend && node scripts/fix-xmr-wallet-network.mjs\n"
  );
  process.exit(1);
}
const { Sequelize, QueryTypes } = sequelizePkg;

// dotenv is optional — without it we fall back to the ambient process env.
const dotenv = requireFrom("dotenv");
if (dotenv) {
  let envPath = null;
  for (const root of candidateRoots()) {
    const candidate = path.join(root, ".env");
    if (fs.existsSync(candidate)) {
      envPath = candidate;
      break;
    }
  }
  dotenv.config(envPath ? { path: envPath } : undefined);
  if (envPath) console.log(`Loaded env from ${envPath}`);
}

const APPLY = process.argv.includes("--apply");

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

// Mirror of backend/src/utils/xmr.ts xmrNetworkFromAddress().
function xmrNetworkFromAddress(address) {
  if (!address || typeof address !== "string") return null;
  const prefix = address[0];
  if (prefix === "4" || prefix === "8") return "mainnet";
  if (prefix === "5" || prefix === "7") return "stagenet";
  if (prefix === "9" || prefix === "A" || prefix === "B") return "testnet";
  return null;
}

// Parse the raw column text until we reach an object, remembering how many
// parses it took so we can re-encode identically (rows are usually depth 2).
function decodeAddress(raw) {
  if (raw === null || raw === undefined) return null;
  let value = raw;
  let depth = 0;
  while (typeof value === "string" && depth < 3) {
    try {
      value = JSON.parse(value);
      depth++;
    } catch {
      return null;
    }
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return { obj: value, depth };
}

function encodeAddress(obj, depth) {
  let out = obj;
  for (let i = 0; i < depth; i++) out = JSON.stringify(out);
  return out;
}

async function main() {
  console.log("=".repeat(64));
  console.log(`XMR wallet network-label fix  (${APPLY ? "APPLY" : "DRY-RUN"})`);
  console.log("=".repeat(64) + "\n");

  await sequelize.authenticate();

  // Coarse SQL filter ('XMR' appears literally even in the escaped encoding);
  // precise checks happen in JS after decoding.
  const rows = await sequelize.query(
    `SELECT id, currency, address FROM \`wallet\`
      WHERE type = 'ECO' AND address IS NOT NULL AND address LIKE '%XMR%'`,
    { type: QueryTypes.SELECT }
  );

  let scanned = 0;
  let unparseable = 0;
  let noXmrEntry = 0;
  let unknownPrefix = 0;
  let alreadyCorrect = 0;
  let toFix = 0;
  let updated = 0;

  for (const row of rows) {
    scanned++;
    const decoded = decodeAddress(row.address);
    if (!decoded) {
      unparseable++;
      console.log(`[SKIP] wallet ${row.id} (${row.currency}): address JSON unparseable.`);
      continue;
    }
    const xmr = decoded.obj.XMR;
    if (!xmr || typeof xmr !== "object" || typeof xmr.address !== "string") {
      noXmrEntry++;
      continue;
    }
    const expected = xmrNetworkFromAddress(xmr.address);
    if (!expected) {
      unknownPrefix++;
      console.log(
        `[SKIP] wallet ${row.id} (${row.currency}): unrecognized XMR address prefix "${xmr.address.slice(0, 4)}...".`
      );
      continue;
    }
    if (xmr.network === expected) {
      alreadyCorrect++;
      continue;
    }

    toFix++;
    console.log(
      `[FIX]  wallet ${row.id} (${row.currency}): XMR ${xmr.address.slice(0, 10)}... network "${xmr.network}" -> "${expected}"`
    );

    if (APPLY) {
      xmr.network = expected;
      const encoded = encodeAddress(decoded.obj, decoded.depth);
      await sequelize.query(`UPDATE \`wallet\` SET address = :addr WHERE id = :id`, {
        replacements: { addr: encoded, id: row.id },
        type: QueryTypes.UPDATE,
      });
      updated++;
    }
  }

  console.log("\n" + "=".repeat(64));
  console.log(`ECO wallets with an XMR key (scanned): ${scanned}`);
  console.log(`  XMR entry with wrong network label:  ${toFix}`);
  console.log(`  already correct:                     ${alreadyCorrect}`);
  console.log(`  no usable XMR entry:                 ${noXmrEntry}`);
  if (unknownPrefix) console.log(`  unrecognized prefix (skipped):       ${unknownPrefix}`);
  if (unparseable) console.log(`  unparseable JSON (skipped):          ${unparseable}`);
  if (APPLY) {
    console.log(`Updated rows: ${updated}`);
  } else {
    console.log(`DRY-RUN — nothing written. Re-run with --apply to fix.`);
  }
  console.log("=".repeat(64));
  if (APPLY && updated > 0) {
    console.log("\nIMPORTANT: restart the backend so cached wallet rows are refreshed.\n");
  }
}

main()
  .catch((e) => {
    console.error("XMR wallet network-label fix failed:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await sequelize.close();
    } catch {}
  });
