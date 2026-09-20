/**
 * seed-docs-trading.ts — plausible content for the TRADING surfaces that render empty.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS EXISTS
 * ---------------------------------------------------------------------------
 * ~600 documentation pages are about to get real screenshots of this platform.
 * A screenshot of an empty state teaches a reader nothing and makes the product
 * look dead. `C:/tmp/docshots/empty-surfaces.json` lists every table that is at
 * zero rows and names the routes each one starves. This script fills the
 * TRADING half of that list:
 *
 *   DEX / Web3      dex_pair, dex_pool, dex_pool_position, dex_swap,
 *                   dex_wallet_link (+ dex_pool_risk_ack, which is a NOT NULL
 *                   FK from a position and therefore not optional)
 *   Forex desk      fx_account_group, fx_routing_rule, fx_economic_event,
 *                   fx_order, fx_position (+ fx_account for the personas)
 *   Forex plans     forex_plan_duration, forex_account_signal
 *                   (+ forex_signal / forex_account for the personas)
 *   Trading bots    trading_bot_strategy, trading_bot_purchase,
 *                   trading_bot_strategy_review, trading_bot_order
 *                   (+ trading_bot / trading_bot_trade for the personas)
 *   Binary AI       binary_ai_engine_position, binary_ai_engine_cohort
 *                   (+ binary_order rows for the positions to point at)
 *   Terminal        exchange_watchlist
 *
 * ---------------------------------------------------------------------------
 * THE THREE RULES THIS FILE OBEYS
 * ---------------------------------------------------------------------------
 * 1. IT NEVER TOUCHES `johndoe3dmodeller@gmail.com`. That is the owner's real
 *    personal account. Every row here hangs off a persona this script created,
 *    at `@example.com`, so no real address can reach a published screenshot.
 *    The existing fx_account / forex_account / trading_bot rows all belong to
 *    the owner; this script creates its OWN and leaves those alone.
 *
 * 2. IDEMPOTENT. Every id is derived from a stable key by `sid()`, so a second
 *    run UPDATES the same rows rather than duplicating them. Re-running is the
 *    supported way to refresh the relative dates.
 *
 * 3. REVERSIBLE. Every id this script mints looks like `d0c5....-7d1a-4...`
 *    — `d0c5` is the marker every documentation seeder shares and `7d1a` is
 *    this one's alone, so undo cannot reach a sibling script's rows.
 *        npx tsx -r dotenv/config scripts/seed-docs-trading.ts \
 *            dotenv_config_path=../.env --undo
 *    deletes exactly those rows, in FK-safe order, and nothing else. The one
 *    thing `--undo` cannot recover from an id is the handful of fx_instrument
 *    rows switched ACTIVE (see ACTIVATED_INSTRUMENTS); undo switches those back
 *    to INACTIVE, which is the state they were in when this was written.
 *
 * ---------------------------------------------------------------------------
 * ARITHMETIC IS LOAD-BEARING
 * ---------------------------------------------------------------------------
 * A reader of these docs is a trader. A screenshot whose numbers do not add up
 * is worse than no screenshot. So nothing here is a typed-in "looks about
 * right" figure: every derived quantity is COMPUTED from a small set of
 * declared prices —
 *
 *   - a V3 pool's sqrtPriceX96 is derived from its declared price and the two
 *     token decimals; its poolLiquidity is the full-range L for the token0
 *     balance; its liquidityUsd is the sum of both legs at the declared prices
 *   - a V2 pool's reserve1 follows from reserve0 and the price; totalSupply is
 *     the geometric mean, as the Uniswap v2 mint does it
 *   - a swap's executionPrice is buyDisplay / sellDisplay, its slippage bps is
 *     the quoted-vs-realized difference, and both USD legs use the same table
 *   - a pair's lastPrice is consistent ACROSS pairs: WBTC/WETH is exactly
 *     WBTC/USDC divided by WETH/USDC
 *   - a closed fx position's realizedPnl is (close-entry)*amount for a BUY and
 *     (entry-close)*amount for a SELL, converted quote -> USD, exactly as
 *     `utils/engine/margin.ts` computes it; commission and swap stay in their
 *     own columns because the engine books them separately
 *   - a bot trade's cost is amount*price and its profitPercent follows from
 *     entry and exit
 *   - a strategy's totalRevenue is the sum of its purchases, split into
 *     creatorRevenue and platformRevenue at the recorded fee percent
 *
 * ---------------------------------------------------------------------------
 * RUN
 * ---------------------------------------------------------------------------
 *     cd C:/xampp/htdocs/v5/backend
 *     npx tsx -r dotenv/config scripts/seed-docs-trading.ts dotenv_config_path=../.env
 *     npx tsx -r dotenv/config scripts/seed-docs-trading.ts dotenv_config_path=../.env --undo
 *
 * Add `--admin-persona` on a LOCAL database to make docs.operations@example.com
 * a Super Admin, which is what the capture harness needs to photograph an
 * /admin page without logging in as the owner. Off by default; see the note
 * beside WANT_ADMIN_PERSONA.
 */

import { createHash } from "crypto";
import { models, sequelize } from "@b/db";
import { hashPassword } from "@b/utils/passwords";

/* ========================================================================== */
/* Identity, idempotency, teardown                                            */
/* ========================================================================== */

/**
 * `d0c5` ("docs") is the family marker the OTHER documentation seeders use too
 * — `seed-docs-products.ts` mints `d0c5<area>-0000-4000-8000-<n>` and sweeps
 * `d0c5%` on undo.
 *
 * SHARING A PREFIX AND NOT SHARING A TEARDOWN PATTERN IS A REAL BUG, AND IT
 * ALREADY BIT: an earlier `--undo` here matched `id LIKE 'd0c5%'` and deleted
 * twelve of that script's persona users along with this one's nine.
 *
 * So the family marker stays (a global "remove every docs row" sweep must
 * still find these), and this script's own rows carry a SECOND marker — the
 * literal group `7d1a` — that nothing else writes. `--undo` here matches
 * `d0c5%-7d1a-4%` and therefore cannot reach another seeder's rows.
 */
const FAMILY_PREFIX = "d0c5";
const OWN_MARKER = "7d1a";
/** The LIKE pattern that matches this script's rows and only this script's. */
const TEARDOWN_LIKE = `${FAMILY_PREFIX}%-${OWN_MARKER}-4%`;

/**
 * A stable UUID for a logical key.
 *
 * Deterministic so a re-run updates rather than duplicates, and doubly marked
 * so `--undo` can find every row this script has ever written without keeping
 * a manifest that could drift from reality.
 */
function sid(key: string): string {
  const h = createHash("sha1").update(`docs-trading:${key}`).digest("hex");
  return [
    FAMILY_PREFIX + h.slice(4, 8),
    OWN_MARKER,
    "4" + h.slice(13, 16),
    "8" + h.slice(17, 20),
    h.slice(20, 32),
  ].join("-");
}

/** A synthetic but structurally valid lowercase EVM address, stable for a key. */
function synthAddress(key: string): string {
  return "0x" + createHash("sha1").update(`docs-addr:${key}`).digest("hex").slice(0, 40);
}

/** A synthetic but structurally valid 32-byte hash, stable for a key. */
function synthHash(key: string): string {
  return "0x" + createHash("sha256").update(`docs-hash:${key}`).digest("hex");
}

const counts: Record<string, { created: number; updated: number }> = {};
function tally(table: string, created: boolean) {
  if (!counts[table]) counts[table] = { created: 0, updated: 0 };
  if (created) counts[table].created++;
  else counts[table].updated++;
}

/**
 * Create-or-update by primary key.
 *
 * `paranoid: false` on the read so a soft-deleted leftover is found and revived
 * rather than colliding on the PK; every paranoid model here is therefore
 * handed an explicit `deletedAt: null`.
 *
 * `silent: true` so the explicit `updatedAt` in `values` is what lands — a
 * screenshot's "Updated" column should read like the story the rest of the row
 * tells, not like the moment the seeder ran.
 */
async function upsert(model: any, table: string, id: string, values: Record<string, any>) {
  const existing = await model.findByPk(id, { paranoid: false });
  if (existing) {
    await existing.update(values, { silent: true });
    tally(table, false);
    return existing;
  }
  const row = await model.create({ id, ...values }, { silent: true });
  tally(table, true);
  return row;
}

/* ========================================================================== */
/* Time                                                                       */
/* ========================================================================== */

/** One clock for the whole run, so every relative date is mutually coherent. */
const NOW = new Date();
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const ago = (ms: number) => new Date(NOW.getTime() - ms);
const ahead = (ms: number) => new Date(NOW.getTime() + ms);

/* ========================================================================== */
/* Personas                                                                   */
/* ========================================================================== */

/**
 * Eight traders and one operations account, all at @example.com.
 *
 * They exist because almost every table in this file has a NOT NULL `userId`
 * and the only populated accounts on this install are the owner's real one and
 * a handful of `dsagent...@example.com` probe rows whose names ("Design Agent")
 * read as test debris in a screenshot.
 *
 * `username` is the ONLY name other users see on the public surfaces, so it is
 * set explicitly rather than left to be derived from something private.
 */
const PERSONAS = [
  { key: "ava", first: "Ava", last: "Lindqvist", username: "ava_lindqvist", email: "ava.lindqvist@example.com" },
  { key: "marcus", first: "Marcus", last: "Bello", username: "marcus_bello", email: "marcus.bello@example.com" },
  { key: "priya", first: "Priya", last: "Raghunathan", username: "priya_r", email: "priya.raghunathan@example.com" },
  { key: "yuki", first: "Yuki", last: "Tanaka", username: "yuki_tanaka", email: "yuki.tanaka@example.com" },
  { key: "sofia", first: "Sofia", last: "Duarte", username: "sofia_duarte", email: "sofia.duarte@example.com" },
  { key: "liam", first: "Liam", last: "OConnor", username: "liam_oconnor", email: "liam.oconnor@example.com" },
  { key: "nadia", first: "Nadia", last: "Haddad", username: "nadia_haddad", email: "nadia.haddad@example.com" },
  { key: "tomas", first: "Tomas", last: "Kovac", username: "tomas_kovac", email: "tomas.kovac@example.com" },
  { key: "ops", first: "Docs", last: "Operations", username: "docs_ops", email: "docs.operations@example.com" },
] as const;

type PersonaKey = (typeof PERSONAS)[number]["key"];
const U = (k: PersonaKey) => sid(`user:${k}`);

/** Shared, obviously-synthetic password for every persona. */
const PERSONA_PASSWORD = "DocsDemo!2026";

/**
 * OPT-IN, AND OFF BY DEFAULT: `--admin-persona` gives the `docs.operations`
 * persona the Super Admin role.
 *
 * Why it is needed: every admin screenshot in this plan has to be taken as
 * SOMEBODY, and the only accounts on this install that can reach
 * /admin/dex/pool, /admin/forex-trading/execution or /admin/ai/binary-engine
 * are the owner's real one and five other real addresses. Rule one of this
 * exercise is that the owner's account is never logged into and never
 * photographed.
 *
 * Why it is not the default: the `Admin` role (roleId 2) holds 188 permission
 * rows and NONE of them covers dex, forex-trading, trading-bot or the binary
 * engine, so an Admin-role persona reaches none of the pages this script
 * fills. Super Admin (roleId 1) is checked by role NAME and holds zero
 * permission rows, which is why it works — and also why creating one with a
 * password written down in a checked-in script has to be a deliberate act on
 * a local database rather than something a seed does by accident.
 */
const WANT_ADMIN_PERSONA = process.argv.includes("--admin-persona");
const SUPER_ADMIN_ROLE_ID = 1;
const USER_ROLE_ID = 4;

async function seedPersonas() {
  const hashed = await hashPassword(PERSONA_PASSWORD);
  let i = 0;
  for (const p of PERSONAS) {
    i++;
    await upsert(models.user, "user", U(p.key), {
      email: p.email,
      password: hashed,
      firstName: p.first,
      lastName: p.last,
      username: p.username,
      emailVerified: true,
      phoneVerified: false,
      roleId: p.key === "ops" && WANT_ADMIN_PERSONA ? SUPER_ADMIN_ROLE_ID : USER_ROLE_ID,
      status: "ACTIVE",
      // Spread the signups so the binary-engine cohort windows below
      // (0-30 days, 30-90 days) actually have members on both sides.
      createdAt: ago((14 + i * 11) * DAY),
      updatedAt: ago(i * HOUR),
      deletedAt: null,
    });
  }
}

/* ========================================================================== */
/* SECTION 1 — DEX / Web3                                                     */
/* ========================================================================== */

/**
 * THE ONE PRICE TABLE. Every DEX number below is derived from these, so the
 * pair rail, the pool TVL, the LP position basis and the swap ledger cannot
 * disagree with each other.
 */
const USD: Record<string, number> = {
  ETH: 3120.0,
  WETH: 3120.0,
  BTC: 64850.0,
  WBTC: 64850.0,
  BTCB: 64850.0,
  BNB: 588.4,
  WBNB: 588.4,
  USDC: 1.0,
  USDT: 1.0,
  DAI: 1.0,
  CELO: 0.72,
};

/** decimals by (chainId, symbol) — read from dex_token at run time. */
type TokenRow = { id: string; chainId: number; symbol: string; address: string; decimals: number };
const tokens = new Map<string, TokenRow>();
const tkey = (chainId: number, symbol: string) => `${chainId}:${symbol}`;

async function loadTokens() {
  const rows = await models.dexToken.findAll({
    attributes: ["id", "chainId", "symbol", "address", "decimals"],
    raw: true,
  });
  for (const r of rows as any[]) tokens.set(tkey(r.chainId, r.symbol), r as TokenRow);
}

function tok(chainId: number, symbol: string): TokenRow {
  const t = tokens.get(tkey(chainId, symbol));
  if (!t) throw new Error(`dex_token ${chainId}:${symbol} is missing — reseed the token allowlist first`);
  return t;
}

/* -------------------------------------------------------------------------- */
/* AMM maths                                                                   */
/* -------------------------------------------------------------------------- */

const Q96 = 2n ** 96n;

/** 10^n as a BigInt. */
const pow10 = (n: number) => 10n ** BigInt(n);

/** Human amount -> raw integer string, without going through a lossy float. */
function toRaw(human: number, decimals: number): string {
  const s = human.toFixed(Math.min(decimals, 18));
  const [whole, frac = ""] = s.split(".");
  const padded = (frac + "0".repeat(decimals)).slice(0, decimals);
  const v = BigInt(whole) * pow10(decimals) + BigInt(padded || "0");
  return v.toString();
}

/**
 * Uniswap V3 sqrtPriceX96 for a declared HUMAN price of token1 per token0.
 *
 * The chain's price is a RAW ratio, so the decimals shift has to be applied
 * before the square root: rawPrice = price * 10^(dec1 - dec0), and
 * sqrtPriceX96 = sqrt(rawPrice) * 2^96.
 *
 * The multiply is staged through a fixed-point step because `sqrt * 2**96`
 * overflows a double's 53 bits of mantissa long before it reaches the uint160
 * the chain stores — doing it in floats gives a number of the right magnitude
 * and the wrong price.
 *
 * The step is scaled to the ROOT'S OWN EXPONENT rather than to a constant 1e9.
 * A fixed 1e9 carries fifteen digits for a root near 1e4 (WETH/USDC) and only
 * three for a root near 1e-6 (DAI/USDC at 6 vs 18 decimals) — which rounded
 * 0.99985 up to exactly 1.0000 and put a stablecoin pool on a perfect peg it
 * does not have. Anchoring the mantissa at ~1e15 gives every pool the same
 * fifteen significant digits regardless of how far apart its decimals are.
 */
function sqrtPriceX96For(price1Per0: number, dec0: number, dec1: number): string {
  const raw = price1Per0 * Math.pow(10, dec1 - dec0);
  const s = Math.sqrt(raw);
  const shift = 15 - Math.floor(Math.log10(s));
  return ((BigInt(Math.round(s * Math.pow(10, shift))) * Q96) / 10n ** BigInt(shift)).toString();
}

/** Integer square root, for the V2 LP totalSupply (the geometric mean). */
function isqrt(value: bigint): bigint {
  if (value < 2n) return value;
  let x = value;
  let y = (x + 1n) / 2n;
  while (y < x) {
    x = y;
    y = (x + value / x) / 2n;
  }
  return x;
}

/* -------------------------------------------------------------------------- */
/* Pools                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * `lpFeeShareBps` is NOT the fee tier. It is what the LP actually receives
 * after the pool's own protocol cut, in BPS OF THE TRADE:
 *   Uniswap V3 0.05% tier, protocol fee off  ->  5
 *   Uniswap V3 0.30% tier, protocol fee off  -> 30
 *   Uniswap V2 0.30% fee, 1/6 to protocol    -> 25
 *   PancakeSwap V2 0.25% fee, 0.08% to CAKE  -> 17
 * The model's own comment says a projection built on the tier number overstates
 * income by 17-20%, which is exactly the mistake these values avoid.
 */
type PoolSpec = {
  key: string;
  chainId: number;
  venueName: string;
  standard: "V2" | "V3";
  routerAbi: "V2_ROUTER02" | "V3_SWAP_ROUTER" | "V3_SWAP_ROUTER_02";
  factory: string;
  router: string;
  quoter?: string;
  positionManager?: string;
  poolAddress?: string;
  predictedAddress?: string;
  initCodeHash?: string;
  /** token0 MUST sort strictly before token1 on the lowercase address. */
  sym0: string;
  sym1: string;
  feeTier: number;
  lpFeeShareBps: number;
  tickSpacing?: number;
  state: "DRAFT" | "CREATED" | "SEEDING" | "ACTIVE" | "WITHDRAWING" | "RETIRED" | "FAILED";
  /** HUMAN price: how many token1 for one token0. */
  price1Per0: number;
  /** HUMAN balance of token0 held by the pool. token1 follows from the price. */
  amount0: number;
  createBlockNumber: number;
  seeded: boolean;
  ageDays: number;
};

const UNI_V3 = {
  factory: "0x1f98431c8ad98523631ae4a59f267346ea31f984",
  router: "0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45",
  quoter: "0x61ffe014ba17989e743c5f6cb21bf9697530b21e",
  positionManager: "0xc36442b4a4522e871399cd717abdd847ab11fe88",
};

const POOLS: PoolSpec[] = [
  {
    key: "uni-v3-eth-usdc-weth-500",
    chainId: 1,
    venueName: "uniswap-v3",
    standard: "V3",
    routerAbi: "V3_SWAP_ROUTER_02",
    ...UNI_V3,
    poolAddress: "0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640",
    sym0: "USDC",
    sym1: "WETH",
    feeTier: 500,
    lpFeeShareBps: 5,
    tickSpacing: 10,
    state: "ACTIVE",
    price1Per0: 1 / USD.ETH,
    amount0: 21_250_000,
    createBlockNumber: 12_376_729,
    seeded: false,
    ageDays: 240,
  },
  {
    key: "uni-v3-eth-wbtc-usdt-3000",
    chainId: 1,
    venueName: "uniswap-v3",
    standard: "V3",
    routerAbi: "V3_SWAP_ROUTER_02",
    ...UNI_V3,
    poolAddress: "0x9db9e0e53058c89e5b94e29621a205198648425b",
    sym0: "WBTC",
    sym1: "USDT",
    feeTier: 3000,
    lpFeeShareBps: 30,
    tickSpacing: 60,
    state: "ACTIVE",
    price1Per0: USD.BTC,
    amount0: 92.5,
    createBlockNumber: 12_380_212,
    seeded: false,
    ageDays: 233,
  },
  {
    key: "uni-v2-eth-dai-weth",
    chainId: 1,
    venueName: "uniswap-v2",
    standard: "V2",
    routerAbi: "V2_ROUTER02",
    factory: "0x5c69bee701ef814a2b6a3edd4b1652cb9cc5aa6f",
    router: "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
    poolAddress: "0xa478c2975ab1ea89e8196811f51a7b7ade33eb11",
    sym0: "DAI",
    sym1: "WETH",
    feeTier: 3000,
    lpFeeShareBps: 25,
    state: "ACTIVE",
    price1Per0: 1 / USD.ETH,
    amount0: 8_400_000,
    createBlockNumber: 10_042_267,
    seeded: false,
    ageDays: 300,
  },
  {
    key: "pcs-v2-bsc-usdt-wbnb",
    chainId: 56,
    venueName: "pancakeswap-v2",
    standard: "V2",
    routerAbi: "V2_ROUTER02",
    factory: "0xca143ce32fe78f1f7019d7d551a6402fc5350c73",
    router: "0x10ed43c718714eb63d5aa57b78b54704e256024e",
    poolAddress: "0x16b9a82891338f9ba80e2d6970fdda79d1eb0dae",
    sym0: "USDT",
    sym1: "WBNB",
    feeTier: 2500,
    lpFeeShareBps: 17,
    state: "ACTIVE",
    price1Per0: 1 / USD.BNB,
    amount0: 11_180_000,
    createBlockNumber: 6_810_423,
    seeded: false,
    ageDays: 187,
  },
  {
    key: "pcs-v3-bsc-usdt-btcb-500",
    chainId: 56,
    venueName: "pancakeswap-v3",
    standard: "V3",
    routerAbi: "V3_SWAP_ROUTER",
    factory: "0x0bfbcf9fa4f9c56b0f40a671ad40e0805a091865",
    router: "0x13f4ea83d0bd40e75c8222255bc855a974568dd4",
    quoter: "0xb048bbc1ee6b733fffcfb9e9cef7375518e25997",
    positionManager: "0x46a15b0b27311cedf172ab29e4f4766fbe7f4364",
    poolAddress: "0x46cf1cf8c69595804ba91dfdd8d6b960c9b0a7c4",
    sym0: "USDT",
    sym1: "BTCB",
    feeTier: 500,
    lpFeeShareBps: 5,
    tickSpacing: 10,
    state: "ACTIVE",
    price1Per0: 1 / USD.BTC,
    amount0: 3_240_000,
    createBlockNumber: 26_956_207,
    seeded: false,
    ageDays: 154,
  },
  {
    key: "uni-v3-arb-weth-usdc-500",
    chainId: 42161,
    venueName: "uniswap-v3",
    standard: "V3",
    routerAbi: "V3_SWAP_ROUTER_02",
    ...UNI_V3,
    poolAddress: "0xc6962004f452be9203591991d15f6b388e09e8d0",
    sym0: "WETH",
    sym1: "USDC",
    feeTier: 500,
    lpFeeShareBps: 5,
    tickSpacing: 10,
    state: "ACTIVE",
    // Arbitrum trades a shade under mainnet; the pair rail below uses the same
    // number, so the two surfaces agree.
    price1Per0: 3119.4,
    amount0: 2_880,
    createBlockNumber: 165_403_991,
    seeded: false,
    ageDays: 121,
  },
  {
    key: "uni-v3-eth-dai-usdc-100",
    chainId: 1,
    venueName: "uniswap-v3",
    standard: "V3",
    routerAbi: "V3_SWAP_ROUTER_02",
    ...UNI_V3,
    poolAddress: "0x5777d92f208679db4b9778590fa3cab3ac9e2168",
    sym0: "DAI",
    sym1: "USDC",
    feeTier: 100,
    lpFeeShareBps: 1,
    tickSpacing: 1,
    state: "ACTIVE",
    price1Per0: 0.99985,
    amount0: 3_600_000,
    createBlockNumber: 12_376_812,
    seeded: false,
    ageDays: 240,
  },
  {
    key: "uni-v3-op-usdc-weth-500",
    chainId: 10,
    venueName: "uniswap-v3",
    standard: "V3",
    routerAbi: "V3_SWAP_ROUTER_02",
    ...UNI_V3,
    poolAddress: "0x1fb3cf6e48f1e7b10213e7b6d87d4c073c7fdb7b",
    sym0: "USDC",
    sym1: "WETH",
    feeTier: 500,
    lpFeeShareBps: 5,
    tickSpacing: 10,
    // Mid-lifecycle on purpose: the pool docs need a row that is not ACTIVE so
    // the state column is visibly an axis rather than a constant.
    state: "SEEDING",
    price1Per0: 1 / 3118.6,
    amount0: 1_240_000,
    createBlockNumber: 118_204_559,
    seeded: true,
    ageDays: 3,
  },
  {
    key: "uni-v2-eth-usdc-usdt-retired",
    chainId: 1,
    venueName: "uniswap-v2",
    standard: "V2",
    routerAbi: "V2_ROUTER02",
    factory: "0x5c69bee701ef814a2b6a3edd4b1652cb9cc5aa6f",
    router: "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
    poolAddress: "0x3041cbd36888becc7bbcbc0045e3b1f144466f5f",
    sym0: "USDC",
    sym1: "USDT",
    feeTier: 3000,
    lpFeeShareBps: 25,
    // Withdrawn and closed. Reserves are zero because the operator took the
    // liquidity out — see the CLOSED position that points at this row.
    state: "RETIRED",
    price1Per0: 1.0002,
    amount0: 0,
    createBlockNumber: 10_093_341,
    seeded: true,
    ageDays: 96,
  },
  {
    key: "uni-v3-celo-celo-usdc-3000",
    chainId: 42220,
    venueName: "uniswap-v3",
    standard: "V3",
    routerAbi: "V3_SWAP_ROUTER_02",
    factory: "0xafe208a311b21f13ef87e33a90049fc17a7acdec",
    router: "0x5615cdab10dc425a742d643d949a7f474c01abc4",
    quoter: "0x82825d0554fa07f7fc52ab63c961f330fdefa8e8",
    positionManager: "0x3d79edaabc0eab6f08ed885c05fc0b014290d95a",
    // DRAFT is the ONLY state the model lets have no poolAddress — the row is
    // a plan, not a pool, and `predictedAddress` is what the operator is about
    // to create.
    sym0: "CELO",
    sym1: "USDC",
    feeTier: 3000,
    lpFeeShareBps: 30,
    tickSpacing: 60,
    state: "DRAFT",
    price1Per0: USD.CELO,
    amount0: 0,
    createBlockNumber: 0,
    seeded: false,
    ageDays: 1,
  },
];

/** Filled in by seedDexPools so the pair / position / swap passes can join. */
const poolIds = new Map<string, string>();
const poolTvl = new Map<string, number>();

async function seedDexPools() {
  for (const p of POOLS) {
    // Celo lists two rows called CELO (the native placeholder and the ERC-20).
    // The pool wants the ERC-20, which is the one that is NOT native.
    const t0 =
      p.chainId === 42220 && p.sym0 === "CELO"
        ? ((await models.dexToken.findOne({
            where: { chainId: 42220, symbol: "CELO", isNative: false },
            raw: true,
          })) as any)
        : tok(p.chainId, p.sym0);
    const t1 = tok(p.chainId, p.sym1);

    if (t0.address >= t1.address) {
      throw new Error(
        `${p.key}: token0 ${t0.address} must sort strictly before token1 ${t1.address} — ` +
          `an inverted pair silently reciprocates every price this venue quotes`
      );
    }

    const id = sid(`pool:${p.key}`);
    poolIds.set(p.key, id);

    const amount1 = p.amount0 * p.price1Per0;
    const tvl =
      p.amount0 * (USD[p.sym0] ?? 1) + amount1 * (USD[p.sym1] ?? 1);
    poolTvl.set(p.key, tvl);

    const raw0 = toRaw(p.amount0, t0.decimals);
    const raw1 = toRaw(amount1, t1.decimals);

    const isDraft = p.state === "DRAFT";
    const hasLiquidity = p.amount0 > 0;

    // V3 full-range identity: x = L / sqrtP and y = L * sqrtP, so L follows
    // from the token0 balance. Keeping L consistent with the reserves is the
    // whole point — an L that disagrees with the balances is a pool that
    // quotes a depth it does not have.
    let sqrtPriceX96: string | null = null;
    let poolLiquidity: string | null = null;
    let reserve0: string | null = null;
    let reserve1: string | null = null;
    let totalSupply: string | null = null;

    if (p.standard === "V3" && !isDraft) {
      sqrtPriceX96 = sqrtPriceX96For(p.price1Per0, t0.decimals, t1.decimals);
      poolLiquidity = hasLiquidity
        ? ((BigInt(raw0) * BigInt(sqrtPriceX96)) / Q96).toString()
        : "0";
      // The token balances are cached on a V3 row too, not only a V2 one.
      // `admin/dex/position/utils.ts` builds EVERY position report from
      // (lpBalance / totalSupply) x (reserve0, reserve1), taking `poolLiquidity`
      // as the denominator when the pool is V3 - so a V3 pool with null
      // reserves values every position on it at zero and the console reports a
      // flat -100.00% quote-asset ledger on a pool that is perfectly healthy.
      reserve0 = raw0;
      reserve1 = raw1;
    } else if (p.standard === "V2") {
      reserve0 = raw0;
      reserve1 = raw1;
      totalSupply = isqrt(BigInt(raw0) * BigInt(raw1)).toString();
    }

    await upsert(models.dexPool, "dex_pool", id, {
      chainId: p.chainId,
      venueName: p.venueName,
      standard: p.standard,
      factory: p.factory,
      router: p.router,
      routerAbi: p.routerAbi,
      quoter: p.quoter ?? null,
      positionManager: p.positionManager ?? null,
      poolAddress: isDraft ? null : p.poolAddress,
      predictedAddress: isDraft ? synthAddress(`predicted:${p.key}`) : null,
      initCodeHash: isDraft ? synthHash(`initcode:${p.key}`) : null,
      token0: t0.address,
      token1: t1.address,
      token0Id: t0.id,
      token1Id: t1.id,
      feeTier: p.feeTier,
      lpFeeShareBps: p.lpFeeShareBps,
      tickSpacing: p.tickSpacing ?? null,
      state: p.state,
      // The TRUST axis, orthogonal to state: DRAFT has nothing on chain to
      // verify, SEEDING has been verified and is mid-fill.
      verifiedAt: isDraft ? null : ago(2 * HOUR),
      verifiedAtBlock: isDraft ? null : p.createBlockNumber + 4_812,
      rejectedReason: null,
      createTxHash: isDraft ? null : synthHash(`createtx:${p.key}`),
      createBlockNumber: isDraft ? null : p.createBlockNumber,
      reserve0,
      reserve1,
      totalSupply,
      sqrtPriceX96,
      poolLiquidity,
      reservesBlock: isDraft ? null : p.createBlockNumber + 5_004,
      reservesUpdatedAt: isDraft ? null : ago(11 * MIN),
      liquidityUsd: isDraft ? null : Number(tvl.toFixed(8)),
      seededByPlatformOperator: p.seeded,
      seedTxHash: p.seeded ? synthHash(`seedtx:${p.key}`) : null,
      lastSwapBlock: isDraft || !hasLiquidity ? null : p.createBlockNumber + 5_004,
      indexedToBlock: isDraft ? null : p.createBlockNumber + 5_004,
      indexedToBlockHash: isDraft ? null : synthHash(`indexblock:${p.key}`),
      metadata: { docsSeed: true, note: "synthetic pool for documentation screenshots" },
      createdAt: ago(p.ageDays * DAY),
      updatedAt: ago(11 * MIN),
      deletedAt: null,
    });
  }
}

/* -------------------------------------------------------------------------- */
/* Risk acknowledgements + LP positions                                        */
/* -------------------------------------------------------------------------- */

/**
 * `dexPoolPosition.riskAckId` is NOT NULL with onDelete RESTRICT, which makes
 * "no position without a written acknowledgement" a SCHEMA fact rather than a
 * handler convention. So every position below gets its own ack row, signed by
 * the `docs.operations@example.com` persona.
 */
const CLAUSE_VERSION = "2026.1";
const CLAUSES = [
  "impermanent-loss",
  "no-key-custody",
  "own-token-price-is-self-referential",
  "withdrawal-is-not-guaranteed",
];

/** The operator's own treasury address, per chain. It holds no platform key. */
const treasury = (chainId: number) => synthAddress(`treasury:${chainId}`);

/**
 * The position's liquidity-token balance: `share` of whatever the pool's
 * denominator is - LP-token totalSupply on a V2 pool, the L value on a V3 one.
 *
 * It has to be derived the same way the pool row was, because the console
 * divides it by that denominator and multiplies by the reserves to decide what
 * the position holds. Two independently invented numbers here would put the
 * pool page and the position page in disagreement about the same money.
 */
function shareOfSupply(pool: PoolSpec, share: number, dec0: number, dec1: number): string {
  const raw0 = BigInt(toRaw(pool.amount0, dec0));
  const scaled = BigInt(Math.round(share * 1e6));
  if (pool.standard === "V3") {
    const sp = BigInt(sqrtPriceX96For(pool.price1Per0, dec0, dec1));
    return (((raw0 * sp) / Q96) * scaled / 1_000_000n).toString();
  }
  const raw1 = BigInt(toRaw(pool.amount0 * pool.price1Per0, dec1));
  return ((isqrt(raw0 * raw1) * scaled) / 1_000_000n).toString();
}

type PositionSpec = {
  poolKey: string;
  state: "OPEN" | "PARTIAL" | "CLOSED";
  /** Fraction of the pool this position owns, TODAY. */
  share: number;
  /**
   * How far the pool has rebalanced since the position was opened, in bps on
   * the token1 leg.
   *
   * This is the whole point of the LP console: the seeded basis and the
   * current holding are DIFFERENT, and the gap between them is impermanent
   * loss plus fees. A position whose basis equals its holding reports 0.00% on
   * every figure and teaches a reader nothing. Applied as a constant-product
   * rebalance - one leg grows, the other shrinks - so the pair of numbers
   * moves the way an AMM actually moves it.
   */
  driftBps: number;
  ageDays: number;
};

const POSITIONS: PositionSpec[] = [
  { poolKey: "uni-v3-eth-usdc-weth-500", state: "OPEN", share: 0.18, driftBps: 420, ageDays: 74 },
  { poolKey: "uni-v3-eth-wbtc-usdt-3000", state: "OPEN", share: 0.34, driftBps: -260, ageDays: 61 },
  { poolKey: "uni-v2-eth-dai-weth", state: "OPEN", share: 0.22, driftBps: 780, ageDays: 118 },
  { poolKey: "pcs-v2-bsc-usdt-wbnb", state: "OPEN", share: 0.41, driftBps: -140, ageDays: 52 },
  { poolKey: "pcs-v3-bsc-usdt-btcb-500", state: "PARTIAL", share: 0.27, driftBps: 310, ageDays: 40 },
  { poolKey: "uni-v3-arb-weth-usdc-500", state: "OPEN", share: 0.55, driftBps: -90, ageDays: 33 },
  { poolKey: "uni-v3-eth-dai-usdc-100", state: "OPEN", share: 0.63, driftBps: 15, ageDays: 27 },
  { poolKey: "uni-v3-op-usdc-weth-500", state: "OPEN", share: 0.88, driftBps: 0, ageDays: 3 },
];

async function seedDexPositions() {
  for (const spec of POSITIONS) {
    const pool = POOLS.find((p) => p.key === spec.poolKey)!;
    const poolId = poolIds.get(spec.poolKey)!;
    const t0 =
      pool.chainId === 42220 && pool.sym0 === "CELO"
        ? ((await models.dexToken.findOne({
            where: { chainId: 42220, symbol: "CELO", isNative: false },
            raw: true,
          })) as any)
        : tok(pool.chainId, pool.sym0);
    const t1 = tok(pool.chainId, pool.sym1);

    // What the position HOLDS today: its share of the pool's current balances.
    const current0 = pool.amount0 * spec.share;
    const current1 = current0 * pool.price1Per0;
    // What it was SEEDED with, walked back through a constant-product
    // rebalance of `driftBps`: token1 up means token0 down, and the reverse.
    const drift = spec.driftBps / 10_000;
    const amount0 = current0 * (1 + drift);
    const amount1 = current1 / (1 + drift);
    const usd0 = amount0 * (USD[pool.sym0] ?? 1);
    const usd1 = amount1 * (USD[pool.sym1] ?? 1);

    const ackId = sid(`ack:${spec.poolKey}`);
    await upsert(models.dexPoolRiskAck, "dex_pool_risk_ack", ackId, {
      poolId,
      chainId: pool.chainId,
      poolAddress: pool.poolAddress,
      adminUserId: U("ops"),
      adminEmail: "docs.operations@example.com",
      adminName: "Docs Operations",
      clauseVersion: CLAUSE_VERSION,
      // The gate is the sha256 of the exact rendered prose. Deriving it from
      // the clause list keeps the evidence internally checkable.
      clauseHash: "0x" + createHash("sha256").update(CLAUSES.join("|") + CLAUSE_VERSION).digest("hex"),
      clausesAccepted: JSON.stringify(CLAUSES),
      typedConfirmation: "I UNDERSTAND THIS IS CAPITAL AT RISK",
      feeTierBps: Math.round(pool.feeTier / 100),
      initialPriceQuotePerBase: toRaw(pool.price1Per0, Math.min(t1.decimals, 18)),
      ipAddress: "203.0.113.42",
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) docs-capture",
      acknowledgedAt: ago((spec.ageDays + 1) * DAY),
      waivedByUserId: null,
      revokedAt: null,
      revokedReason: null,
      createdAt: ago((spec.ageDays + 1) * DAY),
      updatedAt: ago((spec.ageDays + 1) * DAY),
    });

    const isV3 = pool.standard === "V3";
    const isPartial = spec.state === "PARTIAL";
    // A PARTIAL position has taken a third of its basis back out. `realized*Raw`
    // is SIGNED and a withdrawal is negative against the seeded basis, so the
    // realized legs and the realized USD are both negative here.
    const takenFraction = isPartial ? 1 / 3 : 0;

    await upsert(models.dexPoolPosition, "dex_pool_position", sid(`pos:${spec.poolKey}`), {
      poolId,
      chainId: pool.chainId,
      ownerAddress: treasury(pool.chainId),
      riskAckId: ackId,
      openedAt: ago(spec.ageDays * DAY),
      openTxHash: synthHash(`opentx:${spec.poolKey}`),
      seeded0Raw: toRaw(amount0, t0.decimals),
      seeded1Raw: toRaw(amount1, t1.decimals),
      seeded0Usd: Number(usd0.toFixed(8)),
      seeded1Usd: Number(usd1.toFixed(8)),
      usdRateSource: "COINGECKO",
      // The console values a position as (lpBalance / supply) x reserves on
      // BOTH standards, so this must be set on a V3 row too. A null here is
      // what made every V3 position report -100.00%.
      lpBalanceRaw: shareOfSupply(pool, spec.share, t0.decimals, t1.decimals),
      nftTokenId: isV3 ? String(880_000 + Math.round(spec.share * 100_000)) : null,
      // Full range, snapped to the pool's own tick spacing. The V3 minimum and
      // maximum usable ticks are -887272 / 887272.
      tickLower: isV3 ? -Math.floor(887272 / (pool.tickSpacing ?? 1)) * (pool.tickSpacing ?? 1) : null,
      tickUpper: isV3 ? Math.floor(887272 / (pool.tickSpacing ?? 1)) * (pool.tickSpacing ?? 1) : null,
      state: spec.state,
      closedAt: null,
      realized0Raw: isPartial ? "-" + toRaw(amount0 * takenFraction, t0.decimals) : null,
      realized1Raw: isPartial ? "-" + toRaw(amount1 * takenFraction, t1.decimals) : null,
      realizedUsd: isPartial ? Number((-(usd0 + usd1) * takenFraction).toFixed(8)) : null,
      metadata: { docsSeed: true, rangeStyle: isV3 ? "FULL_RANGE" : "V2_CONSTANT_PRODUCT" },
      createdAt: ago(spec.ageDays * DAY),
      updatedAt: ago(isPartial ? 6 * DAY : 11 * MIN),
    });
  }

  // The closed one. It belongs to the RETIRED pool, whose reserves are zero
  // precisely because this position was withdrawn — the two rows tell one story.
  const retired = POOLS.find((p) => p.key === "uni-v2-eth-usdc-usdt-retired")!;
  const retiredPoolId = poolIds.get(retired.key)!;
  const rt0 = tok(1, "USDC");
  const rt1 = tok(1, "USDT");
  const seededUsdc = 640_000;
  const seededUsdt = seededUsdc * retired.price1Per0;
  // Withdrawn: the basis plus 0.31% of accrued LP fees over the life of the
  // position, taken entirely on the USDT leg the way a v2 burn returns both.
  const withdrawnUsdc = seededUsdc;
  const withdrawnUsdt = seededUsdt * 1.0031;

  const retiredAckId = sid(`ack:${retired.key}`);
  await upsert(models.dexPoolRiskAck, "dex_pool_risk_ack", retiredAckId, {
    poolId: retiredPoolId,
    chainId: 1,
    poolAddress: retired.poolAddress,
    adminUserId: U("ops"),
    adminEmail: "docs.operations@example.com",
    adminName: "Docs Operations",
    clauseVersion: CLAUSE_VERSION,
    clauseHash: "0x" + createHash("sha256").update(CLAUSES.join("|") + CLAUSE_VERSION).digest("hex"),
    clausesAccepted: JSON.stringify(CLAUSES),
    typedConfirmation: "I UNDERSTAND THIS IS CAPITAL AT RISK",
    feeTierBps: 30,
    initialPriceQuotePerBase: toRaw(retired.price1Per0, 6),
    ipAddress: "203.0.113.42",
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) docs-capture",
    acknowledgedAt: ago(97 * DAY),
    waivedByUserId: null,
    revokedAt: null,
    revokedReason: null,
    createdAt: ago(97 * DAY),
    updatedAt: ago(97 * DAY),
  });

  await upsert(models.dexPoolPosition, "dex_pool_position", sid(`pos:${retired.key}`), {
    poolId: retiredPoolId,
    chainId: 1,
    ownerAddress: treasury(1),
    riskAckId: retiredAckId,
    openedAt: ago(96 * DAY),
    openTxHash: synthHash(`opentx:${retired.key}`),
    seeded0Raw: toRaw(seededUsdc, rt0.decimals),
    seeded1Raw: toRaw(seededUsdt, rt1.decimals),
    seeded0Usd: Number(seededUsdc.toFixed(8)),
    seeded1Usd: Number(seededUsdt.toFixed(8)),
    usdRateSource: "COINGECKO",
    lpBalanceRaw: "0",
    nftTokenId: null,
    tickLower: null,
    tickUpper: null,
    state: "CLOSED",
    closedAt: ago(9 * DAY),
    realized0Raw: "-" + toRaw(withdrawnUsdc, rt0.decimals),
    realized1Raw: "-" + toRaw(withdrawnUsdt, rt1.decimals),
    realizedUsd: Number((-(withdrawnUsdc + withdrawnUsdt)).toFixed(8)),
    metadata: {
      docsSeed: true,
      rangeStyle: "V2_CONSTANT_PRODUCT",
      // Spelled out because the difference is the entire point of the LP docs:
      // fee income is real, and it is the compensation for impermanent loss,
      // not a return on its own.
      lifetimeFeeIncomeUsd: Number((withdrawnUsdc + withdrawnUsdt - seededUsdc - seededUsdt).toFixed(2)),
    },
    createdAt: ago(96 * DAY),
    updatedAt: ago(9 * DAY),
  });
}

/* -------------------------------------------------------------------------- */
/* Pairs                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * `symbol` is computed server-side as `chainId:BASE/QUOTE` and is a UNIQUE key
 * — the chart route and every websocket payload carry it, so it has to resolve
 * to exactly one row. `computeSymbol` in the admin route builds it the same
 * way; this mirrors it rather than inventing a second convention.
 */
const pairSymbol = (chainId: number, base: string, quote: string) => `${chainId}:${base}/${quote}`;

type PairSpec = {
  chainId: number;
  base: string;
  quote: string;
  status: "ACTIVE" | "INACTIVE" | "HIDDEN";
  venuePolicy:
    | "INHERIT"
    | "AGGREGATOR_ONLY"
    | "AGGREGATOR_PREFERRED"
    | "BEST_EXECUTION"
    | "DIRECT_ONLY_WHEN_UNQUOTED"
    | "DIRECT_ONLY";
  poolKey?: string;
  /** Price of ONE base in quote units. */
  lastPrice: number;
  change24h: number;
  volume24hUsd: number;
  /** Only used when no pool is bound; a bound pair takes its pool's TVL. */
  liquidityUsd?: number;
  isHot?: boolean;
  isTrending?: boolean;
  pricePrecision: number;
  amountPrecision: number;
  defaultSlippageBps: number;
};

const PAIRS: PairSpec[] = [
  { chainId: 1, base: "WETH", quote: "USDC", status: "ACTIVE", venuePolicy: "BEST_EXECUTION", poolKey: "uni-v3-eth-usdc-weth-500", lastPrice: USD.ETH, change24h: 1.84, volume24hUsd: 18_420_100, isHot: true, isTrending: true, pricePrecision: 2, amountPrecision: 6, defaultSlippageBps: 50 },
  { chainId: 1, base: "WBTC", quote: "USDT", status: "ACTIVE", venuePolicy: "AGGREGATOR_PREFERRED", poolKey: "uni-v3-eth-wbtc-usdt-3000", lastPrice: USD.BTC, change24h: -0.62, volume24hUsd: 7_311_480, isTrending: true, pricePrecision: 2, amountPrecision: 8, defaultSlippageBps: 50 },
  { chainId: 1, base: "DAI", quote: "USDC", status: "ACTIVE", venuePolicy: "BEST_EXECUTION", poolKey: "uni-v3-eth-dai-usdc-100", lastPrice: 0.99985, change24h: 0.01, volume24hUsd: 2_140_900, pricePrecision: 5, amountPrecision: 2, defaultSlippageBps: 10 },
  { chainId: 1, base: "USDC", quote: "USDT", status: "ACTIVE", venuePolicy: "AGGREGATOR_ONLY", lastPrice: 1.0001, change24h: 0.0, volume24hUsd: 4_806_220, liquidityUsd: 31_900_000, pricePrecision: 5, amountPrecision: 2, defaultSlippageBps: 10 },
  { chainId: 1, base: "WETH", quote: "USDT", status: "ACTIVE", venuePolicy: "AGGREGATOR_ONLY", lastPrice: 3120.5, change24h: 1.79, volume24hUsd: 9_255_740, liquidityUsd: 24_180_000, isTrending: true, pricePrecision: 2, amountPrecision: 6, defaultSlippageBps: 50 },
  // Cross-consistency check the reader can do in their head:
  // 64850 / 3120 = 20.78526. A rounded 20.79 here would be a visible lie.
  { chainId: 1, base: "WBTC", quote: "WETH", status: "ACTIVE", venuePolicy: "AGGREGATOR_PREFERRED", lastPrice: USD.BTC / USD.ETH, change24h: -2.41, volume24hUsd: 1_907_330, liquidityUsd: 6_450_000, pricePrecision: 6, amountPrecision: 8, defaultSlippageBps: 80 },
  { chainId: 56, base: "WBNB", quote: "USDT", status: "ACTIVE", venuePolicy: "BEST_EXECUTION", poolKey: "pcs-v2-bsc-usdt-wbnb", lastPrice: USD.BNB, change24h: 0.93, volume24hUsd: 12_044_610, isHot: true, pricePrecision: 2, amountPrecision: 5, defaultSlippageBps: 60 },
  { chainId: 56, base: "BTCB", quote: "USDT", status: "ACTIVE", venuePolicy: "AGGREGATOR_PREFERRED", poolKey: "pcs-v3-bsc-usdt-btcb-500", lastPrice: USD.BTC, change24h: -0.58, volume24hUsd: 3_508_970, pricePrecision: 2, amountPrecision: 6, defaultSlippageBps: 60 },
  { chainId: 56, base: "USDC", quote: "USDT", status: "HIDDEN", venuePolicy: "AGGREGATOR_ONLY", lastPrice: 1.0, change24h: 0.0, volume24hUsd: 118_440, liquidityUsd: 2_760_000, pricePrecision: 5, amountPrecision: 2, defaultSlippageBps: 20 },
  { chainId: 42161, base: "WETH", quote: "USDC", status: "ACTIVE", venuePolicy: "BEST_EXECUTION", poolKey: "uni-v3-arb-weth-usdc-500", lastPrice: 3119.4, change24h: 1.81, volume24hUsd: 6_775_220, isHot: true, pricePrecision: 2, amountPrecision: 6, defaultSlippageBps: 50 },
  { chainId: 42161, base: "USDC", quote: "USDT", status: "ACTIVE", venuePolicy: "AGGREGATOR_ONLY", lastPrice: 0.9999, change24h: -0.01, volume24hUsd: 1_442_880, liquidityUsd: 8_130_000, pricePrecision: 5, amountPrecision: 2, defaultSlippageBps: 10 },
  { chainId: 42161, base: "WBTC", quote: "USDC", status: "ACTIVE", venuePolicy: "AGGREGATOR_PREFERRED", lastPrice: 64_820, change24h: -0.71, volume24hUsd: 2_099_140, liquidityUsd: 4_320_000, pricePrecision: 2, amountPrecision: 8, defaultSlippageBps: 60 },
  // The rail must never show a market whose pool is still filling.
  { chainId: 10, base: "WETH", quote: "USDC", status: "INACTIVE", venuePolicy: "INHERIT", poolKey: "uni-v3-op-usdc-weth-500", lastPrice: 3118.6, change24h: 1.77, volume24hUsd: 402_170, pricePrecision: 2, amountPrecision: 6, defaultSlippageBps: 50 },
  { chainId: 42220, base: "CELO", quote: "USDC", status: "INACTIVE", venuePolicy: "INHERIT", lastPrice: USD.CELO, change24h: 3.42, volume24hUsd: 88_360, liquidityUsd: 640_000, pricePrecision: 4, amountPrecision: 4, defaultSlippageBps: 120 },
];

async function seedDexPairs() {
  for (const s of PAIRS) {
    const base =
      s.chainId === 42220 && s.base === "CELO"
        ? ((await models.dexToken.findOne({
            where: { chainId: 42220, symbol: "CELO", isNative: false },
            raw: true,
          })) as any)
        : tok(s.chainId, s.base);
    const quote = tok(s.chainId, s.quote);
    const pool = s.poolKey ? POOLS.find((p) => p.key === s.poolKey)! : null;

    await upsert(models.dexPair, "dex_pair", sid(`pair:${s.chainId}:${s.base}/${s.quote}`), {
      chainId: s.chainId,
      baseTokenId: base.id,
      quoteTokenId: quote.id,
      currency: s.base,
      pair: s.quote,
      symbol: pairSymbol(s.chainId, s.base, s.quote),
      poolAddress: pool && pool.state !== "DRAFT" ? pool.poolAddress : null,
      poolId: s.poolKey ? poolIds.get(s.poolKey)! : null,
      venuePolicy: s.venuePolicy,
      restrictedCountries: null,
      marketDataSource: s.poolKey ? "ONCHAIN" : "INDEXER",
      indexerId: s.poolKey ? null : `geckoterminal:${s.chainId}:${s.base.toLowerCase()}-${s.quote.toLowerCase()}`,
      status: s.status,
      isHot: !!s.isHot,
      isTrending: !!s.isTrending,
      pricePrecision: s.pricePrecision,
      amountPrecision: s.amountPrecision,
      defaultSlippageBps: s.defaultSlippageBps,
      lastPrice: Number(s.lastPrice.toFixed(18)),
      change24h: s.change24h,
      volume24hUsd: s.volume24hUsd,
      // A bound pair reports its POOL's depth. Two different numbers for the
      // same liquidity is the kind of contradiction a trader notices first.
      liquidityUsd: s.poolKey
        ? Number((poolTvl.get(s.poolKey) ?? 0).toFixed(8))
        : (s.liquidityUsd ?? null),
      metadata: { docsSeed: true },
      createdAt: ago(90 * DAY),
      updatedAt: ago(9 * MIN),
    });
  }
}

/* -------------------------------------------------------------------------- */
/* Wallet links                                                                */
/* -------------------------------------------------------------------------- */

/**
 * NOTE FOR WHOEVER READS THIS NEXT.
 *
 * The DEX survey is explicit that NOTHING in this repository writes a
 * dexWalletLink row (the quote route says so in as many words), and that
 * /admin/dex/wallet reads providerUser + dexChain + dexToken instead — so
 * these rows change no pixel today. They are seeded anyway because the model
 * exists, the swaps below quote a `fromAddress` that ought to belong to
 * somebody, and a future wallet console will have something to render.
 */
async function seedDexWalletLinks() {
  const linked: Array<{ persona: PersonaKey; chainId: number; label: string; daysAgo: number }> = [
    { persona: "ava", chainId: 1, label: "Ledger - main", daysAgo: 112 },
    { persona: "marcus", chainId: 56, label: "MetaMask - BSC", daysAgo: 88 },
    { persona: "priya", chainId: 42161, label: "Rabby - Arbitrum", daysAgo: 71 },
    { persona: "yuki", chainId: 1, label: "MetaMask - hot", daysAgo: 55 },
    { persona: "sofia", chainId: 10, label: "Coinbase Wallet", daysAgo: 40 },
    { persona: "liam", chainId: 1, label: "Trezor - cold", daysAgo: 34 },
    { persona: "nadia", chainId: 56, label: "Trust Wallet", daysAgo: 21 },
    { persona: "tomas", chainId: 42161, label: "Frame - desktop", daysAgo: 12 },
  ];
  for (const l of linked) {
    await upsert(models.dexWalletLink, "dex_wallet_link", sid(`wallet:${l.persona}:${l.chainId}`), {
      userId: U(l.persona),
      address: walletOf(l.persona),
      label: l.label,
      verifiedAt: ago(l.daysAgo * DAY),
      verificationMethod: "SIWE",
      chainId: l.chainId,
      lastUsedAt: ago(l.daysAgo * HOUR),
      nonce: null,
      nonceExpiresAt: null,
      vm: "EVM",
      createdAt: ago(l.daysAgo * DAY),
      updatedAt: ago(l.daysAgo * HOUR),
      deletedAt: null,
    });
  }
}

/** One stable wallet per persona, reused by every swap and wallet link. */
const walletOf = (p: PersonaKey) => synthAddress(`wallet:${p}`);

/* -------------------------------------------------------------------------- */
/* Swaps                                                                       */
/* -------------------------------------------------------------------------- */

type SwapSpec = {
  persona: PersonaKey;
  chainId: number;
  sell: string;
  buy: string;
  /** HUMAN amount of the sell token. */
  sellAmount: number;
  status: "PENDING" | "MINED" | "CONFIRMED" | "REVERTED" | "DROPPED" | "REPLACED";
  venueKind: "AGGREGATOR" | "DIRECT_POOL";
  venueName: string;
  poolKey?: string;
  pairKey?: string;
  /** Realised slippage against the quote, in bps. Positive = worse than quoted. */
  slippageBps: number;
  minutesAgo: number;
  statusReason?: string;
};

const SWAPS: SwapSpec[] = [
  { persona: "ava", chainId: 1, sell: "USDC", buy: "WETH", sellAmount: 25_000, status: "CONFIRMED", venueKind: "DIRECT_POOL", venueName: "uniswap-v3", poolKey: "uni-v3-eth-usdc-weth-500", pairKey: "1:WETH/USDC", slippageBps: 6, minutesAgo: 14 },
  { persona: "marcus", chainId: 56, sell: "USDT", buy: "WBNB", sellAmount: 8_400, status: "CONFIRMED", venueKind: "DIRECT_POOL", venueName: "pancakeswap-v2", poolKey: "pcs-v2-bsc-usdt-wbnb", pairKey: "56:WBNB/USDT", slippageBps: 11, minutesAgo: 37 },
  { persona: "priya", chainId: 42161, sell: "WETH", buy: "USDC", sellAmount: 4.5, status: "CONFIRMED", venueKind: "AGGREGATOR", venueName: "0x", pairKey: "42161:WETH/USDC", slippageBps: 3, minutesAgo: 52 },
  { persona: "yuki", chainId: 1, sell: "WETH", buy: "USDT", sellAmount: 12.25, status: "CONFIRMED", venueKind: "AGGREGATOR", venueName: "1inch", pairKey: "1:WETH/USDT", slippageBps: 9, minutesAgo: 96 },
  { persona: "sofia", chainId: 1, sell: "USDT", buy: "WBTC", sellAmount: 64_850, status: "CONFIRMED", venueKind: "DIRECT_POOL", venueName: "uniswap-v3", poolKey: "uni-v3-eth-wbtc-usdt-3000", pairKey: "1:WBTC/USDT", slippageBps: 22, minutesAgo: 141 },
  { persona: "liam", chainId: 1, sell: "DAI", buy: "USDC", sellAmount: 120_000, status: "CONFIRMED", venueKind: "DIRECT_POOL", venueName: "uniswap-v3", poolKey: "uni-v3-eth-dai-usdc-100", pairKey: "1:DAI/USDC", slippageBps: 1, minutesAgo: 188 },
  { persona: "nadia", chainId: 56, sell: "BTCB", buy: "USDT", sellAmount: 0.42, status: "CONFIRMED", venueKind: "AGGREGATOR", venueName: "kyberswap", pairKey: "56:BTCB/USDT", slippageBps: 14, minutesAgo: 233 },
  { persona: "tomas", chainId: 42161, sell: "USDC", buy: "USDT", sellAmount: 40_000, status: "CONFIRMED", venueKind: "AGGREGATOR", venueName: "odos", pairKey: "42161:USDC/USDT", slippageBps: 2, minutesAgo: 287 },
  { persona: "ava", chainId: 1, sell: "WETH", buy: "USDC", sellAmount: 3.0, status: "CONFIRMED", venueKind: "AGGREGATOR", venueName: "0x", pairKey: "1:WETH/USDC", slippageBps: 4, minutesAgo: 361 },
  { persona: "marcus", chainId: 56, sell: "WBNB", buy: "USDT", sellAmount: 62.5, status: "CONFIRMED", venueKind: "DIRECT_POOL", venueName: "pancakeswap-v2", poolKey: "pcs-v2-bsc-usdt-wbnb", pairKey: "56:WBNB/USDT", slippageBps: 8, minutesAgo: 442 },
  { persona: "priya", chainId: 42161, sell: "USDC", buy: "WBTC", sellAmount: 32_410, status: "CONFIRMED", venueKind: "AGGREGATOR", venueName: "1inch", pairKey: "42161:WBTC/USDC", slippageBps: 18, minutesAgo: 590 },
  { persona: "yuki", chainId: 1, sell: "WBTC", buy: "WETH", sellAmount: 0.75, status: "CONFIRMED", venueKind: "AGGREGATOR", venueName: "0x", pairKey: "1:WBTC/WETH", slippageBps: 12, minutesAgo: 724 },
  { persona: "sofia", chainId: 10, sell: "USDC", buy: "WETH", sellAmount: 5_000, status: "CONFIRMED", venueKind: "AGGREGATOR", venueName: "odos", slippageBps: 7, minutesAgo: 902 },
  { persona: "liam", chainId: 1, sell: "USDC", buy: "WETH", sellAmount: 9_360, status: "CONFIRMED", venueKind: "AGGREGATOR", venueName: "1inch", pairKey: "1:WETH/USDC", slippageBps: 5, minutesAgo: 1_140 },
  // The lifecycle states. Each needs a different user-facing message, which is
  // exactly why the swap docs need one of each in the frame.
  { persona: "nadia", chainId: 1, sell: "USDC", buy: "WETH", sellAmount: 1_500, status: "PENDING", venueKind: "AGGREGATOR", venueName: "0x", pairKey: "1:WETH/USDC", slippageBps: 0, minutesAgo: 2 },
  { persona: "tomas", chainId: 56, sell: "USDT", buy: "WBNB", sellAmount: 2_940, status: "MINED", venueKind: "DIRECT_POOL", venueName: "pancakeswap-v2", poolKey: "pcs-v2-bsc-usdt-wbnb", pairKey: "56:WBNB/USDT", slippageBps: 10, minutesAgo: 1 },
  { persona: "ava", chainId: 1, sell: "USDT", buy: "WBTC", sellAmount: 12_970, status: "REVERTED", venueKind: "AGGREGATOR", venueName: "1inch", pairKey: "1:WBTC/USDT", slippageBps: 0, minutesAgo: 320, statusReason: "SLIPPAGE_EXCEEDED" },
  { persona: "marcus", chainId: 1, sell: "WETH", buy: "USDC", sellAmount: 1.8, status: "REPLACED", venueKind: "AGGREGATOR", venueName: "0x", pairKey: "1:WETH/USDC", slippageBps: 0, minutesAgo: 505, statusReason: "SPED_UP_BY_WALLET" },
  { persona: "priya", chainId: 1, sell: "DAI", buy: "USDC", sellAmount: 7_500, status: "DROPPED", venueKind: "AGGREGATOR", venueName: "odos", pairKey: "1:DAI/USDC", slippageBps: 0, minutesAgo: 1_610, statusReason: "NONCE_CONSUMED_ELSEWHERE" },
  { persona: "yuki", chainId: 42161, sell: "USDT", buy: "USDC", sellAmount: 18_000, status: "CONFIRMED", venueKind: "AGGREGATOR", venueName: "kyberswap", pairKey: "42161:USDC/USDT", slippageBps: 2, minutesAgo: 1_915 },
];

/** dexPair id by "chainId:BASE/QUOTE", so a swap can point at the market it hit. */
const pairIdBySymbol = new Map<string, string>();

async function seedDexSwaps() {
  for (const p of PAIRS) {
    pairIdBySymbol.set(
      pairSymbol(p.chainId, p.base, p.quote),
      sid(`pair:${p.chainId}:${p.base}/${p.quote}`)
    );
  }

  // Native gas price per chain, for the gas cost the ledger displays.
  const gasPriceGwei: Record<number, number> = { 1: 14.2, 10: 0.0021, 56: 1.1, 42161: 0.012 };
  const nativeUsd: Record<number, number> = { 1: USD.ETH, 10: USD.ETH, 56: USD.BNB, 42161: USD.ETH };

  let n = 0;
  for (const s of SWAPS) {
    n++;
    const sellTok = tok(s.chainId, s.sell);
    const buyTok = tok(s.chainId, s.buy);

    const sellUsd = s.sellAmount * (USD[s.sell] ?? 1);
    // The QUOTED buy amount, before realised slippage. dexFeeBps is 0 on this
    // install, so no platform fee is deducted here — feeBps below says 0 for
    // the same reason, and a revenue tile that reads zero is telling the truth.
    const quotedBuy = sellUsd / (USD[s.buy] ?? 1);
    const realizedBuy = quotedBuy * (1 - s.slippageBps / 10_000);
    const settled = s.status === "CONFIRMED" || s.status === "MINED";

    const gasUnits = s.venueKind === "DIRECT_POOL" ? 138_000 : 214_000;
    const gasPriceWei = BigInt(Math.round(gasPriceGwei[s.chainId] * 1e9));
    const gasCostNative = (gasUnits * gasPriceGwei[s.chainId]) / 1e9;

    const at = ago(s.minutesAgo * MIN);
    const confirmations = s.status === "CONFIRMED" ? 24 : s.status === "MINED" ? 2 : 0;

    await upsert(models.dexSwap, "dex_swap", sid(`swap:${n}`), {
      userId: U(s.persona),
      quoteId: null,
      pairId: s.pairKey ? (pairIdBySymbol.get(s.pairKey) ?? null) : null,
      kind: "SWAP",
      chainId: s.chainId,
      txHash: synthHash(`swaptx:${n}`),
      nonce: 40 + n,
      fromAddress: walletOf(s.persona),
      toAddress: walletOf(s.persona),
      sellTokenId: sellTok.id,
      buyTokenId: buyTok.id,
      sellAmountRaw: toRaw(s.sellAmount, sellTok.decimals),
      buyAmountRaw: toRaw(quotedBuy, buyTok.decimals),
      realizedBuyAmountRaw: settled ? toRaw(realizedBuy, buyTok.decimals) : null,
      sellAmountDisplay: Number(s.sellAmount.toFixed(18)),
      buyAmountDisplay: Number(quotedBuy.toFixed(18)),
      realizedBuyAmountDisplay: settled ? Number(realizedBuy.toFixed(18)) : null,
      sellUsd: Number(sellUsd.toFixed(8)),
      buyUsd: settled ? Number((realizedBuy * (USD[s.buy] ?? 1)).toFixed(8)) : null,
      // The price the user ACTUALLY got: what arrived divided by what left.
      executionPrice: settled ? Number((realizedBuy / s.sellAmount).toFixed(18)) : null,
      slippageRealizedBps: settled ? s.slippageBps : null,
      status: s.status,
      statusReason: s.statusReason ?? null,
      statusHistory: [
        { status: "PENDING", at: new Date(at.getTime() - 30_000).toISOString() },
        ...(settled ? [{ status: "MINED", at: at.toISOString() }] : []),
        ...(s.status === "CONFIRMED"
          ? [{ status: "CONFIRMED", at: new Date(at.getTime() + 180_000).toISOString() }]
          : []),
        ...(!settled && s.status !== "PENDING"
          ? [{ status: s.status, at: at.toISOString(), reason: s.statusReason ?? null }]
          : []),
      ],
      statusChangedAt: at,
      blockNumber: settled ? 20_100_000 + n * 13 : null,
      blockHash: settled ? synthHash(`swapblock:${n}`) : null,
      blockTimestamp: settled ? at : null,
      confirmations,
      gasUsed: settled ? String(gasUnits) : null,
      effectiveGasPrice: settled ? gasPriceWei.toString() : null,
      gasCostNativeRaw: settled ? toRaw(gasCostNative, 18) : null,
      gasCostUsd: settled ? Number((gasCostNative * nativeUsd[s.chainId]).toFixed(8)) : null,
      aggregator: s.venueKind === "AGGREGATOR" ? s.venueName : null,
      venueKind: s.venueKind,
      venueName: s.venueName,
      poolId: s.poolKey ? (poolIds.get(s.poolKey) ?? null) : null,
      // dexFeeBps is 0 on this install. Recording a fee that was never charged
      // would put the swap ledger and the fee console permanently out of
      // agreement, which is worse than a revenue tile that reads zero.
      feeBps: 0,
      feeRecipient: null,
      feeSide: null,
      lastCheckedAt: at,
      checkAttempts: settled ? 3 : 1,
      reorgCheckedAt: s.status === "CONFIRMED" ? at : null,
      confirmedAt: s.status === "CONFIRMED" ? new Date(at.getTime() + 180_000) : null,
      replacedByTxHash: s.status === "REPLACED" ? synthHash(`swapreplace:${n}`) : null,
      vm: "EVM",
      metadata: { docsSeed: true },
      createdAt: at,
      updatedAt: at,
    });
  }
}

/* ========================================================================== */
/* SECTION 2 — Forex desk (fx_*)                                              */
/* ========================================================================== */

/**
 * The desk ships with three ACTIVE FX instruments (USD/CAD, USD/JPY, USD/CHF)
 * and 85 INACTIVE ones. Every major a forex screenshot is expected to contain
 * — EUR/USD above all — is switched off, so the terminal's instrument rail
 * photographs as a desk that does not trade forex.
 *
 * These five are switched ACTIVE. They all already carry a `providerSymbols`
 * mapping (the same OANDA feed the three live ones use), so this changes what
 * is offered, not how it is priced. `--undo` puts them back to INACTIVE.
 */
const ACTIVATED_INSTRUMENTS: Array<[string, string]> = [
  ["EUR", "USD"],
  ["GBP", "USD"],
  ["AUD", "USD"],
  ["EUR", "JPY"],
  ["GBP", "JPY"],
];

async function activateInstruments(active: boolean) {
  for (const [currency, pair] of ACTIVATED_INSTRUMENTS) {
    await models.fxInstrument.update(
      { status: active ? "ACTIVE" : "INACTIVE" },
      { where: { currency, pair }, silent: true }
    );
  }
}

/** instrument id by "CUR/PAIR". */
const instrumentIds = new Map<string, { id: string; assetClass: string; contractSize: number }>();

async function loadInstruments() {
  const rows = (await models.fxInstrument.findAll({ raw: true })) as any[];
  for (const r of rows) {
    let contractSize = 1;
    try {
      const meta = typeof r.metadata === "string" ? JSON.parse(r.metadata) : r.metadata;
      contractSize = Number(meta?.contractSize ?? 1);
    } catch {
      contractSize = 1;
    }
    instrumentIds.set(`${r.currency}/${r.pair}`, {
      id: r.id,
      assetClass: r.assetClass,
      contractSize,
    });
  }
}

/* -------------------------------------------------------------------------- */
/* Account groups                                                              */
/* -------------------------------------------------------------------------- */

const ACCOUNT_GROUPS = [
  { key: "standard", name: "Standard", marginCall: 100, stopOut: 50, nbp: true, maxLeverage: 200, defaultForType: "LIVE" },
  { key: "raw", name: "Raw Spread", marginCall: 80, stopOut: 40, nbp: true, maxLeverage: 500, defaultForType: null },
  { key: "pro", name: "Professional", marginCall: 60, stopOut: 30, nbp: false, maxLeverage: 500, defaultForType: null },
  { key: "swapfree", name: "Swap-Free (Islamic)", marginCall: 100, stopOut: 50, nbp: true, maxLeverage: 100, defaultForType: null },
  { key: "demo", name: "Demo", marginCall: 100, stopOut: 50, nbp: true, maxLeverage: 500, defaultForType: "DEMO" },
] as const;

async function seedAccountGroups() {
  for (const g of ACCOUNT_GROUPS) {
    await upsert(models.fxAccountGroup, "fx_account_group", sid(`fxgroup:${g.key}`), {
      name: g.name,
      marginCallLevel: g.marginCall,
      stopOutLevel: g.stopOut,
      negativeBalanceProtection: g.nbp,
      maxLeverage: g.maxLeverage,
      defaultForType: g.defaultForType,
      createdAt: ago(210 * DAY),
      updatedAt: ago(30 * DAY),
    });
  }
}

/* -------------------------------------------------------------------------- */
/* Routing rules                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Priority ascending: the FIRST matching rule wins, so the narrow rules have to
 * sort above the broad ones. Rule 90 (the INTERNAL catch-all) is deliberately
 * last — with the table empty the router already falls back to internal, and
 * writing that fallback down as a rule is what makes the console DOCUMENT the
 * policy instead of merely permitting it.
 */
async function seedRoutingRules() {
  const providers = (await models.fxExecutionProvider.findAll({ raw: true })) as any[];
  const byName = new Map(providers.map((p: any) => [p.name, p.id]));
  const groups = (await models.fxSymbolGroup.findAll({ raw: true })) as any[];
  const groupByName = new Map(groups.map((g: any) => [g.name, g.id]));

  const rules: Array<Record<string, any>> = [
    {
      key: "hedge-large-majors",
      priority: 10,
      enabled: true,
      target: "EXTERNAL",
      executionProviderId: byName.get("oanda") ?? null,
      symbolGroupId: groupByName.get("FX Majors") ?? null,
      assetClass: "FOREX",
      accountGroupId: sid("fxgroup:pro"),
      minAmount: 500_000,
      note: "A-book anything over 5 standard lots from Professional accounts",
    },
    {
      key: "hedge-metals",
      priority: 20,
      enabled: true,
      target: "EXTERNAL",
      executionProviderId: byName.get("oanda") ?? null,
      symbolGroupId: groupByName.get("Metals") ?? null,
      assetClass: "COMMODITY",
      minAmount: 100,
      note: "Metals carry overnight gap risk the book will not absorb",
    },
    {
      key: "hedge-raw-sells",
      priority: 30,
      enabled: true,
      target: "EXTERNAL",
      executionProviderId: byName.get("ctrader") ?? null,
      accountGroupId: sid("fxgroup:raw"),
      side: "SELL",
      minAmount: 200_000,
      note: "Raw Spread short size goes to cTrader while the internal book is long",
    },
    {
      key: "internal-stocks",
      priority: 40,
      enabled: true,
      target: "INTERNAL",
      symbolGroupId: groupByName.get("US Stocks") ?? null,
      assetClass: "STOCK",
      maxAmount: 5_000,
      note: "Retail-sized single stocks stay on the book",
    },
    {
      key: "mt-overflow-disabled",
      priority: 50,
      enabled: false,
      target: "EXTERNAL",
      executionProviderId: byName.get("metaapi") ?? null,
      assetClass: "FOREX",
      minAmount: 2_000_000,
      note: "Standby overflow to MT5 - off until the broker approves datacenter logins",
    },
    {
      key: "internal-catch-all",
      priority: 90,
      enabled: true,
      target: "INTERNAL",
      note: "Everything else is B-booked. This is the fallback the router uses when no rule matches, written down so the console documents it",
    },
  ];

  for (const r of rules) {
    const { key, note, ...rest } = r;
    await upsert(models.fxRoutingRule, "fx_routing_rule", sid(`fxrule:${key}`), {
      priority: rest.priority,
      enabled: rest.enabled,
      target: rest.target,
      executionProviderId: rest.executionProviderId ?? null,
      instrumentId: rest.instrumentId ?? null,
      symbolGroupId: rest.symbolGroupId ?? null,
      assetClass: rest.assetClass ?? null,
      accountGroupId: rest.accountGroupId ?? null,
      accountId: rest.accountId ?? null,
      side: rest.side ?? null,
      minAmount: rest.minAmount ?? null,
      maxAmount: rest.maxAmount ?? null,
      note,
      createdAt: ago(120 * DAY),
      updatedAt: ago(6 * DAY),
    });
  }
}

/* -------------------------------------------------------------------------- */
/* Economic calendar                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Past events carry an `actual`, future ones do not — that is the whole visual
 * grammar of an economic calendar, and a table where every row has all three
 * numbers reads as fabricated at a glance.
 */
const EVENTS: Array<{
  key: string;
  hoursFromNow: number;
  country: string;
  currency: string;
  title: string;
  impact: "LOW" | "MEDIUM" | "HIGH";
  forecast?: string;
  previous?: string;
  actual?: string;
  unit?: string;
  source?: "PROVIDER" | "MANUAL";
}> = [
  { key: "us-nfp", hoursFromNow: -52, country: "US", currency: "USD", title: "Non-Farm Payrolls", impact: "HIGH", forecast: "185K", previous: "227K", actual: "142K", unit: "jobs" },
  { key: "us-unemp", hoursFromNow: -52, country: "US", currency: "USD", title: "Unemployment Rate", impact: "HIGH", forecast: "4.2%", previous: "4.2%", actual: "4.3%", unit: "%" },
  { key: "ez-cpi-flash", hoursFromNow: -30, country: "EU", currency: "EUR", title: "CPI Flash Estimate y/y", impact: "HIGH", forecast: "2.2%", previous: "2.4%", actual: "2.1%", unit: "%" },
  { key: "uk-gdp", hoursFromNow: -26, country: "GB", currency: "GBP", title: "GDP m/m", impact: "MEDIUM", forecast: "0.2%", previous: "0.0%", actual: "0.1%", unit: "%" },
  { key: "jp-tankan", hoursFromNow: -20, country: "JP", currency: "JPY", title: "Tankan Large Manufacturers Index", impact: "MEDIUM", forecast: "12", previous: "13", actual: "14" },
  { key: "us-crude", hoursFromNow: -6, country: "US", currency: "USD", title: "Crude Oil Inventories", impact: "MEDIUM", forecast: "-1.1M", previous: "0.8M", actual: "-2.4M", unit: "barrels" },
  { key: "ca-employment", hoursFromNow: -3, country: "CA", currency: "CAD", title: "Employment Change", impact: "HIGH", forecast: "27.5K", previous: "22.1K", actual: "36.4K", unit: "jobs" },
  { key: "au-retail", hoursFromNow: 2, country: "AU", currency: "AUD", title: "Retail Sales m/m", impact: "MEDIUM", forecast: "0.3%", previous: "0.7%" },
  { key: "ez-ecb-rate", hoursFromNow: 7, country: "EU", currency: "EUR", title: "ECB Main Refinancing Rate", impact: "HIGH", forecast: "3.40%", previous: "3.65%", unit: "%" },
  { key: "ez-ecb-presser", hoursFromNow: 8, country: "EU", currency: "EUR", title: "ECB Press Conference", impact: "HIGH" },
  { key: "us-cpi", hoursFromNow: 21, country: "US", currency: "USD", title: "CPI m/m", impact: "HIGH", forecast: "0.2%", previous: "0.2%", unit: "%" },
  { key: "us-corecpi", hoursFromNow: 21, country: "US", currency: "USD", title: "Core CPI m/m", impact: "HIGH", forecast: "0.2%", previous: "0.3%", unit: "%" },
  { key: "uk-boe", hoursFromNow: 30, country: "GB", currency: "GBP", title: "BoE Official Bank Rate", impact: "HIGH", forecast: "5.00%", previous: "5.00%", unit: "%" },
  { key: "jp-boj", hoursFromNow: 44, country: "JP", currency: "JPY", title: "BoJ Policy Rate", impact: "HIGH", forecast: "0.25%", previous: "0.25%", unit: "%" },
  { key: "us-fomc-minutes", hoursFromNow: 52, country: "US", currency: "USD", title: "FOMC Meeting Minutes", impact: "MEDIUM" },
  { key: "de-ifo", hoursFromNow: 56, country: "DE", currency: "EUR", title: "German ifo Business Climate", impact: "MEDIUM", forecast: "86.8", previous: "86.6" },
  { key: "nz-rbnz", hoursFromNow: 74, country: "NZ", currency: "NZD", title: "RBNZ Official Cash Rate", impact: "HIGH", forecast: "5.25%", previous: "5.25%", unit: "%" },
  { key: "ch-snb", hoursFromNow: 96, country: "CH", currency: "CHF", title: "SNB Policy Rate", impact: "HIGH", forecast: "1.00%", previous: "1.25%", unit: "%" },
  { key: "desk-rollover", hoursFromNow: 12, country: "US", currency: "USD", title: "Triple swap rollover - Wednesday", impact: "LOW", source: "MANUAL" },
  { key: "desk-maintenance", hoursFromNow: 120, country: "US", currency: "USD", title: "Scheduled liquidity-provider maintenance window", impact: "LOW", source: "MANUAL" },
];

async function seedEconomicEvents() {
  for (const e of EVENTS) {
    const at = e.hoursFromNow < 0 ? ago(-e.hoursFromNow * HOUR) : ahead(e.hoursFromNow * HOUR);
    await upsert(models.fxEconomicEvent, "fx_economic_event", sid(`fxevent:${e.key}`), {
      externalId: e.source === "MANUAL" ? null : `ff-${e.key}`,
      source: e.source ?? "PROVIDER",
      provider: e.source === "MANUAL" ? null : "forexfactory",
      eventTime: at,
      country: e.country,
      currency: e.currency,
      title: e.title,
      impact: e.impact,
      // An `actual` on a future event would be a calendar that predicts the
      // news. Only past rows carry one.
      actual: e.hoursFromNow < 0 ? (e.actual ?? null) : null,
      forecast: e.forecast ?? null,
      previousValue: e.previous ?? null,
      unit: e.unit ?? null,
      status: true,
      createdAt: ago(9 * DAY),
      updatedAt: e.hoursFromNow < 0 ? at : ago(9 * DAY),
    });
  }
}

/* -------------------------------------------------------------------------- */
/* Accounts, positions, orders                                                 */
/* -------------------------------------------------------------------------- */

/**
 * MARK PRICES. Closed positions are priced against these; open positions are
 * marked live by the terminal, so their unrealised PnL takes care of itself.
 */
const FX_MARK: Record<string, number> = {
  "EUR/USD": 1.10420,
  "GBP/USD": 1.30870,
  "AUD/USD": 0.66940,
  "USD/JPY": 149.180,
  "USD/CAD": 1.35240,
  "USD/CHF": 0.85310,
  "EUR/JPY": 164.750,
  "GBP/JPY": 195.240,
  "XAU/USD": 2518.40,
  "XAG/USD": 29.180,
  "WTI/USD": 71.240,
  "AAPL/USD": 226.80,
  "AMZN/USD": 181.35,
  "AMD/USD": 152.10,
};

/**
 * USD value of one unit of `ccy`, through the single USD hub the engine uses.
 *
 * `override` is a USD/ccy rate supplied by the caller — for a USD-BASED pair
 * the conversion rate IS the pair's own price, and at close time it is the
 * close price, which is how `execution.ts` books the deal.
 */
function usdPerUnit(ccy: string, override?: number): number {
  if (ccy === "USD") return 1;
  if (override) return 1 / override;
  const direct = FX_MARK[`${ccy}/USD`];
  if (direct) return direct;
  const inverse = FX_MARK[`USD/${ccy}`];
  if (inverse) return 1 / inverse;
  throw new Error(`no USD rate for ${ccy} — add one to FX_MARK`);
}

/**
 * Realised PnL in the ACCOUNT currency (USD on every account here).
 *
 * The engine computes PnL in the QUOTE currency — (close-entry)*amount for a
 * BUY, the negative of that for a SELL — and then converts quote -> USD. A
 * cross like GBP/JPY therefore books in JPY and converts at USD/JPY; getting
 * that step wrong is how a screenshot ends up showing a 149x profit.
 */
function fxPnlUsd(symbol: string, side: "BUY" | "SELL", amount: number, entry: number, close: number): number {
  const [base, quote] = symbol.split("/");
  const pnlQuote = side === "BUY" ? (close - entry) * amount : (entry - close) * amount;
  return pnlQuote * usdPerUnit(quote, base === "USD" ? close : undefined);
}

/** Position/order notional in USD. `amount` is in BASE units. */
function fxNotionalUsd(symbol: string, amount: number, price: number): number {
  const [base, quote] = symbol.split("/");
  return amount * price * usdPerUnit(quote, base === "USD" ? price : undefined);
}

const FX_ACCOUNTS = [
  { key: "ava", persona: "ava" as PersonaKey, type: "LIVE" as const, group: "pro", balance: 184_500, leverage: 200 },
  { key: "marcus", persona: "marcus" as PersonaKey, type: "LIVE" as const, group: "raw", balance: 42_800, leverage: 500 },
  { key: "priya", persona: "priya" as PersonaKey, type: "LIVE" as const, group: "standard", balance: 12_650, leverage: 200 },
  { key: "yuki", persona: "yuki" as PersonaKey, type: "DEMO" as const, group: "demo", balance: 100_000, leverage: 500 },
  { key: "sofia", persona: "sofia" as PersonaKey, type: "LIVE" as const, group: "swapfree", balance: 27_300, leverage: 100 },
];

type FxPositionSpec = {
  key: string;
  account: string;
  symbol: string;
  side: "BUY" | "SELL";
  /** Lots. Base units = lots * contractSize. */
  lots: number;
  entry: number;
  status: "OPEN" | "CLOSED" | "LIQUIDATED";
  close?: number;
  closeReason?: string;
  daysAgo: number;
  closedDaysAgo?: number;
  sl?: number;
  tp?: number;
  /** Swap accrued in account currency; swap-free accounts are always 0. */
  swap?: number;
  routing?: "INTERNAL" | "EXTERNAL";
};

/**
 * EVERY POSITION HERE IS CLOSED, AND THAT IS NOT A STYLISTIC CHOICE.
 *
 * Measured on this install: an OPEN position seeded by hand survives about a
 * minute. `risk-engine.ts` loads `fxPosition.findAll({ where: { status: "OPEN" } })`
 * and `fxOrder.findAll({ where: { status: ["OPEN","TRIGGERED"] } })` with NO
 * account filter at all, on the 60-second forex-trading lease tick — so there
 * is no account setting, no leverage and no stop distance that keeps a seeded
 * book out of its hands.
 *
 * The first version of this file seeded nine open positions. Within one tick
 * the engine had closed five of them against the dev price feed, written six
 * fx_deal rows, zeroed their `amount`, and moved a persona balance from 27,300
 * to 428,480 on a silver "take profit" at 68.758 against a 29.18 mark. That is
 * not a screenshot anyone can publish, and it is not reversible by re-running
 * a seeder either, because the deals it books carry ids this script never
 * minted.
 *
 * So: the history blotter, the closed-PnL column, the stop-out record and the
 * order log are all real here, and the OPEN panels stay empty. A screenshot of
 * a live open book has to be taken with a position opened through the UI at
 * capture time. See the note in the return value.
 */
const FX_POSITIONS: FxPositionSpec[] = [
  // Recently closed — this is what the terminal's History tab shows.
  { key: "ava-eurusd", account: "ava", symbol: "EUR/USD", side: "BUY", lots: 2.0, entry: 1.10180, status: "CLOSED", close: 1.10495, closeReason: "MANUAL", daysAgo: 2, closedDaysAgo: 1, sl: 1.09500, tp: 1.11500, swap: -4.12, routing: "EXTERNAL" },
  { key: "ava-xauusd", account: "ava", symbol: "XAU/USD", side: "BUY", lots: 1.5, entry: 2496.30, status: "CLOSED", close: 2521.80, closeReason: "MANUAL", daysAgo: 6, closedDaysAgo: 2, sl: 2455.00, tp: 2580.00, swap: -18.75, routing: "EXTERNAL" },
  { key: "ava-usdjpy", account: "ava", symbol: "USD/JPY", side: "SELL", lots: 1.0, entry: 150.240, status: "CLOSED", close: 149.310, closeReason: "MANUAL", daysAgo: 4, closedDaysAgo: 1, sl: 152.000, tp: 146.500, swap: -6.40 },
  { key: "marcus-gbpusd", account: "marcus", symbol: "GBP/USD", side: "SELL", lots: 1.0, entry: 1.31240, status: "CLOSED", close: 1.30810, closeReason: "MANUAL", daysAgo: 1, closedDaysAgo: 1, sl: 1.32000, tp: 1.29800, swap: -1.85 },
  { key: "marcus-wti", account: "marcus", symbol: "WTI/USD", side: "BUY", lots: 3.0, entry: 69.880, status: "CLOSED", close: 71.190, closeReason: "MANUAL", daysAgo: 3, closedDaysAgo: 1, sl: 67.500, tp: 75.000, swap: -9.30 },
  { key: "priya-audusd", account: "priya", symbol: "AUD/USD", side: "BUY", lots: 0.5, entry: 0.66710, status: "CLOSED", close: 0.66880, closeReason: "MANUAL", daysAgo: 5, closedDaysAgo: 2, sl: 0.66000, tp: 0.67800, swap: -0.92 },
  { key: "yuki-eurjpy", account: "yuki", symbol: "EUR/JPY", side: "BUY", lots: 2.5, entry: 163.820, status: "CLOSED", close: 164.610, closeReason: "MANUAL", daysAgo: 2, closedDaysAgo: 1, tp: 167.000, swap: -7.15 },
  { key: "yuki-aapl", account: "yuki", symbol: "AAPL/USD", side: "BUY", lots: 200, entry: 221.40, status: "CLOSED", close: 226.15, closeReason: "MANUAL", daysAgo: 9, closedDaysAgo: 3, sl: 208.00, tp: 240.00, swap: 0 },
  { key: "sofia-xagusd", account: "sofia", symbol: "XAG/USD", side: "BUY", lots: 2.0, entry: 28.640, status: "CLOSED", close: 29.110, closeReason: "MANUAL", daysAgo: 7, closedDaysAgo: 2, sl: 27.200, tp: 31.000, swap: 0 },

  // Older history — enough rows that the blotter has to scroll.
  { key: "ava-gbpusd-c", account: "ava", symbol: "GBP/USD", side: "BUY", lots: 1.5, entry: 1.29840, status: "CLOSED", close: 1.30910, closeReason: "TP", daysAgo: 21, closedDaysAgo: 18, swap: -5.20, routing: "EXTERNAL" },
  { key: "ava-usdcad-c", account: "ava", symbol: "USD/CAD", side: "SELL", lots: 2.0, entry: 1.36120, status: "CLOSED", close: 1.35480, closeReason: "MANUAL", daysAgo: 16, closedDaysAgo: 14, swap: -3.80 },
  { key: "marcus-eurusd-c", account: "marcus", symbol: "EUR/USD", side: "SELL", lots: 1.0, entry: 1.09760, status: "CLOSED", close: 1.10310, closeReason: "SL", daysAgo: 25, closedDaysAgo: 24, swap: -1.10 },
  { key: "marcus-xauusd-c", account: "marcus", symbol: "XAU/USD", side: "BUY", lots: 0.5, entry: 2464.10, status: "CLOSED", close: 2509.70, closeReason: "MANUAL", daysAgo: 30, closedDaysAgo: 22, swap: -12.40, routing: "EXTERNAL" },
  { key: "priya-usdchf-c", account: "priya", symbol: "USD/CHF", side: "BUY", lots: 0.5, entry: 0.84900, status: "CLOSED", close: 0.85260, closeReason: "MANUAL", daysAgo: 12, closedDaysAgo: 9, swap: -0.64 },
  { key: "priya-eurusd-c", account: "priya", symbol: "EUR/USD", side: "BUY", lots: 0.3, entry: 1.10640, status: "CLOSED", close: 1.10210, closeReason: "SL", daysAgo: 8, closedDaysAgo: 8, swap: -0.30 },
  { key: "yuki-gbpjpy-c", account: "yuki", symbol: "GBP/JPY", side: "SELL", lots: 1.0, entry: 197.120, status: "CLOSED", close: 195.010, closeReason: "TP", daysAgo: 11, closedDaysAgo: 6, swap: -4.05 },
  { key: "yuki-amzn-c", account: "yuki", symbol: "AMZN/USD", side: "BUY", lots: 120, entry: 176.20, status: "CLOSED", close: 182.95, closeReason: "MANUAL", daysAgo: 19, closedDaysAgo: 5, swap: 0 },
  { key: "sofia-wti-c", account: "sofia", symbol: "WTI/USD", side: "SELL", lots: 1.0, entry: 73.910, status: "CLOSED", close: 71.630, closeReason: "TP", daysAgo: 14, closedDaysAgo: 10, swap: 0 },
  // The stop-out. Every risk-console page wants one and there is nowhere else
  // for a reader to see what one looks like.
  { key: "priya-usdjpy-liq", account: "priya", symbol: "USD/JPY", side: "BUY", lots: 3.0, entry: 152.640, status: "LIQUIDATED", close: 149.820, closeReason: "STOP_OUT", daysAgo: 34, closedDaysAgo: 33, swap: -21.60 },
];

/**
 * USD 3.50 per side per STANDARD LOT of notional, i.e. per 100,000 USD.
 *
 * Per standard lot of NOTIONAL, not per unit of `lots` — on a stock the
 * contract size is 1, so `lots` is a share count and charging per share billed
 * 120 shares of AMZN at USD 840 on a USD 21,144 position.
 */
const COMMISSION_PER_100K_ROUND_TURN = 7.0;

const fxAccountIds = new Map<string, string>();

async function seedFxAccountsPositionsOrders() {
  for (const a of FX_ACCOUNTS) {
    const id = sid(`fxaccount:${a.key}`);
    fxAccountIds.set(a.key, id);
  }

  // Accounts must exist BEFORE the positions that point at them — fx_position
  // has a real FK on accountId — but the account's usedMargin is derived FROM
  // those positions. So the account is written twice: once to satisfy the
  // constraint, then again with the margin the book actually reserves.
  const writeAccount = async (a: (typeof FX_ACCOUNTS)[number], usedMargin: number) =>
    upsert(models.fxAccount, "fx_account", fxAccountIds.get(a.key)!, {
      userId: U(a.persona),
      type: a.type,
      accountCurrency: "USD",
      balance: a.balance,
      // Equity is balance + floating PnL, and the floating PnL of an OPEN book
      // is a live number. Seeding equity == balance is the only honest resting
      // value; the terminal recomputes it on the first tick.
      equity: a.balance,
      usedMargin: Number(usedMargin.toFixed(2)),
      leverage: a.leverage,
      marginMode: "HEDGING",
      groupId: sid(`fxgroup:${a.group}`),
      swapFree: a.group === "swapfree",
      tradingEnabled: true,
      status: true,
      dailyWithdrawLimit: 5000,
      monthlyWithdrawLimit: 50000,
      dailyWithdrawn: 0,
      monthlyWithdrawn: 0,
      lastWithdrawReset: ago(1 * DAY),
      metadata: JSON.stringify({ docsSeed: true, riskAckAt: ago(150 * DAY).toISOString() }),
      createdAt: ago(150 * DAY),
      updatedAt: ago(4 * MIN),
      deletedAt: null,
    });

  for (const a of FX_ACCOUNTS) await writeAccount(a, 0);

  const openMarginByAccount = new Map<string, number>();
  const realizedByAccount = new Map<string, number>();

  for (const p of FX_POSITIONS) {
    const inst = instrumentIds.get(p.symbol);
    if (!inst) throw new Error(`fx_instrument ${p.symbol} is missing`);
    const acct = FX_ACCOUNTS.find((a) => a.key === p.account)!;
    const amount = p.lots * inst.contractSize;
    const isOpen = p.status === "OPEN";

    // usedMargin in the ACCOUNT currency, which means the notional has to be
    // converted through the USD hub first — a cross like EUR/JPY has a notional
    // denominated in JPY.
    const usedMargin = isOpen ? fxNotionalUsd(p.symbol, amount, p.entry) / acct.leverage : 0;
    if (isOpen) openMarginByAccount.set(p.account, (openMarginByAccount.get(p.account) ?? 0) + usedMargin);

    const realized =
      p.status === "OPEN" ? null : fxPnlUsd(p.symbol, p.side, amount, p.entry, p.close!);
    if (realized !== null) realizedByAccount.set(p.account, (realizedByAccount.get(p.account) ?? 0) + realized);

    const swap = acct.group === "swapfree" ? 0 : (p.swap ?? 0);
    const commission = Number(
      ((fxNotionalUsd(p.symbol, amount, p.entry) / 100_000) * COMMISSION_PER_100K_ROUND_TURN).toFixed(2)
    );
    const openedAt = ago(p.daysAgo * DAY);

    await upsert(models.fxPosition, "fx_position", sid(`fxpos:${p.key}`), {
      userId: U(acct.persona),
      accountId: fxAccountIds.get(p.account)!,
      instrumentId: inst.id,
      side: p.side,
      amount,
      entryPrice: p.entry,
      slPrice: p.sl ?? null,
      tpPrice: p.tp ?? null,
      trailingDistance: null,
      trailingHighWater: null,
      usedMargin: Number(usedMargin.toFixed(2)),
      swapAccrued: swap,
      commissionPaid: commission,
      status: p.status,
      openedAt,
      closedAt: p.closedDaysAgo != null ? ago(p.closedDaysAgo * DAY) : null,
      closePrice: p.close ?? null,
      // Price PnL only. Commission and swap are their own columns because the
      // engine books them as separate deals — folding them in here would make
      // the position's realised figure disagree with the deal ledger.
      realizedPnl: realized === null ? null : Number(realized.toFixed(2)),
      closeReason: p.closeReason ?? null,
      routing: p.routing ?? "INTERNAL",
      executionProviderId: null,
      externalPositionId: null,
      externalEntryPrice: null,
      externalClosePrice: null,
      hedgePnl: null,
      pendingCloseAmount: null,
      pendingCloseRef: null,
      pendingCloseReason: null,
      closeRequestedAt: null,
      externalMeta: null,
      createdAt: openedAt,
      updatedAt: p.closedDaysAgo != null ? ago(p.closedDaysAgo * DAY) : ago(4 * MIN),
    });
  }

  // Second pass: the margin the open book actually reserves.
  for (const a of FX_ACCOUNTS) await writeAccount(a, openMarginByAccount.get(a.key) ?? 0);

  // Orders. Pending working orders plus the filled/cancelled/rejected history
  // that the desk's order blotter is actually made of.
  type OrderSpec = {
    key: string;
    account: string;
    symbol: string;
    side: "BUY" | "SELL";
    type: "MARKET" | "LIMIT" | "STOP" | "STOP_LIMIT";
    lots: number;
    price?: number;
    stopPrice?: number;
    sl?: number;
    tp?: number;
    status: "OPEN" | "TRIGGERED" | "ROUTING" | "FILLED" | "CANCELLED" | "REJECTED" | "EXPIRED";
    tif?: "GTC" | "GTD" | "DAY";
    minutesAgo: number;
    filledPositionKey?: string;
    rejectReason?: string;
    routing?: "INTERNAL" | "EXTERNAL";
  };

  /**
   * TERMINAL STATES ONLY, for the same reason the positions are all closed:
   * the risk engine loads every OPEN and TRIGGERED order on its 60-second tick
   * with no account filter, so a working order seeded here is the engine's
   * order within the minute. Everything below has already resolved.
   */
  const ORDERS: OrderSpec[] = [
    // The fills behind the closed positions.
    { key: "ava-eurusd-fill", account: "ava", symbol: "EUR/USD", side: "BUY", type: "MARKET", lots: 2.0, price: 1.10180, status: "FILLED", minutesAgo: 2 * 24 * 60, filledPositionKey: "ava-eurusd", routing: "EXTERNAL" },
    { key: "ava-xau-fill", account: "ava", symbol: "XAU/USD", side: "BUY", type: "MARKET", lots: 1.5, price: 2496.30, status: "FILLED", minutesAgo: 6 * 24 * 60, filledPositionKey: "ava-xauusd", routing: "EXTERNAL" },
    { key: "ava-usdjpy-fill", account: "ava", symbol: "USD/JPY", side: "SELL", type: "LIMIT", lots: 1.0, price: 150.240, status: "FILLED", minutesAgo: 4 * 24 * 60, filledPositionKey: "ava-usdjpy" },
    { key: "marcus-gbp-fill", account: "marcus", symbol: "GBP/USD", side: "SELL", type: "MARKET", lots: 1.0, price: 1.31240, status: "FILLED", minutesAgo: 24 * 60, filledPositionKey: "marcus-gbpusd" },
    { key: "marcus-wti-fill", account: "marcus", symbol: "WTI/USD", side: "BUY", type: "STOP", lots: 3.0, stopPrice: 69.880, status: "FILLED", minutesAgo: 3 * 24 * 60, filledPositionKey: "marcus-wti" },
    { key: "priya-aud-fill", account: "priya", symbol: "AUD/USD", side: "BUY", type: "LIMIT", lots: 0.5, price: 0.66710, status: "FILLED", minutesAgo: 5 * 24 * 60, filledPositionKey: "priya-audusd" },
    { key: "yuki-eurjpy-fill", account: "yuki", symbol: "EUR/JPY", side: "BUY", type: "MARKET", lots: 2.5, price: 163.820, status: "FILLED", minutesAgo: 2 * 24 * 60, filledPositionKey: "yuki-eurjpy" },
    { key: "yuki-aapl-fill", account: "yuki", symbol: "AAPL/USD", side: "BUY", type: "LIMIT", lots: 200, price: 221.40, status: "FILLED", minutesAgo: 9 * 24 * 60, filledPositionKey: "yuki-aapl" },
    { key: "sofia-xag-fill", account: "sofia", symbol: "XAG/USD", side: "BUY", type: "LIMIT", lots: 2.0, price: 28.640, status: "FILLED", minutesAgo: 7 * 24 * 60, filledPositionKey: "sofia-xagusd" },
    { key: "priya-usdjpy-fill", account: "priya", symbol: "USD/JPY", side: "BUY", type: "MARKET", lots: 3.0, price: 152.640, status: "FILLED", minutesAgo: 34 * 24 * 60, filledPositionKey: "priya-usdjpy-liq" },
    { key: "ava-gbpusd-fill", account: "ava", symbol: "GBP/USD", side: "BUY", type: "LIMIT", lots: 1.5, price: 1.29840, status: "FILLED", minutesAgo: 21 * 24 * 60, filledPositionKey: "ava-gbpusd-c", routing: "EXTERNAL" },
    { key: "yuki-gbpjpy-fill", account: "yuki", symbol: "GBP/JPY", side: "SELL", type: "LIMIT", lots: 1.0, price: 197.120, status: "FILLED", minutesAgo: 11 * 24 * 60, filledPositionKey: "yuki-gbpjpy-c" },

    // The rest of the blotter: what did NOT become a position.
    { key: "priya-eur-cancelled", account: "priya", symbol: "EUR/USD", side: "BUY", type: "LIMIT", lots: 0.5, price: 1.09200, status: "CANCELLED", minutesAgo: 3 * 24 * 60 },
    { key: "ava-usdcad-cancelled", account: "ava", symbol: "USD/CAD", side: "SELL", type: "STOP", lots: 1.0, stopPrice: 1.34800, status: "CANCELLED", minutesAgo: 11 * 24 * 60 },
    { key: "marcus-xag-cancelled", account: "marcus", symbol: "XAG/USD", side: "BUY", type: "STOP", lots: 1.0, stopPrice: 29.100, status: "CANCELLED", minutesAgo: 6 * 60 },
    { key: "yuki-gbpjpy-expired", account: "yuki", symbol: "GBP/JPY", side: "SELL", type: "LIMIT", lots: 1.0, price: 198.400, status: "EXPIRED", tif: "DAY", minutesAgo: 5 * 24 * 60 },
    { key: "sofia-wti-expired", account: "sofia", symbol: "WTI/USD", side: "BUY", type: "STOP", lots: 1.0, stopPrice: 73.500, status: "EXPIRED", tif: "GTD", minutesAgo: 4 * 24 * 60 },
    { key: "marcus-eur-rejected", account: "marcus", symbol: "EUR/USD", side: "BUY", type: "MARKET", lots: 40.0, status: "REJECTED", minutesAgo: 7 * 24 * 60, rejectReason: "Insufficient free margin: order requires 8,833.60 USD against 4,120.44 USD available" },
    { key: "sofia-xag-rejected", account: "sofia", symbol: "XAG/USD", side: "SELL", type: "LIMIT", lots: 0.2, price: 29.190, status: "REJECTED", minutesAgo: 2 * 24 * 60, rejectReason: "Limit price is inside the stops level (30 points) for XAG/USD" },
    { key: "priya-usdchf-rejected", account: "priya", symbol: "USD/CHF", side: "SELL", type: "MARKET", lots: 12.0, status: "REJECTED", minutesAgo: 9 * 24 * 60, rejectReason: "Order size 12.00 lots exceeds the Standard group maximum of 10.00 lots per ticket" },
  ];

  for (const o of ORDERS) {
    const inst = instrumentIds.get(o.symbol);
    if (!inst) throw new Error(`fx_instrument ${o.symbol} is missing`);
    const acct = FX_ACCOUNTS.find((a) => a.key === o.account)!;
    const amount = o.lots * inst.contractSize;
    const at = ago(o.minutesAgo * MIN);
    const refPrice = o.price ?? o.stopPrice ?? FX_MARK[o.symbol];
    const notionalUsd = fxNotionalUsd(o.symbol, amount, refPrice);
    // No order here is still working (see the note above ORDERS), so none of
    // them holds a margin reservation: a fill handed it to the position and a
    // cancel/reject/expiry handed it back to free margin.
    const working = o.status === "OPEN" || o.status === "TRIGGERED" || o.status === "ROUTING";

    await upsert(models.fxOrder, "fx_order", sid(`fxorder:${o.key}`), {
      userId: U(acct.persona),
      accountId: fxAccountIds.get(o.account)!,
      instrumentId: inst.id,
      side: o.side,
      type: o.type,
      amount,
      price: o.price ?? null,
      stopPrice: o.stopPrice ?? null,
      slPrice: o.sl ?? null,
      tpPrice: o.tp ?? null,
      trailingDistance: null,
      timeInForce: o.tif ?? "GTC",
      expiresAt: o.tif === "GTD" ? ahead(3 * DAY) : o.tif === "DAY" ? ahead(6 * HOUR) : null,
      status: o.status,
      routing: o.routing ?? "INTERNAL",
      filledPositionId: o.filledPositionKey ? sid(`fxpos:${o.filledPositionKey}`) : null,
      requestNonce: `docs-${sid(`fxorder:${o.key}`).slice(0, 18)}`,
      rejectReason: o.rejectReason ?? null,
      executionProviderId: null,
      routingRuleId: o.routing === "EXTERNAL" ? sid("fxrule:hedge-large-majors") : sid("fxrule:internal-catch-all"),
      // Only a working order holds a reservation. A filled one released it to
      // the position; a cancelled one released it to free margin.
      reservedMargin: working ? Number((notionalUsd / acct.leverage).toFixed(2)) : null,
      externalRef: null,
      externalOrderId: null,
      externalFillPrice: null,
      externalFilledAt: null,
      externalError: null,
      externalMeta: null,
      createdAt: at,
      updatedAt: at,
    });
  }
}

/* ========================================================================== */
/* SECTION 3 — Forex investment plans and signals                             */
/* ========================================================================== */

/**
 * forex_plan_duration is a pure JOIN table with a composite key and no
 * timestamps, and `/api/forex/plan/[id]/duration` includes forexPlan with
 * `required: true` through it — so with the table empty EVERY plan returns
 * zero durations and the invest dialog has an empty term selector. Both sides
 * already have rows; only the links were missing.
 */
async function seedForexPlanDurations() {
  const plans = (await models.forexPlan.findAll({ raw: true })) as any[];
  const durations = (await models.forexDuration.findAll({ raw: true })) as any[];
  if (!plans.length || !durations.length) return;

  const byLabel = new Map(durations.map((d: any) => [`${d.duration}-${d.timeframe}`, d.id]));
  // Short plans get short terms, the larger plan gets the long end. A plan
  // offering every term is a plan whose term selector teaches nothing.
  const ladder: Record<string, string[]> = {
    basic: ["1-HOUR", "3-HOUR", "2-DAY", "1-WEEK"],
    aaa: ["1-HOUR", "3-HOUR"],
    Beginner_Level_Forex: ["2-DAY", "1-WEEK", "1-MONTH"],
  };
  const fallback = ["1-HOUR", "2-DAY", "1-WEEK"];

  for (const plan of plans) {
    const wanted = ladder[plan.name] ?? fallback;
    for (const label of wanted) {
      const durationId = byLabel.get(label);
      if (!durationId) continue;
      await upsert(
        models.forexPlanDuration,
        "forex_plan_duration",
        sid(`fxplandur:${plan.id}:${durationId}`),
        { planId: plan.id, durationId }
      );
    }
  }
}

/**
 * forex_signal holds ONE row today, titled "dwada1". Seeding the assignment
 * join against it would put that string on the landing page, which is worse
 * than an empty section — so three real-looking signals are added and the
 * assignments point at those.
 */
const SIGNALS = [
  { key: "majors", title: "FX Majors Desk Signals" },
  { key: "metals", title: "Metals & Energy Swing Signals" },
  { key: "indices", title: "Index Momentum Signals" },
];

async function seedForexAccountSignals() {
  for (const s of SIGNALS) {
    await upsert(models.forexSignal, "forex_signal", sid(`fxsignal:${s.key}`), {
      title: s.title,
      // The signal image column is NOT NULL. Point at the placeholder the rest
      // of the platform uses for a missing upload rather than inventing a path
      // that would 404 in a screenshot.
      image: "/img/placeholder.svg",
      status: true,
      createdAt: ago(140 * DAY),
      updatedAt: ago(12 * DAY),
      deletedAt: null,
    });
  }

  // Persona forex (investment-product) accounts. The two existing rows belong
  // to the owner and to a real gmail address, so neither may carry a signal
  // into a screenshot.
  const accounts = [
    { key: "ava", persona: "ava" as PersonaKey, type: "LIVE" as const, accountId: "FX-108422", balance: 24_500, leverage: 200, broker: "Docs Markets", mt: 5, signals: ["majors", "metals"] },
    { key: "marcus", persona: "marcus" as PersonaKey, type: "LIVE" as const, accountId: "FX-108615", balance: 9_800, leverage: 100, broker: "Docs Markets", mt: 5, signals: ["majors"] },
    { key: "priya", persona: "priya" as PersonaKey, type: "DEMO" as const, accountId: "FX-D20913", balance: 50_000, leverage: 500, broker: "Docs Markets", mt: 4, signals: ["majors", "metals", "indices"] },
    { key: "yuki", persona: "yuki" as PersonaKey, type: "LIVE" as const, accountId: "FX-109044", balance: 61_200, leverage: 200, broker: "Docs Markets", mt: 5, signals: ["indices"] },
  ];

  for (const a of accounts) {
    const accId = sid(`forexaccount:${a.key}`);
    await upsert(models.forexAccount, "forex_account", accId, {
      userId: U(a.persona),
      accountId: a.accountId,
      password: null,
      broker: a.broker,
      mt: a.mt,
      balance: a.balance,
      leverage: a.leverage,
      type: a.type,
      status: true,
      currency: "USD",
      walletType: "SPOT",
      dailyWithdrawLimit: 5000,
      monthlyWithdrawLimit: 50000,
      dailyWithdrawn: 0,
      monthlyWithdrawn: 0,
      lastWithdrawReset: ago(1 * DAY),
      lastMonthlyWithdrawReset: ago(9 * DAY),
      createdAt: ago(120 * DAY),
      updatedAt: ago(2 * DAY),
      deletedAt: null,
    });

    for (const sig of a.signals) {
      const forexSignalId = sid(`fxsignal:${sig}`);
      // Composite primary key, no surrogate id, no timestamps — findOrCreate is
      // the idempotent shape here rather than upsert-by-id.
      const [, created] = await models.forexAccountSignal.findOrCreate({
        where: { forexAccountId: accId, forexSignalId },
        defaults: { forexAccountId: accId, forexSignalId },
      });
      tally("forex_account_signal", created);
    }
  }
}

/* ========================================================================== */
/* SECTION 4 — Trading bots                                                   */
/* ========================================================================== */

/**
 * Marketplace strategies. `getMarketplaceStrategies` filters on
 * `status: APPROVED` AND `visibility: PUBLIC`, so anything else is invisible on
 * /trading-bot/marketplace — but the admin review queue is exactly the rows
 * that are NOT approved, so the mix below carries both.
 */
type StrategySpec = {
  key: string;
  creator: PersonaKey;
  name: string;
  slug: string;
  short: string;
  description: string;
  type: "DCA" | "GRID" | "INDICATOR" | "TRAILING_STOP" | "CUSTOM";
  category: string;
  tags: string[];
  risk: "LOW" | "MEDIUM" | "HIGH";
  status: "DRAFT" | "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "SUSPENDED";
  visibility: "PRIVATE" | "PUBLIC";
  price: number;
  minAllocation: number;
  symbols: string[];
  timeframe: string;
  config: Record<string, any>;
  featured?: number;
  ageDays: number;
  rejectionReason?: string;
};

const STRATEGIES: StrategySpec[] = [
  {
    key: "steady-grid",
    creator: "ava",
    name: "Steady Grid BTC",
    slug: "steady-grid-btc",
    short: "A wide arithmetic grid for ranging BTC/USDT, sized for a 5,000 USDT allocation.",
    description:
      "Twenty arithmetic levels spanning a 12% band around the 30-day mean. Designed for a market that is going nowhere: the grid earns the spread between levels and does nothing at all in a trend, which is the trade-off you are accepting. Sell-all-on-stop is off, so stopping the bot leaves the inventory with you rather than market-selling it into whatever the book looks like at that moment.",
    type: "GRID",
    category: "Range trading",
    tags: ["grid", "btc", "range", "beginner"],
    risk: "MEDIUM",
    status: "APPROVED",
    visibility: "PUBLIC",
    price: 49.0,
    minAllocation: 5000,
    symbols: ["BTC/USDT", "ETH/USDT"],
    timeframe: "15m",
    config: { upperPrice: 68_500, lowerPrice: 61_200, gridCount: 20, amountPerGrid: 250, gridType: "arithmetic", initialBuy: false, sellAllOnStop: false },
    featured: 1,
    ageDays: 168,
  },
  {
    key: "weekly-dca",
    creator: "marcus",
    name: "Weekly DCA Ladder",
    slug: "weekly-dca-ladder",
    short: "Buys a fixed notional every week, doubling the tranche after any 8% drawdown.",
    description:
      "The dullest strategy in the marketplace and deliberately so. A fixed 100 USDT every seven days, with the tranche doubled for the next two buys whenever the last buy is 8% or more underwater. Maximum twenty-six buys, then it stops and holds. There is no exit rule: this is an accumulation tool, and pretending otherwise is how DCA bots get sold to people who needed a trading bot.",
    type: "DCA",
    category: "Accumulation",
    tags: ["dca", "accumulation", "long-term", "beginner"],
    risk: "LOW",
    status: "APPROVED",
    visibility: "PUBLIC",
    price: 0,
    minAllocation: 500,
    symbols: ["BTC/USDT", "ETH/USDT", "SOL/USDT"],
    timeframe: "1d",
    config: { interval: "weekly", intervalHours: 168, amount: 100, amountType: "fixed", maxBuys: 26, drawdownMultiplier: 2, drawdownTriggerPercent: 8 },
    featured: 2,
    ageDays: 201,
  },
  {
    key: "rsi-reversion",
    creator: "priya",
    name: "RSI Mean Reversion",
    slug: "rsi-mean-reversion",
    short: "Buys RSI(14) below 28 with price under the 50-period SMA; exits at the mean.",
    description:
      "A two-condition entry — RSI(14) under 28 AND price below SMA(50) — with the exit at the SMA rather than at a fixed target, so a strong bounce is not cut short and a weak one is not held for ever. The 2% stop is placed at entry, not trailed. Backtested on 4h candles; on anything faster the RSI threshold fires too often to be worth the fees.",
    type: "INDICATOR",
    category: "Mean reversion",
    tags: ["rsi", "mean-reversion", "indicator", "intermediate"],
    risk: "MEDIUM",
    status: "APPROVED",
    visibility: "PUBLIC",
    price: 79.0,
    minAllocation: 2000,
    symbols: ["ETH/USDT", "BNB/USDT"],
    timeframe: "4h",
    config: {
      timeframe: "4h",
      indicators: {
        rsi: { enabled: true, period: 14, overbought: 72, oversold: 28 },
        ma: { enabled: true, type: "SMA", period: 50, crossType: "price_cross" },
      },
      signalMode: "all",
      entryAmount: 400,
      exitMode: "indicator",
      riskManagement: { stopLoss: 2, takeProfit: null },
    },
    featured: 3,
    ageDays: 133,
  },
  {
    key: "trend-trail",
    creator: "yuki",
    name: "Trend Trailing Stop",
    slug: "trend-trailing-stop",
    short: "Enters on a 20/50 EMA cross and trails 3% behind the high-water mark.",
    description:
      "Entry on the 20/50 EMA cross, trail activated once the position is 1.5% ahead, then 3% behind the running high. The trail never widens. Expect a low win rate and a long right tail — this strategy loses small a lot and wins large rarely, and an operator who cannot sit through eight losing trades in a row should not run it.",
    type: "TRAILING_STOP",
    category: "Trend following",
    tags: ["trend", "trailing-stop", "ema", "advanced"],
    risk: "HIGH",
    status: "APPROVED",
    visibility: "PUBLIC",
    price: 129.0,
    minAllocation: 3000,
    symbols: ["BTC/USDT", "ETH/USDT", "SOL/USDT", "AVAX/USDT"],
    timeframe: "1h",
    config: { trailPercent: 3, activationPercent: 1.5, entryMode: "signal", entryAmount: 600, entryCondition: { type: "ema_cross", fast: 20, slow: 50 } },
    ageDays: 97,
  },
  {
    key: "funding-harvest",
    creator: "liam",
    name: "Funding Rate Harvest",
    slug: "funding-rate-harvest",
    short: "Rules-based: goes long spot whenever perp funding has been negative for three prints.",
    description:
      "A custom rule set rather than a preset. Three consecutive negative funding prints on the perpetual are read as crowded-short positioning; the bot buys spot and exits after two positive prints or five days, whichever comes first. It does not short, it does not use leverage, and it sits out most of the month.",
    type: "CUSTOM",
    category: "Market structure",
    tags: ["funding", "custom", "market-neutral", "advanced"],
    risk: "MEDIUM",
    status: "APPROVED",
    visibility: "PUBLIC",
    price: 199.0,
    minAllocation: 10_000,
    symbols: ["BTC/USDT", "ETH/USDT"],
    timeframe: "8h",
    config: {
      symbol: "BTC/USDT",
      timeframe: "8h",
      rules: [
        {
          id: "r1",
          name: "Buy after three negative funding prints",
          conditionLogic: "AND",
          conditions: [
            { id: "c1", type: "FUNDING", operator: "<", value: "0", valueType: "NUMBER", lookback: 3 },
            { id: "c2", type: "POSITION", operator: "=", value: "FLAT", valueType: "STRING" },
          ],
          actions: [{ id: "a1", type: "BUY", amountType: "PERCENT", amount: "25", orderType: "MARKET" }],
        },
        {
          id: "r2",
          name: "Exit after two positive prints",
          conditionLogic: "OR",
          conditions: [
            { id: "c3", type: "FUNDING", operator: ">", value: "0", valueType: "NUMBER", lookback: 2 },
            { id: "c4", type: "AGE", operator: ">", value: "120", valueType: "NUMBER" },
          ],
          actions: [{ id: "a2", type: "SELL", amountType: "ALL", orderType: "MARKET" }],
        },
      ],
      riskManagement: { stopLoss: 6, takeProfit: null },
    },
    ageDays: 74,
  },
  {
    key: "tight-grid-eth",
    creator: "nadia",
    name: "Tight Grid ETH",
    slug: "tight-grid-eth",
    short: "Forty narrow geometric levels on ETH/USDT for high-frequency range capture.",
    description:
      "Forty geometric levels across a 6% band. Fee-sensitive by construction: at 0.1% taker the grid needs a level spacing above roughly 0.25% to clear costs, and this one sits just above that line. Read the fee note before running it on a venue with a taker fee above 0.1%.",
    type: "GRID",
    category: "Range trading",
    tags: ["grid", "eth", "high-frequency", "intermediate"],
    risk: "HIGH",
    status: "APPROVED",
    visibility: "PUBLIC",
    price: 39.0,
    minAllocation: 4000,
    symbols: ["ETH/USDT"],
    timeframe: "5m",
    config: { upperPrice: 3_260, lowerPrice: 3_070, gridCount: 40, amountPerGrid: 120, gridType: "geometric", initialBuy: true, sellAllOnStop: false },
    ageDays: 46,
  },
  // Not on the marketplace. These are what the admin review queue is made of.
  {
    key: "macd-scalper",
    creator: "tomas",
    name: "MACD Scalper 5m",
    slug: "macd-scalper-5m",
    short: "MACD histogram flip on 5m candles with a 0.8% fixed target.",
    description:
      "Submitted for review. Enters on a MACD histogram sign flip confirmed by rising volume, exits at a fixed 0.8% or on the opposite flip. High trade count; the reviewer should check the fee assumptions before approving.",
    type: "INDICATOR",
    category: "Scalping",
    tags: ["macd", "scalping", "5m"],
    risk: "HIGH",
    status: "PENDING_REVIEW",
    visibility: "PUBLIC",
    price: 59.0,
    minAllocation: 1500,
    symbols: ["BTC/USDT"],
    timeframe: "5m",
    config: {
      timeframe: "5m",
      indicators: { macd: { enabled: true, fast: 12, slow: 26, signal: 9 }, volume: { enabled: true, period: 20 } },
      signalMode: "all",
      entryAmount: 300,
      exitMode: "target",
      riskManagement: { stopLoss: 1.2, takeProfit: 0.8 },
    },
    ageDays: 6,
  },
  {
    key: "martingale-recovery",
    creator: "sofia",
    name: "Recovery Martingale",
    slug: "recovery-martingale",
    short: "Doubles position size after every loss until recovery.",
    description:
      "Rejected. The size ladder is unbounded, so the drawdown a losing streak produces is limited only by the account balance. The marketplace does not list strategies whose worst case is a zeroed account.",
    type: "CUSTOM",
    category: "Recovery",
    tags: ["martingale", "high-risk"],
    risk: "HIGH",
    status: "REJECTED",
    visibility: "PRIVATE",
    price: 89.0,
    minAllocation: 2000,
    symbols: ["BTC/USDT"],
    timeframe: "15m",
    config: { symbol: "BTC/USDT", timeframe: "15m", rules: [], martingale: { multiplier: 2, maxSteps: null } },
    ageDays: 23,
    rejectionReason:
      "Unbounded position sizing. The size ladder has no maximum step, so a losing streak is limited only by the account balance. Resubmit with a hard cap and a documented worst-case drawdown.",
  },
  {
    key: "vol-breakout-draft",
    creator: "ava",
    name: "Volatility Breakout (draft)",
    slug: "volatility-breakout-draft",
    short: "Work in progress - ATR-channel breakout with a session filter.",
    description: "Not finished. The session filter is stubbed and the ATR period is still being fitted. Kept private.",
    type: "CUSTOM",
    category: "Breakout",
    tags: ["atr", "breakout", "draft"],
    risk: "HIGH",
    status: "DRAFT",
    visibility: "PRIVATE",
    price: 0,
    minAllocation: 1000,
    symbols: ["BTC/USDT"],
    timeframe: "1h",
    config: { symbol: "BTC/USDT", timeframe: "1h", rules: [] },
    ageDays: 11,
  },
];

const PLATFORM_FEE_PERCENT = 20.0;

type PurchaseSpec = { strategy: string; buyer: PersonaKey; daysAgo: number; timesUsed: number; rating?: number; review?: string };
const PURCHASES: PurchaseSpec[] = [
  { strategy: "steady-grid", buyer: "marcus", daysAgo: 96, timesUsed: 4, rating: 5, review: "Ran it through two flat weeks and it did exactly what the description said." },
  { strategy: "steady-grid", buyer: "priya", daysAgo: 74, timesUsed: 2, rating: 4 },
  { strategy: "steady-grid", buyer: "yuki", daysAgo: 51, timesUsed: 6, rating: 5 },
  { strategy: "steady-grid", buyer: "liam", daysAgo: 30, timesUsed: 1, rating: 4 },
  { strategy: "steady-grid", buyer: "nadia", daysAgo: 12, timesUsed: 1 },
  { strategy: "rsi-reversion", buyer: "ava", daysAgo: 88, timesUsed: 3, rating: 4 },
  { strategy: "rsi-reversion", buyer: "yuki", daysAgo: 44, timesUsed: 2, rating: 5 },
  { strategy: "rsi-reversion", buyer: "tomas", daysAgo: 19, timesUsed: 1, rating: 3 },
  { strategy: "trend-trail", buyer: "marcus", daysAgo: 63, timesUsed: 5, rating: 4 },
  { strategy: "trend-trail", buyer: "sofia", daysAgo: 28, timesUsed: 2, rating: 3 },
  { strategy: "funding-harvest", buyer: "ava", daysAgo: 41, timesUsed: 3, rating: 5 },
  { strategy: "funding-harvest", buyer: "priya", daysAgo: 22, timesUsed: 1, rating: 4 },
  { strategy: "tight-grid-eth", buyer: "tomas", daysAgo: 25, timesUsed: 8, rating: 2, review: "Works, but the fees ate most of it on a 0.1% taker venue. Read the fee note first." },
  { strategy: "tight-grid-eth", buyer: "liam", daysAgo: 8, timesUsed: 2, rating: 4 },
];

type ReviewSpec = { strategy: string; user: PersonaKey; rating: number; title: string; content: string; status: "PENDING" | "APPROVED" | "REJECTED"; daysAgo: number; adminNote?: string };
const REVIEWS: ReviewSpec[] = [
  { strategy: "steady-grid", user: "marcus", rating: 5, title: "Does what it says", content: "Two flat weeks on BTC/USDT and it collected the spread between levels the whole way. The sell-all-on-stop default being off saved me from dumping inventory when I paused it.", status: "APPROVED", daysAgo: 70 },
  { strategy: "steady-grid", user: "priya", rating: 4, title: "Good, but size it properly", content: "The 5,000 minimum is real. I tried it on 2,000 and the per-level size was too small to clear fees.", status: "APPROVED", daysAgo: 55 },
  { strategy: "steady-grid", user: "yuki", rating: 5, title: "My default range bot", content: "Left it running for six weeks. No surprises, which is the highest compliment I have for a grid.", status: "APPROVED", daysAgo: 33 },
  { strategy: "steady-grid", user: "liam", rating: 4, title: "Solid", content: "Nothing clever, and that is the point. Would like a wider band option.", status: "APPROVED", daysAgo: 21 },
  { strategy: "rsi-reversion", user: "ava", rating: 4, title: "Patient by design", content: "It sits out for days at a time. That is correct behaviour for the setup and it still felt strange the first week.", status: "APPROVED", daysAgo: 60 },
  { strategy: "rsi-reversion", user: "yuki", rating: 5, title: "Exit at the mean is the right call", content: "Every other RSI bot I have run uses a fixed target and cuts the good ones short.", status: "APPROVED", daysAgo: 29 },
  { strategy: "rsi-reversion", user: "tomas", rating: 3, title: "Too slow for me", content: "Fine strategy, wrong timeframe for how I trade. My problem, not the strategy's.", status: "APPROVED", daysAgo: 14 },
  { strategy: "trend-trail", user: "marcus", rating: 4, title: "The description does not lie about the drawdown", content: "Eight losers in a row before a winner that paid for all of them. Read the risk note twice before buying.", status: "APPROVED", daysAgo: 40 },
  { strategy: "trend-trail", user: "sofia", rating: 3, title: "Hard to sit through", content: "Works. I could not stomach it.", status: "APPROVED", daysAgo: 17 },
  { strategy: "funding-harvest", user: "ava", rating: 5, title: "Genuinely different", content: "The only strategy here that is not another indicator cross. Trades rarely and the ones it takes make sense.", status: "APPROVED", daysAgo: 26 },
  { strategy: "tight-grid-eth", user: "tomas", rating: 2, title: "Fee sensitive, as warned", content: "The seller does warn about this in the description, so two stars is on me for not reading it. On a 0.02% maker venue it would be a different review.", status: "APPROVED", daysAgo: 15 },
  // The admin review queue.
  { strategy: "trend-trail", user: "nadia", rating: 1, title: "lost money", content: "bot is scam dont buy", status: "PENDING", daysAgo: 2 },
  { strategy: "funding-harvest", user: "liam", rating: 5, title: "Six weeks in", content: "Three trades, all profitable, and long stretches of nothing. Exactly as advertised.", status: "PENDING", daysAgo: 1 },
  { strategy: "tight-grid-eth", user: "sofia", rating: 4, title: "Fine on a maker-rebate venue", content: "Ran it where the maker fee is negative and the economics flip completely.", status: "PENDING", daysAgo: 4 },
  { strategy: "steady-grid", user: "tomas", rating: 1, title: "check my channel for better bots", content: "visit my telegram t.me/example for free signals", status: "REJECTED", daysAgo: 9, adminNote: "Solicitation. Rejected under the marketplace review policy." },
];

async function seedTradingBotMarketplace() {
  // Revenue is derived from the purchases, so total it up first.
  const revenueByStrategy = new Map<string, number>();
  const purchaseCount = new Map<string, number>();
  const ratingSum = new Map<string, number>();
  const ratingCount = new Map<string, number>();

  for (const p of PURCHASES) {
    const strat = STRATEGIES.find((s) => s.key === p.strategy)!;
    revenueByStrategy.set(p.strategy, (revenueByStrategy.get(p.strategy) ?? 0) + strat.price);
    purchaseCount.set(p.strategy, (purchaseCount.get(p.strategy) ?? 0) + 1);
    if (p.rating != null) {
      ratingSum.set(p.strategy, (ratingSum.get(p.strategy) ?? 0) + p.rating);
      ratingCount.set(p.strategy, (ratingCount.get(p.strategy) ?? 0) + 1);
    }
  }

  for (const s of STRATEGIES) {
    const total = revenueByStrategy.get(s.key) ?? 0;
    const platform = Number(((total * PLATFORM_FEE_PERCENT) / 100).toFixed(2));
    const creator = Number((total - platform).toFixed(2));
    const rc = ratingCount.get(s.key) ?? 0;
    const avg = rc ? Number(((ratingSum.get(s.key) ?? 0) / rc).toFixed(2)) : null;
    const created = ago(s.ageDays * DAY);

    await upsert(models.tradingBotStrategy, "trading_bot_strategy", sid(`strategy:${s.key}`), {
      creatorId: U(s.creator),
      name: s.name,
      slug: s.slug,
      description: s.description,
      shortDescription: s.short,
      icon: null,
      coverImage: null,
      type: s.type,
      category: s.category,
      tags: s.tags,
      defaultConfig: s.config,
      customNodes: null,
      recommendedSymbols: s.symbols,
      recommendedTimeframe: s.timeframe,
      minAllocation: s.minAllocation,
      riskLevel: s.risk,
      status: s.status,
      visibility: s.visibility,
      price: s.price,
      currency: "USDT",
      isFeatured: s.featured != null,
      featuredOrder: s.featured ?? null,
      totalPurchases: purchaseCount.get(s.key) ?? 0,
      totalUsers: purchaseCount.get(s.key) ?? 0,
      avgRating: avg,
      totalRatings: rc,
      totalRevenue: total,
      creatorRevenue: creator,
      platformRevenue: platform,
      reviewedAt: s.status === "APPROVED" || s.status === "REJECTED" ? ago((s.ageDays - 2) * DAY) : null,
      reviewedBy: s.status === "APPROVED" || s.status === "REJECTED" ? U("ops") : null,
      rejectionReason: s.rejectionReason ?? null,
      version: "1.2.0",
      changelog: "1.2.0 - tightened the default stop and documented the fee assumption.",
      createdAt: created,
      updatedAt: ago(3 * DAY),
      deletedAt: null,
    });
  }

  for (const p of PURCHASES) {
    const strat = STRATEGIES.find((s) => s.key === p.strategy)!;
    const platformFee = Number(((strat.price * PLATFORM_FEE_PERCENT) / 100).toFixed(2));
    const at = ago(p.daysAgo * DAY);
    await upsert(models.tradingBotPurchase, "trading_bot_purchase", sid(`purchase:${p.strategy}:${p.buyer}`), {
      buyerId: U(p.buyer),
      strategyId: sid(`strategy:${p.strategy}`),
      sellerId: U(strat.creator),
      status: "COMPLETED",
      price: strat.price,
      currency: "USDT",
      platformFee,
      platformFeePercent: PLATFORM_FEE_PERCENT,
      sellerAmount: Number((strat.price - platformFee).toFixed(2)),
      transactionId: null,
      walletId: null,
      // The snapshot is what the buyer actually owns: the config AS SOLD, so a
      // later edit by the seller cannot silently change a bot somebody is
      // already running.
      // DataTypes.JSON: hand it the object. A pre-stringified value is
      // serialised a SECOND time and comes back out as a quoted string.
      strategySnapshot: {
        name: strat.name,
        type: strat.type,
        version: "1.2.0",
        defaultConfig: strat.config,
        recommendedSymbols: strat.symbols,
        recommendedTimeframe: strat.timeframe,
      },
      strategyVersion: "1.2.0",
      timesUsed: p.timesUsed,
      lastUsedAt: ago(Math.max(1, p.daysAgo - 4) * DAY),
      rating: p.rating ?? null,
      review: p.review ?? null,
      reviewedAt: p.rating != null ? ago(Math.max(1, p.daysAgo - 6) * DAY) : null,
      createdAt: at,
      updatedAt: at,
    });
  }

  for (const r of REVIEWS) {
    const at = ago(r.daysAgo * DAY);
    await upsert(models.tradingBotStrategyReview, "trading_bot_strategy_review", sid(`review:${r.strategy}:${r.user}`), {
      userId: U(r.user),
      strategyId: sid(`strategy:${r.strategy}`),
      rating: r.rating,
      title: r.title,
      content: r.content,
      status: r.status,
      adminNote: r.adminNote ?? null,
      createdAt: at,
      updatedAt: at,
    });
  }
}

/* -------------------------------------------------------------------------- */
/* Bots, their trades and their order books                                    */
/* -------------------------------------------------------------------------- */

/**
 * NO BOT HERE IS `RUNNING`, AND THAT IS DELIBERATE.
 *
 * `utils/cron.ts` runs a stale-tick detector that flips any RUNNING bot whose
 * `lastTickAt` is older than the threshold to ERROR, and the engine's
 * `syncWithDatabase` ADOPTS RUNNING rows and starts ticking them. A hand-seeded
 * RUNNING row would therefore either be rewritten to ERROR within minutes or
 * start placing orders of its own — which would also break this script's
 * idempotency, because those rows have ids this script did not mint.
 *
 * PAUSED and LIMIT_REACHED are both "alive" states with a full order book
 * behind them, and neither is touched by the engine. A genuinely RUNNING bot
 * for the running-bots page has to be started through the UI at capture time.
 */
// `purchaseId` is a real FK to trading_bot_purchase, and a bot running a bought
// strategy must point at a purchase THIS user actually made — so every entry
// here has a matching row in PURCHASES above. A bot with `purchase: null` was
// built in the strategy builder and owns its config outright.
const BOTS = [
  { key: "marcus-grid", persona: "marcus" as PersonaKey, name: "BTC Range Grid", symbol: "BTC/USDT", type: "GRID" as const, mode: "LIVE" as const, status: "PAUSED" as const, allocated: 5000, purchase: "steady-grid" },
  { key: "priya-dca", persona: "priya" as PersonaKey, name: "Weekly ETH Ladder", symbol: "ETH/USDT", type: "DCA" as const, mode: "LIVE" as const, status: "PAUSED" as const, allocated: 2600, purchase: null },
  { key: "yuki-rsi", persona: "yuki" as PersonaKey, name: "ETH Mean Reversion", symbol: "ETH/USDT", type: "INDICATOR" as const, mode: "PAPER" as const, status: "PAUSED" as const, allocated: 2000, purchase: "rsi-reversion" },
  { key: "sofia-trail", persona: "sofia" as PersonaKey, name: "SOL Trend Trail", symbol: "SOL/USDT", type: "TRAILING_STOP" as const, mode: "PAPER" as const, status: "LIMIT_REACHED" as const, allocated: 3000, purchase: "trend-trail" },
];

/** Reference prices for the bot symbols, so cost = amount * price holds. */
const BOT_PRICE: Record<string, number> = { "BTC/USDT": 64_850, "ETH/USDT": 3_120, "SOL/USDT": 148.6 };

async function seedTradingBots() {
  for (const b of BOTS) {
    const px = BOT_PRICE[b.symbol];
    const strat = b.purchase ? STRATEGIES.find((s) => s.key === b.purchase)! : null;

    /* ---- trades ---- */
    // Five closed round trips plus one open, per bot. Every derived number
    // (cost, profit, profitPercent) follows from amount, entry and exit.
    const trades: Array<{ n: number; entry: number; exit: number | null; qtyUsd: number; daysAgo: number; signal: string }> = [
      { n: 1, entry: px * 0.972, exit: px * 0.9905, qtyUsd: 420, daysAgo: 26, signal: "GRID_BUY" },
      { n: 2, entry: px * 0.9835, exit: px * 0.9962, qtyUsd: 420, daysAgo: 21, signal: "GRID_BUY" },
      { n: 3, entry: px * 1.0044, exit: px * 0.9958, qtyUsd: 420, daysAgo: 15, signal: "GRID_SELL" },
      { n: 4, entry: px * 0.9901, exit: px * 1.0072, qtyUsd: 420, daysAgo: 9, signal: "GRID_BUY" },
      { n: 5, entry: px * 1.0018, exit: px * 1.0139, qtyUsd: 420, daysAgo: 4, signal: "GRID_BUY" },
      { n: 6, entry: px * 0.9989, exit: null, qtyUsd: 420, daysAgo: 1, signal: "GRID_BUY" },
    ];

    let totalProfit = 0;
    let wins = 0;
    let losses = 0;
    let totalVolume = 0;
    let totalFees = 0;

    // Aggregate FIRST, write SECOND. `trading_bot_trade.botId` is a real FK, so
    // the bot row has to exist before any trade points at it — but the bot's
    // totals are derived FROM those trades. Two passes, no DB in the first.
    for (const t of trades) {
      const amount = t.qtyUsd / t.entry;
      const cost = amount * t.entry;
      const fee = Number((cost * 0.001).toFixed(8));
      const closed = t.exit !== null;
      totalVolume += cost + (closed ? amount * t.exit! : 0);
      totalFees += fee * (closed ? 2 : 1);
      if (closed) {
        const profit = (t.exit! - t.entry) * amount;
        totalProfit += profit;
        if (profit >= 0) wins++;
        else losses++;
      }
    }

    /* ---- the bot itself ---- */
    await upsert(models.tradingBot, "trading_bot", sid(`bot:${b.key}`), {
      userId: U(b.persona),
      name: b.name,
      description: strat ? `Running "${strat.name}" from the marketplace.` : "Built in the strategy builder.",
      symbol: b.symbol,
      type: b.type,
      mode: b.mode,
      status: b.status,
      strategyConfig: strat ? strat.config : { interval: "weekly", intervalHours: 168, amount: 100, amountType: "fixed", maxBuys: 26 },
      maxPositionSize: Number((b.allocated * 0.25).toFixed(8)),
      maxConcurrentTrades: 4,
      dailyLossLimit: Number((b.allocated * 0.05).toFixed(8)),
      dailyLossLimitPercent: 5,
      maxDrawdownPercent: 15,
      cooldownSeconds: 300,
      stopLossPercent: 3,
      takeProfitPercent: 2,
      allocatedAmount: b.allocated,
      usedAmount: 420,
      totalTrades: trades.length,
      winningTrades: wins,
      losingTrades: losses,
      totalProfit: Number(totalProfit.toFixed(8)),
      totalVolume: Number(totalVolume.toFixed(8)),
      totalFees: Number(totalFees.toFixed(8)),
      dailyTrades: 1,
      dailyProfit: 0,
      dailyVolume: 420,
      dailyResetAt: ago(6 * HOUR),
      peakEquity: Number((b.allocated + Math.max(totalProfit, 0)).toFixed(8)),
      currentDrawdown: 0,
      purchaseId: b.purchase ? sid(`purchase:${b.purchase}:${b.persona}`) : null,
      lastTickAt: ago(9 * MIN),
      lastTradeAt: ago(1 * DAY),
      lastErrorAt: null,
      lastError: null,
      errorCount: 0,
      startedAt: ago(28 * DAY),
      stoppedAt: null,
      pausedAt: b.status === "PAUSED" ? ago(11 * MIN) : null,
      flattenRequestedAt: null,
      createdAt: ago(30 * DAY),
      updatedAt: ago(9 * MIN),
      deletedAt: null,
    });

    for (const t of trades) {
      const amount = t.qtyUsd / t.entry;
      const cost = amount * t.entry;
      const fee = Number((cost * 0.001).toFixed(8));
      const closed = t.exit !== null;
      const profit = closed ? (t.exit! - t.entry) * amount : null;
      const profitPercent = closed ? ((t.exit! - t.entry) / t.entry) * 100 : null;

      const openedAt = ago(t.daysAgo * DAY);
      await upsert(models.tradingBotTrade, "trading_bot_trade", sid(`bottrade:${b.key}:${t.n}`), {
        botId: sid(`bot:${b.key}`),
        userId: U(b.persona),
        ecosystemOrderId: null,
        symbol: b.symbol,
        side: "BUY",
        type: "LIMIT",
        status: closed ? "CLOSED" : "OPEN",
        amount: Number(amount.toFixed(8)),
        price: Number(t.entry.toFixed(8)),
        cost: Number(cost.toFixed(8)),
        fee,
        feeCurrency: "USDT",
        executedAmount: Number(amount.toFixed(8)),
        executedPrice: Number(t.entry.toFixed(8)),
        executedCost: Number(cost.toFixed(8)),
        entryPrice: Number(t.entry.toFixed(8)),
        exitPrice: closed ? Number(t.exit!.toFixed(8)) : null,
        profit: closed ? Number(profit!.toFixed(8)) : null,
        profitPercent: closed ? Number(profitPercent!.toFixed(4)) : null,
        stopLossPrice: Number((t.entry * 0.97).toFixed(8)),
        takeProfitPrice: Number((t.entry * 1.02).toFixed(8)),
        stopLossTriggered: false,
        takeProfitTriggered: closed && profit! > 0,
        strategySignal: t.signal,
        strategyContext: { level: t.n, docsSeed: true },
        isPaper: b.mode === "PAPER",
        openedAt,
        closedAt: closed ? ago(Math.max(1, t.daysAgo - 2) * DAY) : null,
        errorMessage: null,
        createdAt: openedAt,
        updatedAt: closed ? ago(Math.max(1, t.daysAgo - 2) * DAY) : ago(7 * MIN),
      });
    }

    /* ---- the order book ---- */
    // This is the table the survey names: 25 trades exist platform-wide and
    // ZERO orders, so a bot shows closed trades and an empty order feed —
    // exactly the running state the running-bots docs are about.
    type BotOrderSpec = {
      n: number;
      side: "BUY" | "SELL";
      type: "MARKET" | "LIMIT" | "STOP_LIMIT";
      status: "PENDING" | "OPEN" | "PARTIAL" | "FILLED" | "CANCELLED" | "EXPIRED" | "FAILED";
      purpose: "ENTRY" | "EXIT" | "STOP_LOSS" | "TAKE_PROFIT" | "GRID_BUY" | "GRID_SELL" | "DCA";
      priceMult: number;
      usd: number;
      filledFraction: number;
      gridLevel?: number;
      minutesAgo: number;
      tradeN?: number;
    };

    const orders: BotOrderSpec[] = [
      { n: 1, side: "BUY", type: "LIMIT", status: "OPEN", purpose: "GRID_BUY", priceMult: 0.9820, usd: 420, filledFraction: 0, gridLevel: 3, minutesAgo: 44 },
      { n: 2, side: "BUY", type: "LIMIT", status: "OPEN", purpose: "GRID_BUY", priceMult: 0.9885, usd: 420, filledFraction: 0, gridLevel: 4, minutesAgo: 44 },
      { n: 3, side: "BUY", type: "LIMIT", status: "PARTIAL", purpose: "GRID_BUY", priceMult: 0.9948, usd: 420, filledFraction: 0.46, gridLevel: 5, minutesAgo: 31 },
      { n: 4, side: "SELL", type: "LIMIT", status: "OPEN", purpose: "GRID_SELL", priceMult: 1.0112, usd: 420, filledFraction: 0, gridLevel: 7, minutesAgo: 44 },
      { n: 5, side: "SELL", type: "LIMIT", status: "OPEN", purpose: "GRID_SELL", priceMult: 1.0178, usd: 420, filledFraction: 0, gridLevel: 8, minutesAgo: 44 },
      { n: 6, side: "SELL", type: "STOP_LIMIT", status: "OPEN", purpose: "STOP_LOSS", priceMult: 0.9700, usd: 420, filledFraction: 0, minutesAgo: 60 * 24 },
      { n: 7, side: "BUY", type: "LIMIT", status: "FILLED", purpose: "ENTRY", priceMult: 0.9989, usd: 420, filledFraction: 1, minutesAgo: 60 * 24, tradeN: 6 },
      { n: 8, side: "SELL", type: "LIMIT", status: "FILLED", purpose: "TAKE_PROFIT", priceMult: 1.0139, usd: 420, filledFraction: 1, minutesAgo: 60 * 24 * 4, tradeN: 5 },
      { n: 9, side: "BUY", type: "LIMIT", status: "FILLED", purpose: "ENTRY", priceMult: 1.0018, usd: 420, filledFraction: 1, minutesAgo: 60 * 24 * 6, tradeN: 5 },
      { n: 10, side: "SELL", type: "LIMIT", status: "CANCELLED", purpose: "GRID_SELL", priceMult: 1.0240, usd: 420, filledFraction: 0, gridLevel: 9, minutesAgo: 60 * 24 * 7 },
      { n: 11, side: "BUY", type: "LIMIT", status: "EXPIRED", purpose: "GRID_BUY", priceMult: 0.9612, usd: 420, filledFraction: 0, gridLevel: 1, minutesAgo: 60 * 24 * 11 },
      { n: 12, side: "BUY", type: "MARKET", status: "FAILED", purpose: "ENTRY", priceMult: 1.0, usd: 420, filledFraction: 0, minutesAgo: 60 * 24 * 13 },
      { n: 13, side: "BUY", type: "LIMIT", status: "PENDING", purpose: "DCA", priceMult: 0.9930, usd: 420, filledFraction: 0, minutesAgo: 1 },
    ];

    for (const o of orders) {
      const price = px * o.priceMult;
      const amount = o.usd / price;
      const filled = amount * o.filledFraction;
      const at = ago(o.minutesAgo * MIN);
      await upsert(models.tradingBotOrder, "trading_bot_order", sid(`botorder:${b.key}:${o.n}`), {
        botId: sid(`bot:${b.key}`),
        userId: U(b.persona),
        tradeId: o.tradeN ? sid(`bottrade:${b.key}:${o.tradeN}`) : null,
        ecosystemOrderId: null,
        symbol: b.symbol,
        side: o.side,
        type: o.type,
        status: o.status,
        amount: Number(amount.toFixed(8)),
        price: Number(price.toFixed(8)),
        stopPrice: o.type === "STOP_LIMIT" ? Number((price * 1.001).toFixed(8)) : null,
        filledAmount: Number(filled.toFixed(8)),
        // remainingAmount is NOT NULL and is the one column a hand-written
        // fixture always gets wrong: it is amount - filledAmount, and a
        // FILLED row must therefore be exactly zero.
        remainingAmount: Number((amount - filled).toFixed(8)),
        purpose: o.purpose,
        gridLevel: o.gridLevel ?? null,
        isPaper: b.mode === "PAPER",
        expiresAt: o.status === "EXPIRED" ? at : null,
        createdAt: at,
        updatedAt: at,
      });
    }
  }
}

/* ========================================================================== */
/* SECTION 5 — Binary AI engine                                               */
/* ========================================================================== */

/**
 * The engine looks alive everywhere except the one table that says what it is
 * HOLDING: 104 actions, 30 snapshots, 6 daily-stat rows and 62 binary orders,
 * and zero positions.
 *
 * A position needs a `binaryOrderId`, and every existing binary_order belongs
 * to the owner's real account — whose email the admin positions endpoint
 * selects and renders. So this seeds its own binary orders for the personas
 * and points the positions at those.
 */
const BINARY_SYMBOLS = ["BTC/USDT", "ETH/USDT", "BNB/USDT", "SOL/USDT"] as const;
const BINARY_PRICE: Record<string, number> = { "BTC/USDT": 64_850, "ETH/USDT": 3_120, "BNB/USDT": 588.4, "SOL/USDT": 148.6 };
/** Standard RISE/FALL payout on this install, matching the existing rows (72%). */
const BINARY_PAYOUT = 0.72;

async function seedBinaryEngine() {
  const engine = (await models.binaryAiEngine.findOne({ raw: true })) as any;
  if (!engine) {
    console.warn("  ! no binary_ai_engine row — skipping binary engine seed");
    return;
  }

  const traders: PersonaKey[] = ["ava", "marcus", "priya", "yuki", "sofia", "liam", "nadia", "tomas"];
  const tiers = ["BRONZE", "SILVER", "GOLD", "PLATINUM"];

  let totalProfit = 0;
  for (let i = 1; i <= 24; i++) {
    const persona = traders[i % traders.length];
    const symbol = BINARY_SYMBOLS[i % BINARY_SYMBOLS.length];
    const px = BINARY_PRICE[symbol];
    const side = i % 3 === 0 ? "FALL" : "RISE";
    // A whale stake, a cooldown case, and the ordinary book.
    const isWhale = i === 5 || i === 17;
    const amount = isWhale ? 12_000 : [50, 100, 250, 500, 1_000][i % 5];
    const isDemo = i % 5 === 4;

    /*
      EVERY ORDER IS SETTLED, for the same reason every fx position is closed.

      Measured: four PENDING binary orders seeded here were picked up by the
      settlement job within minutes and closed against the LIVE BTC feed - one
      recorded a 64,833 entry against a 77,036 close and a
      `FAIR:NO_ENGINE_LOADED` settlement note, which is a screenshot of the
      seeder losing an argument with a cron. Settlement also credits a wallet
      on a win, and these personas hold none.

      The engine's positions page reads `status ACTIVE` for its live tile, so
      that one tile stays at zero. Everything else on the page - the outcome
      mix, the whale flag, the cooldown flag, the steering record and the
      platform P/L column - is real.
    */
    const live = false;
    const outcome = i % 7 === 0 ? "DRAW" : i % 3 === 1 ? "WIN" : "LOSS";

    const entryPrice = px * (1 + ((i % 11) - 5) / 4_000);
    const drift = (i % 13) / 100_000;
    const closePrice =
      outcome === "DRAW"
        ? entryPrice
        : (outcome === "WIN") === (side === "RISE")
          ? entryPrice * (1 + drift + 0.00008)
          : entryPrice * (1 - drift - 0.00008);

    // The platform's side of the trade: it keeps the stake on a loss and pays
    // the payout on a win. A draw refunds, so the platform books nothing.
    const platformProfit =
      outcome === "LOSS" ? amount : outcome === "WIN" ? -(amount * BINARY_PAYOUT) : 0;
    const traderProfit = outcome === "WIN" ? amount * BINARY_PAYOUT : 0;
    if (!isDemo && !live) totalProfit += platformProfit;

    const openedAt = ago((40 + i * 47) * MIN);
    const expiry = new Date(openedAt.getTime() + 5 * MIN);
    const orderId = sid(`binorder:${i}`);

    await upsert(models.binaryOrder, "binary_order", orderId, {
      userId: U(persona),
      symbol,
      price: Number(entryPrice.toFixed(8)),
      amount,
      profit: Number(traderProfit.toFixed(8)),
      side,
      type: "RISE_FALL",
      status: outcome === "PENDING" ? "PENDING" : outcome,
      isDemo,
      closedAt: expiry,
      closePrice: live ? null : Number(closePrice.toFixed(8)),
      durationType: "TIME",
      profitPercentage: BINARY_PAYOUT * 100,
      metadata: { docsSeed: true },
      createdAt: openedAt,
      updatedAt: live ? openedAt : expiry,
      deletedAt: null,
    });

    await upsert(models.binaryAiEnginePosition, "binary_ai_engine_position", sid(`binpos:${i}`), {
      engineId: engine.id,
      binaryOrderId: orderId,
      userId: U(persona),
      symbol,
      side,
      amount,
      entryPrice: Number(entryPrice.toFixed(8)),
      expiryTime: expiry,
      isDemo,
      userTier: tiers[i % tiers.length],
      isWhale,
      // The big-win cooldown is on with a 1,000 threshold, so a trader who has
      // just won more than that is flagged for the next hour.
      hasCooldown: i === 9 || i === 21,
      outcome,
      settledAt: live ? null : expiry,
      // Volatility masking is enabled on this engine, so a settled position
      // carries the record of whether the mask actually moved the print.
      wasManipulated: !live && (i % 4 === 0),
      manipulationDetails:
        !live && i % 4 === 0
          ? {
              reason: "VOLATILITY_MASK",
              appliedNoisePercent: 0.001,
              leadTimeSeconds: 30,
              adjustedBy: Number((closePrice * 0.001).toFixed(8)),
            }
          : null,
      status: live ? "ACTIVE" : "SETTLED",
      closePrice: live ? null : Number(closePrice.toFixed(8)),
      platformProfit: Number(platformProfit.toFixed(8)),
      abTestId: null,
      abVariant: i % 2 === 0 ? "CONTROL" : "TREATMENT",
      createdAt: openedAt,
      updatedAt: live ? openedAt : expiry,
    });
  }

  /* ---- cohorts ---- */
  // The definitions mirror `CohortAnalyzer.getPredefinedCohorts()` exactly, so
  // an operator who clicks "create from template" gets the rows they already
  // see rather than a second, differently-shaped set.
  const cohorts: Array<{
    key: string;
    name: string;
    type: "SIGNUP_DATE" | "DEPOSIT_AMOUNT" | "TRADE_FREQUENCY" | "CUSTOM";
    criteria: Record<string, any>;
    users: number;
    orders: number;
    wins: number;
    profit: number;
  }> = [
    { key: "new-30", name: "New Users (Last 30 Days)", type: "SIGNUP_DATE", criteria: { signupDateRange: { start: ago(30 * DAY), end: NOW } }, users: 3, orders: 148, wins: 51, profit: 4_320.5 },
    { key: "established", name: "Established Users (30-90 Days)", type: "SIGNUP_DATE", criteria: { signupDateRange: { start: ago(90 * DAY), end: ago(30 * DAY) } }, users: 6, orders: 612, wins: 224, profit: 18_940.75 },
    { key: "small-dep", name: "Small Depositors ($0-$500)", type: "DEPOSIT_AMOUNT", criteria: { depositRange: { min: 0, max: 500 } }, users: 4, orders: 96, wins: 38, profit: 1_112.0 },
    { key: "mid-dep", name: "Medium Depositors ($500-$5000)", type: "DEPOSIT_AMOUNT", criteria: { depositRange: { min: 500, max: 5000 } }, users: 3, orders: 380, wins: 131, profit: 9_640.25 },
    { key: "large-dep", name: "Large Depositors ($5000+)", type: "DEPOSIT_AMOUNT", criteria: { depositRange: { min: 5000, max: 999999999 } }, users: 2, orders: 284, wins: 106, profit: 12_508.0 },
    { key: "casual", name: "Casual Traders (1-10 trades)", type: "TRADE_FREQUENCY", criteria: { tradeCountRange: { min: 1, max: 10 } }, users: 2, orders: 14, wins: 6, profit: 210.0 },
    { key: "active", name: "Active Traders (11-50 trades)", type: "TRADE_FREQUENCY", criteria: { tradeCountRange: { min: 11, max: 50 } }, users: 4, orders: 132, wins: 47, profit: 3_880.5 },
    { key: "power", name: "Power Traders (50+ trades)", type: "TRADE_FREQUENCY", criteria: { tradeCountRange: { min: 50, max: 999999 } }, users: 3, orders: 614, wins: 222, profit: 19_172.75 },
    { key: "whales", name: "Whale Watch (stake > $10k)", type: "CUSTOM", criteria: { minSingleStake: 10000, engineFlag: "isWhale" }, users: 2, orders: 38, wins: 9, profit: 42_600.0 },
  ];

  for (const c of cohorts) {
    await upsert(models.binaryAiEngineCohort, "binary_ai_engine_cohort", sid(`cohort:${c.key}`), {
      engineId: engine.id,
      name: c.name,
      type: c.type,
      criteria: c.criteria,
      startDate: c.type === "SIGNUP_DATE" ? (c.criteria.signupDateRange.start as Date) : null,
      endDate: c.type === "SIGNUP_DATE" ? (c.criteria.signupDateRange.end as Date) : null,
      minValue: c.type === "DEPOSIT_AMOUNT" ? c.criteria.depositRange.min : null,
      maxValue: c.type === "DEPOSIT_AMOUNT" ? c.criteria.depositRange.max : null,
      userCount: c.users,
      totalOrders: c.orders,
      totalWins: c.wins,
      // avgWinRate is DECIMAL(5,4): a rate, not a percentage. Storing 35.20
      // here would silently clamp and every cohort would read 9.9999.
      avgWinRate: Number((c.wins / c.orders).toFixed(4)),
      totalProfit: c.profit,
      lastCalculatedAt: ago(2 * HOUR),
      createdAt: ago(60 * DAY),
      updatedAt: ago(2 * HOUR),
    });
  }
}

/* ========================================================================== */
/* SECTION 6 — Watchlists                                                     */
/* ========================================================================== */

/**
 * With this table empty the terminal's Markets panel renders WatchlistEmptyState
 * ("Create your watchlist") on /trade and /market, right beside a Markets tab
 * holding 581 rows. The contrast is what makes the empty tab the first thing a
 * reader's eye lands on.
 *
 * Rows are seeded for every persona AND for the pre-existing `test@example.com`
 * account, because the capture harness's USER-role login is not fixed yet and a
 * watchlist belongs to exactly one user.
 */
async function seedWatchlists() {
  const spotSymbols = ["BTC/USDT", "TRX/USDT", "ZIL/USDT", "ZRX/USDT"];
  const ecoSymbols = ["MO/USDT", "TON/USDT", "MASH/BNB", "BTC/WALLET"];

  const owners: Array<{ label: string; userId: string }> = PERSONAS.filter((p) => p.key !== "ops").map(
    (p) => ({ label: p.key, userId: U(p.key) })
  );

  const testUser = (await models.user.findOne({ where: { email: "test@example.com" }, raw: true })) as any;
  if (testUser) owners.push({ label: "testuser", userId: testUser.id });

  for (const o of owners) {
    for (const s of spotSymbols) {
      await upsert(models.exchangeWatchlist, "exchange_watchlist", sid(`watch:${o.label}:SPOT:${s}`), {
        userId: o.userId,
        symbol: s,
        type: "SPOT",
      });
    }
    for (const s of ecoSymbols) {
      await upsert(models.exchangeWatchlist, "exchange_watchlist", sid(`watch:${o.label}:ECO:${s}`), {
        userId: o.userId,
        symbol: s,
        type: "ECO",
      });
    }
  }
}

/* ========================================================================== */
/* Teardown                                                                   */
/* ========================================================================== */

/**
 * FK-safe order: children before parents. `dex_pool_position` before
 * `dex_pool_risk_ack` before `dex_pool` matters in particular — the ack is
 * RESTRICT from the position and the pool is RESTRICT from the ack, so getting
 * this order wrong fails loudly rather than silently, but it still fails.
 *
 * `forex_account_signal` has no id column at all, so it is deleted by its two
 * foreign keys instead of by prefix.
 */
const TEARDOWN_ORDER = [
  "exchange_watchlist",
  "binary_ai_engine_position",
  "binary_ai_engine_cohort",
  "binary_order",
  "trading_bot_order",
  "trading_bot_trade",
  "trading_bot",
  "trading_bot_strategy_review",
  "trading_bot_purchase",
  "trading_bot_strategy",
  "forex_plan_duration",
  "forex_signal",
  "forex_account",
  "fx_order",
  "fx_position",
  "fx_account",
  "fx_routing_rule",
  "fx_account_group",
  "fx_economic_event",
  "dex_swap",
  "dex_pair",
  "dex_pool_position",
  "dex_pool_risk_ack",
  "dex_pool",
  "dex_wallet_link",
  "user",
];

async function undo() {
  const removed: Record<string, number> = {};

  // Deals the LIVE risk engine may have booked against a seeded position. They
  // carry ids this script never minted, so they are matched by their position
  // instead — without this an --undo leaves orphan money movements behind.
  const [dealResult]: any = await sequelize.query(
    `DELETE FROM fx_deal WHERE positionId LIKE :p OR orderId LIKE :p OR accountId LIKE :p`,
    { replacements: { p: TEARDOWN_LIKE } }
  );
  removed["fx_deal"] = dealResult?.affectedRows ?? 0;

  // The join table next: no id, so it cannot be matched by prefix.
  const [joinResult]: any = await sequelize.query(
    `DELETE FROM forex_account_signal WHERE forexAccountId LIKE :p OR forexSignalId LIKE :p`,
    { replacements: { p: TEARDOWN_LIKE } }
  );
  removed["forex_account_signal"] = joinResult?.affectedRows ?? 0;

  for (const table of TEARDOWN_ORDER) {
    const [result]: any = await sequelize.query(
      `DELETE FROM \`${table}\` WHERE id LIKE :p`,
      { replacements: { p: TEARDOWN_LIKE } }
    );
    removed[table] = result?.affectedRows ?? 0;
  }

  await activateInstruments(false);

  console.log("\nRemoved:");
  for (const [t, n] of Object.entries(removed)) if (n) console.log(`  ${t.padEnd(30)} ${n}`);
  console.log(
    `\n  fx_instrument                  ${ACTIVATED_INSTRUMENTS.length} switched back to INACTIVE`
  );
}

/* ========================================================================== */
/* Entry point                                                                */
/* ========================================================================== */

async function main() {
  const isUndo = process.argv.includes("--undo");

  if (isUndo) {
    console.log("seed-docs-trading --undo\n");
    await undo();
    return;
  }

  console.log("seed-docs-trading\n");

  console.log("  personas");
  await seedPersonas();

  console.log("  dex: tokens -> pools -> positions -> pairs -> swaps -> wallet links");
  await loadTokens();
  await seedDexPools();
  await seedDexPositions();
  await seedDexPairs();
  await seedDexSwaps();
  await seedDexWalletLinks();

  console.log("  forex desk: instruments -> groups -> rules -> calendar -> book");
  await activateInstruments(true);
  await loadInstruments();
  await seedAccountGroups();
  await seedRoutingRules();
  await seedEconomicEvents();
  await seedFxAccountsPositionsOrders();

  console.log("  forex plans and signals");
  await seedForexPlanDurations();
  await seedForexAccountSignals();

  console.log("  trading bots: marketplace -> bots -> trades -> orders");
  await seedTradingBotMarketplace();
  await seedTradingBots();

  console.log("  binary ai engine: orders -> positions -> cohorts");
  await seedBinaryEngine();

  console.log("  watchlists");
  await seedWatchlists();

  console.log("\nRows:");
  const tablesSorted = Object.keys(counts).sort();
  for (const t of tablesSorted) {
    const c = counts[t];
    console.log(`  ${t.padEnd(30)} +${String(c.created).padStart(3)} created  ${String(c.updated).padStart(3)} updated`);
  }
  console.log(
    `\n  fx_instrument                  ${ACTIVATED_INSTRUMENTS.length} switched ACTIVE ` +
      `(${ACTIVATED_INSTRUMENTS.map(([a, b]) => `${a}/${b}`).join(", ")})`
  );
  console.log(`\n  Persona login: any @example.com address above / ${PERSONA_PASSWORD}`);
  console.log(
    WANT_ADMIN_PERSONA
      ? "  docs.operations@example.com is a SUPER ADMIN on this run (--admin-persona)"
      : "  No privileged account was created. Re-run with --admin-persona for an admin login."
  );
}

main()
  .then(async () => {
    await sequelize.close();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error(error);
    try {
      await sequelize.close();
    } catch {
      /* already closed */
    }
    process.exit(1);
  });
