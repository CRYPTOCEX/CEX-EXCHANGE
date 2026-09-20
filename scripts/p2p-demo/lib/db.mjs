/**
 * Connection, identity and arithmetic primitives for the P2P demo dataset.
 *
 * THE DATABASE CONFIG IS IMPORTED, NOT RE-READ.
 * ---------------------------------------------
 * `e2e/shared/env.mjs` already resolves the repo's own `.env` and the
 * mysql2/argon2 installs that only the backend carries. Re-implementing that
 * here would create a second opinion about which database the demo writes to,
 * and a seeder pointed at a different database than the running server is the
 * classic way a "it worked, but the page is still empty" afternoon starts.
 *
 * This used to import from `e2e/p2p/lib/env.mjs` - one suite's private helper.
 * That file is gone: the test tree now has a single shared layer, and this is a
 * deliberate public entry point of it rather than a reach into someone's
 * internals. The values are the same ones the suites use.
 */

import { DB, loadArgon2, loadMysql } from "../../../e2e/shared/env.mjs";

const mysql = loadMysql();

/* --------------------------------------------------------------------------
   Identity
   -------------------------------------------------------------------------- */

/**
 * ONE PREFIX FOR EVERY ROW THIS SEEDER OWNS.
 *
 * `--drop` is a single `id LIKE 'de000000-0000-4000-8000-%'` per table, so the
 * predicate cannot reach an operator's real row: a randomly generated UUID
 * would have to collide on 24 fixed hex characters.
 *
 * Deliberately NOT the e2e harness's `e2e00000-0000-4000-8000-` namespace. The
 * two datasets live in the same database at the same time and must be able to
 * be torn down independently — `node e2e/p2p/api-suite.mjs` has to stay green
 * with a demo market standing, and dropping the demo must not disturb the
 * suite's fixture.
 *
 * The letters are constrained to hex because `p2pOffer` / `p2pTrade` validate
 * their id columns with `isUUID: { args: 4 }`; a mnemonic like "demo" would be
 * rejected the moment any API route wrote to one of these rows.
 */
export const ID_PREFIX = "de000000-0000-4000-8000-";

/** Everything human-readable carries this so an operator can spot it at a glance. */
export const TAG = "p2pdemo";

/** The demo accounts all share it. Printed by the seeder so an operator can sign in. */
export const DEMO_PASSWORD = "P2pDemo!Market2026";

/** `<local-part>@localhost.invalid` — a reserved TLD, so no mail can ever escape. */
export const EMAIL_DOMAIN = "localhost.invalid";

/**
 * Namespaced id minting.
 *
 * Ids are DERIVED from (kind, sequence) rather than generated, which is what
 * makes a second run reuse rows instead of piling a fresh market on top of the
 * last one. The kind byte keeps the namespaces from colliding as the cast grows.
 */
const KIND = {
  user: "01",
  method: "02",
  offer: "03",
  trade: "04",
  review: "05",
  dispute: "06",
  wallet: "07",
};

export function demoId(kind, seq) {
  const prefix = KIND[kind];
  if (!prefix) throw new Error(`demoId: unknown kind ${kind}`);
  return ID_PREFIX + prefix + seq.toString(16).padStart(10, "0");
}

/* --------------------------------------------------------------------------
   Determinism
   -------------------------------------------------------------------------- */

/**
 * A seeded PRNG, so the same `--scale` always produces the same market.
 *
 * `Math.random()` would make every run a different marketplace, which breaks
 * idempotency in the way that actually matters: re-running would leave the same
 * row COUNT but different contents, so a screenshot, a bug report or a support
 * conversation about "the trader with 412 trades" would stop referring to
 * anything. mulberry32 is four lines and needs no dependency.
 */
export function rng(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick(random, list) {
  return list[Math.floor(random() * list.length) % list.length];
}

export function between(random, lo, hi) {
  return lo + random() * (hi - lo);
}

export function intBetween(random, lo, hi) {
  return Math.floor(between(random, lo, hi + 1));
}

/** Deterministic, non-destructive shuffle. */
export function shuffled(random, list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/* --------------------------------------------------------------------------
   Money
   -------------------------------------------------------------------------- */

/**
 * Crypto amounts are quantised to 8 decimals and summed as integers.
 *
 * The escrow audit compares a wallet's `inOrder` against the sum of what the
 * open offers and live trades say should be held, with a tolerance of 1e-8.
 * `p2p_offers.amountConfig.total` is JSON text, `p2p_trades.escrowAmount` is a
 * DOUBLE and `wallet.inOrder` is DECIMAL(36,18) — three different numeric
 * regimes for one quantity. Adding a hundred doubles and writing the result
 * into a DECIMAL is exactly how a 3e-9 drift appears in a figure that is
 * supposed to reconcile exactly. Rounding every amount to the same grid first,
 * and adding on that grid, removes the question.
 */
export const SATOSHI = 1e8;

export function q8(n) {
  return Math.round(Number(n) * SATOSHI) / SATOSHI;
}

export function sum8(values) {
  let units = 0;
  for (const v of values) units += Math.round(Number(v) * SATOSHI);
  return units / SATOSHI;
}

/** Fiat figures render in whole units on the board; keep them tidy. */
export function roundTo(n, step) {
  return Math.round(n / step) * step;
}

/* --------------------------------------------------------------------------
   Connection
   -------------------------------------------------------------------------- */

export async function connect() {
  return mysql.createConnection({
    host: DB.host,
    port: DB.port,
    user: DB.user,
    password: DB.password,
    database: DB.database,
    multipleStatements: false,
    // Every JSON column on `p2p_offers` is LONGTEXT here. Letting the driver
    // hand back strings uniformly means this seeder writes plain, once-encoded
    // JSON text — which is what `utils/visibility.ts` documents the parser
    // wanting, and what the model's own setter produces on a good day.
    typeCast: true,
    dateStrings: true,
  });
}

export { loadArgon2 };

/**
 * Chunked multi-row INSERT.
 *
 * A veteran's history is several hundred rows and the cast has fifteen of them;
 * one round trip per row turns a two-second seed into a two-minute one.
 */
export async function insertRows(conn, table, columns, rows, { chunk = 200 } = {}) {
  if (!rows.length) return 0;
  const colSql = columns.map((c) => `\`${c}\``).join(",");
  const placeholder = `(${columns.map(() => "?").join(",")})`;
  let written = 0;
  for (let i = 0; i < rows.length; i += chunk) {
    const slice = rows.slice(i, i + chunk);
    const values = [];
    for (const row of slice) for (const col of columns) values.push(row[col] ?? null);
    await conn.query(
      `INSERT INTO \`${table}\` (${colSql}) VALUES ${slice.map(() => placeholder).join(",")}`,
      values
    );
    written += slice.length;
  }
  return written;
}

/** MySQL DATETIME text. The columns are DATETIME, not TIMESTAMP — no zone. */
export function sqlDate(d) {
  if (!d) return null;
  const pad = (n, w = 2) => String(n).padStart(w, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}
