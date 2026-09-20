// Read-only diagnostic: find ECO wallets that have a TRON address in their
// wallet.address JSON but NO usable private key (walletData row for chain=TRON
// missing, or present with an empty `data` column). Those are the "old"
// wallets that hit "Private key not found for the wallet" on TRC20 withdrawals.
//
// This script ONLY READS. It makes no changes.
//
// Run on the production box from the backend/ directory:
//   node scripts/diagnose-tron-keyless-wallets.mjs
//
// It resolves DB credentials from backend/.env, then the repo-root .env.

import { createRequire } from "module";
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const backendRoot = join(__dirname, "..");
const repoRoot = join(backendRoot, "..");

// --- Minimal .env loader (no dependency on dotenv) -------------------------
function loadEnv(file) {
  const out = {};
  if (!existsSync(file)) return out;
  const text = readFileSync(file, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

const env = {
  ...loadEnv(join(repoRoot, ".env")),
  ...loadEnv(join(backendRoot, ".env")),
  ...process.env,
};

const DB_NAME = env.DB_NAME || "v5";
const DB_USER = env.DB_USER || "root";
const DB_PASSWORD = env.DB_PASSWORD || "";
const DB_HOST = env.DB_HOST || "localhost";
const DB_PORT = parseInt(env.DB_PORT || "3306", 10);

// Robustly decode wallet.address that may be a JS object, a JSON string, or a
// double-encoded JSON string (both shapes appear in the wild).
function parseAddresses(raw) {
  if (!raw) return {};
  let v = raw;
  for (let i = 0; i < 3; i++) {
    if (typeof v === "string") {
      try {
        v = JSON.parse(v);
      } catch {
        return {};
      }
    } else {
      break;
    }
  }
  return v && typeof v === "object" ? v : {};
}

async function main() {
  let mysql;
  try {
    mysql = require("mysql2/promise");
  } catch {
    console.error(
      "mysql2 is not installed in backend/node_modules. Run this from the backend/ directory."
    );
    process.exit(1);
  }

  const conn = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
  });

  console.log(
    `Connected to ${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}\n`
  );

  const [wallets] = await conn.execute(
    "SELECT id, userId, currency, balance, address FROM wallet WHERE type = 'ECO'"
  );

  // Map walletId -> TRON walletData row (data presence only; keys never printed)
  const [wdRows] = await conn.execute(
    "SELECT walletId, currency, (data IS NULL OR data = '') AS keyMissing FROM wallet_data WHERE chain = 'TRON'"
  );
  const wdByWallet = new Map();
  for (const r of wdRows) {
    if (!wdByWallet.has(r.walletId)) wdByWallet.set(r.walletId, []);
    wdByWallet.get(r.walletId).push(r);
  }

  const isTronAddr = (a) => typeof a === "string" && a.startsWith("T");

  const buckets = {
    healthy: [], // TRON address + walletData row with data
    brokenNoRow: [], // TRON address, NO walletData row for TRON at all
    brokenEmptyData: [], // TRON address, walletData row exists but data empty
    tronAddrNonT: [], // TRON entry present but address is not a T-address (old 0x path)
    noTronEntry: [], // no TRON entry in address JSON
  };

  for (const w of wallets) {
    const addresses = parseAddresses(w.address);
    const tron = addresses.TRON;
    const tronAddr = tron && tron.address;
    const wd = wdByWallet.get(w.id) || [];
    const hasKey = wd.some((r) => Number(r.keyMissing) === 0);

    const row = {
      walletId: w.id,
      userId: w.userId,
      currency: w.currency,
      balance: String(w.balance),
      tronAddr: tronAddr || null,
    };

    if (!tron || !tronAddr) {
      buckets.noTronEntry.push(row);
    } else if (!isTronAddr(tronAddr)) {
      buckets.tronAddrNonT.push(row);
    } else if (hasKey) {
      buckets.healthy.push(row);
    } else if (wd.length === 0) {
      buckets.brokenNoRow.push(row);
    } else {
      buckets.brokenEmptyData.push(row);
    }
  }

  const broken = [
    ...buckets.brokenNoRow,
    ...buckets.brokenEmptyData,
    ...buckets.tronAddrNonT,
  ];

  console.log("=== ECO wallet TRON key health ===");
  console.log(`Total ECO wallets:              ${wallets.length}`);
  console.log(`Healthy (T-addr + key present): ${buckets.healthy.length}`);
  console.log(`BROKEN - no walletData row:     ${buckets.brokenNoRow.length}`);
  console.log(`BROKEN - walletData data empty: ${buckets.brokenEmptyData.length}`);
  console.log(`BROKEN - address not a T-addr:  ${buckets.tronAddrNonT.length}`);
  console.log(`No TRON entry in address JSON:  ${buckets.noTronEntry.length}`);
  console.log("");
  console.log(
    `>>> ${broken.length} wallet(s) would hit "Private key not found" on a TRON withdrawal.`
  );
  console.log(
    `    (After deploying the code fix, these are paid from pooled/alternative`
  );
  console.log(`     custodial wallets — no per-wallet repair is required to withdraw.)\n`);

  const withBalance = broken.filter((r) => parseFloat(r.balance) > 0);
  console.log(`Of those, ${withBalance.length} currently hold a positive balance:\n`);
  for (const r of withBalance.slice(0, 50)) {
    console.log(
      `  wallet=${r.walletId} user=${r.userId} ${r.currency} balance=${r.balance} tron=${r.tronAddr}`
    );
  }
  if (withBalance.length > 50) {
    console.log(`  ... and ${withBalance.length - 50} more`);
  }

  await conn.end();
}

main().catch((e) => {
  console.error("Diagnostic failed:", e);
  process.exit(1);
});
