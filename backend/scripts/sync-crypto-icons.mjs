/**
 * Sync Crypto Currency Icons
 *
 * Exchange providers list new tokens continuously. Every one of them shows up in
 * the UI as `/img/crypto/<symbol>.webp`, and any symbol we have no file for
 * renders as a broken image (or falls back to a meaningless gold-coin
 * placeholder). This script finds those gaps and fills them.
 *
 * WHAT COUNTS AS "MISSING" — and why a plain existence check is WRONG.
 * A previous bulk fill copied `generic.webp` over ~88 symbols (aevo, cati,
 * aixbt, lista, nfp, awe, 1000cat, ...). Those files EXIST, so `fs.existsSync`
 * reports them as present, yet they render as the generic gold coin and convey
 * nothing. This script therefore treats a file as missing when it is absent OR
 * byte-identical to `generic.webp`. Without that rule the earlier bulk fill
 * would permanently mask those symbols from every future run.
 *
 * Deliberately NOT treated as missing: the exchange-family badges. 34 files
 * (aaveup/aavedown/adaup/...) share the Binance logo and 26 (adabull/adabear/
 * algobull/...) share the FTX logo, because those are Binance/FTX leveraged
 * products and the badge identifies the issuer. That is real, intentional art.
 * `--list-family-badges` reports them if you ever want to revisit it.
 *
 * THE OUTPUT FORMAT is derived by measuring the existing 9838 files, not
 * guessed: every one is exactly 64x64 webp. The dominant convention (6642
 * files) is a round badge with an alpha channel whose artwork runs edge to edge
 * — alpha bounding box 64x64, all four corners transparent, ~24% of pixels
 * transparent, which is exactly the area outside a circle inscribed in the
 * square (1 - pi/4 = 21.5%, plus antialiasing). New icons are written to match:
 * 64x64, alpha preserved, and a circular mask applied only when the source has
 * opaque corners (i.e. it is a square logo that would otherwise not match).
 *
 * RESOLUTION CHAIN, cheapest and most accurate first. Most of the work needs no
 * network at all:
 *
 *   1. local-blockchains  An ecosystem token already carries its own logo at
 *                         `/blockchains/<chain>/assets/<key>/logo.webp` (5346
 *                         of them are on disk). Converting that local file
 *                         fills 1121 of the 1127 ecosystem gaps offline, and it
 *                         is the token's REAL logo, keyed by contract — the
 *                         most accurate source available.
 *   2. alias              Exchange derivative naming, derived offline: the
 *                         leveraged suffixes (3L/3S/5L/5S/UP/DOWN/BULL/BEAR)
 *                         and the multiplier prefixes (1000X/1MX). ACE3L is
 *                         ACE, 1000KQUACK is QUACK. Reuses the base icon we
 *                         already own — ~144 symbols, no network.
 *                         Only these two exchange conventions are applied.
 *                         Generic affix stripping was measured and REJECTED: it
 *                         maps aero->ero, adf->df, addy->ddy, which are wrong.
 *   3. trustwallet        Contract-address-keyed logos, for ecosystem tokens
 *                         that have a `contract` but no local file.
 *   4. tokenlist          DEX token lists (Uniswap, 1inch, CoinGecko per-chain).
 *                         Plain JSON on CDNs with NO rate limit, each entry
 *                         carrying a logoURI. Measured to cover 188 symbols
 *                         nothing else resolves — the dependable network tier.
 *   5. coingecko          Symbol -> coin -> CDN image, disambiguated by market
 *                         cap rank (see below). Best single source for CEX
 *                         listings, but see the rate-limit note.
 *   6. flag               Fiat ISO 4217 -> circular country flag. The ISO 4217
 *                         code's first two letters are the ISO 3166 country for
 *                         93 of the 97 missing fiats; the rest are overridden
 *                         explicitly below. Flags rather than currency glyphs
 *                         because 25 currencies share the "$" glyph — see the
 *                         `flag` resolver for the full argument.
 *
 * ENABLEMENT IS THE NUMBER THAT MATTERS. The spot import writes `status: false`
 * on both its create and update path, so a newly ccxt-listed token is not live
 * until an admin enables it. Only 5 of 1464 exchange_currency rows, 36 of 5531
 * ecosystem_token rows and 3 of 160 fiat rows are enabled here, so the ~2000
 * missing icons are overwhelmingly LATENT — a handful are user-visible today.
 * Every run prints the enabled subset separately, and `--enabled-only` restricts
 * the work to it. The default full run is the pre-emptive backfill, which is
 * cheap because two thirds of it needs no network.
 *
 * THE TICKER COLLISION PROBLEM. Many unrelated tokens share a ticker, so a
 * symbol-only lookup can fetch a clone's logo. Two guards: CoinGecko candidates
 * are ranked by market cap (a real listing beats a namesake with no market
 * data), and when the top candidate has no rank at all AND more than one
 * candidate exists the symbol is left unresolved rather than guessed. Raise
 * `--max-ambiguity` to accept those, or resolve them by hand.
 *
 * RATE LIMITS. CoinGecko's keyless tier 429s aggressively — a second call
 * seconds after the first was refused during development. So the symbol index
 * is built ONCE from the bulk `/coins/markets` pages (250 coins each), cached
 * under backend/storage/icon-sync/, and reused. Image downloads come from
 * coin-images.coingecko.com, a CDN that is not subject to the API limit.
 * Index building backs off on 429 and resumes from the cache, so an interrupted
 * build costs nothing. Set COINGECKO_API_KEY to raise the ceiling.
 *
 * DRY-RUN by default. Nothing is written without --apply.
 *   Report:  node scripts/sync-crypto-icons.mjs
 *   Apply:   node scripts/sync-crypto-icons.mjs --apply
 *   Verify:  node scripts/sync-crypto-icons.mjs        -> resolved count drops
 *
 * Re-running is idempotent: a symbol that now has a real file is no longer
 * missing, so a second --apply writes only what genuinely failed before.
 *
 * FLAGS
 *   --apply                 write files (default: report only)
 *   --enabled-only          only symbols on ENABLED rows (the live surface)
 *   --only=cex,eco,fiat,fx  restrict to buckets (default: all but fx)
 *   --symbols=a,b,c         restrict to specific symbols (implies all buckets)
 *   --limit=N               stop after N successful writes
 *   --sources=a,b           restrict the resolution chain
 *   --refresh-index         rebuild the CoinGecko index even if cached
 *   --no-network            offline only: local-blockchains + alias
 *   --circle=auto|always|never   circular mask policy (default auto)
 *   --concurrency=N         parallel downloads (default 6)
 *   --max-ambiguity=N       accept a rankless symbol with <=N candidates (default 1)
 *   --json[=path]           write a machine-readable report
 *   --list-family-badges    show the Binance/FTX shared-badge groups and exit
 *   --verbose               per-symbol resolution detail
 *
 * This script is self-contained (raw Sequelize, no model imports) like every
 * other script in this directory, so it runs without booting the backend. Every
 * table read is guarded by an INFORMATION_SCHEMA check: an install without the
 * ecosystem or forex addon simply skips those sources instead of crashing.
 */

import { config } from "dotenv";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { Sequelize } from "sequelize";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.join(__dirname, "../../.env") });

/* ------------------------------------------------------------------ */
/* Paths and constants                                                 */
/* ------------------------------------------------------------------ */

const REPO_ROOT = path.resolve(__dirname, "../..");
const PUBLIC_DIR = path.join(REPO_ROOT, "frontend", "public");
const ICON_DIR = path.join(PUBLIC_DIR, "img", "crypto");
const GENERIC_ICON = path.join(ICON_DIR, "generic.webp");

/**
 * Windows reserves the DOS device names below, and the reservation ignores both
 * the extension and the directory: `con.webp` names the console device, not a
 * file. Git for Windows refuses to open such a path at all — core.protectNTFS
 * is on by default and fails it with ENOENT — so an icon written under a bare
 * reserved name is silently uncommittable, which is exactly what happened to
 * the ecosystem CON token. The shipped icon set already dodges this with an
 * underscore prefix (`_aux.webp`, `_con.webp`); symbols normalise to [a-z0-9],
 * so a leading `_` can never collide with a real one. The canonical
 * `/img/crypto/<symbol>.webp` URL is rewritten onto these files in
 * frontend/next.config.js — keep the two lists in step.
 */
const WIN_RESERVED = new Set([
  "con",
  "prn",
  "aux",
  "nul",
  ...Array.from({ length: 9 }, (_, i) => `com${i + 1}`),
  ...Array.from({ length: 9 }, (_, i) => `lpt${i + 1}`),
]);

/** The on-disk file name for a symbol, escaping Windows device names. */
const iconFile = (symbol) => `${WIN_RESERVED.has(symbol) ? "_" : ""}${symbol}.webp`;

/** Inverse of `iconFile`: the symbol a given on-disk file name stands for. */
const iconSymbol = (file) => {
  const base = file.slice(0, -5);
  return base.startsWith("_") && WIN_RESERVED.has(base.slice(1)) ? base.slice(1) : base;
};

const CACHE_DIR = path.join(REPO_ROOT, "backend", "storage", "icon-sync");
const CG_INDEX_FILE = path.join(CACHE_DIR, "coingecko-index.json");

/** Measured from all 9838 existing icons: every one is exactly 64x64. */
const SIZE = 64;
/** Rebuild the CoinGecko index when the cache is older than this. */
const INDEX_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/** CoinGecko keyless tier is ~5-15 req/min; stay well under it. */
const CG_PAGE_DELAY_MS = 2600;
const CG_MAX_PAGES = 80;

/* ------------------------------------------------------------------ */
/* CLI                                                                 */
/* ------------------------------------------------------------------ */

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const val = (name, dflt) => {
  const hit = argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return dflt;
  const eq = hit.indexOf("=");
  return eq === -1 ? true : hit.slice(eq + 1);
};
const num = (name, dflt) => {
  const v = val(name, undefined);
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : dflt;
};
const csv = (name) => {
  const v = val(name, undefined);
  if (typeof v !== "string" || !v.trim()) return null;
  return v.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
};

const APPLY = has("--apply");
const VERBOSE = has("--verbose");
const NO_NETWORK = has("--no-network");
const REFRESH_INDEX = has("--refresh-index");
/**
 * Use whatever index is cached and do NOT try to extend it. Useful once the
 * keyless CoinGecko quota is spent: the partial index still resolves hundreds of
 * symbols, and without this every run first burns several minutes of backoff
 * rediscovering that the API is still throttling.
 */
const CACHED_INDEX = has("--cached-index");
const LIST_FAMILY = has("--list-family-badges");
const ENABLED_ONLY = has("--enabled-only");
/**
 * Re-resolve symbols that ALREADY have a good icon, so an existing file can be
 * replaced. Needed to migrate the 53 legacy fiat glyph badges to flags; never
 * implied, because a normal run must not churn art that is already correct.
 */
const OVERWRITE = has("--overwrite");
// An explicit --limit=0 must mean zero, not "unlimited" — `num()` rejects 0 and
// would silently fall back to Infinity, which is the opposite of what was asked.
const LIMIT = (() => {
  const v = val("limit", undefined);
  if (v === undefined) return Infinity;
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 ? n : Infinity;
})();
const CONCURRENCY = Math.min(num("concurrency", 6), 16);
const MAX_AMBIGUITY = (() => {
  const v = val("max-ambiguity", undefined);
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 ? n : 1;
})();
const CIRCLE = (() => {
  const v = val("circle", "auto");
  return ["auto", "always", "never"].includes(v) ? v : "auto";
})();
const ONLY = csv("only");
const SYMBOLS = csv("symbols");
const SOURCES = csv("sources");
const JSON_OUT = (() => {
  const v = val("json", undefined);
  if (v === undefined) return null;
  return v === true ? path.join(CACHE_DIR, "missing-icons-report.json") : path.resolve(v);
})();

const ALL_SOURCES = [
  "local-blockchains",
  "alias",
  "trustwallet",
  "tokenlist",
  "coingecko",
  "flag",
  // Last: an ambiguous word-suffix guess is only right when nothing
  // authoritative recognised the symbol. See LEV_WORD.
  "alias-word",
];
/**
 * Sources that need no network.
 *
 * `flag` belongs here because it falls back to the repo's own
 * frontend/public/img/flag set — leaving it out made an offline report claim
 * every missing fiat was unresolvable when 104 of them are sitting in the repo.
 *
 * `alias-word` is deliberately NOT here. Its whole justification is that the
 * authoritative indexes were consulted first and came back empty; with
 * --no-network they were never consulted, so firing it would hand a real token
 * its base asset's logo on no evidence at all.
 */
const OFFLINE_SOURCES = ["local-blockchains", "alias", "flag"];
const sourceEnabled = (s) => {
  if (NO_NETWORK && !OFFLINE_SOURCES.includes(s)) return false;
  return !SOURCES || SOURCES.includes(s);
};

/* ------------------------------------------------------------------ */
/* Symbol normalization — MIRROR of the frontend                        */
/* ------------------------------------------------------------------ */

/**
 * The filename the app actually requests. Copied from
 * frontend/utils/image-fallback.ts getCryptoImageUrl(), which every consumer
 * agrees with (`currency.toLowerCase()` plus a non-alphanumeric strip). If that
 * function ever changes, change this with it — a mismatch here writes files
 * nothing will ever request.
 */
const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();

/**
 * Symbols that cannot be a real asset. Junk rows exist (a staking pool named
 * "dwadaw", tokens whose currency is a bare emoji), and there is no point
 * burning a network call on them.
 */
const isPlausibleSymbol = (n) => n.length >= 1 && n.length <= 24 && /[a-z0-9]/.test(n);

/* ------------------------------------------------------------------ */
/* Exchange derivative naming (source: alias)                           */
/* ------------------------------------------------------------------ */

/**
 * Numeric leveraged suffixes (ACE3L, ADA3S, BTC5L). UNAMBIGUOUS: no real ticker
 * ends in a digit-plus-L/S by coincidence, so these are safe to resolve before
 * consulting any external index.
 */
const LEV_NUMERIC = /([2345][ls])$/;

/**
 * Word-shaped directional suffixes (AAVEUP, ADABULL, BNBHEDGE). AMBIGUOUS: real
 * tickers end in these letters for unrelated reasons, and stripping blindly
 * produces confident nonsense. Verified against the icon set on this install:
 * SETUP->SET, STARTUP->START, MARKUP->MARK, MEETUP->MEET, HOLDUP->HOLD,
 * SUNDOWN->SUN and REDBULL->RED would all "resolve" to a base whose icon we
 * happen to own. The live dataset already contains one such case: TONUP is the
 * TonUP launchpad, NOT a leveraged TON product, so TONUP->TON is simply wrong.
 *
 * These are therefore applied as a LAST RESORT (see the `alias-word` resolver),
 * after the authoritative indexes have had a chance to return the token's own
 * logo. A genuinely leveraged product is absent from those indexes and still
 * falls through to the base icon, which is the outcome we want.
 */
const LEV_WORD = /(up|down|bull|bear|hedge|half)$/;

/** Meme-token redenomination prefixes: 1000SHIB, 1000000HVI, 1MBABYDOGE. */
const MULT_PREFIX = /^(1000000|100000|10000|1000|100|1m|1b|1k)(?=[a-z])/;

function stripCandidates(n, suffixRe) {
  const out = [];
  const push = (s) => {
    if (s && s.length >= 2 && s !== n && !out.includes(s)) out.push(s);
  };
  const m = suffixRe ? n.match(suffixRe) : null;
  const stripped = m ? n.slice(0, m.index) : null;
  push(stripped);
  if (stripped) push(stripped.replace(MULT_PREFIX, ""));
  return out;
}

/** Safe, early: numeric leveraged suffixes plus the multiplier prefixes. */
function aliasCandidates(n) {
  const out = stripCandidates(n, LEV_NUMERIC);
  const demult = n.replace(MULT_PREFIX, "");
  if (demult !== n && demult.length >= 2 && !out.includes(demult)) out.push(demult);
  return out;
}

/** Ambiguous, last resort: the word-shaped directional suffixes. */
function aliasWordCandidates(n) {
  return stripCandidates(n, LEV_WORD);
}

/* ------------------------------------------------------------------ */
/* Fiat ISO 4217 -> ISO 3166 country (source: flag)                     */
/* ------------------------------------------------------------------ */

/**
 * For 93 of the 97 missing fiat codes the country is simply the first two
 * letters of the currency code (AED->ae, THB->th). Only these need saying out
 * loud: currency unions, and the codes whose country letters differ.
 */
const FIAT_COUNTRY_OVERRIDES = {
  eur: "eu", gbp: "gb", usd: "us", chf: "ch", xaf: "cm", xof: "sn",
  xpf: "pf", xcd: "ag", ang: "cw", awg: "aw", cnh: "cn", cny: "cn",
  ghc: "gh", mro: "mr", std: "st", ves: "ve", vef: "ve", zwl: "zw",
  byn: "by", byr: "by", ssp: "ss", srd: "sr", tmt: "tm", mmk: "mm",
  krw: "kr", jpy: "jp", rub: "ru", try: "tr", inr: "in", brl: "br",
  aud: "au", cad: "ca", nzd: "nz", sgd: "sg", hkd: "hk", zar: "za",
  dkk: "dk", nok: "no", sek: "se", pln: "pl", czk: "cz", huf: "hu",
  ils: "il", clf: "cl", cou: "co", bov: "bo", mxv: "mx", uyi: "uy",
  usn: "us", che: "ch", chw: "ch",
};

/** Units of account and metals — no country, so no flag. */
const NON_COUNTRY_CODES = new Set(["xau", "xag", "xpt", "xpd", "xdr", "xts", "xxx", "clf", "cou", "bov", "mxv", "uyi", "usn", "che", "chw"]);

function fiatCountry(n) {
  if (NON_COUNTRY_CODES.has(n)) return null;
  if (FIAT_COUNTRY_OVERRIDES[n]) return FIAT_COUNTRY_OVERRIDES[n];
  if (/^[a-z]{3}$/.test(n)) return n.slice(0, 2);
  return null;
}

/* ------------------------------------------------------------------ */
/* Trust Wallet chain slugs (source: trustwallet)                        */
/* ------------------------------------------------------------------ */

const TW_CHAIN = {
  ETH: "ethereum", BSC: "smartchain", POLYGON: "polygon", MATIC: "polygon",
  ARBITRUM: "arbitrum", OPTIMISM: "optimism", FTM: "fantom", AVAX: "avalanchec",
  CELO: "celo", CRO: "cronos", BASE: "base", SOL: "solana", TRON: "tron",
  TRX: "tron", BTC: "bitcoin", LTC: "litecoin", DOGE: "doge", DASH: "dash",
  XMR: "monero", TON: "ton",
};

/* ------------------------------------------------------------------ */
/* Database                                                            */
/* ------------------------------------------------------------------ */

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

async function tableExists(tableName) {
  const [rows] = await sequelize.query(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    { replacements: [tableName] }
  );
  return rows.length > 0;
}

async function columnExists(tableName, columnName) {
  const [rows] = await sequelize.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    { replacements: [tableName, columnName] }
  );
  return rows.length > 0;
}

/**
 * Every catalog table that defines an asset a UI can show an icon for, with the
 * bucket it belongs to. Transactional tables (orders, deposits) are excluded on
 * purpose: their currency values are always a subset of these, so scanning them
 * only slows the run down.
 *
 * `fiat` reads `currency.id`, NOT `currency.symbol` — in that table `id` holds
 * the ISO 4217 code and `symbol` holds the display GLYPH ("$", "kr", "Bs."),
 * which is not a filename and produced 42 nonsense "missing icons" before this
 * was caught.
 */
/**
 * `enabledSql` matters more than it looks. The spot import writes
 * `status: false` on BOTH its create and update path
 * (src/api/admin/finance/currency/spot/import.get.ts), so a newly ccxt-listed
 * token is NOT live until an admin enables it. On this database only 5 of 1464
 * exchange_currency rows, 36 of 5531 ecosystem_token rows and 3 of 160 fiat
 * rows are enabled — so the vast majority of the gap is latent, and the handful
 * of icons a user can actually see today is a completely different, much smaller
 * set. `--enabled-only` targets that live surface; the default full run is the
 * pre-emptive backfill.
 */
const SYMBOL_SOURCES = [
  { table: "exchange_currency", column: "currency", bucket: "cex", enabledSql: "status = 1" },
  { table: "exchange_market", column: "currency", bucket: "cex", enabledSql: "status = 1" },
  { table: "exchange_market", column: "pair", bucket: "cex", enabledSql: "status = 1" },
  { table: "ecosystem_token", column: "currency", bucket: "eco", enabledSql: "status = 1" },
  { table: "ecosystem_market", column: "currency", bucket: "eco", enabledSql: "status = 1" },
  { table: "ecosystem_market", column: "pair", bucket: "eco", enabledSql: "status = 1" },
  { table: "ecosystem_blockchain", column: "chain", bucket: "eco", enabledSql: "status = 1" },
  { table: "ecosystem_custom_chain", column: "chain", bucket: "eco", enabledSql: "status = 1" },
  { table: "ecosystem_custom_chain", column: "currency", bucket: "eco", enabledSql: "status = 1" },
  { table: "currency", column: "id", bucket: "fiat", enabledSql: "status = 1" },
  { table: "futures_market", column: "currency", bucket: "cex", enabledSql: "status = 1" },
  { table: "futures_market", column: "pair", bucket: "cex", enabledSql: "status = 1" },
  { table: "binary_market", column: "currency", bucket: "cex", enabledSql: "status = 1" },
  { table: "binary_market", column: "pair", bucket: "cex", enabledSql: "status = 1" },
  // fx_instrument.status is a VARCHAR ('ACTIVE'/'INACTIVE'), not a tinyint.
  { table: "fx_instrument", column: "currency", bucket: "fx", enabledSql: "status = 'ACTIVE'" },
  { table: "fx_instrument", column: "pair", bucket: "fx", enabledSql: "status = 'ACTIVE'" },
  { table: "forex_currency", column: "currency", bucket: "fiat", enabledSql: "status = 1" },
  // staking_pools.status is an ENUM('ACTIVE','INACTIVE','COMING_SOON').
  { table: "staking_pools", column: "symbol", bucket: "eco", enabledSql: "status = 'ACTIVE'" },
  { table: "staking_pools", column: "token", bucket: "eco", enabledSql: "status = 'ACTIVE'" },
];

/** bucket precedence when a symbol appears in more than one source */
const BUCKET_RANK = { cex: 0, eco: 1, fiat: 2, fx: 3 };

async function collectSymbols() {
  /** normalized symbol -> { raw, bucket, sources:Set } */
  const found = new Map();
  const skipped = [];
  /**
   * Fiat-ness is tracked separately from the bucket on purpose. A currency like
   * INR or TRY appears in BOTH the fiat table and exchange_market.pair, and
   * bucket precedence resolves that to `cex` — which would hide it from the flag
   * resolver and let CoinGecko hand it a same-ticker crypto logo instead.
   */
  const fiatCodes = new Set();

  for (const src of SYMBOL_SOURCES) {
    if (!(await tableExists(src.table))) {
      skipped.push(`${src.table} (no such table)`);
      continue;
    }
    if (!(await columnExists(src.table, src.column))) {
      skipped.push(`${src.table}.${src.column} (no such column)`);
      continue;
    }
    // `enabled` is selected per row rather than filtered, so one pass yields both
    // the full inventory and the live subset.
    const hasStatus = src.enabledSql ? await columnExists(src.table, "status") : false;
    const enabledExpr = hasStatus ? `MAX(${src.enabledSql})` : "0";
    const [rows] = await sequelize.query(
      `SELECT \`${src.column}\` AS sym, ${enabledExpr} AS enabled FROM \`${src.table}\`
         WHERE \`${src.column}\` IS NOT NULL AND \`${src.column}\` <> ''
         GROUP BY \`${src.column}\``
    );
    for (const r of rows) {
      const n = norm(r.sym);
      if (!isPlausibleSymbol(n)) continue;
      if (src.bucket === "fiat") fiatCodes.add(n);
      const enabled = Number(r.enabled) === 1;
      const prev = found.get(n);
      const label = `${src.table}.${src.column}`;
      if (prev) {
        prev.sources.add(label);
        if (enabled) prev.enabled = true;
        if (BUCKET_RANK[src.bucket] < BUCKET_RANK[prev.bucket]) prev.bucket = src.bucket;
      } else {
        found.set(n, {
          raw: String(r.sym).trim(),
          bucket: src.bucket,
          enabled,
          sources: new Set([label]),
        });
      }
    }
  }
  return { found, skipped, fiatCodes };
}

/**
 * Ecosystem tokens carry their own logo path plus a contract address. Both feed
 * the two most accurate resolvers, so read them once up front.
 */
async function collectTokenMeta() {
  const meta = new Map();
  if (!(await tableExists("ecosystem_token"))) return meta;
  const [rows] = await sequelize.query(
    `SELECT currency, chain, contract, icon FROM ecosystem_token
       WHERE currency IS NOT NULL AND currency <> ''`
  );
  for (const r of rows) {
    const n = norm(r.currency);
    if (!n) continue;
    const entry = meta.get(n) || { icons: [], contracts: [] };
    if (r.icon && !r.icon.startsWith("/img/crypto/")) entry.icons.push(r.icon);
    if (r.contract && r.chain && /^0x[0-9a-fA-F]{40}$/.test(r.contract)) {
      entry.contracts.push({ chain: String(r.chain).toUpperCase(), contract: r.contract });
    }
    meta.set(n, entry);
  }
  return meta;
}

/* ------------------------------------------------------------------ */
/* Existing icons + placeholder detection                              */
/* ------------------------------------------------------------------ */

const md5 = (buf) => crypto.createHash("md5").update(buf).digest("hex");

/**
 * Index the icon directory by symbol and by content hash. The hash index is
 * what makes placeholder detection possible: `generic.webp`'s own hash
 * identifies every file that is a copy of it.
 */
function loadExistingIcons() {
  if (!fs.existsSync(ICON_DIR)) {
    throw new Error(`Icon directory not found: ${ICON_DIR}`);
  }
  const files = fs.readdirSync(ICON_DIR).filter((f) => f.endsWith(".webp"));
  /** symbol -> { file, hash } */
  const bySymbol = new Map();
  /** hash -> symbols[] */
  const byHash = new Map();

  for (const f of files) {
    let hash;
    try {
      hash = md5(fs.readFileSync(path.join(ICON_DIR, f)));
    } catch {
      continue;
    }
    // Key by the SYMBOL, not the file stem, so the underscore-escaped device
    // names register as the symbols they stand for. Keying by stem made `_con`
    // its own entry, left CON looking permanently missing, and had every
    // --apply run re-resolve it and write an uncommittable `con.webp`.
    const sym = iconSymbol(f);
    bySymbol.set(sym, { file: f, hash });
    const list = byHash.get(hash) || [];
    list.push(sym);
    byHash.set(hash, list);
  }

  const genericHash = fs.existsSync(GENERIC_ICON) ? md5(fs.readFileSync(GENERIC_ICON)) : null;
  /** Symbols whose file is a byte-identical copy of generic.webp. */
  const placeholders = new Set(
    genericHash ? (byHash.get(genericHash) || []).filter((s) => s !== "generic") : []
  );

  return { bySymbol, byHash, genericHash, placeholders };
}

/**
 * The shared exchange-family badges (Binance logo on *UP/*DOWN, FTX logo on
 * *BULL/*BEAR and tokenized stocks). Reported by --list-family-badges; these are
 * intentional art and are NOT treated as missing.
 */
function familyBadgeGroups(byHash, placeholders) {
  return [...byHash.entries()]
    .filter(([, syms]) => syms.length > 3 && !syms.some((s) => placeholders.has(s)))
    .sort((a, b) => b[1].length - a[1].length)
    .map(([hash, syms]) => ({ hash: hash.slice(0, 10), count: syms.length, sample: syms.slice(0, 8) }));
}

/* ------------------------------------------------------------------ */
/* Image conversion                                                    */
/* ------------------------------------------------------------------ */

const circleMaskSvg = Buffer.from(
  `<svg width="${SIZE}" height="${SIZE}"><circle cx="${SIZE / 2}" cy="${SIZE / 2}" r="${SIZE / 2}" fill="#fff"/></svg>`
);

/**
 * True when the source is a square logo (opaque corners). Those get the
 * circular mask so they match the dominant round-badge convention; a source
 * that is already a round badge with transparent corners is left alone.
 */
async function hasOpaqueCorners(buf) {
  const { data, info } = await sharp(buf, { animated: false })
    .ensureAlpha()
    .resize(SIZE, SIZE, { fit: "cover" })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;
  let opaque = 0;
  for (const [x, y] of [[0, 0], [W - 1, 0], [0, H - 1], [W - 1, H - 1]]) {
    if (data[(y * W + x) * C + 3] > 128) opaque++;
  }
  return opaque >= 3;
}

/**
 * Any source image (png/jpg/svg/webp, any size) -> the house format: 64x64
 * webp, alpha preserved, artwork contained and centred so nothing is cropped.
 */
async function toHouseFormat(srcBuf) {
  /**
   * 1199 of the icons come from `local-blockchains`, where the source file is
   * ALREADY a 64x64 webp with alpha in exactly the house format. Re-encoding
   * those would throw away quality for nothing (lossy webp -> lossy webp is
   * generational loss), so pass the original bytes through untouched when they
   * already satisfy the spec and no mask is being forced.
   */
  try {
    const m = await sharp(srcBuf, { animated: false }).metadata();
    if (
      m.format === "webp" &&
      m.width === SIZE &&
      m.height === SIZE &&
      m.hasAlpha &&
      // An animated source must be re-encoded to a still frame, never passed through.
      !(m.pages > 1) &&
      CIRCLE !== "always" &&
      // `hasAlpha` only means an alpha CHANNEL exists, not that the corners are
      // transparent — a square logo saved with a fully opaque alpha channel would
      // otherwise skip the circle mask that every other square source gets.
      !(CIRCLE === "auto" && (await hasOpaqueCorners(srcBuf)))
    ) {
      return { buffer: srcBuf, circleApplied: false, passthrough: true };
    }
  } catch {
    /* fall through to the normal conversion, which reports the error properly */
  }

  const contained = await sharp(srcBuf, { animated: false })
    .ensureAlpha()
    .resize(SIZE, SIZE, {
      fit: "contain",
      position: "centre",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: "lanczos3",
    })
    .png()
    .toBuffer();

  const applyCircle =
    CIRCLE === "always" || (CIRCLE === "auto" && (await hasOpaqueCorners(srcBuf)));

  let pipe = sharp(contained);
  if (applyCircle) {
    pipe = sharp(
      await pipe.composite([{ input: circleMaskSvg, blend: "dest-in" }]).png().toBuffer()
    );
  }

  const out = await pipe
    .webp({ quality: 90, alphaQuality: 100, effort: 6, lossless: false, smartSubsample: true })
    .toBuffer();

  return { buffer: out, circleApplied: applyCircle };
}

/** Reject HTML error pages, 1x1 trackers and other non-logo responses. */
async function validateSource(buf) {
  if (!buf || buf.length < 64) return "too small";
  try {
    const m = await sharp(buf, { animated: false }).metadata();
    if (!m.width || !m.height) return "no dimensions";
    if (m.width < 16 || m.height < 16) return `too small (${m.width}x${m.height})`;
    return null;
  } catch (e) {
    return `undecodable (${String(e.message).slice(0, 40)})`;
  }
}

/* ------------------------------------------------------------------ */
/* HTTP                                                               */
/* ------------------------------------------------------------------ */

const UA = "v5-icon-sync/1.0 (+maintenance script)";

/** A logo is a few KB. Anything past this is not a logo — cap it rather than buffer it. */
const MAX_DOWNLOAD_BYTES = 4 * 1024 * 1024;

/**
 * Only plain https to a public host. `tokenlist` fetches a `logoURI` straight
 * out of a third-party token list, which is untrusted input: without this an
 * entry could point at `file:///…`, `http://169.254.169.254/…` (cloud metadata)
 * or a localhost admin port and this script would fetch it.
 */
function isSafeRemoteUrl(raw) {
  let u;
  try {
    u = new URL(String(raw));
  } catch {
    return false;
  }
  if (u.protocol !== "https:") return false;
  const host = u.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host === "metadata.google.internal" ||
    // literal IPs: no logo CDN is addressed by IP, and this is where SSRF lives
    /^\[?[0-9a-f:]*:[0-9a-f:]*\]?$/.test(host) ||
    /^\d{1,3}(\.\d{1,3}){3}$/.test(host)
  ) {
    return false;
  }
  return true;
}

async function httpGet(url, { timeoutMs = 20000, accept = "*/*" } = {}) {
  if (!isSafeRemoteUrl(url)) return { ok: false, status: 0, error: "unsafe url" };
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctl.signal,
      redirect: "follow",
      headers: { "user-agent": UA, accept },
    });
    if (!res.ok) return { ok: false, status: res.status };

    // A redirect chain can land somewhere unsafe even when the first hop was fine.
    if (res.url && !isSafeRemoteUrl(res.url)) {
      return { ok: false, status: 0, error: "redirected to an unsafe url" };
    }

    const declared = parseInt(res.headers.get("content-length") || "", 10);
    if (Number.isFinite(declared) && declared > MAX_DOWNLOAD_BYTES) {
      return { ok: false, status: 0, error: `too large (${declared} bytes)` };
    }

    // Content-Length is advisory, so cap while streaming too.
    const chunks = [];
    let total = 0;
    for await (const chunk of res.body) {
      total += chunk.length;
      if (total > MAX_DOWNLOAD_BYTES) {
        ctl.abort();
        return { ok: false, status: 0, error: "exceeded size cap mid-stream" };
      }
      chunks.push(Buffer.from(chunk));
    }
    return { ok: true, status: res.status, buffer: Buffer.concat(chunks) };
  } catch (e) {
    return { ok: false, status: 0, error: String(e.message).slice(0, 60) };
  } finally {
    clearTimeout(timer);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------------ */
/* CoinGecko index                                                    */
/* ------------------------------------------------------------------ */

const CG_KEY = process.env.COINGECKO_API_KEY || process.env.COIN_GECKO_API_KEY || "";
const cgBase = () =>
  CG_KEY ? "https://pro-api.coingecko.com/api/v3" : "https://api.coingecko.com/api/v3";
const cgUrl = (p) => `${cgBase()}${p}${CG_KEY ? `${p.includes("?") ? "&" : "?"}x_cg_pro_api_key=${CG_KEY}` : ""}`;

/**
 * Build `symbol -> [{id,name,image,rank}]` from the bulk market pages. One
 * cached build serves every symbol, so a run costs zero API calls once warm.
 * `/coins/markets` is the only endpoint that returns the image URL AND the
 * market cap rank in bulk, which is what makes ticker collisions decidable.
 */
async function buildCoinGeckoIndex() {
  fs.mkdirSync(CACHE_DIR, { recursive: true });

  if (!REFRESH_INDEX && fs.existsSync(CG_INDEX_FILE)) {
    try {
      const cached = JSON.parse(fs.readFileSync(CG_INDEX_FILE, "utf8"));
      const age = Date.now() - new Date(cached.builtAt).getTime();
      if (CACHED_INDEX && cached.bySymbol) {
        const n = Object.keys(cached.bySymbol).length;
        console.log(
          `  CoinGecko index: using the cached ${cached.partial ? "PARTIAL" : "complete"} ` +
            `index as-is (${n} symbols), not extending it`
        );
        return cached.bySymbol;
      }
      // A partial (throttle-interrupted) cache must NOT be served as a complete
      // one, or the build never finishes and coverage silently stays low.
      if (age < INDEX_TTL_MS && cached.bySymbol && !cached.partial) {
        console.log(
          `  CoinGecko index: cache hit (${Object.keys(cached.bySymbol).length} symbols, ` +
            `${Math.round(age / 3600000)}h old)`
        );
        return cached.bySymbol;
      }
      console.log(`  CoinGecko index: cache stale (${Math.round(age / 86400000)}d), rebuilding`);
    } catch {
      console.log("  CoinGecko index: cache unreadable, rebuilding");
    }
  }

  /**
   * Resume from whatever a previous interrupted build saved. Throttling makes a
   * full build take a while, so progress is checkpointed and never thrown away.
   */
  const bySymbol = {};
  const seenIds = new Set();
  let resumeFrom = 1;
  if (!REFRESH_INDEX && fs.existsSync(CG_INDEX_FILE)) {
    try {
      const partial = JSON.parse(fs.readFileSync(CG_INDEX_FILE, "utf8"));
      if (partial.bySymbol && partial.partial) {
        Object.assign(bySymbol, partial.bySymbol);
        for (const list of Object.values(bySymbol)) for (const c of list) seenIds.add(c.id);
        resumeFrom = Math.max(1, Number(partial.nextPage) || 1);
        console.log(`  CoinGecko index: resuming partial build at page ${resumeFrom} (${seenIds.size} coins so far)`);
      }
    } catch {
      /* fall through to a fresh build */
    }
  }

  const checkpoint = (nextPage, partial) => {
    for (const k of Object.keys(bySymbol)) {
      // Best (lowest) rank first; rankless last. This is the collision tiebreak.
      bySymbol[k].sort((a, b) => (a.rank ?? 1e9) - (b.rank ?? 1e9));
    }
    fs.writeFileSync(
      CG_INDEX_FILE,
      JSON.stringify({ builtAt: new Date().toISOString(), partial, nextPage, bySymbol }, null, 0)
    );
  };

  const MAX_ATTEMPTS = 6;
  let backoff = CG_PAGE_DELAY_MS;
  let exhausted = false;
  /**
   * TRUE only when CoinGecko actually ran out of coins (a short page). Giving up
   * because of the rate limit is NOT completion — conflating the two marks a
   * truncated index `partial:false`, and the next run then serves it from cache
   * and never fetches the pages the throttle cost us.
   */
  let endOfData = false;
  let lastPageTried = resumeFrom;

  for (let page = resumeFrom; page <= CG_MAX_PAGES && !exhausted; page++) {
    lastPageTried = page;
    let rows = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const res = await httpGet(
        cgUrl(`/coins/markets?vs_currency=usd&per_page=250&page=${page}&sparkline=false`),
        { accept: "application/json" }
      );

      let parsed = null;
      if (res.ok) {
        try {
          parsed = JSON.parse(res.buffer.toString("utf8"));
        } catch {
          parsed = null;
        }
      }

      /**
       * The keyless tier does NOT reliably answer 429 when it throttles — it
       * answers `200 []`. Treating an empty array as "no more pages" is
       * therefore wrong and silently produces an EMPTY index. An empty page is
       * only believed as end-of-data once the request has been retried and the
       * answer stayed empty; a genuine end-of-data page repeats, a throttle
       * clears.
       */
      const throttled = res.status === 429 || (Array.isArray(parsed) && parsed.length === 0);

      if (Array.isArray(parsed) && parsed.length > 0) {
        rows = parsed;
        break;
      }
      if (!throttled && !res.ok) {
        console.log(`  CoinGecko index: page ${page} failed (HTTP ${res.status}${res.error ? ` ${res.error}` : ""})`);
      }
      if (attempt === MAX_ATTEMPTS) {
        // Empty after every retry: believe it only if we already have data,
        // otherwise report the throttle honestly rather than caching nothing.
        rows = [];
        break;
      }
      backoff = Math.min(Math.round(backoff * 1.8), 60000);
      console.log(
        `  CoinGecko index: page ${page} ${res.status === 429 ? "429" : "empty (soft throttle)"}, ` +
          `retry ${attempt}/${MAX_ATTEMPTS - 1} in ${backoff}ms`
      );
      await sleep(backoff);
    }

    if (!rows || rows.length === 0) {
      // Empty after every retry. Could be the true end, could be the throttle —
      // indistinguishable from here, so treat it as INCOMPLETE and let the next
      // run resume from this page.
      exhausted = true;
      if (seenIds.size === 0) break;
      console.log(
        `  CoinGecko index: page ${page} still empty after ${MAX_ATTEMPTS - 1} retries — ` +
          `stopping here and keeping the index PARTIAL so a later run resumes`
      );
      break;
    }

    for (const c of rows) {
      const n = norm(c.symbol);
      if (!n || !c.image || seenIds.has(c.id)) continue;
      seenIds.add(c.id);
      (bySymbol[n] = bySymbol[n] || []).push({
        id: c.id,
        name: c.name,
        image: c.image,
        rank: c.market_cap_rank == null ? null : Number(c.market_cap_rank),
      });
    }

    if (page % 5 === 0) {
      checkpoint(page + 1, true);
      console.log(`  CoinGecko index: page ${page}, ${seenIds.size} coins (checkpointed)`);
    }
    if (rows.length < 250) {
      // A short page is the ONLY honest signal that there are no more coins.
      exhausted = true;
      endOfData = true;
      break;
    }
    await sleep(CG_PAGE_DELAY_MS);
  }

  if (seenIds.size > 0) {
    // Resume from the page we failed on, not past it.
    checkpoint(endOfData ? CG_MAX_PAGES + 1 : lastPageTried, !endOfData);
    console.log(
      `  CoinGecko index: ${endOfData ? "complete" : "PARTIAL"} — ` +
        `${seenIds.size} coins / ${Object.keys(bySymbol).length} symbols` +
        (endOfData
          ? ""
          : ` (rate limited at page ${lastPageTried}; re-run to continue, or set ` +
            `COINGECKO_API_KEY to finish in one pass)`)
    );
  } else {
    console.log(
      "  CoinGecko index: EMPTY — the keyless API is throttling (it answers 200 with []). " +
        "Set COINGECKO_API_KEY, or re-run later; the other sources still work."
    );
  }
  return bySymbol;
}

/* ------------------------------------------------------------------ */
/* DEX token lists                                                    */
/* ------------------------------------------------------------------ */

/**
 * Plain JSON on CDNs, no key and no rate limit. Ordered least-to-most
 * comprehensive so the richest list wins the `symbol -> logoURI` slot: entries
 * are inserted with `??=` semantics, so a later list only fills gaps.
 */
const TOKEN_LISTS = [
  "https://tokens.uniswap.org",
  "https://tokens.1inch.eth.link",
  "https://tokens.coingecko.com/binance-smart-chain/all.json",
  "https://tokens.coingecko.com/ethereum/all.json",
];

const TL_CACHE_FILE = path.join(CACHE_DIR, "token-lists.json");

async function buildTokenListIndex() {
  fs.mkdirSync(CACHE_DIR, { recursive: true });

  if (!REFRESH_INDEX && fs.existsSync(TL_CACHE_FILE)) {
    try {
      const cached = JSON.parse(fs.readFileSync(TL_CACHE_FILE, "utf8"));
      const age = Date.now() - new Date(cached.builtAt).getTime();
      if (age < INDEX_TTL_MS && cached.bySymbol) {
        console.log(
          `  token lists: cache hit (${Object.keys(cached.bySymbol).length} symbols, ${Math.round(age / 3600000)}h old)`
        );
        return cached.bySymbol;
      }
    } catch {
      /* rebuild */
    }
  }

  const bySymbol = {};
  for (const url of TOKEN_LISTS) {
    const res = await httpGet(url, { timeoutMs: 40000, accept: "application/json" });
    if (!res.ok) {
      console.log(`  token lists: ${url.replace(/^https:\/\//, "")} failed (HTTP ${res.status})`);
      continue;
    }
    let parsed;
    try {
      parsed = JSON.parse(res.buffer.toString("utf8"));
    } catch {
      continue;
    }
    const tokens = Array.isArray(parsed) ? parsed : parsed.tokens;
    if (!Array.isArray(tokens)) continue;
    let added = 0;
    for (const t of tokens) {
      const n = norm(t && t.symbol);
      const uri = t && t.logoURI;
      if (!n || !uri || typeof uri !== "string") continue;
      // ipfs:// cannot be fetched without a gateway; skip rather than fail later.
      if (uri.startsWith("ipfs://")) continue;
      if (!bySymbol[n]) {
        bySymbol[n] = uri;
        added++;
      }
    }
    console.log(`  token lists: ${url.replace(/^https:\/\//, "").slice(0, 46)} +${added}`);
  }

  if (Object.keys(bySymbol).length) {
    fs.writeFileSync(
      TL_CACHE_FILE,
      JSON.stringify({ builtAt: new Date().toISOString(), bySymbol }, null, 0)
    );
    console.log(`  token lists: ${Object.keys(bySymbol).length} symbols`);
  } else {
    console.log("  token lists: EMPTY (network unavailable)");
  }
  return bySymbol;
}

/* ------------------------------------------------------------------ */
/* Resolvers                                                          */
/* ------------------------------------------------------------------ */

/**
 * Resolve a site-relative path from `ecosystem_token.icon` to a real file, or
 * null if it escapes frontend/public.
 *
 * WHY A CONTAINMENT CHECK AND NOT JUST path.join. That column is admin-editable
 * and its model validator is `^/(uploads|img|blockchains)/.*$` — the `.*` happily
 * matches `..` segments, so `/uploads/../../../backend/storage/kyc/id.png`
 * passes validation. Stripping leading slashes does not help: path.join would
 * then resolve the traversal and this resolver would read that file, convert it
 * and write it into frontend/public/img/crypto, where it is PUBLICLY SERVED.
 * That turns an icon refresh into an arbitrary-file-disclosure primitive, so the
 * resolved path is checked against the public root before anything reads it.
 */
function resolveInsidePublic(rel) {
  if (typeof rel !== "string" || !rel) return null;
  const full = path.resolve(PUBLIC_DIR, rel.replace(/^[\\/]+/, ""));
  const root = path.resolve(PUBLIC_DIR);
  const inside = full === root || full.startsWith(root + path.sep);
  return inside ? full : null;
}

/** Reuse an icon we already own for a derivative symbol. Shared by both aliasers. */
async function reuseBaseIcon(sym, ctx, candidates, label) {
  for (const base of candidates) {
    const hit = ctx.icons.bySymbol.get(base);
    // Never propagate a blank placeholder — that would only spread the problem.
    if (!hit || ctx.icons.placeholders.has(base)) continue;
    let buf;
    try {
      buf = fs.readFileSync(path.join(ICON_DIR, hit.file));
    } catch {
      continue;
    }
    return { buffer: buf, detail: `${label} of ${base}` };
  }
  return null;
}

/**
 * Each resolver returns { buffer, detail } on success, null when it has nothing
 * for this symbol. Order matters — see the header. `ctx` carries the existing
 * icon index, ecosystem token metadata and the CoinGecko index.
 */
const RESOLVERS = {
  /**
   * The ecosystem token's own logo, already on disk under /blockchains. Exact,
   * offline, and keyed by the token's contract rather than its ticker, so it
   * cannot pick up a namesake's art.
   */
  "local-blockchains": async (sym, ctx) => {
    const meta = ctx.tokenMeta.get(sym);
    if (!meta || !meta.icons.length) return null;
    for (const rel of meta.icons) {
      const full = resolveInsidePublic(rel);
      // Outside frontend/public — see resolveInsidePublic for why this matters.
      if (!full) continue;
      if (!fs.existsSync(full)) continue;
      let buf;
      try {
        buf = fs.readFileSync(full);
      } catch {
        continue;
      }
      // A token logo that is itself the generic placeholder is no better than
      // what we already have.
      if (ctx.genericHash && md5(buf) === ctx.genericHash) continue;
      if (await validateSource(buf)) continue;
      return { buffer: buf, detail: rel };
    }
    return null;
  },

  /**
   * Exchange derivative naming: reuse the base asset's icon we already own.
   * ACE3L -> ace, 1000KQUACK -> quack.
   */
  alias: async (sym, ctx) => reuseBaseIcon(sym, ctx, aliasCandidates(sym), "alias"),

  /**
   * Last-resort word-suffix alias — see LEV_WORD for why this is not run early.
   * By the time control reaches here the token's own logo was not found in any
   * index, which is exactly the signature of a synthetic exchange product.
   */
  "alias-word": async (sym, ctx) =>
    reuseBaseIcon(sym, ctx, aliasWordCandidates(sym), "alias-word"),

  /** Contract-address-keyed logos from the Trust Wallet assets repo. */
  trustwallet: async (sym, ctx) => {
    const meta = ctx.tokenMeta.get(sym);
    if (!meta || !meta.contracts.length) return null;
    for (const { chain, contract } of meta.contracts.slice(0, 3)) {
      const slug = TW_CHAIN[chain];
      if (!slug) continue;
      const url = `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${slug}/assets/${contract}/logo.png`;
      const res = await httpGet(url);
      if (!res.ok) continue;
      if (await validateSource(res.buffer)) continue;
      return { buffer: res.buffer, detail: `${slug}/${contract.slice(0, 10)}…` };
    }
    return null;
  },

  /**
   * DEX token lists — single JSON files on CDNs with no rate limit at all, each
   * entry carrying a `logoURI`. They exist to be mirrored, so unlike the
   * CoinGecko API they can be fetched reliably every run. Measured to cover 188
   * symbols that nothing else in the chain resolves, which makes this the
   * dependable half of the network tier.
   */
  tokenlist: async (sym, ctx) => {
    // Hard invariant, not just an ordering preference: a fiat code must never be
    // served a crypto logo. Plenty of ISO codes double as token tickers, and
    // `--sources=tokenlist` would otherwise bypass the flag-first chain order.
    if (ctx.fiatCodes.has(sym)) return null;
    const uri = ctx.tokenList[sym];
    if (!uri) return null;
    const res = await httpGet(uri);
    if (!res.ok) return null;
    if (await validateSource(res.buffer)) return null;
    return { buffer: res.buffer, detail: uri.slice(0, 64) };
  },

  /**
   * Symbol -> coin -> CDN image, disambiguated by market cap rank. A rankless
   * symbol with several candidates is refused rather than guessed (see the
   * ticker collision note in the header).
   */
  coingecko: async (sym, ctx) => {
    // Same hard invariant as `tokenlist` — see the note there.
    if (ctx.fiatCodes.has(sym)) return null;
    const cands = ctx.cgIndex[sym];
    if (!cands || !cands.length) return null;
    const best = cands[0];
    if (best.rank == null && cands.length > MAX_AMBIGUITY) {
      return { ambiguous: `${cands.length} rankless candidates: ${cands.slice(0, 3).map((c) => c.id).join(", ")}` };
    }
    const res = await httpGet(best.image);
    if (!res.ok) return null;
    if (await validateSource(res.buffer)) return null;
    return {
      buffer: res.buffer,
      detail: `${best.id}${best.rank != null ? ` (rank ${best.rank})` : " (no rank)"}`,
    };
  },

  /**
   * Fiat ISO 4217 -> country flag.
   *
   * WHY A FLAG AND NOT THE CURRENCY GLYPH. The 53 fiat icons already in this
   * directory are circular badges showing the glyph ($, EUR sign). That style
   * cannot be extended: in the `currency` table 25 different currencies share
   * the glyph "$" (ARS AUD BBD BMD BND BSD CAD CLP COP ... USD XCD ZWL) and 11
   * share the pound sign, so glyph badges would render AUD, CAD, NZD, SGD, HKD
   * and MXN as the same indistinguishable icon. A flag identifies the currency
   * unambiguously and is still a round badge, so it matches the shape
   * convention. Existing glyph icons are left alone.
   *
   * Circular flags come from the circle-flags repo; the repo's own
   * frontend/public/img/flag set is the offline fallback, but those are
   * RECTANGULAR (80x42, no alpha) so they get letterboxed into the 64x64 canvas.
   */
  flag: async (sym, ctx) => {
    if (!ctx.fiatCodes.has(sym)) return null;
    const cc = fiatCountry(sym);
    if (!cc) return null;

    if (!NO_NETWORK) {
      const base = "https://raw.githubusercontent.com/HatScripts/circle-flags/gh-pages/flags";
      let name = `${cc}.svg`;

      for (let hop = 0; hop < 2; hop++) {
        const res = await httpGet(`${base}/${name}`, { accept: "image/svg+xml,*/*" });
        if (!res.ok) break;

        /**
         * Some flags are git SYMLINKS (eu.svg -> european_union.svg). raw.github
         * serves a symlink's blob verbatim, which is just the target FILENAME as
         * plain text — an 18-byte "european_union.svg", not an image. Follow it
         * once instead of discarding a flag we can actually get.
         */
        const asText = res.buffer.toString("utf8").trim();
        if (res.buffer.length < 256 && /^[\w.\-/]+\.svg$/.test(asText)) {
          name = asText.replace(/^.*\//, "");
          continue;
        }

        if (!(await validateSource(res.buffer))) {
          return { buffer: res.buffer, detail: `circle-flag:${name.replace(/\.svg$/, "")}` };
        }
        break;
      }
    }

    const local = path.join(PUBLIC_DIR, "img", "flag", `${cc}.webp`);
    if (fs.existsSync(local)) {
      try {
        const buf = fs.readFileSync(local);
        if (!(await validateSource(buf))) {
          return { buffer: buf, detail: `img/flag/${cc}.webp (rectangular, letterboxed)` };
        }
      } catch {
        /* fall through */
      }
    }
    return null;
  },
};

/* ------------------------------------------------------------------ */
/* Concurrency helper                                                 */
/* ------------------------------------------------------------------ */

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}

/* ------------------------------------------------------------------ */
/* Reporting                                                          */
/* ------------------------------------------------------------------ */

const EMPTY_STATS = { written: 0, wouldWrite: 0, unresolved: 0, ambiguous: 0, failed: 0 };

/**
 * Write the machine-readable report.
 *
 * MUST be reachable on EVERY exit path that gets as far as scanning, including
 * the "nothing in scope" one. The admin routes parse this file and treat its
 * absence as a failure, so returning early without writing it turned the SUCCESS
 * case — every icon present — into a 500.
 */
function writeJsonReport({ icons, found, missing, byBucket, work, stats, bySource, results }) {
  if (!JSON_OUT) return;
  fs.mkdirSync(path.dirname(JSON_OUT), { recursive: true });
  fs.writeFileSync(
    JSON_OUT,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        applied: APPLY,
        existingIcons: icons.bySymbol.size,
        placeholderIcons: [...icons.placeholders],
        totalSymbols: found.size,
        missing: missing.length,
        missingByBucket: byBucket,
        inScope: work.length,
        stats: stats || { ...EMPTY_STATS },
        bySource: bySource || {},
        items: (results || []).map((r) => ({
          symbol: r.symbol,
          raw: r.raw,
          bucket: r.bucket,
          reason: r.reason,
          outcome: r.outcome,
          source: r.source || null,
          detail: r.detail || null,
          bytes: r.bytes || null,
          sources: r.sources,
        })),
      },
      null,
      2
    )
  );
  console.log("");
  console.log(`report -> ${JSON_OUT}`);
}

/* ------------------------------------------------------------------ */
/* Main                                                               */
/* ------------------------------------------------------------------ */

async function main() {
  console.log("");
  console.log("Crypto icon sync");
  console.log(`  icons     ${ICON_DIR}`);
  console.log(`  mode      ${APPLY ? "APPLY (writes files)" : "DRY-RUN (reports only, pass --apply to write)"}`);
  console.log(`  format    ${SIZE}x${SIZE} webp, alpha, circle=${CIRCLE}`);
  console.log("");

  const icons = loadExistingIcons();
  console.log(`  ${icons.bySymbol.size} existing icons on disk`);
  if (icons.placeholders.size) {
    console.log(
      `  ${icons.placeholders.size} of them are byte-identical copies of generic.webp ` +
        `-> counted as MISSING (e.g. ${[...icons.placeholders].slice(0, 6).join(", ")})`
    );
  }

  if (LIST_FAMILY) {
    console.log("");
    console.log("Shared exchange-family badge groups (intentional art, NOT missing):");
    for (const g of familyBadgeGroups(icons.byHash, icons.placeholders)) {
      console.log(`  ${g.hash} x${String(g.count).padStart(4)}  ${g.sample.join(", ")}`);
    }
    return;
  }

  /* ---- collect symbols ---- */
  const { found, skipped, fiatCodes } = await collectSymbols();
  if (skipped.length) console.log(`  skipped sources: ${skipped.join(", ")}`);
  const tokenMeta = await collectTokenMeta();
  console.log(`  ${found.size} distinct symbols across the catalog tables`);

  /* ---- determine what is missing ---- */
  const buckets = new Map();
  const missing = [];
  for (const [n, info] of found) {
    buckets.set(n, info.bucket);
    const hit = icons.bySymbol.get(n);
    const isPlaceholder = icons.placeholders.has(n);
    if (hit && !isPlaceholder && !OVERWRITE) continue;
    missing.push({
      symbol: n,
      raw: info.raw,
      bucket: info.bucket,
      enabled: !!info.enabled,
      sources: [...info.sources],
      reason: hit ? (isPlaceholder ? "placeholder" : "overwrite") : "absent",
    });
  }

  const byBucket = missing.reduce((acc, m) => {
    acc[m.bucket] = (acc[m.bucket] || 0) + 1;
    return acc;
  }, {});
  console.log("");
  console.log(`MISSING: ${missing.length}`);
  for (const [b, c] of Object.entries(byBucket).sort((a, b2) => b2[1] - a[1])) {
    console.log(`  ${b.padEnd(6)} ${String(c).padStart(5)}`);
  }
  const placeholderCount = missing.filter((m) => m.reason === "placeholder").length;
  if (placeholderCount) {
    console.log(`  (${placeholderCount} of these have a file that is the generic placeholder)`);
  }

  /**
   * The number that actually matters operationally. Everything else is a
   * pre-emptive backfill for rows an admin has not switched on yet.
   */
  const liveMissing = missing.filter((m) => m.enabled);
  console.log("");
  console.log(`  of which ENABLED (user-visible right now): ${liveMissing.length}`);
  if (liveMissing.length) {
    console.log(`    ${liveMissing.map((m) => m.symbol).sort().join(", ")}`);
  }

  /* ---- filter to the requested work ---- */
  // `fx` (stocks, indices, commodities) is excluded by default: those need
  // company-logo sources with trademark implications, not a crypto logo API.
  // Ask for it explicitly with --only=fx once you have chosen a source.
  const defaultBuckets = ["cex", "eco", "fiat"];
  let work = missing;
  if (ENABLED_ONLY) work = work.filter((m) => m.enabled);
  if (SYMBOLS) {
    const want = new Set(SYMBOLS.map(norm));
    work = work.filter((m) => want.has(m.symbol));
  } else {
    const want = new Set(ONLY || defaultBuckets);
    // `fiat` selects by ISO-code membership, not by bucket: codes like INR and
    // CHF also appear in exchange_market.pair, so bucket precedence labels them
    // `cex` and a bucket-only filter would miss exactly the rows a fiat run wants.
    work = work.filter((m) => want.has(m.bucket) || (want.has("fiat") && fiatCodes.has(m.symbol)));
  }
  work.sort((a, b) => a.symbol.localeCompare(b.symbol));

  if (!SYMBOLS && !ONLY) {
    const excluded = missing.length - work.length;
    if (excluded > 0) {
      console.log(`  ${excluded} excluded from this run (bucket not in ${defaultBuckets.join(",")}; use --only=fx)`);
    }
  }
  console.log(`  ${work.length} in scope for resolution`);

  if (!work.length) {
    console.log("");
    console.log("Nothing to do.");
    // Still emit the report — this is the success case, and the admin routes
    // treat a missing report file as a failed run.
    writeJsonReport({ icons, found, missing, byBucket, work, stats: null, bySource: null, results: [] });
    return;
  }

  /* ---- network indexes, only if their resolver can contribute ---- */
  const cryptoWork = work.some((m) => m.bucket !== "fiat");
  let tokenList = {};
  let cgIndex = {};
  if (cryptoWork && sourceEnabled("tokenlist")) {
    console.log("");
    tokenList = await buildTokenListIndex();
  }
  if (cryptoWork && sourceEnabled("coingecko")) {
    console.log("");
    cgIndex = await buildCoinGeckoIndex();
  }

  const ctx = {
    icons,
    tokenMeta,
    tokenList,
    cgIndex,
    buckets,
    fiatCodes,
    genericHash: icons.genericHash,
  };
  const chain = ALL_SOURCES.filter(sourceEnabled);
  /**
   * For a symbol we KNOW is a fiat currency, the flag is the correct art and
   * CoinGecko is a hazard: tickers like TRY, INR and BND all exist as crypto
   * tokens too, so leaving coingecko ahead of flag hands a fiat row a random
   * token's logo.
   */
  const fiatChain = [...chain].sort((a, b) => {
    const w = (s) => (s === "flag" ? -1 : s === "coingecko" ? 1 : 0);
    return w(a) - w(b);
  });
  console.log("");
  console.log(`Resolution chain: ${chain.join(" -> ")}`);
  console.log(`  for known fiat: ${fiatChain.join(" -> ")}`);
  console.log("");

  /* ---- resolve ---- */
  const stats = { written: 0, wouldWrite: 0, unresolved: 0, ambiguous: 0, failed: 0 };
  const bySource = {};
  const results = [];
  let budget = LIMIT;

  await mapLimit(work, CONCURRENCY, async (item) => {
    if (budget <= 0) {
      item.outcome = "skipped-limit";
      // Must still be pushed, or the report silently loses rows and the UI's
      // counts do not add up to the number of symbols in scope.
      results.push(item);
      return;
    }
    for (const src of fiatCodes.has(item.symbol) ? fiatChain : chain) {
      let r;
      try {
        r = await RESOLVERS[src](item.symbol, ctx);
      } catch (e) {
        if (VERBOSE) console.log(`  ${item.symbol}: ${src} threw ${String(e.message).slice(0, 60)}`);
        continue;
      }
      if (!r) continue;
      if (r.ambiguous) {
        item.outcome = "ambiguous";
        item.detail = r.ambiguous;
        stats.ambiguous++;
        results.push(item);
        return;
      }

      let converted;
      try {
        converted = await toHouseFormat(r.buffer);
      } catch (e) {
        if (VERBOSE) console.log(`  ${item.symbol}: convert failed (${String(e.message).slice(0, 50)})`);
        stats.failed++;
        item.outcome = "convert-failed";
        results.push(item);
        return;
      }

      // Reserve the budget slot HERE, synchronously, at the moment we commit to
      // writing. Checking it at task start instead lets every concurrent worker
      // pass the check before any of them decrements, overshooting --limit by up
      // to `concurrency`.
      if (budget <= 0) {
        item.outcome = "skipped-limit";
        results.push(item);
        return;
      }
      budget--;

      item.source = src;
      item.detail = r.detail;
      item.bytes = converted.buffer.length;
      item.circle = converted.circleApplied;
      bySource[src] = (bySource[src] || 0) + 1;

      if (APPLY) {
        fs.writeFileSync(path.join(ICON_DIR, iconFile(item.symbol)), converted.buffer);
        stats.written++;
        item.outcome = "written";
      } else {
        stats.wouldWrite++;
        item.outcome = "would-write";
      }
      if (VERBOSE) {
        console.log(
          `  ${item.symbol.padEnd(18)} ${src.padEnd(18)} ${String(item.bytes).padStart(5)}B  ${r.detail || ""}`
        );
      }
      results.push(item);
      return;
    }
    item.outcome = "unresolved";
    stats.unresolved++;
    results.push(item);
  });

  /* ---- report ---- */
  console.log("");
  console.log(`${APPLY ? "WROTE" : "WOULD WRITE"}: ${APPLY ? stats.written : stats.wouldWrite}`);
  for (const [s, c] of Object.entries(bySource).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${s.padEnd(18)} ${String(c).padStart(5)}`);
  }
  console.log("");
  console.log(`unresolved      ${String(stats.unresolved).padStart(5)}  (no source had a logo)`);
  if (stats.ambiguous) {
    console.log(`ambiguous       ${String(stats.ambiguous).padStart(5)}  (ticker collision, refused to guess — see --max-ambiguity)`);
  }
  if (stats.failed) console.log(`convert-failed  ${String(stats.failed).padStart(5)}`);

  const unresolvedList = results.filter((r) => r.outcome === "unresolved").map((r) => r.symbol);
  if (unresolvedList.length) {
    console.log("");
    console.log(`unresolved sample: ${unresolvedList.slice(0, 30).join(", ")}${unresolvedList.length > 30 ? " …" : ""}`);
  }

  writeJsonReport({ icons, found, missing, byBucket, work, stats, bySource, results });

  if (!APPLY && (stats.wouldWrite > 0 || stats.ambiguous > 0)) {
    console.log("");
    console.log("Re-run with --apply to write these files.");
  }
}

main()
  .then(() => sequelize.close())
  .catch(async (e) => {
    console.error("");
    console.error("FAILED:", e && e.stack ? e.stack : e);
    await sequelize.close();
    process.exit(1);
  });
