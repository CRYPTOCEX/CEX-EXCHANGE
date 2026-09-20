/**
 * Seed the PRODUCT and CONTENT surfaces that render empty, for documentation
 * screenshots.
 *
 *   cd backend
 *   npx tsx -r dotenv/config scripts/seed-docs-products.ts dotenv_config_path=../.env
 *   npx tsx -r dotenv/config scripts/seed-docs-products.ts dotenv_config_path=../.env --undo
 *   npx tsx -r dotenv/config scripts/seed-docs-products.ts dotenv_config_path=../.env --only=faq,nft
 *
 * `--only` narrows the SEED. `--undo` ignores it and removes everything this
 * script has ever written, deliberately: a partial teardown leaves foreign keys
 * pointing at rows that are about to disappear.
 *
 * ---------------------------------------------------------------------------
 * WHY
 * ---------------------------------------------------------------------------
 * ~600 documentation pages are about to get real screenshots of this install.
 * A screenshot of an empty state teaches nothing and makes the product look
 * dead, so the surfaces the docs describe have to hold plausible content first.
 * `C:/tmp/docshots/empty-surfaces.json` named the starved tables; this script
 * covers the ICO, NFT marketplace, staking tier, FAQ, payment-gateway,
 * e-commerce and P2P-reputation half of that list.
 *
 * ---------------------------------------------------------------------------
 * THE TABLES IN THE BRIEF ARE NOT ALL THE TABLES THAT RENDER
 * ---------------------------------------------------------------------------
 * Several names in the original brief are DEAD SCHEMA — no Sequelize model, no
 * reference anywhere in `backend/src` or `frontend/`. Seeding them would starve
 * nothing and render nothing. The live twin is seeded instead:
 *
 *   ico_project / ico_token / ico_phase / ico_contribution / ico_allocation
 *       -> dead. The product runs on ico_token_offering + ico_token_detail +
 *          ico_token_offering_phase + ico_transaction + ico_token_vesting.
 *   faq / faq_category / faq_views
 *       -> dead. The live table is `faqs` (models/ext/faq/faq.ts declares
 *          tableName "faqs"); categories come from `faqs.category` and view
 *          counts from `faqs.views`.
 *   staking_duration (singular) / staking_log
 *       -> dead. The live tier table is `staking_durations` (plural).
 *   ecommerce_product_variant, gateway_setting, nft_review
 *       -> no model / no rendering route. gateway settings come from the core
 *          `settings` table via getGatewaySettings(); an /admin/nft/review
 *          endpoint exists but there is no frontend route that calls it.
 *
 * ---------------------------------------------------------------------------
 * THE OWNER'S ACCOUNT IS NEVER TOUCHED
 * ---------------------------------------------------------------------------
 * `johndoe3dmodeller@gmail.com` is the operator's real personal account. Every
 * row written here belongs to a persona at `@example.com`. That is not only a
 * privacy rule — it changes the SHAPE of the seed. The existing NFT collection,
 * ICO offerings, gateway merchant and e-commerce order all hang off that
 * account, so this script does not decorate them; it stands up parallel
 * synthetic ones (a collection, three offerings, a merchant, a set of orders)
 * that a screenshot can show in full without redaction.
 *
 * ---------------------------------------------------------------------------
 * IDEMPOTENT AND REVERSIBLE, BY CONSTRUCTION
 * ---------------------------------------------------------------------------
 * Every row this script writes carries a primary key of the shape `d0c9<area>-0000-4000-8000-<n>`.
 * Nothing else in the database uses that shape - see the note on ID_PREFIX below,
 * which explains why the prefix alone was not enough. So:
 *
 *   - re-running is a no-op: each row is looked up by primary key first
 *     (`paranoid: false`, so a soft-deleted twin is found too);
 *   - `--undo` is `DELETE ... WHERE id LIKE 'd0c9%-0000-4000-8000-%'` per table, in reverse
 *     dependency order, with `force: true` so paranoid models really go.
 *
 * The ONE exception is the three placeholder FAQ rows that predate this script
 * ("test test", "taweadwad dwad aw", "wd awd awd awda wda w"). Gibberish on a
 * customer-facing page is worse than an empty one, so they are soft-deleted —
 * guarded on their exact question text so the script can never hide a real FAQ
 * — and `--undo` restores them.
 *
 * ---------------------------------------------------------------------------
 * PERSONA LOGINS
 * ---------------------------------------------------------------------------
 * The screenshot harness signs in with SKELETON_EMAIL / SKELETON_PASSWORD. Every
 * persona below shares the password DOCS_PERSONA_PASSWORD, set ONLY at creation
 * so a re-run never churns credentials. The two that matter for auth-walled
 * captures are:
 *
 *   mira.calder@example.com     ICO creator - /ico/creator, /ico/creator/token/[id]/release
 *   tobias.ferreira@example.com NFT creator - /nft/creator
 *   aiko.tanaka@example.com     gateway merchant - /gateway/dashboard, /gateway/payouts
 *   priya.raman@example.com     buyer/investor/trader - /ico/portfolio, /ecommerce/shipping,
 *                               /staking/dashboard, /p2p/profile, /nft (favourites)
 */

import { models, sequelize } from "@b/db";
import { Op } from "sequelize";
import { hashPassword } from "@b/utils/passwords";

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const ARGV = process.argv.slice(2);
const UNDO = ARGV.includes("--undo");
const ONLY = (() => {
  const arg = ARGV.find((a) => a.startsWith("--only="));
  if (!arg) return null;
  return new Set(
    arg
      .slice("--only=".length)
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
})();

const AREAS = [
  "users",
  "faq",
  "staking",
  "ico",
  "nft",
  "gateway",
  "ecommerce",
  "p2p",
] as const;
type Area = (typeof AREAS)[number];

function wants(area: Area): boolean {
  if (!ONLY) return true;
  // The persona users are a hard dependency of every other area.
  if (area === "users") return true;
  return ONLY.has(area);
}

const DOCS_PERSONA_PASSWORD = "DocsShots#2026";

// ---------------------------------------------------------------------------
// Ids. Everything is `d0c9<area>-0000-4000-8000-<12 digits>`.
// ---------------------------------------------------------------------------

const AREA_CODE: Record<string, string> = {
  user: "0001",
  faq: "0002",
  staking: "0003",
  ico: "0004",
  nft: "0005",
  gateway: "0006",
  ecommerce: "0007",
  p2p: "0008",
};

function uid(area: keyof typeof AREA_CODE | string, n: number): string {
  const code = AREA_CODE[area] ?? area;
  return `${ID_PREFIX}${code}-0000-4000-8000-${String(n).padStart(12, "0")}`;
}

/*
 * THE MARKER IS THE WHOLE SHAPE, NOT JUST THE PREFIX.
 *
 * A sibling documentation seeder on this same install writes rows with ids of
 * the form `d0c5xxxx-7d1a-4xxx-...` — a RANDOM uuid that merely starts `d0c5`.
 * Its teardown is `DELETE ... WHERE id LIKE 'd0c5%'`, and when this script also
 * used a bare `d0c5` prefix that teardown silently deleted every row seeded
 * here (and cascaded through the persona users, taking the ICO, NFT, gateway
 * and P2P trees with them). Observed, not hypothesised.
 *
 * So this script owns a different prefix AND matches on the fixed middle
 * groups, which a random uuid cannot produce. `LEGACY_ID_LIKE` sweeps the
 * generation written before the move, so `--undo` still cleans an install that
 * ran the earlier version.
 *
 * The neighbouring seeders as of this writing:
 *   scripts/seed-docs-trading.ts   `d0c5xxxx-7d1a-4...`, sweeps `d0c5%-7d1a-4%`
 *   scripts/seed-docs-demo.ts      `d1000002-0000-...`
 *   THIS FILE                      `d0c9<area>-0000-4000-8000-<n>`
 * Three disjoint patterns. Keep it that way: a new seeder that sweeps a bare
 * four-character prefix will delete somebody else's product.
 */
const ID_PREFIX = "d0c9";
const ID_LIKE = "d0c9%-0000-4000-8000-%";
const LEGACY_ID_LIKE = "d0c5%-0000-4000-8000-%";

// ---------------------------------------------------------------------------
// Time helpers. Everything is anchored to the moment the script runs so that a
// re-seed months later still produces "last week" rather than a frozen date.
// DATETIME columns on this platform are UTC (see MEMORY: DATETIME is UTC).
// ---------------------------------------------------------------------------

const NOW = new Date();

function daysAgo(n: number): Date {
  return new Date(NOW.getTime() - n * 86400000);
}
function daysAhead(n: number): Date {
  return new Date(NOW.getTime() + n * 86400000);
}
function hoursAgo(n: number): Date {
  return new Date(NOW.getTime() - n * 3600000);
}
function minutesAfter(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 60000);
}

/**
 * A deterministic, well-formed 0x + 64-hex transaction hash.
 *
 * Several models validate this column with `/^0x[a-fA-F0-9]{64}$/`, so a
 * hand-written "looks like a hash" string is rejected outright. Derived from a
 * seed string so a re-run produces the SAME hash and the unique index on
 * `nft_sale.transactionHash` does not fire.
 */
function fakeTxHash(seed: string): string {
  let x = 0x9e3779b9;
  for (let i = 0; i < seed.length; i++) {
    x = (Math.imul(x ^ seed.charCodeAt(i), 0x85ebca6b) >>> 0) + i;
    x >>>= 0;
  }
  let out = "";
  for (let i = 0; i < 64; i++) {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
    out += ((x >>> 20) & 0xf).toString(16);
  }
  return `0x${out}`;
}

/** Round to 8dp the way the money helpers do, so totals really add up. */
function m8(n: number): number {
  return Math.round(n * 1e8) / 1e8;
}
function m2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ---------------------------------------------------------------------------
// Write helpers
// ---------------------------------------------------------------------------

const created: Record<string, number> = {};
let skipped = 0;

function bump(table: string, n = 1) {
  created[table] = (created[table] ?? 0) + n;
}

/**
 * Create the row if its primary key is not already present.
 *
 * `paranoid: false` on the lookup matters: a soft-deleted twin still occupies
 * the primary key, so a plain findByPk would miss it and the create would then
 * fail on a duplicate key.
 */
async function ensure(model: any, id: string, values: Record<string, any>) {
  const table = model.getTableName();
  const existing = await model.findByPk(id, { paranoid: false });
  if (existing) {
    skipped++;
    return existing;
  }
  const row = await model.create({ id, ...values });
  bump(table);
  return row;
}

// ---------------------------------------------------------------------------
// PERSONAS
// ---------------------------------------------------------------------------

interface Persona {
  key: string;
  n: number;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  country: string;
  bio: string;
}

const PERSONAS: Persona[] = [
  {
    key: "mira",
    n: 1,
    email: "mira.calder@example.com",
    username: "mira_calder",
    firstName: "Mira",
    lastName: "Calder",
    country: "PT",
    bio: "Token launch lead. Builds settlement rails for small treasuries.",
  },
  {
    key: "tobias",
    n: 2,
    email: "tobias.ferreira@example.com",
    username: "halcyon_works",
    firstName: "Tobias",
    lastName: "Ferreira",
    country: "BR",
    bio: "Generative artist. Long-exposure plates rendered on chain.",
  },
  {
    key: "aiko",
    n: 3,
    email: "aiko.tanaka@example.com",
    username: "aiko_tanaka",
    firstName: "Aiko",
    lastName: "Tanaka",
    country: "JP",
    bio: "Runs a small digital-goods storefront and its crypto checkout.",
  },
  {
    key: "priya",
    n: 4,
    email: "priya.raman@example.com",
    username: "priya_raman",
    firstName: "Priya",
    lastName: "Raman",
    country: "IN",
    bio: "Long-horizon saver. Staking and early-stage allocations.",
  },
  {
    key: "lukas",
    n: 5,
    email: "lukas.novak@example.com",
    username: "lukas_novak",
    firstName: "Lukas",
    lastName: "Novak",
    country: "CZ",
    bio: "Weekend trader. Mostly stablecoin pairs.",
  },
  {
    key: "chidi",
    n: 6,
    email: "chidi.okafor@example.com",
    username: "chidi_okafor",
    firstName: "Chidi",
    lastName: "Okafor",
    country: "NG",
    bio: "P2P merchant. Naira on and off ramp, bank transfer only.",
  },
  {
    key: "sofia",
    n: 7,
    email: "sofia.marino@example.com",
    username: "sofia_marino",
    firstName: "Sofia",
    lastName: "Marino",
    country: "IT",
    bio: "Collector. Buys one plate a month, never flips.",
  },
  {
    key: "omar",
    n: 8,
    email: "omar.haddad@example.com",
    username: "omar_haddad",
    firstName: "Omar",
    lastName: "Haddad",
    country: "AE",
    bio: "Treasury desk. Runs the fixed-term ladder.",
  },
  {
    key: "elena",
    n: 9,
    email: "elena.petrova@example.com",
    username: "elena_petrova",
    firstName: "Elena",
    lastName: "Petrova",
    country: "RS",
    bio: "Was a lurker for two years. Now bids on everything.",
  },
  {
    key: "jonas",
    n: 10,
    email: "jonas.berg@example.com",
    username: "jonas_berg",
    firstName: "Jonas",
    lastName: "Berg",
    country: "SE",
    bio: "Index-and-forget. Checks the app twice a month.",
  },
  {
    key: "nadia",
    n: 11,
    email: "nadia.rahman@example.com",
    username: "nadia_rahman",
    firstName: "Nadia",
    lastName: "Rahman",
    country: "MY",
    bio: "Runs a two-person studio; pays contractors in USDT.",
  },
  {
    key: "marcus",
    n: 12,
    email: "marcus.webb@example.com",
    username: "marcus_webb",
    firstName: "Marcus",
    lastName: "Webb",
    country: "GB",
    bio: "Sells software licences. Cares only about settlement time.",
  },
];

const P: Record<string, string> = {};
for (const p of PERSONAS) P[p.key] = uid("user", p.n);

async function seedUsers() {
  const userRole = await models.role.findOne({ where: { name: "User" } });
  if (!userRole) throw new Error("No 'User' role found - cannot seed personas");

  let hashed: string | null = null;
  for (const p of PERSONAS) {
    const id = uid("user", p.n);
    const existing = await models.user.findByPk(id, { paranoid: false });
    if (existing) {
      skipped++;
      continue;
    }
    // Hash once, lazily: argon2 is deliberately slow and a re-run does none.
    if (!hashed) hashed = await hashPassword(DOCS_PERSONA_PASSWORD);
    await models.user.create({
      id,
      email: p.email,
      password: hashed,
      firstName: p.firstName,
      lastName: p.lastName,
      username: p.username,
      emailVerified: true,
      roleId: userRole.id,
      status: "ACTIVE",
      lastLogin: hoursAgo(3 + p.n),
      profile: {
        bio: p.bio,
        location: { country: p.country },
        social: {},
      },
      createdAt: daysAgo(420 - p.n * 9),
      updatedAt: hoursAgo(3 + p.n),
    });
    bump("user");
  }
}

// ---------------------------------------------------------------------------
// FAQ  (live table: `faqs`)
// ---------------------------------------------------------------------------

/**
 * The three placeholder rows that predate this script. Guarded on the exact
 * question text: if an operator has since edited one, it is left alone.
 */
const PLACEHOLDER_FAQS: Array<{ id: string; question: string }> = [
  { id: "367bd5ed-ee3d-4c59-8edb-e4b47b702b0b", question: "test test" },
  { id: "9a332222-dd69-4566-b209-48e9b078b236", question: "taweadwad dwad aw" },
  { id: "b88b7f0f-88df-4de9-b2d6-a875e6b44176", question: "wd awd awd awda wda w" },
];

interface FaqSeed {
  q: string;
  a: string;
  category: string;
  pagePath: string;
  tags: string[];
  views: number;
}

const FAQS: FaqSeed[] = [
  {
    q: "How long does a crypto deposit take to show up in my wallet?",
    a: "<p>A deposit is credited once the network has confirmed it. The number of confirmations we wait for depends on the chain: 2 for most EVM networks, 3 for Tron, and 2 for Bitcoin. In practice that is under a minute on Tron and BSC, and roughly twenty minutes on Bitcoin.</p><p>If your transaction is confirmed on the block explorer but the balance has not moved, check that you sent the token on the <strong>same network</strong> the deposit address was issued for. An address issued for BEP-20 will not credit a token sent over ERC-20, and recovery in that case is a manual support request.</p>",
    category: "Deposits",
    pagePath: "/finance/deposit",
    tags: ["deposit", "confirmations", "network"],
    views: 3184,
  },
  {
    q: "I sent a deposit on the wrong network. Can it be recovered?",
    a: "<p>Sometimes. If the token exists on both networks and we control the destination address on the chain you actually used, support can sweep it manually. Open a ticket with the transaction hash, the exact token, and the network you sent from.</p><p>Recovery is never automatic and is not possible at all for chains the platform does not support. Always send a small test amount the first time you use a new address.</p>",
    category: "Deposits",
    pagePath: "/finance/deposit",
    tags: ["deposit", "wrong network", "recovery"],
    views: 2470,
  },
  {
    q: "Why is my withdrawal still pending?",
    a: "<p>Withdrawals go through three stages: <em>pending review</em>, <em>broadcast</em>, and <em>confirmed</em>. Most clear automatically within a few minutes. A withdrawal is held for manual review when it is the first to a new address, when it is large relative to your recent history, or when the account changed its password or 2FA device in the last 24 hours.</p><p>You can see which stage a withdrawal is at from <strong>Finance &rarr; History</strong>. Once a transaction hash appears, the funds have left the platform and the remaining wait is the network's.</p>",
    category: "Withdrawals",
    pagePath: "/finance/withdraw",
    tags: ["withdrawal", "pending", "review"],
    views: 5216,
  },
  {
    q: "What is the withdrawal fee, and is it taken from the amount I enter?",
    a: "<p>The fee is shown on the withdrawal form before you confirm, and it is deducted from the amount you enter — so entering 100 USDT with a 1 USDT fee sends 99 USDT and debits 100 from your balance.</p><p>Network fees change with congestion. The figure on the form is the one that will be charged; if it changes before you confirm, the form refreshes and asks you to confirm again.</p>",
    category: "Fees",
    pagePath: "/finance/withdraw",
    tags: ["fees", "withdrawal"],
    views: 4102,
  },
  {
    q: "What is the difference between the Spot, Funding and Futures wallets?",
    a: "<p>Your money lives in separate pots, and an order can only spend the pot it belongs to:</p><ul><li><strong>Spot</strong> — the balance the spot market spends.</li><li><strong>Funding (FIAT)</strong> — deposits and withdrawals in national currencies.</li><li><strong>Futures</strong> — margin for derivatives positions only.</li><li><strong>Eco</strong> — assets on the platform's own ecosystem chains.</li></ul><p>Moving between them is instant and free from <strong>Finance &rarr; Transfer</strong>. An 'insufficient balance' error on a market where you know you hold the asset almost always means the asset is in a different pot.</p>",
    category: "Account",
    pagePath: "/finance/wallet",
    tags: ["wallets", "transfer", "balance"],
    views: 6741,
  },
  {
    q: "Why does my balance show as 'in order' and how do I free it?",
    a: "<p>Placing a limit order reserves the funds it would spend. That reserve is reported as <em>in order</em> and is not part of your available balance until the order fills or you cancel it.</p><p>Cancel the resting order from the terminal's open-orders panel and the reserve returns immediately. A partially filled order only holds the remaining, unfilled portion.</p>",
    category: "Trading",
    pagePath: "/trade",
    tags: ["orders", "balance", "in order"],
    views: 3890,
  },
  {
    q: "What is the difference between a market, limit and stop order?",
    a: "<p>A <strong>market</strong> order fills immediately at the best price available, so you control the size but not the price. A <strong>limit</strong> order fills only at your price or better, so you control the price but not whether it fills at all. A <strong>stop</strong> order does nothing until the market reaches your trigger, at which point it becomes a market or limit order.</p><p>On a thin book a market order can fill well away from the last traded price. If the spread looks wide, use a limit.</p>",
    category: "Trading",
    pagePath: "/trade",
    tags: ["orders", "limit", "stop", "market"],
    views: 5433,
  },
  {
    q: "How are trading fees calculated?",
    a: "<p>Fees are charged per fill, as a percentage of the filled value, and are taken in the currency you receive. Maker and taker rates are shown on the fee schedule and on the order form's estimate block before you confirm.</p><p>A partially filled order is charged only on the part that filled. Cancelling an unfilled order costs nothing.</p>",
    category: "Fees",
    pagePath: "/trade",
    tags: ["fees", "maker", "taker"],
    views: 2960,
  },
  {
    q: "Do I have to complete KYC to use the exchange?",
    a: "<p>You can browse markets and hold a balance without verification. Verification is required before you can withdraw, before P2P trading, and before any fiat deposit method will accept you.</p><p>Verification is reviewed by a person, so it is not instant. Most applications are answered within a working day; a blurred document or a name that does not match the account is the usual reason for a rejection.</p>",
    category: "Verification",
    pagePath: "/user/profile",
    tags: ["kyc", "verification", "withdrawal"],
    views: 7215,
  },
  {
    q: "How do I turn on two-factor authentication?",
    a: "<p>Open <strong>Profile &rarr; Security</strong> and choose an authenticator app, SMS or email. Scan the QR code with your app, then enter the six-digit code once to prove the device works — the method is not armed until you do.</p><p>Save the recovery codes somewhere that is not the phone holding the authenticator. Losing both means an identity check with support before the account can be unlocked.</p>",
    category: "Security",
    pagePath: "/user/profile",
    tags: ["2fa", "security", "recovery codes"],
    views: 4877,
  },
  {
    q: "Someone has my password. What should I do first?",
    a: "<p>Change the password, then revoke every other session from <strong>Profile &rarr; Sessions</strong> — a password change alone does not sign other devices out. Then check that the withdrawal addresses on the account are still yours and that no API key you do not recognise exists.</p><p>If a withdrawal has already been submitted, contact support immediately with the transaction reference; a pending withdrawal can sometimes still be stopped.</p>",
    category: "Security",
    pagePath: "/user/profile",
    tags: ["security", "compromise", "sessions"],
    views: 1988,
  },
  {
    q: "What can an API key do, and how do I limit it?",
    a: "<p>An API key acts as your account. Each key carries an explicit permission set and an optional IP allow-list, both chosen when you create it. Grant reading only unless a bot genuinely needs to place orders, and never grant withdrawal to a key that lives on a third-party service.</p><p>The secret is shown once, at creation. If you lose it, delete the key and issue another — it cannot be recovered.</p>",
    category: "API",
    pagePath: "/user/api",
    tags: ["api", "keys", "permissions"],
    views: 1544,
  },
  {
    q: "How is staking yield calculated, and when am I paid?",
    a: "<p>Each pool publishes one or more <strong>duration tiers</strong>. A tier fixes the lock period, the annual rate and how often rewards are credited — daily, weekly, monthly or once at the end of the term. Your position stores the rate that applied on the day you staked, so a later change to the pool does not alter what you were promised.</p><p>Rewards appear in <strong>Staking &rarr; Dashboard</strong> as they are credited. A tier marked auto-compound folds them back into the principal instead, and pays everything at maturity.</p>",
    category: "Staking",
    pagePath: "/staking",
    tags: ["staking", "apr", "rewards", "tiers"],
    views: 3320,
  },
  {
    q: "Can I withdraw a staked position before the lock period ends?",
    a: "<p>Yes, if the pool allows early exit. You get the principal back minus the pool's early-withdrawal fee, and you forfeit any reward that has not already been credited.</p><p>The fee is shown on the tier before you stake and again in the confirmation dialog. A tier that pays at the end of the term is the most expensive one to leave early, because none of the yield has been credited yet.</p>",
    category: "Staking",
    pagePath: "/staking",
    tags: ["staking", "early withdrawal", "penalty"],
    views: 2105,
  },
  {
    q: "What protects me when I buy from another person on P2P?",
    a: "<p>The seller's crypto is moved into escrow the moment a trade opens, before you are asked to pay. The seller cannot touch it while the trade is live. Once you mark the payment as sent and the seller confirms receipt, escrow releases to you automatically.</p><p>If the seller does not release, open a dispute from the trade screen. Support can see the chat, the escrow record and the payment reference, and can release or refund the escrow directly.</p>",
    category: "P2P",
    pagePath: "/p2p",
    tags: ["p2p", "escrow", "dispute"],
    views: 4611,
  },
  {
    q: "Who pays the P2P fee, the buyer or the seller?",
    a: "<p>The buyer. The seller escrows the full advertised amount and gives up the full amount whatever the fee is, so the platform fee is taken from the buyer's side of the settlement and is shown on the trade screen before you commit.</p><p>Posting an offer is free. You are charged only when a trade actually settles.</p>",
    category: "P2P",
    pagePath: "/p2p",
    tags: ["p2p", "fees", "escrow"],
    views: 2288,
  },
  {
    q: "A P2P counterparty is not releasing my coins. What now?",
    a: "<p>Do not cancel the trade — cancelling returns the escrow to the seller. Open a dispute instead, from the same trade screen, and attach proof of payment: a bank reference, a timestamped receipt, or a screenshot showing the exact amount and the account it went to.</p><p>Disputes are answered by a human operator. Keep all conversation inside the trade chat; it is the record the operator reads.</p>",
    category: "P2P",
    pagePath: "/p2p",
    tags: ["p2p", "dispute", "evidence"],
    views: 3057,
  },
  {
    q: "What am I actually buying when I buy an NFT here?",
    a: "<p>Ownership of a token on the collection's contract, recorded against your wallet. It is not a copyright assignment: unless the creator says otherwise in the collection description, the artist keeps the rights and you own the token.</p><p>Every collection publishes a royalty percentage. That is paid to the creator out of each secondary sale, automatically, and is shown on the listing before you buy.</p>",
    category: "NFT",
    pagePath: "/nft",
    tags: ["nft", "ownership", "royalty"],
    views: 1830,
  },
  {
    q: "How does an NFT auction end?",
    a: "<p>At the end time, if the highest bid is at or above the reserve, that bid wins and settlement runs automatically. If no bid reached the reserve, nothing is sold and every bid is released.</p><p>A bid placed in the last few minutes extends the auction slightly so that the previous leader has a chance to answer. Your bid is held while it is winning and released the moment it is outbid.</p>",
    category: "NFT",
    pagePath: "/nft",
    tags: ["nft", "auction", "bids", "reserve"],
    views: 1421,
  },
  {
    q: "How do I take part in a token sale?",
    a: "<p>Open the offering, pick the phase that is currently live, and enter the amount you want to buy. Each phase has its own price and its own remaining allocation, so an early phase is cheaper and smaller. Payment comes from the wallet the offering names.</p><p>Your contribution is recorded immediately. Whether tokens arrive immediately depends on the offering: many release on a vesting schedule instead, which the offering page shows before you commit.</p>",
    category: "Token Sales",
    pagePath: "/ico",
    tags: ["ico", "phases", "allocation"],
    views: 2644,
  },
  {
    q: "What is a vesting schedule, and where do I see mine?",
    a: "<p>Vesting means the tokens you bought are delivered in tranches over time instead of all at once. A schedule has a start, an end, and often a <em>cliff</em> — a period at the beginning during which nothing is released at all.</p><p>Your schedules, the tranches already delivered and the date of the next one are on <strong>ICO &rarr; Portfolio &rarr; Vesting</strong>. A tranche whose date has passed but that is still pending is waiting on the issuer, not on you.</p>",
    category: "Token Sales",
    pagePath: "/ico",
    tags: ["ico", "vesting", "cliff", "tranche"],
    views: 1902,
  },
  {
    q: "My token sale contribution says 'verification'. Is something wrong?",
    a: "<p>No. <em>Verification</em> means the issuer has received your payment and is checking the destination wallet address before releasing tokens. It is a normal stage for offerings that deliver on chain.</p><p>If the address you supplied was wrong, contact the issuer through the offering page before the release happens — afterwards the tokens are on chain and cannot be recalled.</p>",
    category: "Token Sales",
    pagePath: "/ico",
    tags: ["ico", "status", "verification"],
    views: 1174,
  },
  {
    q: "How do I accept crypto payments on my own website?",
    a: "<p>Create a merchant profile, then issue an API key from <strong>Gateway &rarr; Developers</strong>. Your server creates a payment intent with the amount and currency, redirects the customer to the returned checkout URL, and we notify your server when the payment settles.</p><p>Always treat the webhook as the source of truth, not the browser redirect — a customer can close the tab after paying, and the redirect will never fire.</p>",
    category: "Payments",
    pagePath: "/gateway",
    tags: ["gateway", "api", "checkout"],
    views: 1663,
  },
  {
    q: "How do I verify that a gateway webhook really came from you?",
    a: "<p>Every delivery carries a signature header computed over the raw request body and a timestamp, using your merchant webhook secret. Recompute it on the raw bytes — parsing the JSON and re-serialising it changes the body and the signature will never match.</p><p>Reject any delivery whose timestamp is more than five minutes old, and treat repeated event IDs as duplicates: we retry a failed delivery up to five times with backoff.</p>",
    category: "Payments",
    pagePath: "/gateway",
    tags: ["gateway", "webhook", "signature", "hmac"],
    views: 1298,
  },
  {
    q: "When do merchant payouts run?",
    a: "<p>On the schedule set on your merchant profile — instant, daily, weekly or monthly — and only for the balance that has cleared and is above your payout threshold. Money from a payment that is still within its refund window is held back and shows as <em>pending</em> on the dashboard.</p><p>Each payout lists the payments and refunds it settles, so the net figure can always be traced back to individual orders.</p>",
    category: "Payments",
    pagePath: "/gateway/payouts",
    tags: ["gateway", "payout", "schedule"],
    views: 1077,
  },
  {
    q: "When is a store order delivered, and how do I track it?",
    a: "<p>A downloadable product is released the moment the payment settles; the download link appears on the order page and in your e-mail. A physical product is dispatched by the seller and gets a shipment record with a carrier and a load reference, which you can follow from <strong>Store &rarr; Shipping</strong>.</p><p>The delivery address is fixed at checkout. If it is wrong, cancel the order before it ships rather than editing it afterwards.</p>",
    category: "Store",
    pagePath: "/ecommerce",
    tags: ["ecommerce", "shipping", "orders"],
    views: 1385,
  },
  {
    q: "How do I use a discount code?",
    a: "<p>Enter it in the cart, before checkout. Valid codes show the reduction on the order total straight away. A code can be limited to one product, to a date window, or to a number of uses in total — the error message says which of those failed.</p><p>Claimed codes stay on your account and are listed in the cart when they apply, so you do not have to remember them.</p>",
    category: "Store",
    pagePath: "/ecommerce",
    tags: ["ecommerce", "discount", "checkout"],
    views: 946,
  },
  {
    q: "Can I trade on my phone?",
    a: "<p>Yes. The web application is responsive and the terminal, wallets, P2P and staking all work in a mobile browser. Chart drawing tools are easier with a pointer, so complex analysis is better on a desktop.</p><p>Whichever device you use, keep the authenticator on a separate one where you can. A phone that holds both the session and the second factor is a single point of failure.</p>",
    category: "Account",
    pagePath: "/",
    tags: ["mobile", "access"],
    views: 2011,
  },
  {
    q: "Which countries can open an account?",
    a: "<p>Most, but not all. Access is restricted where local law or our licensing does not permit us to operate, and the check runs on the country you verify with rather than on the network you connect from.</p><p>If your country is restricted, the sign-up form says so at the point of verification rather than after you have deposited. Using a VPN to bypass the check is a breach of the terms and will lose the account.</p>",
    category: "Account",
    pagePath: "/",
    tags: ["restrictions", "eligibility", "kyc"],
    views: 2532,
  },
  {
    q: "How do I contact support, and how long does it take?",
    a: "<p>Open a ticket from <strong>Support</strong>. Include the account e-mail, what you expected to happen, and any transaction reference — a ticket with a reference is usually answered in one reply rather than three.</p><p>First responses are typically within a few hours. Disputes, verification and stuck withdrawals are queued ahead of general questions.</p>",
    category: "Support",
    pagePath: "/support",
    tags: ["support", "tickets"],
    views: 3744,
  },
];

const FAQ_SEARCHES: Array<{ q: string; results: number; category: string | null; hrs: number }> = [
  { q: "withdrawal pending", results: 4, category: "Withdrawals", hrs: 2 },
  { q: "withdrawal pending", results: 4, category: "Withdrawals", hrs: 9 },
  { q: "withdrawal pending", results: 4, category: null, hrs: 31 },
  { q: "deposit not credited", results: 3, category: "Deposits", hrs: 5 },
  { q: "deposit not credited", results: 3, category: null, hrs: 27 },
  { q: "kyc", results: 2, category: "Verification", hrs: 12 },
  { q: "kyc", results: 2, category: null, hrs: 55 },
  { q: "2fa recovery codes", results: 2, category: "Security", hrs: 18 },
  { q: "trading fees", results: 3, category: "Fees", hrs: 21 },
  { q: "staking apr", results: 2, category: "Staking", hrs: 34 },
  { q: "p2p escrow", results: 3, category: "P2P", hrs: 40 },
  { q: "wrong network", results: 2, category: "Deposits", hrs: 44 },
  { q: "api key permissions", results: 1, category: "API", hrs: 61 },
  { q: "vesting", results: 2, category: "Token Sales", hrs: 70 },
  { q: "nft royalty", results: 2, category: "NFT", hrs: 88 },
  { q: "webhook signature", results: 1, category: "Payments", hrs: 101 },
];

const FAQ_QUESTIONS: Array<{ p: string; q: string; a: string; status: string; days: number }> = [
  {
    p: "priya",
    q: "If I stake for 180 days and the pool later raises the rate, does my position move to the new rate?",
    a: "No. The rate is written onto your position the day you stake and stays there for the whole term. A later change applies to new positions only. If the new rate is better and the pool allows early exit, you can weigh the early-withdrawal fee against the difference.",
    status: "ANSWERED",
    days: 6,
  },
  {
    p: "chidi",
    q: "Can I have two P2P offers for the same asset at once, one buy and one sell?",
    a: "Yes. Buy and sell offers are independent and can be live at the same time for the same asset, which is how most merchants quote a spread. Each one reserves its own escrow when a trade opens against it.",
    status: "ANSWERED",
    days: 11,
  },
  {
    p: "marcus",
    q: "Does the payment gateway support partial refunds?",
    a: "Yes. A refund can be for any amount up to the original payment, and a payment that has been partly refunded stays visible as PARTIALLY_REFUNDED with the remaining refundable balance on its detail page.",
    status: "ANSWERED",
    days: 17,
  },
  {
    p: "sofia",
    q: "What happens to my bid if the auction ends below the reserve price?",
    a: "Nothing is sold and every bid is released, including yours. The item can be relisted by the seller at a lower reserve, and you would need to bid again.",
    status: "ANSWERED",
    days: 24,
  },
  {
    p: "jonas",
    q: "Is there a fee to move funds between my own wallets?",
    a: "No. Internal transfers between your Spot, Funding, Futures and Eco wallets are free and settle immediately.",
    status: "ANSWERED",
    days: 33,
  },
  {
    p: "nadia",
    q: "Can I pay contractors straight from the exchange, or do I have to withdraw first?",
    a: "You can send to any external address directly from the Spot or Eco wallet as a normal withdrawal. If the contractor also has an account here, an internal transfer by e-mail is instant and has no network fee.",
    status: "PENDING",
    days: 2,
  },
];

async function seedFaq() {
  // 1. Hide the placeholder rows (guarded on their exact text).
  for (const ph of PLACEHOLDER_FAQS) {
    const row = await models.faq.findByPk(ph.id);
    if (row && row.question === ph.question) {
      await row.destroy();
      bump("faqs:hidden-placeholder");
    }
  }

  // 2. The real articles.
  for (let i = 0; i < FAQS.length; i++) {
    const f = FAQS[i];
    await ensure(models.faq, uid("faq", 100 + i), {
      question: f.q,
      answer: f.a,
      category: f.category,
      tags: f.tags,
      status: true,
      // `order` is per pagePath in the admin, so index within the page group.
      order: FAQS.slice(0, i).filter((x) => x.pagePath === f.pagePath).length,
      pagePath: f.pagePath,
      views: f.views,
      createdAt: daysAgo(300 - i * 6),
      updatedAt: daysAgo(40 - (i % 30)),
    });
  }

  // 3. Helpful/unhelpful votes. The stats endpoint counts these per FAQ, so a
  //    popular article needs votes or it reports 0% helpful next to 5,000 views.
  let fb = 0;
  for (let i = 0; i < FAQS.length; i++) {
    const votes = 1 + (i % 3); // 1..3 voters per article
    for (let v = 0; v < votes; v++) {
      const persona = PERSONAS[(i + v) % PERSONAS.length];
      await ensure(models.faqFeedback, uid("faq", 400 + fb), {
        faqId: uid("faq", 100 + i),
        userId: P[persona.key],
        // Roughly 85% helpful, deterministically.
        isHelpful: (i * 3 + v) % 7 !== 0,
        comment: null,
        createdAt: daysAgo(30 - (fb % 28)),
        updatedAt: daysAgo(30 - (fb % 28)),
      });
      fb++;
    }
  }

  // 4. Trending searches. The stats endpoint windows these to the last 7 days,
  //    so they are anchored to run time in HOURS, not to a fixed date.
  for (let i = 0; i < FAQ_SEARCHES.length; i++) {
    const s = FAQ_SEARCHES[i];
    await ensure(models.faqSearch, uid("faq", 700 + i), {
      query: s.q,
      resultCount: s.results,
      category: s.category,
      userId: P[PERSONAS[i % PERSONAS.length].key],
      createdAt: hoursAgo(s.hrs),
      updatedAt: hoursAgo(s.hrs),
    });
  }

  // 5. Reader questions, five answered and one still in the queue.
  for (let i = 0; i < FAQ_QUESTIONS.length; i++) {
    const q = FAQ_QUESTIONS[i];
    const persona = PERSONAS.find((p) => p.key === q.p)!;
    await ensure(models.faqQuestion, uid("faq", 900 + i), {
      name: `${persona.firstName} ${persona.lastName}`,
      email: persona.email,
      question: q.q,
      answer: q.status === "ANSWERED" ? q.a : null,
      status: q.status,
      createdAt: daysAgo(q.days),
      updatedAt: daysAgo(q.status === "ANSWERED" ? Math.max(1, q.days - 1) : q.days),
    });
  }
}

async function undoFaq() {
  for (const ph of PLACEHOLDER_FAQS) {
    const row = await models.faq.findByPk(ph.id, { paranoid: false });
    if (row && row.deletedAt) {
      await row.restore();
    }
  }
}

// ---------------------------------------------------------------------------
// STAKING
// ---------------------------------------------------------------------------

interface TierSeed {
  name: string;
  lockPeriod: number;
  apr: number;
  frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "END_OF_TERM";
  autoCompound: boolean;
  minStake: number;
  maxStake: number | null;
  earlyWithdrawalFee: number;
  featured?: boolean;
}

interface PoolSeed {
  n: number;
  name: string;
  token: string;
  symbol: string;
  icon: string;
  description: string;
  profitSource: string;
  fundAllocation: string;
  risks: string;
  rewards: string;
  capacity: number;
  promoted: boolean;
  tiers: TierSeed[];
}

const POOLS: PoolSeed[] = [
  {
    n: 1,
    name: "Ethereum Liquid Staking",
    token: "Ethereum",
    symbol: "ETH",
    icon: "/img/crypto/eth.webp",
    description:
      "<p>Delegated Ethereum staking with no validator to run yourself. Your ETH joins a pooled validator set; rewards are consensus and execution-layer rewards net of the operator fee, credited monthly.</p><p>Exiting before the term ends returns the principal minus the early-withdrawal fee and forfeits reward that has not yet been credited.</p>",
    profitSource:
      "Ethereum consensus rewards and priority fees earned by the pooled validator set.",
    fundAllocation:
      "97% delegated to the validator set; 3% held as a liquidity buffer so ordinary exits do not have to wait for a validator to unbond.",
    risks:
      "Validator penalties and slashing, a withdrawal queue on the beacon chain during heavy exit periods, and rate variation with network activity. Advertised rates are not guaranteed.",
    rewards:
      "Credited monthly in ETH. Longer terms carry a higher rate; the 365-day tier pays once at maturity.",
    capacity: 4200,
    promoted: true,
    tiers: [
      {
        name: "30 Days",
        lockPeriod: 30,
        apr: 4.2,
        frequency: "MONTHLY",
        autoCompound: false,
        minStake: 0.05,
        maxStake: 250,
        earlyWithdrawalFee: 1.5,
      },
      {
        name: "90 Days",
        lockPeriod: 90,
        apr: 5.4,
        frequency: "MONTHLY",
        autoCompound: false,
        minStake: 0.1,
        maxStake: 500,
        earlyWithdrawalFee: 2.5,
      },
      {
        name: "180 Days",
        lockPeriod: 180,
        apr: 6.6,
        frequency: "MONTHLY",
        autoCompound: true,
        minStake: 0.25,
        maxStake: 750,
        earlyWithdrawalFee: 4,
        featured: true,
      },
      {
        name: "1 Year",
        lockPeriod: 365,
        apr: 8.1,
        frequency: "END_OF_TERM",
        autoCompound: true,
        minStake: 0.5,
        maxStake: 1000,
        earlyWithdrawalFee: 7.5,
      },
    ],
  },
  {
    n: 2,
    /*
     * USDC, not USDT, on purpose: the platform enforces ONE ACTIVE POOL PER
     * (symbol, walletType), and a sibling documentation seeder on this install
     * publishes a "USDT Flexible Growth Pool" on SPOT. Two ACTIVE USDT/SPOT
     * pools is a state the admin console refuses to create and would refuse to
     * save, so this ladder is denominated in the other major stablecoin.
     */
    name: "USD Coin Stable Yield",
    token: "USD Coin",
    symbol: "USDC",
    icon: "/img/crypto/usdc.webp",
    description:
      "<p>A short-duration stablecoin ladder for treasuries that need the money back on a known date. Yield comes from over-collateralised lending into on-chain money markets, rebalanced daily.</p><p>Rates are variable within the term and the figure shown is the current annualised rate, not a promise.</p>",
    profitSource:
      "Over-collateralised USDC lending across established on-chain money markets.",
    fundAllocation:
      "80% lending positions, 15% short-duration ladder, 5% instant-redemption buffer.",
    risks:
      "Smart-contract risk in the underlying markets, utilisation swings that move the rate mid-term, and stablecoin de-pegging. Capital is not insured.",
    rewards:
      "Credited daily for the 14 and 60-day tiers, weekly for 120 days, and at maturity for the annual tier.",
    capacity: 750000,
    promoted: true,
    tiers: [
      {
        name: "14 Days",
        lockPeriod: 14,
        apr: 6.5,
        frequency: "DAILY",
        autoCompound: false,
        minStake: 50,
        maxStake: 100000,
        earlyWithdrawalFee: 0.5,
      },
      {
        name: "60 Days",
        lockPeriod: 60,
        apr: 8,
        frequency: "DAILY",
        autoCompound: false,
        minStake: 100,
        maxStake: 250000,
        earlyWithdrawalFee: 1.5,
        featured: true,
      },
      {
        name: "120 Days",
        lockPeriod: 120,
        apr: 9.25,
        frequency: "WEEKLY",
        autoCompound: true,
        minStake: 250,
        maxStake: 400000,
        earlyWithdrawalFee: 3,
      },
      {
        name: "1 Year",
        lockPeriod: 365,
        apr: 11.5,
        frequency: "END_OF_TERM",
        autoCompound: true,
        minStake: 1000,
        maxStake: 500000,
        earlyWithdrawalFee: 6,
      },
    ],
  },
  {
    n: 3,
    name: "Solana Delegated Staking",
    token: "Solana",
    symbol: "SOL",
    icon: "/img/crypto/sol.webp",
    description:
      "<p>Delegation to a vetted set of Solana validators, chosen for uptime and commission rather than for size. Rewards accrue every epoch and are credited monthly.</p><p>Solana's own unbonding period means an early exit is settled at the next epoch boundary, not instantly.</p>",
    profitSource: "Solana inflation rewards and validator commissions rebated to the pool.",
    fundAllocation: "Split across five independent validators, none above 30% of the pool.",
    risks:
      "Validator downtime reduces rewards; network outages delay epoch settlement; SOL price movement affects the value of both principal and reward.",
    rewards: "Credited monthly in SOL, or folded into the principal on the 270-day tier.",
    capacity: 18000,
    promoted: false,
    tiers: [
      {
        name: "60 Days",
        lockPeriod: 60,
        apr: 5.8,
        frequency: "MONTHLY",
        autoCompound: false,
        minStake: 1,
        maxStake: 5000,
        earlyWithdrawalFee: 2,
      },
      {
        name: "120 Days",
        lockPeriod: 120,
        apr: 7,
        frequency: "MONTHLY",
        autoCompound: false,
        minStake: 5,
        maxStake: 8000,
        earlyWithdrawalFee: 3.5,
      },
      {
        name: "270 Days",
        lockPeriod: 270,
        apr: 8.4,
        frequency: "END_OF_TERM",
        autoCompound: true,
        minStake: 10,
        maxStake: 10000,
        earlyWithdrawalFee: 6,
        featured: true,
      },
    ],
  },
];

/**
 * Tier ladders for the two pools that already exist.
 *
 * The FIRST tier must mirror the pool's own `apr` / `lockPeriod` /
 * `earningFrequency`: the admin CRUD routes copy the default tier (lowest
 * `order`) back onto those columns, so a ladder whose default disagrees with
 * the pool makes the headline change the first time an operator presses Save.
 * Both existing pools are 5% / 30 days / MONTHLY.
 */
const EXISTING_POOL_TIERS: Array<{ poolId: string; base: number; tiers: TierSeed[] }> = [
  {
    poolId: "4fa14a73-e15e-464f-b6a7-ca174b3c39bf",
    base: 800,
    tiers: [
      {
        name: "30 Days",
        lockPeriod: 30,
        apr: 5,
        frequency: "MONTHLY",
        autoCompound: false,
        minStake: 0.03,
        maxStake: null,
        earlyWithdrawalFee: 5,
      },
      {
        name: "90 Days",
        lockPeriod: 90,
        apr: 6.5,
        frequency: "MONTHLY",
        autoCompound: false,
        minStake: 0.05,
        maxStake: null,
        earlyWithdrawalFee: 5,
      },
      {
        name: "180 Days",
        lockPeriod: 180,
        apr: 8,
        frequency: "END_OF_TERM",
        autoCompound: true,
        minStake: 0.1,
        maxStake: null,
        earlyWithdrawalFee: 7,
      },
    ],
  },
  {
    poolId: "bf3a39ca-ffd9-4aad-aa4c-90a30866d3f3",
    base: 850,
    tiers: [
      {
        name: "30 Days",
        lockPeriod: 30,
        apr: 5,
        frequency: "MONTHLY",
        autoCompound: false,
        minStake: 0.01,
        maxStake: null,
        earlyWithdrawalFee: 5,
      },
      {
        name: "120 Days",
        lockPeriod: 120,
        apr: 7.25,
        frequency: "MONTHLY",
        autoCompound: false,
        minStake: 0.05,
        maxStake: null,
        earlyWithdrawalFee: 5,
      },
    ],
  },
];

/**
 * Positions. `poolIdx` and `tierIdx` index POOLS; the position copies the tier's
 * economics the way stake.post.ts does, so a pool page's "staked" figure and its
 * ladder cannot disagree.
 */
const POSITIONS: Array<{
  n: number;
  persona: string;
  poolIdx: number;
  tierIdx: number;
  amount: number;
  startedDaysAgo: number;
  status: "ACTIVE" | "COMPLETED";
}> = [
  { n: 1, persona: "priya", poolIdx: 0, tierIdx: 2, amount: 12.5, startedDaysAgo: 64, status: "ACTIVE" },
  { n: 2, persona: "omar", poolIdx: 1, tierIdx: 3, amount: 85000, startedDaysAgo: 120, status: "ACTIVE" },
  { n: 3, persona: "jonas", poolIdx: 1, tierIdx: 1, amount: 12000, startedDaysAgo: 21, status: "ACTIVE" },
  { n: 4, persona: "lukas", poolIdx: 2, tierIdx: 0, amount: 340, startedDaysAgo: 12, status: "ACTIVE" },
  { n: 5, persona: "nadia", poolIdx: 1, tierIdx: 0, amount: 2500, startedDaysAgo: 5, status: "ACTIVE" },
  { n: 6, persona: "elena", poolIdx: 0, tierIdx: 0, amount: 3.2, startedDaysAgo: 95, status: "COMPLETED" },
  { n: 7, persona: "priya", poolIdx: 1, tierIdx: 2, amount: 40000, startedDaysAgo: 200, status: "COMPLETED" },
  { n: 8, persona: "sofia", poolIdx: 2, tierIdx: 2, amount: 120, startedDaysAgo: 40, status: "ACTIVE" },
];

async function seedStaking() {
  // Pools first, with capacity reduced by what the positions below lock up, so
  // "available to stake" and the position list tell the same story.
  const lockedByPool = new Map<number, number>();
  for (const pos of POSITIONS) {
    if (pos.status !== "ACTIVE") continue;
    lockedByPool.set(pos.poolIdx, (lockedByPool.get(pos.poolIdx) ?? 0) + pos.amount);
  }

  for (let i = 0; i < POOLS.length; i++) {
    const pool = POOLS[i];
    const defaultTier = pool.tiers[0];
    await ensure(models.stakingPool, uid("staking", pool.n), {
      name: pool.name,
      token: pool.token,
      symbol: pool.symbol,
      icon: pool.icon,
      description: pool.description,
      // The pool's scalar columns are the DEFAULT tier, mirrored.
      apr: defaultTier.apr,
      lockPeriod: defaultTier.lockPeriod,
      minStake: defaultTier.minStake,
      maxStake: defaultTier.maxStake,
      earlyWithdrawalFee: defaultTier.earlyWithdrawalFee,
      adminFeePercentage: 10,
      status: "ACTIVE",
      isPromoted: pool.promoted,
      order: i + 1,
      earningFrequency: defaultTier.frequency,
      autoCompound: defaultTier.autoCompound,
      externalPoolUrl: null,
      profitSource: pool.profitSource,
      fundAllocation: pool.fundAllocation,
      risks: pool.risks,
      rewards: pool.rewards,
      availableToStake: m8(pool.capacity - (lockedByPool.get(i) ?? 0)),
      walletType: "SPOT",
      walletChain: null,
      createdAt: daysAgo(260 - i * 20),
      updatedAt: daysAgo(4),
    });

    for (let t = 0; t < pool.tiers.length; t++) {
      const tier = pool.tiers[t];
      await ensure(models.stakingDuration, uid("staking", pool.n * 100 + t), {
        poolId: uid("staking", pool.n),
        name: tier.name,
        lockPeriod: tier.lockPeriod,
        apr: tier.apr,
        earningFrequency: tier.frequency,
        autoCompound: tier.autoCompound,
        minStake: tier.minStake,
        maxStake: tier.maxStake,
        adminFeePercentage: 10,
        earlyWithdrawalFee: tier.earlyWithdrawalFee,
        status: "ACTIVE",
        order: t,
        isFeatured: !!tier.featured,
        createdAt: daysAgo(260 - pool.n * 20),
        updatedAt: daysAgo(4),
      });
    }
  }

  // Ladders on the two pre-existing pools, so their detail pages stop rendering
  // an empty tier list without changing anything already on the pool row.
  for (const spec of EXISTING_POOL_TIERS) {
    const pool = await models.stakingPool.findByPk(spec.poolId);
    if (!pool) continue; // gone from this install: nothing to hang a tier on
    for (let t = 0; t < spec.tiers.length; t++) {
      const tier = spec.tiers[t];
      await ensure(models.stakingDuration, uid("staking", spec.base + t), {
        poolId: spec.poolId,
        name: tier.name,
        lockPeriod: tier.lockPeriod,
        apr: tier.apr,
        earningFrequency: tier.frequency,
        autoCompound: tier.autoCompound,
        minStake: tier.minStake,
        maxStake: tier.maxStake,
        adminFeePercentage: 10,
        earlyWithdrawalFee: tier.earlyWithdrawalFee,
        status: "ACTIVE",
        order: t,
        isFeatured: false,
        createdAt: daysAgo(120),
        updatedAt: daysAgo(4),
      });
    }
  }

  // Positions.
  for (const pos of POSITIONS) {
    const pool = POOLS[pos.poolIdx];
    const tier = pool.tiers[pos.tierIdx];
    const start = daysAgo(pos.startedDaysAgo);
    const end = new Date(start.getTime() + tier.lockPeriod * 86400000);
    await ensure(models.stakingPosition, uid("staking", 2000 + pos.n), {
      userId: P[pos.persona],
      poolId: uid("staking", pool.n),
      durationId: uid("staking", pool.n * 100 + pos.tierIdx),
      amount: pos.amount,
      startDate: start,
      endDate: end,
      status: pos.status,
      withdrawalRequested: false,
      apr: tier.apr,
      adminFeePercentage: 10,
      earlyWithdrawalFee: tier.earlyWithdrawalFee,
      earningFrequency: tier.frequency,
      autoCompound: tier.autoCompound,
      lockPeriod: tier.lockPeriod,
      lastDistributionDate: pos.status === "ACTIVE" ? daysAgo(pos.startedDaysAgo % 30) : end,
      completedAt: pos.status === "COMPLETED" ? end : null,
      createdAt: start,
      updatedAt: pos.status === "COMPLETED" ? end : daysAgo(1),
    });
  }
}

// ---------------------------------------------------------------------------
// ICO
// ---------------------------------------------------------------------------

interface PhaseSeed {
  name: string;
  price: number;
  allocation: number;
  remaining: number;
  duration: number;
  startsDaysAgo: number;
}

interface OfferingSeed {
  n: number;
  name: string;
  symbol: string;
  icon: string;
  status: "ACTIVE" | "SUCCESS" | "UPCOMING";
  tokenPrice: number;
  targetAmount: number;
  startDaysAgo: number;
  endDaysAgo: number; // negative = in the future
  participants: number;
  featured: boolean;
  website: string;
  detail: {
    totalSupply: number;
    tokensForSale: number;
    blockchain: string;
    description: string;
    /*
     * BOTH OF THESE ARE ARRAY SHAPES THE UI RENDERS DIRECTLY.
     *
     * `useOfFunds` is a list of STRINGS. Storing it as [{label,percentage}]
     * made the offering detail page throw "Objects are not valid as a React
     * child" and render the 500 boundary - a shape that passes every validator
     * and still takes the page down.
     *
     * `links` is a plain OBJECT MAP, `{website: url, whitepaper: url}`, because
     * `offer/[id]/components/token-details.tsx` renders it with
     * `Object.entries(...)` and uses the KEY as the link text. The creator
     * launch form writes `[{label,url}]` instead, which is why the offerings
     * that were already here render their links as a list labelled 0,1,2,3
     * pointing at "[object Object]". Seeding the shape the reader wants keeps
     * the screenshot honest; the writer/reader mismatch is a real defect and is
     * reported separately.
     */
    useOfFunds: string[];
    links: Record<string, string>;
    vestingEnabled: boolean;
    vestingType: "LINEAR" | "CLIFF" | "MILESTONE" | null;
    vestingDurationMonths: number | null;
    vestingCliffMonths: number | null;
  };
  phases: PhaseSeed[];
}

const OFFERINGS: OfferingSeed[] = [
  {
    n: 1,
    name: "Aurora Ledger",
    symbol: "AUR",
    icon: "/img/crypto/arb.webp",
    status: "ACTIVE",
    tokenPrice: 0.045,
    // Target, phase allocations and contributions are one arithmetic. Every
    // phase's (allocation - remaining) equals the tokens its contributions
    // bought, and targetAmount is what the three phases raise if they all sell
    // out - so the "N% funded" bar on the offering card is a real fraction and
    // not a number that contradicts the phase table underneath it.
    targetAmount: 508000,
    startDaysAgo: 165,
    endDaysAgo: -52,
    participants: 6,
    featured: true,
    website: "https://aurora-ledger.example.com",
    detail: {
      totalSupply: 100000000,
      tokensForSale: 12600000,
      blockchain: "Ethereum",
      description:
        "Aurora Ledger is a settlement layer for small treasuries: batched payouts, per-counterparty spending rules and a reconciliation export that an accountant can read. The token pays for batch execution and governs the fee schedule.",
      useOfFunds: [
        "Protocol engineering - 45%",
        "Security audits - 15%",
        "Liquidity provision - 20%",
        "Operations and legal - 20%",
      ],
      links: {
        website: "https://aurora-ledger.example.com",
        whitepaper: "https://aurora-ledger.example.com/whitepaper.pdf",
        github: "https://github.example.com/aurora-ledger",
        twitter: "https://social.example.com/auroraledger",
      },
      vestingEnabled: true,
      vestingType: "LINEAR",
      vestingDurationMonths: 12,
      vestingCliffMonths: 3,
    },
    phases: [
      { name: "Seed", price: 0.03, allocation: 2600000, remaining: 0, duration: 45, startsDaysAgo: 165 },
      { name: "Private", price: 0.04, allocation: 4000000, remaining: 1800000, duration: 60, startsDaysAgo: 120 },
      { name: "Public", price: 0.045, allocation: 6000000, remaining: 5700000, duration: 112, startsDaysAgo: 60 },
    ],
  },
  {
    n: 2,
    name: "Northwind Compute",
    symbol: "NWC",
    icon: "/img/crypto/render.webp",
    status: "SUCCESS",
    tokenPrice: 0.12,
    targetAmount: 50000,
    startDaysAgo: 420,
    endDaysAgo: 96,
    participants: 4,
    featured: false,
    website: "https://northwind-compute.example.com",
    detail: {
      totalSupply: 5000000,
      tokensForSale: 520000,
      blockchain: "Ethereum",
      description:
        "Northwind Compute sells verifiable batch compute: submit a job, get back a result and a proof that the right binary produced it. The token meters job submission and stakes the node operators.",
      useOfFunds: [
        "Node network build-out - 50%",
        "Proof system R&D - 25%",
        "Go-to-market - 15%",
        "Reserve - 10%",
      ],
      links: {
        website: "https://northwind-compute.example.com",
        whitepaper: "https://northwind-compute.example.com/paper",
        github: "https://github.example.com/northwind-compute",
      },
      vestingEnabled: true,
      vestingType: "CLIFF",
      vestingDurationMonths: 18,
      vestingCliffMonths: 6,
    },
    phases: [
      { name: "Strategic", price: 0.1, allocation: 120000, remaining: 0, duration: 90, startsDaysAgo: 420 },
      { name: "Public", price: 0.12, allocation: 400000, remaining: 0, duration: 234, startsDaysAgo: 330 },
    ],
  },
  {
    n: 3,
    name: "Verdant Carbon",
    symbol: "VRD",
    icon: "/img/crypto/fet.webp",
    status: "UPCOMING",
    tokenPrice: 0.02,
    targetAmount: 400000,
    startDaysAgo: -27,
    endDaysAgo: -117,
    participants: 0,
    featured: false,
    website: "https://verdant-carbon.example.com",
    detail: {
      totalSupply: 250000000,
      tokensForSale: 22000000,
      blockchain: "Polygon",
      description:
        "Verdant Carbon tokenises retired carbon credits with a public retirement registry, so a buyer can prove a credit was used once and only once. The token is the registry's write fee.",
      useOfFunds: [
        "Registry integrations - 40%",
        "Verification partners - 30%",
        "Audit and compliance - 20%",
        "Reserve - 10%",
      ],
      links: {
        website: "https://verdant-carbon.example.com",
        twitter: "https://social.example.com/verdantcarbon",
      },
      vestingEnabled: false,
      vestingType: null,
      vestingDurationMonths: null,
      vestingCliffMonths: null,
    },
    phases: [
      { name: "Seed", price: 0.015, allocation: 8000000, remaining: 8000000, duration: 30, startsDaysAgo: -27 },
      { name: "Public", price: 0.02, allocation: 14000000, remaining: 14000000, duration: 60, startsDaysAgo: 3 },
    ],
  },
];

interface IcoTxSeed {
  n: number;
  offering: number; // index into OFFERINGS
  phase: number; // index into that offering's phases
  persona: string;
  tokens: number;
  price: number;
  status: "PENDING" | "VERIFICATION" | "RELEASED" | "REJECTED" | "REFUNDED";
  daysAgo: number;
  wallet: string | null;
  notes?: string;
}

const ICO_TXS: IcoTxSeed[] = [
  { n: 1, offering: 0, phase: 0, persona: "priya", tokens: 1000000, price: 0.03, status: "RELEASED", daysAgo: 158, wallet: "0x7Ae2C1b3F4d59A0e8B1c6D4F2a9E37bC5D0a4E11" },
  { n: 2, offering: 0, phase: 0, persona: "lukas", tokens: 1600000, price: 0.03, status: "RELEASED", daysAgo: 151, wallet: "0x3F9b8C2d7E1a45B6C08D3e9F2a71B4c5D6E80912" },
  { n: 3, offering: 0, phase: 1, persona: "chidi", tokens: 600000, price: 0.04, status: "RELEASED", daysAgo: 106, wallet: "0xB1c94D7e2F5a83C06D1e4F7a2B95C8D3E0a61F44" },
  { n: 4, offering: 0, phase: 1, persona: "sofia", tokens: 1200000, price: 0.04, status: "RELEASED", daysAgo: 92, wallet: "0x5D8a2E1c9F4b76A03C5d8E2f1B47a9C6D0E35B88" },
  { n: 5, offering: 0, phase: 1, persona: "omar", tokens: 400000, price: 0.04, status: "VERIFICATION", daysAgo: 9, wallet: "0x2C7e5A9b1D3f84E06B2c7D5a9F13e8B4C6a02D77", notes: "Awaiting wallet confirmation from the issuer." },
  { n: 6, offering: 0, phase: 2, persona: "elena", tokens: 300000, price: 0.045, status: "PENDING", daysAgo: 2, wallet: "0x9A4c6E2b8D1f37C05A9e3B6d2F84c1E7B0D52A33" },
  { n: 7, offering: 1, phase: 0, persona: "priya", tokens: 120000, price: 0.1, status: "RELEASED", daysAgo: 390, wallet: "0x7Ae2C1b3F4d59A0e8B1c6D4F2a9E37bC5D0a4E11" },
  { n: 8, offering: 1, phase: 1, persona: "jonas", tokens: 250000, price: 0.12, status: "RELEASED", daysAgo: 300, wallet: "0x4E1b7C3a9D2f65B08C4e1A7d3F92b5C6D8E04A21" },
  { n: 9, offering: 1, phase: 1, persona: "nadia", tokens: 90000, price: 0.12, status: "RELEASED", daysAgo: 244, wallet: "0x8B3d1F6a4C7e92D05B8a2C6f1E43d7A9C0B51E66" },
  { n: 10, offering: 1, phase: 1, persona: "marcus", tokens: 60000, price: 0.12, status: "REFUNDED", daysAgo: 232, wallet: "0x6C2a9B4e1D8f53A07C6b4E2a9D15f8B3C7D40E99", notes: "Refunded at the contributor's request before release." },
];

/**
 * Vesting schedules and their tranches.
 *
 * `pct` sums to 100 on every schedule; `releasedAmount` on the parent is the sum
 * of the tranches marked RELEASED, computed rather than typed so the two can
 * never drift. Tranche dates are relative to run time, and at least one PENDING
 * tranche is deliberately IN THE PAST so the creator's release console has
 * something in its "due now" bucket.
 */
interface VestingSeed {
  n: number;
  tx: number; // ICO_TXS.n
  type: "LINEAR" | "CLIFF" | "MILESTONE";
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
  startDaysAgo: number;
  endDaysAhead: number;
  cliffDays: number | null;
  tranches: Array<{ pct: number; daysFromNow: number; released: boolean }>;
}

const VESTINGS: VestingSeed[] = [
  {
    n: 1,
    tx: 1,
    type: "LINEAR",
    status: "ACTIVE",
    startDaysAgo: 158,
    endDaysAhead: 207,
    cliffDays: 90,
    tranches: [
      { pct: 25, daysFromNow: -68, released: true },
      { pct: 25, daysFromNow: -23, released: true },
      { pct: 25, daysFromNow: 68, released: false },
      { pct: 25, daysFromNow: 160, released: false },
    ],
  },
  {
    n: 2,
    tx: 2,
    type: "LINEAR",
    status: "ACTIVE",
    startDaysAgo: 151,
    endDaysAhead: 214,
    cliffDays: 90,
    tranches: [
      { pct: 25, daysFromNow: -61, released: true },
      // Past its date and still pending: this is the row the release console
      // is supposed to be shouting about.
      { pct: 25, daysFromNow: -16, released: false },
      { pct: 25, daysFromNow: 75, released: false },
      { pct: 25, daysFromNow: 167, released: false },
    ],
  },
  {
    n: 3,
    tx: 3,
    type: "LINEAR",
    status: "ACTIVE",
    startDaysAgo: 106,
    endDaysAhead: 259,
    cliffDays: 90,
    tranches: [
      { pct: 20, daysFromNow: -16, released: true },
      { pct: 20, daysFromNow: 45, released: false },
      { pct: 20, daysFromNow: 136, released: false },
      { pct: 20, daysFromNow: 197, released: false },
      { pct: 20, daysFromNow: 259, released: false },
    ],
  },
  {
    n: 4,
    tx: 4,
    type: "CLIFF",
    status: "ACTIVE",
    startDaysAgo: 92,
    endDaysAhead: 273,
    cliffDays: 180,
    tranches: [
      { pct: 50, daysFromNow: 88, released: false },
      { pct: 50, daysFromNow: 273, released: false },
    ],
  },
  {
    n: 5,
    tx: 7,
    type: "CLIFF",
    status: "COMPLETED",
    startDaysAgo: 390,
    endDaysAhead: -25,
    cliffDays: 180,
    tranches: [
      { pct: 50, daysFromNow: -210, released: true },
      { pct: 50, daysFromNow: -25, released: true },
    ],
  },
  {
    n: 6,
    tx: 8,
    type: "MILESTONE",
    status: "ACTIVE",
    startDaysAgo: 300,
    endDaysAhead: 240,
    cliffDays: null,
    tranches: [
      { pct: 30, daysFromNow: -180, released: true },
      { pct: 30, daysFromNow: -60, released: true },
      { pct: 20, daysFromNow: -4, released: false },
      { pct: 20, daysFromNow: 240, released: false },
    ],
  },
  {
    n: 7,
    tx: 9,
    type: "CLIFF",
    status: "ACTIVE",
    startDaysAgo: 244,
    endDaysAhead: 302,
    cliffDays: 180,
    tranches: [
      { pct: 50, daysFromNow: -64, released: true },
      { pct: 50, daysFromNow: 302, released: false },
    ],
  },
  {
    n: 8,
    tx: 10,
    type: "CLIFF",
    status: "CANCELLED",
    startDaysAgo: 232,
    endDaysAhead: 314,
    cliffDays: 180,
    tranches: [
      { pct: 50, daysFromNow: -52, released: false },
      { pct: 50, daysFromNow: 314, released: false },
    ],
  },
];

const ROADMAP: Array<{ n: number; offering: number; title: string; description: string; date: string; done: boolean }> = [
  { n: 1, offering: 0, title: "Testnet settlement layer", description: "Batched payouts and per-counterparty rules running end to end on a public testnet.", date: "Q3 2025", done: true },
  { n: 2, offering: 0, title: "Third-party security audit", description: "Full audit of the settlement and fee contracts, published in the repository.", date: "Q1 2026", done: true },
  { n: 3, offering: 0, title: "Mainnet launch", description: "Contracts deployed to Ethereum mainnet with the fee schedule under governance.", date: "Q4 2026", done: false },
  { n: 4, offering: 0, title: "Accounting export partners", description: "Native reconciliation export for three major bookkeeping platforms.", date: "Q2 2027", done: false },
  { n: 5, offering: 1, title: "Proof system v1", description: "Verifiable batch execution shipped for the first workload class.", date: "Q2 2025", done: true },
  { n: 6, offering: 1, title: "Operator network at 100 nodes", description: "Independent operators staking and serving jobs across three regions.", date: "Q4 2025", done: true },
  { n: 7, offering: 1, title: "Open job marketplace", description: "Anyone can submit a workload and pick an operator on price and latency.", date: "Q3 2026", done: false },
];

const TEAM: Array<{ n: number; offering: number; name: string; role: string; bio: string }> = [
  { n: 1, offering: 0, name: "Mira Calder", role: "Founder", bio: "Fifteen years in payments infrastructure. Previously built the settlement layer for a regional clearing house." },
  { n: 2, offering: 0, name: "Devan Roy", role: "Protocol Lead", bio: "Smart contract engineer. Wrote and audited the fee accounting used by two mid-size DEXes." },
  { n: 3, offering: 0, name: "Hanna Lindqvist", role: "Head of Compliance", bio: "Former regulator. Runs the licensing and reporting side of every jurisdiction the protocol serves." },
  { n: 4, offering: 1, name: "Tomasz Wójcik", role: "Founder", bio: "Distributed systems researcher. Spent six years on verifiable computation before founding Northwind." },
  { n: 5, offering: 1, name: "Sara Bekele", role: "Head of Operations", bio: "Ran node operations for a top-20 validator set. Owns the operator programme." },
];

async function seedIco() {
  const plan = await models.icoLaunchPlan.findOne({ order: [["price", "DESC"]] });
  const type = await models.icoTokenType.findOne();
  if (!plan || !type) {
    console.log("  ICO: no launch plan or token type on this install - skipping ICO");
    return;
  }

  for (const off of OFFERINGS) {
    const offeringId = uid("ico", off.n);
    await ensure(models.icoTokenOffering, offeringId, {
      userId: P["mira"],
      planId: plan.id,
      typeId: type.id,
      name: off.name,
      symbol: off.symbol,
      icon: off.icon,
      status: off.status,
      tokenPrice: off.tokenPrice,
      targetAmount: off.targetAmount,
      startDate: off.startDaysAgo >= 0 ? daysAgo(off.startDaysAgo) : daysAhead(-off.startDaysAgo),
      endDate: off.endDaysAgo >= 0 ? daysAgo(off.endDaysAgo) : daysAhead(-off.endDaysAgo),
      participants: off.participants,
      currentPrice: off.tokenPrice,
      priceChange: off.status === "ACTIVE" ? 12.5 : 0,
      submittedAt: daysAgo(Math.abs(off.startDaysAgo) + 20),
      approvedAt: off.status === "UPCOMING" ? daysAgo(10) : daysAgo(Math.abs(off.startDaysAgo) + 4),
      isPaused: false,
      isFlagged: false,
      featured: off.featured,
      website: off.website,
      purchaseWalletCurrency: "USDT",
      purchaseWalletType: "SPOT",
      createdAt: daysAgo(Math.abs(off.startDaysAgo) + 20),
      updatedAt: daysAgo(3),
    });

    const d = off.detail;
    await ensure(models.icoTokenDetail, uid("ico", 100 + off.n), {
      offeringId,
      tokenType: type.value ?? "utility",
      totalSupply: d.totalSupply,
      tokensForSale: d.tokensForSale,
      salePercentage: m2((d.tokensForSale / d.totalSupply) * 100),
      blockchain: d.blockchain,
      description: d.description,
      useOfFunds: d.useOfFunds,
      links: d.links,
      vestingEnabled: d.vestingEnabled,
      vestingType: d.vestingType,
      vestingDurationMonths: d.vestingDurationMonths,
      vestingCliffMonths: d.vestingCliffMonths,
      vestingMilestones: null,
      createdAt: daysAgo(Math.abs(off.startDaysAgo) + 20),
      updatedAt: daysAgo(3),
    });

    for (let p = 0; p < off.phases.length; p++) {
      const ph = off.phases[p];
      const start =
        ph.startsDaysAgo >= 0 ? daysAgo(ph.startsDaysAgo) : daysAhead(-ph.startsDaysAgo);
      await ensure(models.icoTokenOfferingPhase, uid("ico", 200 + off.n * 10 + p), {
        offeringId,
        name: ph.name,
        tokenPrice: ph.price,
        allocation: ph.allocation,
        remaining: ph.remaining,
        duration: ph.duration,
        sequence: p + 1,
        startDate: start,
        endDate: new Date(start.getTime() + ph.duration * 86400000),
        createdAt: daysAgo(Math.abs(off.startDaysAgo) + 20),
        updatedAt: daysAgo(3),
      });
    }
  }

  for (const item of ROADMAP) {
    await ensure(models.icoRoadmapItem, uid("ico", 300 + item.n), {
      offeringId: uid("ico", OFFERINGS[item.offering].n),
      title: item.title,
      description: item.description,
      date: item.date,
      completed: item.done,
      createdAt: daysAgo(200),
      updatedAt: daysAgo(10),
    });
  }

  for (const member of TEAM) {
    await ensure(models.icoTeamMember, uid("ico", 400 + member.n), {
      offeringId: uid("ico", OFFERINGS[member.offering].n),
      name: member.name,
      role: member.role,
      bio: member.bio,
      avatar: null,
      linkedin: null,
      twitter: null,
      website: null,
      github: null,
      createdAt: daysAgo(200),
      updatedAt: daysAgo(10),
    });
  }

  for (const tx of ICO_TXS) {
    const off = OFFERINGS[tx.offering];
    await ensure(models.icoTransaction, uid("ico", 500 + tx.n), {
      userId: P[tx.persona],
      offeringId: uid("ico", off.n),
      phaseId: uid("ico", 200 + off.n * 10 + tx.phase),
      amount: tx.tokens,
      price: tx.price,
      status: tx.status,
      walletAddress: tx.wallet,
      releaseUrl: tx.status === "RELEASED" ? `https://etherscan.example.com/tx/${fakeTxHash(`ico-tx-${tx.n}`)}` : "",
      notes: tx.notes ?? null,
      createdAt: daysAgo(tx.daysAgo),
      updatedAt: daysAgo(Math.max(1, tx.daysAgo - 2)),
    });
  }

  for (const v of VESTINGS) {
    const tx = ICO_TXS.find((t) => t.n === v.tx)!;
    const off = OFFERINGS[tx.offering];
    const total = tx.tokens;
    const releasedAmount = m8(
      v.tranches
        .filter((t) => t.released)
        .reduce((sum, t) => sum + (total * t.pct) / 100, 0)
    );
    const vestingId = uid("ico", 600 + v.n);
    await ensure(models.icoTokenVesting, vestingId, {
      transactionId: uid("ico", 500 + tx.n),
      userId: P[tx.persona],
      offeringId: uid("ico", off.n),
      totalAmount: total,
      releasedAmount,
      vestingType: v.type,
      startDate: daysAgo(v.startDaysAgo),
      endDate: v.endDaysAhead >= 0 ? daysAhead(v.endDaysAhead) : daysAgo(-v.endDaysAhead),
      cliffDuration: v.cliffDays,
      releaseSchedule: v.tranches.map((t) => ({
        date: (t.daysFromNow >= 0 ? daysAhead(t.daysFromNow) : daysAgo(-t.daysFromNow)).toISOString(),
        percentage: t.pct,
        amount: m8((total * t.pct) / 100),
      })),
      status: v.status,
      createdAt: daysAgo(v.startDaysAgo),
      updatedAt: daysAgo(2),
    });

    for (let i = 0; i < v.tranches.length; i++) {
      const t = v.tranches[i];
      const date = t.daysFromNow >= 0 ? daysAhead(t.daysFromNow) : daysAgo(-t.daysFromNow);
      const trancheStatus = v.status === "CANCELLED" ? "CANCELLED" : t.released ? "RELEASED" : "PENDING";
      await ensure(models.icoTokenVestingRelease, uid("ico", 700 + v.n * 10 + i), {
        vestingId,
        releaseDate: date,
        releaseAmount: m8((total * t.pct) / 100),
        percentage: t.pct,
        status: trancheStatus,
        transactionHash: t.released ? fakeTxHash(`ico-release-${v.n}-${i}`) : null,
        releasedAt: t.released ? date : null,
        failureReason: null,
        metadata: null,
        createdAt: daysAgo(v.startDaysAgo),
        updatedAt: t.released ? date : daysAgo(2),
      });
    }
  }
}

// ---------------------------------------------------------------------------
// NFT MARKETPLACE
// ---------------------------------------------------------------------------

const NFT_CREATOR_ID = uid("nft", 1);
const NFT_COLLECTION_ID = uid("nft", 10);
const NFT_ROYALTY_PCT = 5;
const NFT_MARKETPLACE_FEE_PCT = 2.5;

/**
 * Images are LOCAL files that already exist under
 * frontend/public/uploads/nft — reused deliberately. The existing collection's
 * token images are remote IPFS gateway URLs, which a screenshot run without
 * outbound network renders as broken.
 */
const NFT_IMAGES = [
  "/uploads/nft/4023c4c9-e549-493a-9729-2428e3802883.jpg",
  "/uploads/nft/70df7712-f687-44bd-9f13-c0c15f6a0249.jpg",
  "/uploads/nft/90fadb0c-8005-4717-95ca-fbdac4fac2f9.jpg",
  "/uploads/nft/c7166d56-da0c-48e8-88fb-7848af51e209.jpg",
  "/uploads/nft/e992c9d3-f730-43c8-96d8-7aac43b5de1c.jpg",
];

interface NftTokenSeed {
  n: number;
  name: string;
  description: string;
  owner: string;
  rarity: "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "LEGENDARY";
  rarityScore: number;
  views: number;
}

const NFT_TOKENS: NftTokenSeed[] = [
  { n: 1, name: "Meridian 01 — Long Dusk", description: "Ninety-minute exposure over the salt flats, rendered from the raw plate.", owner: "tobias", rarity: "RARE", rarityScore: 78.5, views: 1240 },
  { n: 2, name: "Meridian 02 — Cold Harbour", description: "The harbour at four in the morning, when the water stops moving.", owner: "tobias", rarity: "EPIC", rarityScore: 91.2, views: 2015 },
  { n: 3, name: "Meridian 03 — Static Field", description: "A single frame from a two-hour capture of an electrical storm.", owner: "sofia", rarity: "UNCOMMON", rarityScore: 54.0, views: 688 },
  { n: 4, name: "Meridian 04 — Signal Drift", description: "Radio noise from a decommissioned relay, plotted as light.", owner: "tobias", rarity: "LEGENDARY", rarityScore: 98.7, views: 3402 },
  { n: 5, name: "Meridian 05 — Low Tide", description: "The same shoreline, photographed once a day for a year and stacked.", owner: "tobias", rarity: "RARE", rarityScore: 72.4, views: 1105 },
  { n: 6, name: "Meridian 06 — Night Freight", description: "A freight line at speed, exposed until the carriages became one object.", owner: "elena", rarity: "COMMON", rarityScore: 33.9, views: 512 },
];

interface NftListingSeed {
  n: number;
  token: number;
  type: "FIXED_PRICE" | "AUCTION";
  price: number | null;
  startingBid: number | null;
  reservePrice: number | null;
  buyNowPrice: number | null;
  currentBid: number | null;
  minBidIncrement: number | null;
  status: "ACTIVE" | "SOLD";
  startedDaysAgo: number;
  endsDaysAhead: number | null;
  seller: string;
}

const NFT_LISTINGS: NftListingSeed[] = [
  { n: 1, token: 1, type: "FIXED_PRICE", price: 0.85, startingBid: null, reservePrice: null, buyNowPrice: null, currentBid: null, minBidIncrement: null, status: "ACTIVE", startedDaysAgo: 18, endsDaysAhead: null, seller: "tobias" },
  { n: 2, token: 2, type: "FIXED_PRICE", price: 1.4, startingBid: null, reservePrice: null, buyNowPrice: null, currentBid: null, minBidIncrement: null, status: "ACTIVE", startedDaysAgo: 11, endsDaysAhead: null, seller: "tobias" },
  { n: 3, token: 5, type: "FIXED_PRICE", price: 0.42, startingBid: null, reservePrice: null, buyNowPrice: null, currentBid: null, minBidIncrement: null, status: "ACTIVE", startedDaysAgo: 6, endsDaysAhead: null, seller: "tobias" },
  { n: 4, token: 4, type: "AUCTION", price: null, startingBid: 0.5, reservePrice: 0.9, buyNowPrice: 2, currentBid: 1.05, minBidIncrement: 0.05, status: "ACTIVE", startedDaysAgo: 4, endsDaysAhead: 3, seller: "tobias" },
  { n: 5, token: 6, type: "AUCTION", price: null, startingBid: 0.3, reservePrice: 0.6, buyNowPrice: 1.2, currentBid: 0.72, minBidIncrement: 0.04, status: "ACTIVE", startedDaysAgo: 2, endsDaysAhead: 6, seller: "elena" },
  { n: 6, token: 3, type: "FIXED_PRICE", price: 0.65, startingBid: null, reservePrice: null, buyNowPrice: null, currentBid: null, minBidIncrement: null, status: "SOLD", startedDaysAgo: 40, endsDaysAhead: null, seller: "tobias" },
];

/** Bids escalate; only the top bid on each auction is ACTIVE, the rest OUTBID. */
const NFT_BIDS: Array<{ n: number; listing: number; token: number; persona: string; amount: number; hoursAgo: number; status: "ACTIVE" | "OUTBID" }> = [
  { n: 1, listing: 4, token: 4, persona: "priya", amount: 0.55, hoursAgo: 92, status: "OUTBID" },
  { n: 2, listing: 4, token: 4, persona: "lukas", amount: 0.62, hoursAgo: 81, status: "OUTBID" },
  { n: 3, listing: 4, token: 4, persona: "chidi", amount: 0.7, hoursAgo: 66, status: "OUTBID" },
  { n: 4, listing: 4, token: 4, persona: "sofia", amount: 0.85, hoursAgo: 40, status: "OUTBID" },
  { n: 5, listing: 4, token: 4, persona: "priya", amount: 0.95, hoursAgo: 22, status: "OUTBID" },
  { n: 6, listing: 4, token: 4, persona: "omar", amount: 1.05, hoursAgo: 5, status: "ACTIVE" },
  { n: 7, listing: 5, token: 6, persona: "elena", amount: 0.35, hoursAgo: 44, status: "OUTBID" },
  { n: 8, listing: 5, token: 6, persona: "jonas", amount: 0.44, hoursAgo: 36, status: "OUTBID" },
  { n: 9, listing: 5, token: 6, persona: "nadia", amount: 0.55, hoursAgo: 27, status: "OUTBID" },
  { n: 10, listing: 5, token: 6, persona: "elena", amount: 0.61, hoursAgo: 16, status: "OUTBID" },
  { n: 11, listing: 5, token: 6, persona: "marcus", amount: 0.68, hoursAgo: 8, status: "OUTBID" },
  { n: 12, listing: 5, token: 6, persona: "jonas", amount: 0.72, hoursAgo: 2, status: "ACTIVE" },
];

const NFT_OFFERS: Array<{
  n: number;
  kind: "TOKEN" | "COLLECTION";
  token: number | null;
  listing: number | null;
  persona: string;
  seller: string | null;
  amount: number;
  status: "ACTIVE" | "ACCEPTED" | "REJECTED" | "EXPIRED" | "CANCELLED";
  daysAgo: number;
  expiresDaysAhead: number;
  message: string | null;
}> = [
  { n: 1, kind: "TOKEN", token: 1, listing: 1, persona: "priya", seller: "tobias", amount: 0.72, status: "ACTIVE", daysAgo: 3, expiresDaysAhead: 4, message: "Would take it today at this price." },
  { n: 2, kind: "TOKEN", token: 1, listing: 1, persona: "elena", seller: "tobias", amount: 0.66, status: "ACTIVE", daysAgo: 5, expiresDaysAhead: 2, message: null },
  { n: 3, kind: "TOKEN", token: 2, listing: 2, persona: "sofia", seller: "tobias", amount: 1.15, status: "ACTIVE", daysAgo: 2, expiresDaysAhead: 5, message: "Collecting the whole harbour series." },
  { n: 4, kind: "TOKEN", token: 2, listing: 2, persona: "omar", seller: "tobias", amount: 0.98, status: "REJECTED", daysAgo: 9, expiresDaysAhead: -2, message: null },
  { n: 5, kind: "TOKEN", token: 5, listing: 3, persona: "lukas", seller: "tobias", amount: 0.38, status: "ACTIVE", daysAgo: 1, expiresDaysAhead: 6, message: null },
  { n: 6, kind: "TOKEN", token: 3, listing: 6, persona: "sofia", seller: "tobias", amount: 0.65, status: "ACCEPTED", daysAgo: 40, expiresDaysAhead: -33, message: "Happy to take it at the listed price." },
  { n: 7, kind: "TOKEN", token: 6, listing: null, persona: "nadia", seller: "elena", amount: 0.5, status: "EXPIRED", daysAgo: 21, expiresDaysAhead: -7, message: null },
  { n: 8, kind: "TOKEN", token: 4, listing: 4, persona: "marcus", seller: "tobias", amount: 1.6, status: "CANCELLED", daysAgo: 12, expiresDaysAhead: -3, message: "Changed my mind, sorry." },
  { n: 9, kind: "COLLECTION", token: null, listing: null, persona: "jonas", seller: null, amount: 0.4, status: "ACTIVE", daysAgo: 4, expiresDaysAhead: 10, message: "Standing bid on any plate in the collection." },
  { n: 10, kind: "COLLECTION", token: null, listing: null, persona: "priya", seller: null, amount: 0.33, status: "ACTIVE", daysAgo: 7, expiresDaysAhead: 14, message: null },
];

/**
 * Sales. Ownership is threaded: for every token, the LAST sale's buyer is the
 * token's current `ownerId` above, so the history explains who holds it.
 */
const NFT_SALES: Array<{
  n: number;
  token: number;
  listing: number | null;
  seller: string;
  buyer: string;
  price: number;
  daysAgo: number;
}> = [
  { n: 1, token: 1, listing: null, seller: "tobias", buyer: "priya", price: 0.4, daysAgo: 150 },
  { n: 2, token: 1, listing: null, seller: "priya", buyer: "tobias", price: 0.62, daysAgo: 62 },
  { n: 3, token: 2, listing: null, seller: "tobias", buyer: "omar", price: 0.95, daysAgo: 121 },
  { n: 4, token: 2, listing: null, seller: "omar", buyer: "tobias", price: 1.22, daysAgo: 34 },
  { n: 5, token: 3, listing: 6, seller: "tobias", buyer: "sofia", price: 0.65, daysAgo: 33 },
  { n: 6, token: 4, listing: null, seller: "tobias", buyer: "elena", price: 1.1, daysAgo: 95 },
  { n: 7, token: 4, listing: null, seller: "elena", buyer: "tobias", price: 1.45, daysAgo: 47 },
  { n: 8, token: 6, listing: null, seller: "tobias", buyer: "elena", price: 0.28, daysAgo: 76 },
];

/** Favourites, including on the pre-existing tokens so their hearts stop reading 0. */
const EXISTING_NFT_TOKEN_IDS = [
  "4023c4c9-e549-493a-9729-2428e3802883",
  "70df7712-f687-44bd-9f13-c0c15f6a0249",
  "90fadb0c-8005-4717-95ca-fbdac4fac2f9",
  "c7166d56-da0c-48e8-88fb-7848af51e209",
  "e992c9d3-f730-43c8-96d8-7aac43b5de1c",
];

async function seedNft() {
  const category = await models.nftCategory.findOne({ where: { slug: "art" } });

  await ensure(models.nftCreator, NFT_CREATOR_ID, {
    userId: P["tobias"],
    displayName: "Halcyon Works",
    bio: "Long-exposure plates and signal studies. One release a month, no more.",
    banner: "/uploads/collectionsbanners/1761548287514-369766975.webp",
    isVerified: true,
    verificationTier: "GOLD",
    totalSales: NFT_SALES.length,
    totalVolume: m8(NFT_SALES.reduce((s, x) => s + x.price, 0)),
    totalItems: NFT_TOKENS.length,
    floorPrice: 0.42,
    profilePublic: true,
    createdAt: daysAgo(210),
    updatedAt: daysAgo(2),
  });

  await ensure(models.nftCollection, NFT_COLLECTION_ID, {
    name: "Meridian Drift",
    slug: "meridian-drift",
    description:
      "Six long-exposure plates made between 2024 and 2026. Each one is a single capture — nothing is composited — and the raw sensor data is archived with the token.",
    symbol: "MRD",
    contractAddress: "0xd0c9A1b2C3d4E5f60718293A4b5C6d7E8f90A1b2",
    chain: "ETH",
    network: "mainnet",
    standard: "ERC721",
    totalSupply: NFT_TOKENS.length,
    maxSupply: 500,
    mintPrice: 0.08,
    currency: "ETH",
    royaltyPercentage: NFT_ROYALTY_PCT,
    royaltyAddress: "0xd0c9A1b2C3d4E5f60718293A4b5C6d7E8f90A1b2",
    creatorId: NFT_CREATOR_ID,
    categoryId: category?.id ?? null,
    bannerImage: "/uploads/collectionsbanners/1761550788464-240092973.webp",
    logoImage: "/uploads/collectionslogos/1761550787061-768357605.webp",
    featuredImage: null,
    website: "https://halcyon-works.example.com",
    twitter: "https://social.example.com/halcyonworks",
    isVerified: true,
    isLazyMinted: false,
    isPublicMintEnabled: false,
    status: "ACTIVE",
    createdAt: daysAgo(200),
    updatedAt: daysAgo(2),
  });

  // Favourites are seeded before tokens so the `likes` column can be set from
  // the real count rather than typed independently.
  const favourites: Array<{ n: number; persona: string; token: string; days: number }> = [];
  let favN = 1;
  const favouritePlan: Array<[string, number]> = [
    ["priya", 1], ["sofia", 1], ["elena", 1], ["jonas", 1],
    ["lukas", 2], ["omar", 2], ["priya", 2], ["nadia", 2], ["marcus", 2],
    ["chidi", 3],
    ["priya", 4], ["sofia", 4], ["elena", 4], ["omar", 4], ["jonas", 4], ["nadia", 4],
    ["lukas", 5], ["marcus", 5],
    ["sofia", 6],
  ];
  for (const [persona, tokenN] of favouritePlan) {
    favourites.push({ n: favN, persona, token: uid("nft", 20 + tokenN), days: (favN * 3) % 60 });
    favN++;
  }
  // ...and a few on the tokens that were already here.
  const existingFavPlan: Array<[string, number]> = [
    ["priya", 0], ["elena", 0], ["jonas", 1], ["sofia", 2], ["omar", 2], ["lukas", 3], ["nadia", 4],
  ];
  for (const [persona, idx] of existingFavPlan) {
    favourites.push({ n: favN, persona, token: EXISTING_NFT_TOKEN_IDS[idx], days: (favN * 5) % 90 });
    favN++;
  }

  const likesByToken = new Map<string, number>();
  for (const f of favourites) {
    likesByToken.set(f.token, (likesByToken.get(f.token) ?? 0) + 1);
  }

  for (const t of NFT_TOKENS) {
    const tokenId = uid("nft", 20 + t.n);
    await ensure(models.nftToken, tokenId, {
      collectionId: NFT_COLLECTION_ID,
      tokenId: String(t.n),
      name: t.name,
      description: t.description,
      image: NFT_IMAGES[(t.n - 1) % NFT_IMAGES.length],
      attributes: [
        { trait_type: "Exposure", value: t.n % 2 === 0 ? "Long" : "Very long" },
        { trait_type: "Series", value: "Meridian" },
        { trait_type: "Plate", value: String(t.n).padStart(2, "0") },
      ],
      // `isUrl` validator: an ipfs:// scheme is rejected, so the gateway URL is
      // the only shape this column accepts.
      metadataUri: `https://ipfs.example.com/ipfs/d0c9meridian/${t.n}.json`,
      ownerId: P[t.owner],
      creatorId: NFT_CREATOR_ID,
      mintedAt: daysAgo(200 - t.n * 4),
      isMinted: true,
      isListed: NFT_LISTINGS.some((l) => l.token === t.n && l.status === "ACTIVE"),
      views: t.views,
      likes: likesByToken.get(tokenId) ?? 0,
      rarity: t.rarity,
      rarityScore: t.rarityScore,
      status: "MINTED",
      blockchainTokenId: String(t.n),
      createdAt: daysAgo(200 - t.n * 4),
      updatedAt: daysAgo(2),
    });
  }

  for (const l of NFT_LISTINGS) {
    await ensure(models.nftListing, uid("nft", 30 + l.n), {
      tokenId: uid("nft", 20 + l.token),
      sellerId: P[l.seller],
      type: l.type,
      price: l.price,
      currency: "ETH",
      reservePrice: l.reservePrice,
      buyNowPrice: l.buyNowPrice,
      startingBid: l.startingBid,
      currentBid: l.currentBid,
      minBidIncrement: l.minBidIncrement,
      startTime: daysAgo(l.startedDaysAgo),
      endTime: l.endsDaysAhead == null ? null : daysAhead(l.endsDaysAhead),
      status: l.status,
      views: 120 + l.n * 37,
      likes: 4 + l.n * 2,
      soldAt: l.status === "SOLD" ? daysAgo(33) : null,
      createdAt: daysAgo(l.startedDaysAgo),
      updatedAt: daysAgo(1),
    });
  }

  for (const b of NFT_BIDS) {
    await ensure(models.nftBid, uid("nft", 100 + b.n), {
      listingId: uid("nft", 30 + b.listing),
      tokenId: uid("nft", 20 + b.token),
      userId: P[b.persona],
      amount: b.amount,
      currency: "ETH",
      expiresAt: daysAhead(b.listing === 4 ? 3 : 6),
      status: b.status,
      outbidAt: b.status === "OUTBID" ? hoursAgo(Math.max(1, b.hoursAgo - 6)) : null,
      createdAt: hoursAgo(b.hoursAgo),
      updatedAt: hoursAgo(b.status === "OUTBID" ? Math.max(1, b.hoursAgo - 6) : b.hoursAgo),
    });
  }

  for (const o of NFT_OFFERS) {
    await ensure(models.nftOffer, uid("nft", 200 + o.n), {
      tokenId: o.token == null ? null : uid("nft", 20 + o.token),
      collectionId: o.kind === "COLLECTION" ? NFT_COLLECTION_ID : null,
      listingId: o.listing == null ? null : uid("nft", 30 + o.listing),
      userId: P[o.persona],
      sellerId: o.seller ? P[o.seller] : null,
      type: o.kind,
      amount: o.amount,
      currency: "ETH",
      message: o.message,
      expiresAt: o.expiresDaysAhead >= 0 ? daysAhead(o.expiresDaysAhead) : daysAgo(-o.expiresDaysAhead),
      status: o.status,
      acceptedAt: o.status === "ACCEPTED" ? daysAgo(o.daysAgo - 1) : null,
      rejectedAt: o.status === "REJECTED" ? daysAgo(o.daysAgo - 1) : null,
      cancelledAt: o.status === "CANCELLED" ? daysAgo(o.daysAgo - 1) : null,
      expiredAt: o.status === "EXPIRED" ? daysAgo(-o.expiresDaysAhead) : null,
      createdAt: daysAgo(o.daysAgo),
      updatedAt: daysAgo(Math.max(1, o.daysAgo - 1)),
    });
  }

  for (const s of NFT_SALES) {
    const marketplaceFee = m8((s.price * NFT_MARKETPLACE_FEE_PCT) / 100);
    const royaltyFee = m8((s.price * NFT_ROYALTY_PCT) / 100);
    const totalFee = m8(marketplaceFee + royaltyFee);
    const saleId = uid("nft", 300 + s.n);
    await ensure(models.nftSale, saleId, {
      tokenId: uid("nft", 20 + s.token),
      listingId: s.listing == null ? null : uid("nft", 30 + s.listing),
      sellerId: P[s.seller],
      buyerId: P[s.buyer],
      price: s.price,
      currency: "ETH",
      marketplaceFee,
      royaltyFee,
      totalFee,
      netAmount: m8(s.price - totalFee),
      transactionHash: fakeTxHash(`nft-sale-${s.n}`),
      blockNumber: 21400000 + s.n * 137,
      status: "COMPLETED",
      createdAt: daysAgo(s.daysAgo),
      updatedAt: daysAgo(s.daysAgo),
    });

    await ensure(models.nftRoyalty, uid("nft", 400 + s.n), {
      saleId,
      tokenId: uid("nft", 20 + s.token),
      collectionId: NFT_COLLECTION_ID,
      // The royalty always goes to the collection's creator, not to the seller.
      recipientId: P["tobias"],
      amount: royaltyFee,
      percentage: NFT_ROYALTY_PCT,
      currency: "ETH",
      transactionHash: fakeTxHash(`nft-royalty-${s.n}`),
      blockNumber: 21400000 + s.n * 137,
      status: "PAID",
      paidAt: daysAgo(s.daysAgo),
      createdAt: daysAgo(s.daysAgo),
      updatedAt: daysAgo(s.daysAgo),
    });
  }

  for (const f of favourites) {
    await ensure(models.nftFavorite, uid("nft", 500 + f.n), {
      userId: P[f.persona],
      tokenId: f.token,
      collectionId: null,
      createdAt: daysAgo(f.days),
      updatedAt: daysAgo(f.days),
    });
  }
}

// ---------------------------------------------------------------------------
// PAYMENT GATEWAY
// ---------------------------------------------------------------------------

const GW_MERCHANT_ID = uid("gateway", 1);
const GW_FEE_PCT = 2.9;
const GW_FEE_FIXED = 0.3;
const GW_WEBHOOK_URL = "https://shop.northwind-digital.example.com/hooks/bicrypto";

interface GwPaymentSeed {
  n: number;
  persona: string;
  amount: number;
  currency: "USD" | "EUR";
  daysAgo: number;
  status:
    | "COMPLETED"
    | "PENDING"
    | "FAILED"
    | "EXPIRED"
    | "REFUNDED"
    | "PARTIALLY_REFUNDED";
  item: string;
}

const GW_PAYMENTS: GwPaymentSeed[] = [
  { n: 1, persona: "priya", amount: 149, currency: "USD", daysAgo: 54, status: "COMPLETED", item: "Northwind Studio — annual licence" },
  { n: 2, persona: "lukas", amount: 49, currency: "USD", daysAgo: 52, status: "COMPLETED", item: "Northwind Studio — monthly licence" },
  { n: 3, persona: "sofia", amount: 320, currency: "EUR", daysAgo: 49, status: "COMPLETED", item: "Northwind Suite — team of 5" },
  { n: 4, persona: "omar", amount: 149, currency: "USD", daysAgo: 45, status: "REFUNDED", item: "Northwind Studio — annual licence" },
  { n: 5, persona: "elena", amount: 89, currency: "USD", daysAgo: 43, status: "COMPLETED", item: "Plate Archive — one year" },
  { n: 6, persona: "jonas", amount: 249, currency: "EUR", daysAgo: 40, status: "COMPLETED", item: "Northwind Suite — team of 3" },
  { n: 7, persona: "nadia", amount: 49, currency: "USD", daysAgo: 38, status: "FAILED", item: "Northwind Studio — monthly licence" },
  { n: 8, persona: "marcus", amount: 599, currency: "USD", daysAgo: 33, status: "COMPLETED", item: "Northwind Enterprise — 25 seats" },
  { n: 9, persona: "chidi", amount: 149, currency: "USD", daysAgo: 31, status: "PARTIALLY_REFUNDED", item: "Northwind Studio — annual licence" },
  { n: 10, persona: "priya", amount: 89, currency: "USD", daysAgo: 27, status: "COMPLETED", item: "Plate Archive — one year" },
  { n: 11, persona: "sofia", amount: 49, currency: "USD", daysAgo: 24, status: "EXPIRED", item: "Northwind Studio — monthly licence" },
  { n: 12, persona: "lukas", amount: 320, currency: "EUR", daysAgo: 20, status: "COMPLETED", item: "Northwind Suite — team of 5" },
  { n: 13, persona: "omar", amount: 149, currency: "USD", daysAgo: 17, status: "COMPLETED", item: "Northwind Studio — annual licence" },
  { n: 14, persona: "jonas", amount: 599, currency: "USD", daysAgo: 13, status: "REFUNDED", item: "Northwind Enterprise — 25 seats" },
  { n: 15, persona: "elena", amount: 89, currency: "USD", daysAgo: 10, status: "COMPLETED", item: "Plate Archive — one year" },
  { n: 16, persona: "nadia", amount: 249, currency: "EUR", daysAgo: 6, status: "COMPLETED", item: "Northwind Suite — team of 3" },
  { n: 17, persona: "marcus", amount: 49, currency: "USD", daysAgo: 3, status: "PENDING", item: "Northwind Studio — monthly licence" },
  { n: 18, persona: "priya", amount: 149, currency: "USD", daysAgo: 1, status: "COMPLETED", item: "Northwind Studio — annual licence" },
];

/**
 * Refunds. Only payments already carrying a refunded status get a COMPLETED
 * refund, so the payment row and the refund ledger never contradict each other.
 * The two extras are a refund still in flight and one that failed at the rail.
 */
const GW_REFUNDS: Array<{
  n: number;
  payment: number;
  amount: number;
  reason: "REQUESTED_BY_CUSTOMER" | "DUPLICATE" | "FRAUDULENT" | "OTHER";
  description: string;
  status: "PENDING" | "COMPLETED" | "FAILED";
  daysAgo: number;
}> = [
  { n: 1, payment: 4, amount: 149, reason: "REQUESTED_BY_CUSTOMER", description: "Customer bought the wrong tier and asked for a full refund within the window.", status: "COMPLETED", daysAgo: 42 },
  { n: 2, payment: 9, amount: 60, reason: "OTHER", description: "Two of five seats never activated; partial refund agreed by support.", status: "COMPLETED", daysAgo: 26 },
  { n: 3, payment: 14, amount: 599, reason: "DUPLICATE", description: "Charged twice by a retried checkout. Duplicate reversed.", status: "COMPLETED", daysAgo: 11 },
  { n: 4, payment: 6, amount: 249, reason: "REQUESTED_BY_CUSTOMER", description: "Cancelled inside the 14-day window.", status: "PENDING", daysAgo: 1 },
  { n: 5, payment: 3, amount: 320, reason: "FRAUDULENT", description: "Card issuer flagged the original authorisation.", status: "FAILED", daysAgo: 15 },
  { n: 6, payment: 12, amount: 80, reason: "OTHER", description: "Goodwill credit for a three-day outage.", status: "COMPLETED", daysAgo: 8 },
];

async function seedGateway() {
  await ensure(models.gatewayMerchant, GW_MERCHANT_ID, {
    userId: P["aiko"],
    name: "Northwind Digital",
    slug: "northwind-digital",
    description:
      "Digital-goods storefront: creative software licences and archive subscriptions, settled in crypto.",
    logo: null,
    website: "https://shop.northwind-digital.example.com",
    email: "billing@northwind-digital.example.com",
    phone: "+81355550142",
    address: "2-14-1 Nihonbashi",
    city: "Tokyo",
    state: "Tokyo",
    postalCode: "103-0027",
    country: "JP",
    // Synthetic keys. Prefixed `test` so nobody mistakes them for live secrets.
    apiKey: "pk_test_d0c9NorthwindDocsShotsPublishableKey000001",
    secretKey: "sk_test_d0c9NorthwindDocsShotsSecretKey0000000001",
    webhookSecret: "whsec_d0c9NorthwindDocsShots0001",
    testMode: false,
    allowedCurrencies: ["USD", "EUR", "USDT"],
    allowedWalletTypes: ["FIAT", "SPOT"],
    defaultCurrency: "USD",
    feeType: "BOTH",
    feePercentage: GW_FEE_PCT,
    feeFixed: GW_FEE_FIXED,
    payoutSchedule: "WEEKLY",
    payoutThreshold: 100,
    status: "ACTIVE",
    verificationStatus: "VERIFIED",
    dailyLimit: 25000,
    monthlyLimit: 250000,
    transactionLimit: 5000,
    createdAt: daysAgo(90),
    updatedAt: daysAgo(2),
  });

  // Payments.
  for (const p of GW_PAYMENTS) {
    const fee = m8((p.amount * GW_FEE_PCT) / 100 + GW_FEE_FIXED);
    const persona = PERSONAS.find((x) => x.key === p.persona)!;
    const settled = p.status === "COMPLETED" || p.status === "REFUNDED" || p.status === "PARTIALLY_REFUNDED";
    await ensure(models.gatewayPayment, uid("gateway", 100 + p.n), {
      merchantId: GW_MERCHANT_ID,
      customerId: P[p.persona],
      transactionId: null,
      paymentIntentId: `pi_d0c9${String(p.n).padStart(4, "0")}NorthwindDocs`,
      merchantOrderId: `NW-${4100 + p.n}`,
      amount: p.amount,
      currency: p.currency,
      walletType: "FIAT",
      feeAmount: fee,
      netAmount: m8(p.amount - fee),
      status: p.status,
      checkoutUrl: `http://localhost:3000/en/gateway/checkout/pi_d0c9${String(p.n).padStart(4, "0")}NorthwindDocs`,
      returnUrl: "https://shop.northwind-digital.example.com/order/complete",
      cancelUrl: "https://shop.northwind-digital.example.com/order/cancelled",
      webhookUrl: GW_WEBHOOK_URL,
      description: `${p.item} (order NW-${4100 + p.n})`,
      metadata: { source: "northwind-storefront", plan: p.item },
      lineItems: [{ name: p.item, description: "", quantity: 1, unitPrice: p.amount }],
      customerEmail: persona.email,
      customerName: `${persona.firstName} ${persona.lastName}`,
      expiresAt: minutesAfter(daysAgo(p.daysAgo), 30),
      completedAt: settled ? minutesAfter(daysAgo(p.daysAgo), 4) : null,
      testMode: false,
      createdAt: daysAgo(p.daysAgo),
      updatedAt: daysAgo(Math.max(0, p.daysAgo - 1)),
    });
  }

  // Refunds.
  for (const r of GW_REFUNDS) {
    const payment = GW_PAYMENTS.find((p) => p.n === r.payment)!;
    await ensure(models.gatewayRefund, uid("gateway", 200 + r.n), {
      paymentId: uid("gateway", 100 + r.payment),
      merchantId: GW_MERCHANT_ID,
      transactionId: null,
      refundId: `re_d0c9NorthwindRefund${String(r.n).padStart(4, "0")}`,
      amount: r.amount,
      currency: payment.currency,
      reason: r.reason,
      description: r.description,
      status: r.status,
      metadata: { orderId: `NW-${4100 + r.payment}` },
      createdAt: daysAgo(r.daysAgo),
      updatedAt: daysAgo(Math.max(0, r.daysAgo - 1)),
    });
  }

  // Payouts, DERIVED from the payments above rather than typed, so the merchant
  // dashboard's owed/paid tiles reconcile against the payment list.
  const buckets = new Map<
    number,
    { gross: number; fee: number; count: number; refunds: number; refunded: number; currency: string }
  >();
  for (const p of GW_PAYMENTS) {
    if (p.currency !== "USD") continue; // payouts here are settled in USD
    if (p.status === "FAILED" || p.status === "EXPIRED" || p.status === "PENDING") continue;
    const week = Math.floor(p.daysAgo / 7);
    const fee = m8((p.amount * GW_FEE_PCT) / 100 + GW_FEE_FIXED);
    const b = buckets.get(week) ?? { gross: 0, fee: 0, count: 0, refunds: 0, refunded: 0, currency: "USD" };
    b.gross = m8(b.gross + p.amount);
    b.fee = m8(b.fee + fee);
    b.count += 1;
    buckets.set(week, b);
  }
  for (const r of GW_REFUNDS) {
    if (r.status !== "COMPLETED") continue;
    const payment = GW_PAYMENTS.find((p) => p.n === r.payment)!;
    if (payment.currency !== "USD") continue;
    const week = Math.floor(payment.daysAgo / 7);
    const b = buckets.get(week);
    if (!b) continue;
    b.refunds += 1;
    b.refunded = m8(b.refunded + r.amount);
  }

  // Ascending BUCKET INDEX is descending in TIME: bucket 0 is the week that has
  // just ended. Sorting the other way round put the PENDING payout on the
  // oldest window and marked this week's already paid.
  const weeks = [...buckets.keys()].sort((a, b) => a - b);
  let payoutN = 0;
  for (const week of weeks) {
    payoutN++;
    const b = buckets.get(week)!;
    const net = m8(b.gross - b.fee - b.refunded);
    // The most recent window is still open, the one before it is mid-flight,
    // and everything older has already been paid. One historical payout is
    // FAILED so the admin queue has a rejection to show.
    const status =
      week === weeks[0]
        ? "PENDING"
        : week === weeks[1]
          ? "PROCESSING"
          : payoutN === 5
            ? "FAILED"
            : "COMPLETED";
    await ensure(models.gatewayPayout, uid("gateway", 300 + payoutN), {
      merchantId: GW_MERCHANT_ID,
      transactionId: null,
      // The payouts list renders only the TAIL of this id, so the sequence goes
      // last - with the number in front, every row on the page read
      // "Payout: #windDocs".
      payoutId: `po_d0c9NorthwindPayout${String(payoutN).padStart(4, "0")}`,
      amount: net,
      currency: "USD",
      walletType: "FIAT",
      status,
      periodStart: daysAgo(week * 7 + 7),
      periodEnd: daysAgo(week * 7),
      grossAmount: b.gross,
      feeAmount: b.fee,
      netAmount: net,
      paymentCount: b.count,
      refundCount: b.refunds,
      metadata: { refundedAmount: b.refunded },
      processedAt: status === "COMPLETED" ? daysAgo(week * 7 - 1) : null,
      createdAt: daysAgo(week * 7),
      updatedAt: daysAgo(Math.max(0, week * 7 - 1)),
    });
  }

  // Merchant balances, from the same arithmetic.
  const totals = { USD: { received: 0, fees: 0, refunded: 0 }, EUR: { received: 0, fees: 0, refunded: 0 } };
  for (const p of GW_PAYMENTS) {
    if (p.status === "FAILED" || p.status === "EXPIRED" || p.status === "PENDING") continue;
    const fee = m8((p.amount * GW_FEE_PCT) / 100 + GW_FEE_FIXED);
    totals[p.currency].received = m8(totals[p.currency].received + p.amount);
    totals[p.currency].fees = m8(totals[p.currency].fees + fee);
  }
  for (const r of GW_REFUNDS) {
    if (r.status !== "COMPLETED") continue;
    const payment = GW_PAYMENTS.find((p) => p.n === r.payment)!;
    totals[payment.currency].refunded = m8(totals[payment.currency].refunded + r.amount);
  }
  const paidOutUsd = m8(
    [...buckets.entries()]
      .filter(([w], i) => w !== weeks[0] && w !== weeks[1])
      .reduce((s, [, b]) => s + b.gross - b.fee - b.refunded, 0)
  );
  const balances: Array<[string, number]> = [
    ["USD", paidOutUsd],
    ["EUR", 0],
  ];
  let balN = 0;
  for (const [currency, paidOut] of balances) {
    balN++;
    const t = totals[currency as "USD" | "EUR"];
    const settledNet = m8(t.received - t.fees - t.refunded);
    await ensure(models.gatewayMerchantBalance, uid("gateway", 400 + balN), {
      merchantId: GW_MERCHANT_ID,
      currency,
      walletType: "FIAT",
      available: m8(Math.max(0, settledNet - paidOut)),
      pending: 0,
      reserved: 0,
      totalReceived: t.received,
      totalRefunded: t.refunded,
      totalFees: t.fees,
      totalPaidOut: paidOut,
      updatedAt: daysAgo(1),
    });
  }

  // Webhook delivery log.
  let hookN = 0;
  const hook = async (
    paymentN: number | null,
    refundN: number | null,
    eventType: string,
    outcome: "SENT" | "FAILED" | "RETRYING" | "PENDING",
    daysAgoValue: number
  ) => {
    hookN++;
    const body =
      paymentN != null
        ? { id: `pi_d0c9${String(paymentN).padStart(4, "0")}NorthwindDocs`, object: "payment", type: eventType }
        : { id: `re_d0c9${String(refundN).padStart(4, "0")}NorthwindDocs`, object: "refund", type: eventType };
    await ensure(models.gatewayWebhook, uid("gateway", 500 + hookN), {
      merchantId: GW_MERCHANT_ID,
      paymentId: paymentN == null ? null : uid("gateway", 100 + paymentN),
      refundId: refundN == null ? null : uid("gateway", 200 + refundN),
      eventType,
      url: GW_WEBHOOK_URL,
      payload: { event: eventType, data: body, createdAt: daysAgo(daysAgoValue).toISOString() },
      signature:
        outcome === "PENDING"
          ? null
          : `t=${Math.floor(daysAgo(daysAgoValue).getTime() / 1000)},v1=d0c9${String(hookN).padStart(4, "0")}9f4c2b7e8a1d6035`,
      status: outcome,
      attempts: outcome === "SENT" ? 1 : outcome === "RETRYING" ? 2 : outcome === "FAILED" ? 5 : 0,
      maxAttempts: 5,
      lastAttemptAt: outcome === "PENDING" ? null : daysAgo(daysAgoValue),
      nextRetryAt: outcome === "RETRYING" ? minutesAfter(NOW, 12) : null,
      responseStatus: outcome === "SENT" ? 200 : outcome === "FAILED" ? 500 : outcome === "RETRYING" ? 502 : null,
      responseBody: outcome === "SENT" ? '{"received":true}' : outcome === "PENDING" ? null : "upstream did not respond",
      responseTime: outcome === "SENT" ? 90 + hookN * 7 : outcome === "PENDING" ? null : 30000,
      errorMessage:
        outcome === "FAILED"
          ? "Max delivery attempts reached (5/5): endpoint returned 500"
          : outcome === "RETRYING"
            ? "Endpoint returned 502; retry scheduled"
            : null,
      createdAt: daysAgo(daysAgoValue),
      updatedAt: daysAgo(daysAgoValue),
    });
  };

  for (const p of GW_PAYMENTS.slice(0, 10)) {
    await hook(p.n, null, "payment.created", "SENT", p.daysAgo);
  }
  await hook(1, null, "payment.completed", "SENT", 54);
  await hook(8, null, "payment.completed", "SENT", 33);
  await hook(7, null, "payment.failed", "SENT", 38);
  await hook(11, null, "payment.expired", "SENT", 24);
  await hook(4, 1, "refund.completed", "SENT", 42);
  await hook(9, 2, "refund.completed", "FAILED", 26);
  await hook(14, 3, "refund.completed", "FAILED", 11);
  await hook(6, 4, "refund.created", "RETRYING", 1);
  await hook(18, null, "payment.completed", "PENDING", 1);
}

// ---------------------------------------------------------------------------
// E-COMMERCE
// ---------------------------------------------------------------------------

const ECOM_PRODUCTS: Array<{
  n: number;
  name: string;
  slug: string;
  short: string;
  description: string;
  type: "DOWNLOADABLE" | "PHYSICAL";
  price: number;
  currency: string;
  walletType: "FIAT" | "SPOT";
  categorySlugLike: string;
  inventory: number;
  image: string;
}> = [
  {
    n: 1,
    name: "Hardware Wallet — Sentinel X1",
    slug: "hardware-wallet-sentinel-x1",
    short: "Air-gapped signing device with a certified secure element.",
    description:
      "<p>A signing device that never touches a network. Transactions go in over QR, signatures come back the same way, and the seed never leaves the secure element.</p><ul><li>Certified secure element</li><li>Colour screen, physical confirm button</li><li>Recovery card and lanyard included</li></ul>",
    type: "PHYSICAL",
    price: 129,
    currency: "USD",
    walletType: "FIAT",
    categorySlugLike: "software",
    inventory: 48,
    image: "/uploads/product/1740789131115-751615709.webp",
  },
  {
    n: 2,
    name: "Steel Seed Backup Plate",
    slug: "steel-seed-backup-plate",
    short: "Fireproof stainless plate for a 24-word recovery phrase.",
    description:
      "<p>Stamped stainless steel, rated well past the temperature at which paper stops existing. Fits a 24-word phrase with a punch set included in the box.</p>",
    type: "PHYSICAL",
    price: 45,
    currency: "USD",
    walletType: "FIAT",
    categorySlugLike: "software",
    inventory: 120,
    image: "/uploads/product/1751368303427-665047116.webp",
  },
  {
    n: 3,
    name: "Market Structure Course — 12 Modules",
    slug: "market-structure-course-12-modules",
    short: "Twelve recorded modules on order books, liquidity and execution.",
    description:
      "<p>Twelve modules, roughly nine hours, on how an order book actually behaves: where liquidity sits, what a market order really costs you, and how to read a tape without inventing patterns in it.</p><p>Includes the worksheets and a lifetime licence to future revisions.</p>",
    type: "DOWNLOADABLE",
    price: 89,
    currency: "USD",
    walletType: "FIAT",
    categorySlugLike: "movies",
    inventory: 9999,
    image: "/uploads/product/1751369108342-644529048.webp",
  },
  {
    n: 4,
    name: "Portfolio Tracker — Annual Licence",
    slug: "portfolio-tracker-annual-licence",
    short: "Desktop portfolio and tax-lot tracker, one year of updates.",
    description:
      "<p>Reads your exchange history, matches lots, and produces a report an accountant will accept. Runs locally; nothing is uploaded.</p>",
    type: "DOWNLOADABLE",
    price: 59,
    currency: "USDT",
    walletType: "SPOT",
    categorySlugLike: "software",
    inventory: 9999,
    image: "/uploads/product/1740789131115-751615709.webp",
  },
];

const ECOM_DISCOUNTS: Array<{
  n: number;
  code: string;
  type: "PERCENTAGE" | "FIXED" | "FREE_SHIPPING";
  percentage: number;
  amount: number;
  product: number;
  maxUses: number | null;
}> = [
  { n: 1, code: "WELCOME10", type: "PERCENTAGE", percentage: 10, amount: 0, product: 3, maxUses: 500 },
  { n: 2, code: "SHIPFREE", type: "FREE_SHIPPING", percentage: 0, amount: 0, product: 1, maxUses: 200 },
  { n: 3, code: "SAVE15", type: "FIXED", percentage: 0, amount: 15, product: 4, maxUses: 100 },
];

const ECOM_SHIPMENTS: Array<{
  n: number;
  loadId: string;
  status: "PENDING" | "TRANSIT" | "DELIVERED";
  transporter: string;
  cost: number;
  tax: number;
  deliveryDaysFromNow: number;
  weight: number;
  volume: number;
  vehicle: string;
  description: string;
}> = [
  { n: 1, loadId: "NW-SHIP-48213", status: "DELIVERED", transporter: "DHL Express", cost: 14, tax: 1.4, deliveryDaysFromNow: -9, weight: 0.6, volume: 0.004, vehicle: "DX-4471", description: "Sentinel X1 hardware wallet, insured" },
  { n: 2, loadId: "NW-SHIP-48291", status: "TRANSIT", transporter: "UPS Standard", cost: 9.5, tax: 0.95, deliveryDaysFromNow: 3, weight: 0.3, volume: 0.002, vehicle: "UP-8820", description: "Steel seed backup plate and punch set" },
  { n: 3, loadId: "NW-SHIP-48344", status: "PENDING", transporter: "FedEx International", cost: 22, tax: 2.2, deliveryDaysFromNow: 8, weight: 0.9, volume: 0.006, vehicle: "FX-1093", description: "Sentinel X1 plus steel plate, two-item order" },
];

interface EcomOrderSeed {
  n: number;
  persona: string;
  product: number;
  quantity: number;
  status: "PENDING" | "COMPLETED" | "CANCELLED";
  shipment: number | null;
  discount: number; // absolute currency amount
  daysAgo: number;
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone: string;
  } | null;
}

const ECOM_ORDERS: EcomOrderSeed[] = [
  {
    n: 1, persona: "priya", product: 1, quantity: 1, status: "COMPLETED", shipment: 1, discount: 0, daysAgo: 22,
    address: { street: "14 Brigade Road, Flat 3B", city: "Bengaluru", state: "Karnataka", postalCode: "560001", country: "IN", phone: "+918055550117" },
  },
  {
    n: 2, persona: "lukas", product: 2, quantity: 2, status: "PENDING", shipment: 2, discount: 0, daysAgo: 4,
    address: { street: "Vinohradská 1420/28", city: "Prague", state: "Praha", postalCode: "12000", country: "CZ", phone: "+420222555018" },
  },
  {
    n: 3, persona: "sofia", product: 3, quantity: 1, status: "COMPLETED", shipment: null, discount: 8.9, daysAgo: 30,
    address: null,
  },
  {
    n: 4, persona: "omar", product: 1, quantity: 1, status: "COMPLETED", shipment: 3, discount: 0, daysAgo: 2,
    address: { street: "Marasi Drive, Business Bay, Tower 2, Office 1104", city: "Dubai", state: "Dubai", postalCode: "00000", country: "AE", phone: "+97145550193" },
  },
  {
    n: 5, persona: "jonas", product: 4, quantity: 1, status: "COMPLETED", shipment: null, discount: 15, daysAgo: 16,
    address: null,
  },
  {
    n: 6, persona: "nadia", product: 3, quantity: 1, status: "CANCELLED", shipment: null, discount: 0, daysAgo: 11,
    address: null,
  },
  {
    n: 7, persona: "elena", product: 2, quantity: 1, status: "COMPLETED", shipment: 1, discount: 0, daysAgo: 38,
    address: { street: "Kneza Miloša 42", city: "Belgrade", state: "Beograd", postalCode: "11000", country: "RS", phone: "+381115550142" },
  },
  {
    n: 8, persona: "marcus", product: 4, quantity: 3, status: "COMPLETED", shipment: null, discount: 0, daysAgo: 7,
    address: null,
  },
];

const ECOM_USER_DISCOUNTS: Array<{ n: number; persona: string; discount: number; used: boolean }> = [
  { n: 1, persona: "priya", discount: 1, used: false },
  { n: 2, persona: "lukas", discount: 1, used: false },
  { n: 3, persona: "sofia", discount: 1, used: true },
  { n: 4, persona: "omar", discount: 2, used: false },
  { n: 5, persona: "elena", discount: 2, used: false },
  { n: 6, persona: "jonas", discount: 3, used: true },
  { n: 7, persona: "nadia", discount: 3, used: false },
  { n: 8, persona: "marcus", discount: 1, used: false },
];

async function seedEcommerce() {
  const categories = await models.ecommerceCategory.findAll();
  const catBySlug = new Map(categories.map((c: any) => [String(c.slug).split("-")[0], c.id]));
  const fallbackCategory = categories.find((c: any) => c.status)?.id ?? categories[0]?.id;
  if (!fallbackCategory) {
    console.log("  Ecommerce: no product category on this install - skipping ecommerce");
    return;
  }

  for (const p of ECOM_PRODUCTS) {
    await ensure(models.ecommerceProduct, uid("ecommerce", 40 + p.n), {
      name: p.name,
      slug: p.slug,
      description: p.description,
      shortDescription: p.short,
      type: p.type,
      price: p.price,
      currency: p.currency,
      walletType: p.walletType,
      categoryId: catBySlug.get(p.categorySlugLike) ?? fallbackCategory,
      inventoryQuantity: p.inventory,
      status: true,
      image: p.image,
      gallery: [p.image],
      createdAt: daysAgo(150 - p.n * 10),
      updatedAt: daysAgo(5),
    });
  }

  for (const d of ECOM_DISCOUNTS) {
    await ensure(models.ecommerceDiscount, uid("ecommerce", 1 + d.n), {
      code: d.code,
      percentage: d.percentage,
      amount: d.amount,
      type: d.type,
      productId: uid("ecommerce", 40 + d.product),
      status: true,
      validFrom: daysAgo(60),
      validUntil: daysAhead(120),
      maxUses: d.maxUses,
      createdAt: daysAgo(60),
      updatedAt: daysAgo(5),
    });
  }

  for (const s of ECOM_SHIPMENTS) {
    await ensure(models.ecommerceShipping, uid("ecommerce", 10 + s.n), {
      loadId: s.loadId,
      loadStatus: s.status,
      shipper: "Northwind Fulfilment",
      transporter: s.transporter,
      goodsType: "Non Perishable",
      weight: s.weight,
      volume: s.volume,
      description: s.description,
      vehicle: s.vehicle,
      cost: s.cost,
      tax: s.tax,
      deliveryDate:
        s.deliveryDaysFromNow >= 0 ? daysAhead(s.deliveryDaysFromNow) : daysAgo(-s.deliveryDaysFromNow),
      createdAt: daysAgo(30 - s.n * 5),
      updatedAt: daysAgo(2),
    });
  }

  for (const o of ECOM_ORDERS) {
    const product = ECOM_PRODUCTS.find((p) => p.n === o.product)!;
    const shipment = o.shipment == null ? null : ECOM_SHIPMENTS.find((s) => s.n === o.shipment)!;
    const subtotal = m2(product.price * o.quantity);
    const shippingCost = shipment ? shipment.cost : 0;
    const tax = shipment ? shipment.tax : 0;
    const total = m2(subtotal - o.discount + shippingCost + tax);
    const orderId = uid("ecommerce", 20 + o.n);

    await ensure(models.ecommerceOrder, orderId, {
      userId: P[o.persona],
      status: o.status,
      shippingId: shipment ? uid("ecommerce", 10 + shipment.n) : null,
      productId: uid("ecommerce", 40 + o.product),
      subtotal,
      discount: o.discount,
      shippingCost,
      tax,
      total,
      currency: product.currency,
      walletType: product.walletType,
      createdAt: daysAgo(o.daysAgo),
      updatedAt: daysAgo(Math.max(0, o.daysAgo - 1)),
    });

    await ensure(models.ecommerceOrderItem, uid("ecommerce", 60 + o.n), {
      orderId,
      productId: uid("ecommerce", 40 + o.product),
      quantity: o.quantity,
      key: product.type === "DOWNLOADABLE" ? `NW-KEY-${(9100 + o.n).toString(36).toUpperCase()}-D0C9` : null,
      filePath: product.type === "DOWNLOADABLE" ? `/uploads/product/${product.slug}.zip` : null,
      instructions:
        product.type === "DOWNLOADABLE"
          ? "Redeem the key inside the desktop application under Help > Activate."
          : null,
    });

    if (o.address) {
      const persona = PERSONAS.find((p) => p.key === o.persona)!;
      await ensure(models.ecommerceShippingAddress, uid("ecommerce", 80 + o.n), {
        userId: P[o.persona],
        orderId,
        name: `${persona.firstName} ${persona.lastName}`,
        email: persona.email,
        phone: o.address.phone,
        street: o.address.street,
        city: o.address.city,
        state: o.address.state,
        postalCode: o.address.postalCode,
        country: o.address.country,
        createdAt: daysAgo(o.daysAgo),
        updatedAt: daysAgo(o.daysAgo),
      });
    }
  }

  for (const ud of ECOM_USER_DISCOUNTS) {
    await ensure(models.ecommerceUserDiscount, uid("ecommerce", 100 + ud.n), {
      userId: P[ud.persona],
      discountId: uid("ecommerce", 1 + ud.discount),
      // `status` here means "still claimable" - a spent code is 0.
      status: !ud.used,
    });
  }
}

// ---------------------------------------------------------------------------
// P2P
// ---------------------------------------------------------------------------

const P2P_RAIL_SLUGS = ["banktransfer", "sepainstant", "wise", "revolut"];

interface P2pOfferSeed {
  n: number;
  persona: string;
  type: "BUY" | "SELL";
  currency: string;
  priceCurrency: string;
  total: number;
  min: number;
  max: number;
  price: number;
  marketPrice: number;
  country: string;
  method: number; // index into the payment methods created below
  terms: string;
  daysAgo: number;
  views: number;
}

const P2P_OFFERS: P2pOfferSeed[] = [
  { n: 1, persona: "chidi", type: "SELL", currency: "USDT", priceCurrency: "USD", total: 25000, min: 50, max: 5000, price: 1.012, marketPrice: 1.0, country: "NG", method: 1, terms: "Bank transfer only. Please put the trade reference in the narration or release will be delayed.", daysAgo: 34, views: 1842 },
  { n: 2, persona: "chidi", type: "BUY", currency: "USDT", priceCurrency: "USD", total: 18000, min: 100, max: 4000, price: 0.995, marketPrice: 1.0, country: "NG", method: 1, terms: "I pay within 10 minutes during business hours (09:00-18:00 WAT).", daysAgo: 34, views: 1204 },
  { n: 3, persona: "nadia", type: "SELL", currency: "USDT", priceCurrency: "EUR", total: 40000, min: 200, max: 10000, price: 0.938, marketPrice: 0.93, country: "DE", method: 2, terms: "SEPA Instant only. No third-party payments — the sending account must match your verified name.", daysAgo: 21, views: 967 },
  { n: 4, persona: "omar", type: "SELL", currency: "BTC", priceCurrency: "USD", total: 2.5, min: 0.002, max: 0.25, price: 68450, marketPrice: 68200, country: "AE", method: 3, terms: "Wise transfer. I release as soon as the funds show as received, usually within the hour.", daysAgo: 15, views: 2310 },
  { n: 5, persona: "lukas", type: "BUY", currency: "BTC", priceCurrency: "EUR", total: 1.2, min: 0.005, max: 0.2, price: 63100, marketPrice: 63400, country: "CZ", method: 4, terms: "Revolut only. Small trades welcome; first-time counterparties fine.", daysAgo: 9, views: 641 },
  { n: 6, persona: "marcus", type: "SELL", currency: "USDT", priceCurrency: "USD", total: 60000, min: 500, max: 15000, price: 1.008, marketPrice: 1.0, country: "GB", method: 3, terms: "Business hours UK. Invoices available on request for company accounts.", daysAgo: 5, views: 488 },
];

/**
 * Trades. `escrowFee` is the ABSOLUTE platform fee in the trade's ASSET
 * currency, charged to the BUYER — that is what `settleTradeEscrow` writes and
 * what the commission row must equal. 0.2% here.
 */
const P2P_FEE_RATE = 0.002;

interface P2pTradeSeed {
  n: number;
  offer: number;
  buyer: string;
  seller: string;
  amount: number;
  daysAgo: number;
  status: "COMPLETED" | "DISPUTED" | "CANCELLED" | "PAYMENT_SENT";
  payMinutes: number; // minutes from open to buyer confirming payment
  releaseMinutes: number; // minutes from payment confirmation to release
}

const P2P_TRADES: P2pTradeSeed[] = [
  { n: 1, offer: 1, buyer: "priya", seller: "chidi", amount: 500, daysAgo: 31, status: "COMPLETED", payMinutes: 7, releaseMinutes: 4 },
  { n: 2, offer: 1, buyer: "elena", seller: "chidi", amount: 1200, daysAgo: 27, status: "COMPLETED", payMinutes: 12, releaseMinutes: 3 },
  { n: 3, offer: 2, buyer: "chidi", seller: "jonas", amount: 800, daysAgo: 25, status: "COMPLETED", payMinutes: 5, releaseMinutes: 9 },
  { n: 4, offer: 3, buyer: "sofia", seller: "nadia", amount: 2500, daysAgo: 19, status: "COMPLETED", payMinutes: 3, releaseMinutes: 2 },
  { n: 5, offer: 3, buyer: "lukas", seller: "nadia", amount: 900, daysAgo: 17, status: "COMPLETED", payMinutes: 21, releaseMinutes: 6 },
  { n: 6, offer: 4, buyer: "priya", seller: "omar", amount: 0.045, daysAgo: 13, status: "COMPLETED", payMinutes: 9, releaseMinutes: 11 },
  { n: 7, offer: 4, buyer: "marcus", seller: "omar", amount: 0.12, daysAgo: 11, status: "COMPLETED", payMinutes: 4, releaseMinutes: 5 },
  { n: 8, offer: 5, buyer: "lukas", seller: "elena", amount: 0.02, daysAgo: 8, status: "COMPLETED", payMinutes: 15, releaseMinutes: 8 },
  { n: 9, offer: 6, buyer: "nadia", seller: "marcus", amount: 3000, daysAgo: 6, status: "COMPLETED", payMinutes: 6, releaseMinutes: 4 },
  { n: 10, offer: 1, buyer: "jonas", seller: "chidi", amount: 250, daysAgo: 4, status: "COMPLETED", payMinutes: 11, releaseMinutes: 7 },
  { n: 11, offer: 3, buyer: "omar", seller: "nadia", amount: 4000, daysAgo: 2, status: "DISPUTED", payMinutes: 8, releaseMinutes: 0 },
  { n: 12, offer: 6, buyer: "sofia", seller: "marcus", amount: 700, daysAgo: 1, status: "CANCELLED", payMinutes: 0, releaseMinutes: 0 },
  { n: 13, offer: 4, buyer: "elena", seller: "omar", amount: 0.03, daysAgo: 0, status: "PAYMENT_SENT", payMinutes: 14, releaseMinutes: 0 },
];

const P2P_REVIEWS: Array<{
  n: number;
  trade: number;
  reviewer: string;
  reviewee: string;
  comm: number;
  speed: number;
  trust: number;
  comment: string;
}> = [
  { n: 1, trade: 1, reviewer: "priya", reviewee: "chidi", comm: 5, speed: 5, trust: 5, comment: "Released in under five minutes and answered every message. No notes." },
  { n: 2, trade: 1, reviewer: "chidi", reviewee: "priya", comm: 5, speed: 5, trust: 5, comment: "Paid immediately with the reference in the narration. Ideal counterparty." },
  { n: 3, trade: 2, reviewer: "elena", reviewee: "chidi", comm: 5, speed: 4, trust: 5, comment: "Straightforward. Slight wait on release but he warned me in advance." },
  { n: 4, trade: 2, reviewer: "chidi", reviewee: "elena", comm: 4, speed: 4, trust: 5, comment: "All fine, payment arrived as described." },
  { n: 5, trade: 3, reviewer: "chidi", reviewee: "jonas", comm: 4, speed: 4, trust: 5, comment: "Solid seller. Took a few minutes to release but nothing unreasonable." },
  { n: 6, trade: 4, reviewer: "sofia", reviewee: "nadia", comm: 5, speed: 5, trust: 5, comment: "Fastest SEPA trade I have done here. Two minutes from confirmation to release." },
  { n: 7, trade: 4, reviewer: "nadia", reviewee: "sofia", comm: 5, speed: 5, trust: 5, comment: "Verified name matched, instant payment. Would trade again." },
  { n: 8, trade: 5, reviewer: "lukas", reviewee: "nadia", comm: 4, speed: 4, trust: 5, comment: "Good communication. Took me a while to pay and she was patient about it." },
  { n: 9, trade: 6, reviewer: "priya", reviewee: "omar", comm: 5, speed: 4, trust: 5, comment: "Careful and precise. Confirmed the amount twice before releasing." },
  { n: 10, trade: 7, reviewer: "marcus", reviewee: "omar", comm: 5, speed: 5, trust: 5, comment: "Large trade, no friction at all. Released within five minutes." },
  { n: 11, trade: 7, reviewer: "omar", reviewee: "marcus", comm: 5, speed: 5, trust: 5, comment: "Professional throughout. Sent proof without being asked." },
  { n: 12, trade: 8, reviewer: "lukas", reviewee: "elena", comm: 4, speed: 3, trust: 4, comment: "Release took longer than the quoted window, but she stayed in touch." },
  { n: 13, trade: 9, reviewer: "nadia", reviewee: "marcus", comm: 5, speed: 5, trust: 5, comment: "Invoice provided for the company account. Very smooth." },
  { n: 14, trade: 10, reviewer: "jonas", reviewee: "chidi", comm: 5, speed: 4, trust: 5, comment: "Small trade, treated exactly the same as a large one. Appreciated." },
];

const P2P_RELATIONS: Array<{ n: number; user: string; trader: string; type: "FOLLOW" | "BLOCK"; note: string | null }> = [
  { n: 1, user: "priya", trader: "chidi", type: "FOLLOW", note: "Reliable NGN merchant, always online in the morning." },
  { n: 2, user: "priya", trader: "omar", type: "FOLLOW", note: "Best BTC spread I have found." },
  { n: 3, user: "sofia", trader: "nadia", type: "FOLLOW", note: null },
  { n: 4, user: "lukas", trader: "nadia", type: "FOLLOW", note: "SEPA, fast." },
  { n: 5, user: "marcus", trader: "omar", type: "FOLLOW", note: null },
  { n: 6, user: "elena", trader: "chidi", type: "FOLLOW", note: null },
  { n: 7, user: "omar", trader: "elena", type: "BLOCK", note: "Slow to release on the last two trades." },
  { n: 8, user: "nadia", trader: "jonas", type: "BLOCK", note: "Kept asking to move the conversation off-platform." },
];

async function seedP2p() {
  const rails = await models.p2pPaymentRail.findAll({
    where: { slug: { [Op.in]: P2P_RAIL_SLUGS } },
  });
  const railBySlug = new Map(rails.map((r: any) => [r.slug, r]));

  // Payment methods, one per rail, owned by the merchant personas.
  const methodOwners = ["chidi", "nadia", "omar", "lukas"];
  const methodDetails: Array<Record<string, string>> = [
    { "Account name": "Chidi Okafor", "Account number": "0123456789", Bank: "Kuda Microfinance Bank" },
    { IBAN: "DE89 3704 0044 0532 0130 00", "Account holder": "Nadia Rahman", BIC: "COBADEFFXXX" },
    { "Wise tag": "@omarhaddad", "Account holder": "Omar Haddad", Currency: "USD" },
    { "Revolut tag": "@lukasnovak", "Account holder": "Lukas Novak", Currency: "EUR" },
  ];
  for (let i = 0; i < P2P_RAIL_SLUGS.length; i++) {
    const rail = railBySlug.get(P2P_RAIL_SLUGS[i]);
    await ensure(models.p2pPaymentMethod, uid("p2p", 1 + i), {
      userId: P[methodOwners[i]],
      name: rail?.name ?? P2P_RAIL_SLUGS[i],
      icon: rail?.icon ?? "credit-card",
      description: `${rail?.name ?? P2P_RAIL_SLUGS[i]} account used for P2P settlement.`,
      instructions:
        "Send the exact amount shown on the trade and put the trade reference in the payment description.",
      processingTime: rail?.processingTime ?? "Instant",
      fees: null,
      available: true,
      popularityRank: i,
      isGlobal: false,
      metadata: methodDetails[i],
      railId: rail?.id ?? null,
      createdAt: daysAgo(60),
      updatedAt: daysAgo(6),
    });
  }

  for (const o of P2P_OFFERS) {
    const offerId = uid("p2p", 10 + o.n);
    await ensure(models.p2pOffer, offerId, {
      userId: P[o.persona],
      type: o.type,
      currency: o.currency,
      walletType: "SPOT",
      amountConfig: { total: o.total, min: o.min, max: o.max },
      priceConfig: {
        model: "FIXED",
        value: o.price,
        marketPrice: o.marketPrice,
        finalPrice: o.price,
        currency: o.priceCurrency,
      },
      tradeSettings: {
        autoCancel: 30,
        kycRequired: true,
        visibility: "PUBLIC",
        termsOfTrade: o.terms,
        additionalNotes: "",
      },
      locationSettings: { country: o.country, restrictions: [] },
      userRequirements: {
        minCompletedTrades: 0,
        minSuccessRate: 0,
        minAccountAge: 0,
        trustedOnly: false,
        verifiedOnly: true,
      },
      status: "ACTIVE",
      views: o.views,
      priceCurrency: o.priceCurrency,
      escrowAmount: 0,
      createdAt: daysAgo(o.daysAgo),
      updatedAt: daysAgo(1),
    });

    /*
     * `p2p_offer_payment_method` is a pure join table: the PRIMARY KEY is
     * (offerId, paymentMethodId) and there is NO `id` column, even though the
     * model declares one. `ensure()` looks rows up by primary key, so it cannot
     * be used here - findByPk would emit `WHERE id = ...` and 500. Matched on
     * the real key instead, and torn down by offerId in undo().
     */
    const pmId = uid("p2p", 1 + (o.method - 1));
    const [rows]: any = await sequelize.query(
      "SELECT offerId FROM p2p_offer_payment_method WHERE offerId = ? AND paymentMethodId = ?",
      { replacements: [offerId, pmId] }
    );
    if (rows.length > 0) {
      skipped++;
    } else {
      await sequelize.query(
        "INSERT INTO p2p_offer_payment_method (offerId, paymentMethodId, createdAt, updatedAt) VALUES (?, ?, ?, ?)",
        { replacements: [offerId, pmId, daysAgo(o.daysAgo), daysAgo(o.daysAgo)] }
      );
      bump("p2p_offer_payment_method");
    }
  }

  for (const t of P2P_TRADES) {
    const offer = P2P_OFFERS.find((o) => o.n === t.offer)!;
    const opened = daysAgo(t.daysAgo);
    const paidAt = t.payMinutes > 0 ? minutesAfter(opened, t.payMinutes) : null;
    const completedAt =
      t.status === "COMPLETED" && paidAt ? minutesAfter(paidAt, t.releaseMinutes) : null;
    const fee = m8(t.amount * P2P_FEE_RATE);
    const total = m8(t.amount * offer.price);

    const timeline: any[] = [
      {
        event: "TRADE_INITIATED",
        message: "Trade initiated",
        userId: P[t.buyer],
        createdAt: opened.toISOString(),
      },
    ];
    if (paidAt) {
      timeline.push({
        event: "PAYMENT_CONFIRMED",
        message: "Buyer confirmed payment sent",
        userId: P[t.buyer],
        createdAt: paidAt.toISOString(),
        paymentReference: `NW-P2P-${String(t.n).padStart(4, "0")}`,
      });
    }
    if (completedAt) {
      timeline.push({
        event: "ESCROW_RELEASED",
        message: "Seller released escrow",
        userId: P[t.seller],
        createdAt: completedAt.toISOString(),
      });
    }
    if (t.status === "DISPUTED") {
      timeline.push({
        event: "DISPUTE_OPENED",
        message: "Dispute opened: SELLER_UNRESPONSIVE",
        userId: P[t.buyer],
        previousStatus: "PAYMENT_SENT",
        createdAt: minutesAfter(paidAt ?? opened, 90).toISOString(),
      });
    }
    if (t.status === "CANCELLED") {
      timeline.push({
        event: "TRADE_CANCELLED",
        message: "Buyer cancelled before payment",
        userId: P[t.buyer],
        createdAt: minutesAfter(opened, 24).toISOString(),
      });
    }

    await ensure(models.p2pTrade, uid("p2p", 200 + t.n), {
      offerId: uid("p2p", 10 + t.offer),
      buyerId: P[t.buyer],
      sellerId: P[t.seller],
      userId: P[t.buyer],
      type: offer.type,
      currency: offer.currency,
      amount: t.amount,
      price: offer.price,
      total,
      status: t.status,
      paymentMethod: uid("p2p", 1 + (offer.method - 1)),
      paymentDetails: {
        name: "Bank Transfer",
        instructions: "Put the trade reference in the payment description.",
        processingTime: "Instant",
      },
      timeline,
      terms: offer.terms,
      escrowFee: String(fee),
      escrowTime: "30",
      paymentConfirmedAt: paidAt,
      paymentReference: paidAt ? `NW-P2P-${String(t.n).padStart(4, "0")}` : null,
      escrowAmount: t.status === "COMPLETED" || t.status === "CANCELLED" ? 0 : t.amount,
      escrowStatus:
        t.status === "COMPLETED"
          ? "RELEASED"
          : t.status === "CANCELLED"
            ? "REFUNDED"
            : "HELD",
      completedAt,
      cancelledAt: t.status === "CANCELLED" ? minutesAfter(opened, 24) : null,
      disputedAt: t.status === "DISPUTED" ? minutesAfter(paidAt ?? opened, 90) : null,
      cancelledBy: t.status === "CANCELLED" ? P[t.buyer] : null,
      cancellationReason: t.status === "CANCELLED" ? "Buyer changed their mind before paying" : null,
      createdAt: opened,
      updatedAt: completedAt ?? minutesAfter(opened, 30),
    });
  }

  // Commissions. One per settled trade, written the way settleTradeEscrow
  // writes them: adminId is a Super Admin, amount is the platform fee that was
  // actually taken from the BUYER, and the description carries the same shape.
  const admin = await resolveCommissionAdmin();
  if (admin) {
    let commissionN = 0;
    for (const t of P2P_TRADES) {
      if (t.status !== "COMPLETED") continue;
      commissionN++;
      const offer = P2P_OFFERS.find((o) => o.n === t.offer)!;
      const tradeId = uid("p2p", 200 + t.n);
      const fee = m8(t.amount * P2P_FEE_RATE);
      const settledAt = minutesAfter(daysAgo(t.daysAgo), t.payMinutes + t.releaseMinutes);
      await ensure(models.p2pCommission, uid("p2p", 300 + commissionN), {
        adminId: admin.id,
        amount: fee,
        description: `P2P escrow fee for trade #${tradeId.slice(0, 8)} - ${t.amount} ${offer.currency}`,
        tradeId,
        offerId: uid("p2p", 10 + t.offer),
        createdAt: settledAt,
        updatedAt: settledAt,
      });
    }
  } else {
    console.log("  P2P: no non-owner Super Admin found - commissions skipped");
  }

  for (const r of P2P_REVIEWS) {
    const trade = P2P_TRADES.find((t) => t.n === r.trade)!;
    const at = minutesAfter(daysAgo(trade.daysAgo), trade.payMinutes + trade.releaseMinutes + 30);
    await ensure(models.p2pReview, uid("p2p", 400 + r.n), {
      reviewerId: P[r.reviewer],
      revieweeId: P[r.reviewee],
      userId: P[r.reviewee],
      tradeId: uid("p2p", 200 + r.trade),
      /*
       * THESE COLUMNS ARE PERCENTAGES, NOT STARS.
       *
       * The model documents `0-100 percent` and validates `max: 100`, and the
       * trader-profile reader divides by 20 to draw stars. Writing the 1-5
       * value a reviewer actually picks stores it literally, and a five-star
       * review then renders as 0.3 of a star on every offer card. Authored in
       * stars above because that is what the data means; converted here.
       */
      communicationRating: r.comm * 20,
      speedRating: r.speed * 20,
      trustRating: r.trust * 20,
      comment: r.comment,
      createdAt: at,
      updatedAt: at,
    });
  }

  for (const rel of P2P_RELATIONS) {
    await ensure(models.p2pTraderRelation, uid("p2p", 500 + rel.n), {
      userId: P[rel.user],
      traderId: P[rel.trader],
      type: rel.type,
      note: rel.note,
      createdAt: daysAgo(30 - rel.n),
      updatedAt: daysAgo(30 - rel.n),
    });
  }
}

/**
 * The commission writer uses the OLDEST Super Admin. On this install that is
 * the operator's real personal account, which must never appear in a
 * screenshot, so prefer a synthetic Super Admin and fall back to any Super
 * Admin that is not the protected one. `adminId` is never rendered — the admin
 * revenue views group by the joined TRADE's currency — so the substitution
 * costs nothing.
 */
const PROTECTED_OWNER_EMAIL = "johndoe3dmodeller@gmail.com";

async function resolveCommissionAdmin() {
  const superAdmins = await models.user.findAll({
    include: [{ model: models.role, as: "role", where: { name: "Super Admin" } }],
    order: [["createdAt", "ASC"]],
  });
  const synthetic = superAdmins.find((u: any) => String(u.email ?? "").endsWith("@example.com"));
  if (synthetic) return synthetic;
  return superAdmins.find((u: any) => u.email !== PROTECTED_OWNER_EMAIL) ?? null;
}

// ---------------------------------------------------------------------------
// UNDO
// ---------------------------------------------------------------------------

/** Reverse dependency order: children before the rows they point at. */
const UNDO_ORDER: string[] = [
  // p2p ("p2pOfferPaymentMethod" is handled separately - it has no id column)
  "p2pReview",
  "p2pCommission",
  "p2pTraderRelation",
  "p2pTrade",
  "p2pOffer",
  "p2pPaymentMethod",
  // ecommerce
  "ecommerceUserDiscount",
  "ecommerceShippingAddress",
  "ecommerceOrderItem",
  "ecommerceOrder",
  "ecommerceShipping",
  "ecommerceDiscount",
  "ecommerceProduct",
  // gateway
  "gatewayWebhook",
  "gatewayRefund",
  "gatewayPayout",
  "gatewayPayment",
  "gatewayMerchantBalance",
  "gatewayMerchant",
  // nft
  "nftRoyalty",
  "nftSale",
  "nftBid",
  "nftOffer",
  "nftFavorite",
  "nftListing",
  "nftToken",
  "nftCollection",
  "nftCreator",
  // ico
  "icoTokenVestingRelease",
  "icoTokenVesting",
  "icoTransaction",
  "icoTokenOfferingPhase",
  "icoTokenDetail",
  "icoRoadmapItem",
  "icoTeamMember",
  "icoTokenOffering",
  // staking
  "stakingPosition",
  "stakingDuration",
  "stakingPool",
  // faq
  "faqFeedback",
  "faqSearch",
  "faqQuestion",
  "faq",
  // users last
  "user",
];

async function undo() {
  await undoFaq();

  // The offer/payment-method join carries no `id`, so it is removed by the
  // offer side of its composite key.
  const [, linkMeta]: any = await sequelize.query(
    "DELETE FROM p2p_offer_payment_method WHERE offerId LIKE ? OR offerId LIKE ?",
    { replacements: [ID_LIKE, LEGACY_ID_LIKE] }
  );
  const links = linkMeta?.affectedRows ?? 0;
  if (links > 0) console.log(`  removed ${links} row(s) from p2p_offer_payment_method`);

  for (const modelName of UNDO_ORDER) {
    const model = (models as any)[modelName];
    if (!model) continue;
    const n = await model.destroy({
      where: { id: { [Op.or]: [{ [Op.like]: ID_LIKE }, { [Op.like]: LEGACY_ID_LIKE }] } },
      force: true,
    });
    if (n > 0) console.log(`  removed ${n} row(s) from ${model.getTableName()}`);
  }
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------

async function main() {
  await sequelize.authenticate();

  if (UNDO) {
    console.log("Removing documentation seed data (this script's rows only) ...\n");
    await undo();
    console.log("\nDone. The three placeholder FAQ rows have been restored.");
    process.exit(0);
  }

  console.log("Seeding documentation product/content surfaces ...\n");

  await seedUsers();
  if (wants("faq")) await seedFaq();
  if (wants("staking")) await seedStaking();
  if (wants("ico")) await seedIco();
  if (wants("nft")) await seedNft();
  if (wants("gateway")) await seedGateway();
  if (wants("ecommerce")) await seedEcommerce();
  if (wants("p2p")) await seedP2p();

  const tables = Object.keys(created).sort();
  if (tables.length === 0) {
    console.log("Nothing to do - every row is already present.");
  } else {
    for (const t of tables) console.log(`  ${t.padEnd(32)} +${created[t]}`);
  }
  console.log(`\n${skipped} row(s) already present and left alone.`);
  console.log("Undo with: --undo");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
