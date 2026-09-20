#!/usr/bin/env node
/**
 * A DEMO MARKETPLACE FOR THE P2P SECTION — localhost only.
 *
 *   node scripts/p2p-demo/index.mjs              seed at scale 1
 *   node scripts/p2p-demo/index.mjs --scale 3    a bigger market
 *   node scripts/p2p-demo/index.mjs --drop       remove everything it made
 *   node scripts/p2p-demo/index.mjs --audit      just re-check the escrow
 *
 * WHAT PROBLEM THIS SOLVES
 * ------------------------
 * The P2P rework computes a trust record for every counterparty — completion
 * rate, average release time, "you've traded with them before", the Traders
 * lens ranking, the reasons under each pick — and on a fresh install all of it
 * renders as ABSENT. Every card reads "New trader — no completed trades yet",
 * `PriceDelta` prints nothing because there is no same-pair average to compare
 * against, and the picks row has three near-identical offers to choose between.
 * The operator cannot tell working code from dead code.
 *
 * So this seeds a market with a RANGE in it: veterans who release in under a
 * minute, ordinary traders in the nineties, a couple who are scrupulously
 * honest and take a quarter of an hour, genuine newcomers, and one account with
 * a record bad enough to exercise the caution styling.
 *
 * FLAGS
 *   --scale N        multiplies the cast and the board. Default 1.
 *   --drop           remove every row this seeder owns, and nothing else.
 *   --audit          run the escrow reconciliation and exit.
 *   --viewer EMAIL   whose account gets a shared trade history with three of
 *                    the traders, so "you've traded with them before" renders.
 *                    Defaults to the first Super Admin.
 *   --no-viewer      skip that entirely.
 *   --no-currencies  do not switch on the fiat `currency` rows the board quotes.
 *
 * SAFETY
 *   Everything carries the id namespace `de000000-0000-4000-8000-` and the tag
 *   `p2pdemo`, distinct from the e2e harness's `e2e00000-…` / `p2pe2e`. The two
 *   datasets coexist; `node e2e/p2p/api-suite.mjs` stays green with this
 *   standing, and dropping either leaves the other alone.
 */

import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { auditEscrow } from "./lib/audit.mjs";
import { DEMO_PASSWORD, connect, loadArgon2 } from "./lib/db.mjs";
import { dropAll } from "./lib/drop.mjs";
import { buildPlan } from "./lib/plan.mjs";
import { enableFiats, restoreFiats, writePlan } from "./lib/write.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
/**
 * What `--drop` needs to know that the rows themselves cannot say: which fiat
 * `currency` rows were switched OFF before the seeder switched them on. Kept
 * beside the script rather than in the `settings` table, because a marker row
 * in `settings` shows up on the operator's own settings screen.
 */
const STATE_FILE = join(HERE, ".demo-state.json");

/* --------------------------------------------------------------------------
   Arguments
   -------------------------------------------------------------------------- */

const argv = process.argv.slice(2);
const has = (flag) => argv.includes(flag);
const value = (flag, fallback = null) => {
  const i = argv.indexOf(flag);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : fallback;
};

const MODE = has("--drop") ? "drop" : has("--audit") ? "audit" : "seed";
const SCALE = (() => {
  const raw = Number(value("--scale", "1"));
  if (!Number.isFinite(raw) || raw <= 0) {
    process.stderr.write("--scale must be a positive number\n");
    process.exit(2);
  }
  return raw;
})();

const out = (line = "") => process.stdout.write(`${line}\n`);
const step = (line) => out(`  ${line}`);

/* --------------------------------------------------------------------------
   Main
   -------------------------------------------------------------------------- */

const conn = await connect();
try {
  if (MODE === "audit") {
    await reportAudit();
  } else if (MODE === "drop") {
    out("Removing the P2P demo market");
    await dropAll(conn, { log: step });
    await restoreCurrencies();
    out("\nDone. The e2e fixture and every real row are untouched.");
  } else {
    await seed();
  }
} finally {
  await conn.end();
}

/* --------------------------------------------------------------------------
   Seed
   -------------------------------------------------------------------------- */

async function seed() {
  out(`Seeding the P2P demo market (scale ${SCALE})`);

  /*
    EVERY ARGUMENT IS VALIDATED BEFORE ANYTHING IS DESTROYED.

    `resolveViewer` exits with a usage error when `--viewer` names an account
    that does not exist. Resolving it after the clear below meant a typo in an
    email address deleted the standing demo market and then refused to build a
    new one — the operator is left with less than they started with, for a
    mistake the script could see before touching a row.
  */
  const viewer = has("--no-viewer") ? null : await resolveViewer();

  /*
    IDEMPOTENCY IS A CLEAN SLATE, NOT AN UPSERT.

    Ids are deterministic, so a second run could upsert row by row — but the
    cast, the offer count and the trade count all move with `--scale`, so a run
    at a smaller scale would leave the previous run's tail standing and the
    escrow arithmetic would then be balancing a dataset that is no longer the
    one on the page. Removing this seeder's own rows first is the only version
    of "running it twice does not double anything" that is also true when the
    two runs disagree about how big the market should be.
  */
  await dropAll(conn, { log: () => {} });

  const rates = await platformFiatRates();
  // AFTER the clear, deliberately: this reads the level the board is already
  // quoting each pair at, and it must not see the previous run's own prices or
  // the demo would slowly drift away from the market it is supposed to join.
  const pairPrices = await boardPairPrices();

  const plan = buildPlan({ scale: SCALE, rates, pairPrices, viewer });

  const argon2 = loadArgon2();
  const passwordHash = await argon2.hash(DEMO_PASSWORD);

  await writePlan(conn, plan, { passwordHash, log: step });

  /* Fiat rows the board quotes in. */
  let currencyState = { enabled: [], previouslyDisabled: [] };
  if (!has("--no-currencies")) {
    const fiats = [...new Set(plan.offers.map((o) => o.priceCurrency))];
    currencyState = await enableFiats(conn, fiats);
    if (currencyState.previouslyDisabled.length) {
      step(
        `switched on ${currencyState.previouslyDisabled.length} fiat currencies so the ` +
          `locale detector can quote them: ${currencyState.previouslyDisabled.join(", ")}`
      );
    }
  }
  /*
    The record of what was switched on is a UNION across runs, not a snapshot of
    the last one. Seeding at scale 3 and then at scale 1 can quote fewer
    corridors, and a state file that only remembered the second run would leave
    the first run's currencies switched on with nothing left to say so.
  */
  writeFileSync(
    STATE_FILE,
    JSON.stringify(
      {
        seededAt: new Date().toISOString(),
        scale: SCALE,
        currenciesEnabled: [
          ...new Set([...(readState().currenciesEnabled ?? []), ...currencyState.previouslyDisabled]),
        ],
      },
      null,
      2
    )
  );

  out("");
  await summarise(plan, viewer);
  const audit = await reportAudit();
  if (!audit.ok) process.exitCode = 1;
}

/* --------------------------------------------------------------------------
   Reporting
   -------------------------------------------------------------------------- */

async function summarise(plan, viewer) {
  const byArchetype = new Map();
  for (const trader of plan.traders) {
    if (!byArchetype.has(trader.archetypeLabel)) byArchetype.set(trader.archetypeLabel, []);
    byArchetype.get(trader.archetypeLabel).push(trader);
  }

  out("The cast");
  for (const [label, group] of byArchetype) {
    const completed = group.map((t) => t.target.completed);
    const rates = group.map((t) => t.target.rate);
    const release = group.map((t) => t.target.release).filter((r) => r !== null);
    const releaseText = release.length
      ? `, release ${Math.min(...release)}-${Math.max(...release)}s`
      : ", no release history";
    step(
      `${String(group.length).padStart(2)} × ${label} — ` +
        `${Math.min(...completed)}-${Math.max(...completed)} completed, ` +
        `${Math.min(...rates)}-${Math.max(...rates)}%${releaseText}`
    );
  }

  const live = plan.offers.filter((o) => o.purpose === "live");
  const countries = new Set(live.map((o) => o.country));
  const fiats = new Set(live.map((o) => o.priceCurrency));
  const assets = new Set(live.map((o) => o.currency));
  const byStatus = live.reduce((acc, o) => ((acc[o.status] = (acc[o.status] ?? 0) + 1), acc), {});
  const sells = live.filter((o) => o.type === "SELL").length;

  out("");
  out("The board");
  step(
    `${live.length} live offers — ${sells} SELL / ${live.length - sells} BUY, ` +
      `across ${countries.size} countries, ${fiats.size} fiat currencies, ${assets.size} assets`
  );
  step(
    Object.entries(byStatus)
      .map(([k, v]) => `${v} ${k}`)
      .join(", ")
  );
  step(`countries: ${[...countries].sort().join(" ")}`);
  step(`fiats: ${[...fiats].sort().join(" ")}`);

  const openTrades = plan.trades.filter((t) => t.live);
  out("");
  out("Live trades");
  for (const state of ["PENDING", "PAYMENT_SENT", "DISPUTED"]) {
    const rows = openTrades.filter((t) => t.status === state);
    step(`${rows.length} ${state}`);
  }

  /*
    THE e2e SUITE LOOKS FOR ITS OWN OFFER IN A BOARD PAGE OF 100.

    `api-suite.mjs` asserts its freshly published SELL offer appears in
    `/api/p2p/market/board?side=buy&currency=USDT&limit=100`. The demo's
    veterans score far higher than a brand-new fixture maker, so at a large
    enough scale they would fill that page and push the fixture's offer off it —
    a suite failure that has nothing to do with the code under test. Said out
    loud rather than discovered.
  */
  const [{ n: usdtSells }] = (
    await conn.execute(
      `SELECT COUNT(*) AS n FROM p2p_offers
        WHERE status = 'ACTIVE' AND type = 'SELL' AND currency = 'USDT' AND deletedAt IS NULL`
    )
  )[0];
  const [{ n: activeOffers }] = (
    await conn.execute(
      `SELECT COUNT(*) AS n FROM p2p_offers WHERE status = 'ACTIVE' AND deletedAt IS NULL`
    )
  )[0];

  const warnings = [];
  if (Number(usdtSells) > 80) {
    warnings.push(
      `${usdtSells} active USDT SELL offers exist. The e2e suite pages the board at limit=100; ` +
        `above that its own offer can be pushed off page one.`
    );
  }
  /*
    The read endpoints are BOUNDED, and the bounds are documented as real
    limitations rather than rounding errors: `market/traders.get.ts` scans 400
    offers and `market/board.get.ts` 600, after which the board reports
    `truncated: true` and the traders lens silently shows only the most recently
    listed. A demo big enough to cross them stops demonstrating the product and
    starts demonstrating its caps.
  */
  if (Number(activeOffers) > 380) {
    warnings.push(
      `${activeOffers} active offers exist. The traders lens scans 400 and the board 600; ` +
        `past those the surfaces truncate and no longer show the whole market.`
    );
  }
  if (warnings.length) {
    out("");
    for (const w of warnings) out(`  WARNING: ${w}`);
    out("  Re-seed at a lower --scale if either matters to what you are looking at.");
  }

  if (viewer) {
    const withViewer = plan.trades.filter((t) => t.buyerId === viewer.id).length;
    out("");
    out("The viewer");
    step(
      `${withViewer} trades where ${viewer.email} is the BUYER — that is what makes ` +
        `"you've traded with them before" and the pinned repeat traders render`
    );
    step("the viewer is never a seller here, so their real wallet is never rewritten");
  }

  out("");
  out(`Sign in as any demo trader with the password: ${plan.password}`);
  step(`for example ${plan.traders[0].email}`);
  out(`Open http://localhost:3000/en/p2p/market`);
}

async function reportAudit() {
  const result = await auditEscrow(conn);
  out("");
  out("Escrow reconciliation");
  if (result.ok) {
    step(
      `${result.checked} demo wallets check out — every held coin is backed by an ` +
        `open commitment (${result.totalHeld.toLocaleString()} held in total)`
    );
  } else {
    step(`FAILED across ${result.checked} wallets:`);
    for (const problem of result.problems.slice(0, 20)) step(`  ${problem}`);
    if (result.problems.length > 20) step(`  …and ${result.problems.length - 20} more`);
  }
  return result;
}

/* --------------------------------------------------------------------------
   Environment
   -------------------------------------------------------------------------- */

/**
 * The platform's own fiat rates, so the demo board quotes prices the rest of
 * the install already believes. `currency.price` is UNITS PER USD — a fact this
 * repo has a memory of getting backwards.
 */
async function platformFiatRates() {
  const [rows] = await conn.execute(`SELECT id, price FROM currency`);
  const rates = {};
  for (const row of rows) {
    const price = Number(row.price);
    if (Number.isFinite(price) && price > 0) rates[row.id] = price;
  }
  return rates;
}

/**
 * The MEDIAN price each pair is already quoted at on this board.
 *
 * Runs after the demo's own rows have been cleared, so it only ever sees offers
 * this seeder does not own — the level to fit into, not the level it last set.
 * Median rather than mean because one mispriced listing must not drag a whole
 * corridor, which is the same reason the board itself publishes a same-side
 * average rather than a two-sided mid.
 */
async function boardPairPrices() {
  const [rows] = await conn.execute(
    `SELECT currency, priceCurrency,
            CAST(JSON_UNQUOTE(JSON_EXTRACT(priceConfig,'$.finalPrice')) AS DECIMAL(30,10)) AS price
       FROM p2p_offers
      WHERE status = 'ACTIVE' AND deletedAt IS NULL AND priceCurrency IS NOT NULL`
  );
  const buckets = new Map();
  for (const row of rows) {
    const price = Number(row.price);
    if (!Number.isFinite(price) || price <= 0) continue;
    const key = `${row.currency}|${row.priceCurrency}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(price);
  }
  const out = {};
  for (const [key, prices] of buckets) {
    prices.sort((a, b) => a - b);
    out[key] = prices[Math.floor(prices.length / 2)];
  }
  return out;
}

/**
 * Whose account gets a shared history with the cast.
 *
 * Defaults to the first Super Admin because that is the account an operator
 * running a local install is signed in as, and the personalised half of the
 * market — repeat counterparties pinned to the front of the Traders lens, the
 * "+12" that `scoreOffer` gives somebody you have dealt with — is invisible
 * from a guest session.
 */
async function resolveViewer() {
  const email = value("--viewer");
  if (email) {
    const [rows] = await conn.execute(`SELECT id, email FROM user WHERE email = ? LIMIT 1`, [email]);
    if (!rows[0]) {
      process.stderr.write(`--viewer ${email} is not an account on this install\n`);
      process.exit(2);
    }
    return rows[0];
  }
  const [rows] = await conn.execute(
    `SELECT u.id, u.email FROM user u
       JOIN role r ON r.id = u.roleId
      WHERE r.name = 'Super Admin' AND u.deletedAt IS NULL
      ORDER BY u.createdAt ASC LIMIT 1`
  );
  return rows[0] ?? null;
}

function readState() {
  try {
    return JSON.parse(readFileSync(STATE_FILE, "utf8"));
  } catch {
    return {};
  }
}

async function restoreCurrencies() {
  const state = readState();
  if (!state.seededAt) {
    step("no seed state file — leaving the `currency` table alone");
    return;
  }
  const codes = state.currenciesEnabled ?? [];
  if (codes.length) {
    const n = await restoreFiats(conn, codes);
    step(`switched ${n} fiat currencies back off: ${codes.join(", ")}`);
  }
  try {
    rmSync(STATE_FILE);
  } catch {
    /* already gone */
  }
}
