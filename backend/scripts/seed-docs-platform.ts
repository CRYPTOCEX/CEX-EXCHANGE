/**
 * Seed the PLATFORM surfaces that photographed empty, for documentation
 * screenshots.
 *
 *   cd backend
 *   npx tsx -r dotenv/config scripts/seed-docs-platform.ts dotenv_config_path=../.env
 *   npx tsx -r dotenv/config scripts/seed-docs-platform.ts dotenv_config_path=../.env --undo
 *   npx tsx -r dotenv/config scripts/seed-docs-platform.ts dotenv_config_path=../.env --only=agents,blocks
 *
 * `--only` narrows the SEED. `--undo` ignores it and removes everything this
 * script has ever written, deliberately: a partial teardown leaves foreign keys
 * pointing at rows that are about to disappear.
 *
 * ---------------------------------------------------------------------------
 * WHAT IT COVERS, AND WHAT IT CANNOT
 * ---------------------------------------------------------------------------
 * Six routes came back from the screenshot pass showing an empty state. Five of
 * them are filled here:
 *
 *   /admin/ai/binary-engine/cooldowns  binary_ai_engine_user_cooldown
 *   /admin/ai/support/agents           ai_support_agent
 *   /admin/mailwizard/block            mailwizard_block
 *   /admin/system/database/backup      FILES in backend/backup, not a table
 *   /blog/author/manage                author + category + post, owned by Ava
 *
 * The sixth, /hb/console, is NOT seeded and cannot honestly be. See the block
 * comment "WHY /hb/console IS NOT HERE" at the bottom of this file.
 *
 * ---------------------------------------------------------------------------
 * THE ROWS OBEY THE ENGINE'S OWN ARITHMETIC
 * ---------------------------------------------------------------------------
 * A reader who notices a number that does not follow the product's own rules
 * has learned to distrust the documentation, so the cooldown rows are derived
 * from `utils/tiers/CooldownManager.ts` rather than invented:
 *
 *   BIG_WIN  triggerAmount is the WIN, and must clear the engine's
 *            `bigWinThreshold`; the penalty is the engine's
 *            `cooldownWinRateReduction`; the window is exactly
 *            `cooldownDurationMinutes`.
 *   STREAK   triggerAmount is the STREAK LENGTH, not money — `applyStreakCooldown`
 *            passes `streak` into the `amount` parameter — and must clear
 *            `streakThreshold` (default 3). The window is
 *            `streakCooldownDuration` (default 30 minutes; neither column exists
 *            on this schema, so `int(engine.streakCooldownDuration, 30)` in
 *            BinaryAiEngine.ts always falls back).
 *   MANUAL   triggerAmount is 0 — `applyManualCooldown` hard-codes it — and both
 *            the penalty and the duration are the operator's choice.
 *
 * One further invariant, and it is the one a careless seed breaks:
 * `upsertCooldown` REFRESHES an existing active-and-unexpired cooldown of the
 * same reason rather than inserting a second one. So no user here holds two
 * live rows of the same reason at once. Several hold an expired one alongside a
 * live one of a different reason, which is what the table looks like in use.
 *
 * ---------------------------------------------------------------------------
 * COOLDOWN ROWS AGE OUT. RE-RUN BEFORE THE SHOOT.
 * ---------------------------------------------------------------------------
 * A BIG_WIN cooldown lasts 60 minutes and a STREAK one lasts 30, because that
 * is what the engine does — so "38m left" becomes "Expired" within the hour and
 * no static seed can prevent it. The cooldown rows are therefore RE-ANCHORED on
 * every run (same ids, refreshed `startsAt`/`expiresAt`), so the fix is to run
 * this script again shortly before capturing that one page. Everything else is
 * create-if-absent and a re-run is a no-op.
 *
 * ---------------------------------------------------------------------------
 * IDEMPOTENT AND REVERSIBLE, BY CONSTRUCTION
 * ---------------------------------------------------------------------------
 * Every row carries a primary key of the shape `d0cb<area>-0000-4000-8000-<n>`.
 * A random uuid cannot produce those fixed middle groups, so `--undo` is
 * `DELETE ... WHERE id LIKE 'd0cb%-0000-4000-8000-%'` per table, in reverse
 * dependency order, with `force: true` so paranoid models really go.
 *
 * The neighbouring documentation seeders own disjoint patterns and must keep
 * owning them — a seeder that sweeps a bare four-character prefix deletes
 * somebody else's product (that has happened here before; see the note on
 * ID_PREFIX in seed-docs-products.ts):
 *
 *   scripts/seed-docs-demo.ts      `d1000002-0000-...`
 *   scripts/seed-docs-trading.ts   `d0c5xxxx-7d1a-4...`
 *   scripts/seed-docs-products.ts  `d0c9<area>-0000-4000-8000-<n>`
 *   THIS FILE                      `d0cb<area>-0000-4000-8000-<n>`
 *
 * The database-backup area is the one that is not rows: it writes FILES into
 * `backend/backup`, because that is what the route reads. See `seedBackups()`
 * for why the filename has no room for a marker and where the marker lives
 * instead.
 *
 * ---------------------------------------------------------------------------
 * WHAT IT WILL NOT TOUCH
 * ---------------------------------------------------------------------------
 * johndoe3dmodeller@gmail.com — the owner's real personal account. Nothing here
 * writes or deletes outside this script's own id namespace, with two named
 * exceptions that are READS: the docs-demo customer (Ava Thornton, who owns the
 * blog author profile because /blog/author/manage is photographed as her) and
 * the install's existing binary AI engine, which the cooldown rows point at
 * because a cooldown cannot exist without one.
 */

import { models, sequelize } from "@b/db";
import { Op } from "sequelize";
import { hashPassword } from "@b/utils/passwords";
import { format } from "date-fns";
import fs from "fs";
import path from "path";

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

const AREAS = ["users", "cooldowns", "agents", "blocks", "blog", "backups"] as const;
type Area = (typeof AREAS)[number];

function wants(area: Area): boolean {
  if (!ONLY) return true;
  // The trader personas are a hard dependency of the cooldown rows.
  if (area === "users") return true;
  return ONLY.has(area);
}

/** The one account that must never be read, written or photographed. */
const FORBIDDEN_EMAIL = "johndoe3dmodeller@gmail.com";
const TRADER_PASSWORD = "DocsShots#2026";

/** The docs-demo customer. Owns the blog author profile — see seed-docs-demo.ts. */
const AVA_EMAIL = "ava.thornton@example.com";

// ---------------------------------------------------------------------------
// Ids
// ---------------------------------------------------------------------------

const ID_PREFIX = "d0cb";
const ID_LIKE = "d0cb%-0000-4000-8000-%";

const AREA_CODE = {
  user: "0001",
  cooldown: "0002",
  agent: "0003",
  block: "0004",
  blogcat: "0005",
  blogpost: "0006",
  blogauthor: "0007",
} as const;

function uid(area: keyof typeof AREA_CODE, n: number): string {
  return `${ID_PREFIX}${AREA_CODE[area]}-0000-4000-8000-${String(n).padStart(12, "0")}`;
}

// ---------------------------------------------------------------------------
// Time. DATETIME columns on this platform are UTC and the arithmetic below is
// absolute, so every offset is an offset from the moment of the run.
// ---------------------------------------------------------------------------

const NOW = new Date();
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

const minutesAgo = (n: number) => new Date(NOW.getTime() - n * MIN);
const hoursAgo = (n: number) => new Date(NOW.getTime() - n * HOUR);
const daysAgo = (n: number) => new Date(NOW.getTime() - n * DAY);
/** `from` plus `minutes`, so a window's END is always derived from its START. */
const plusMinutes = (from: Date, minutes: number) =>
  new Date(from.getTime() + minutes * MIN);

// ---------------------------------------------------------------------------
// Write helpers
// ---------------------------------------------------------------------------

const created: Record<string, number> = {};
let skipped = 0;

function bump(label: string, n = 1) {
  created[label] = (created[label] ?? 0) + n;
}

/**
 * Create the row if its primary key is not already present.
 *
 * `paranoid: false` on the lookup matters: a soft-deleted twin still occupies
 * the primary key, so a plain findByPk would miss it and the create would then
 * fail on a duplicate key.
 *
 * A back-dated `createdAt` in `values` is honoured; a back-dated `updatedAt` is
 * NOT — Sequelize stamps it at insert time regardless. None of the six screens
 * this script feeds renders `updatedAt`, so the values below still state the
 * intended age for anyone reading the seed, but do not expect to read them back.
 */
async function ensure(model: any, id: string, values: Record<string, any>) {
  const existing = await model.findByPk(id, { paranoid: false });
  if (existing) {
    skipped++;
    return existing;
  }
  const row = await model.create({ id, ...values });
  bump(model.getTableName());
  return row;
}

/**
 * Create the row, or overwrite the fields of an existing one.
 *
 * Used ONLY for cooldowns, whose whole meaning is a live countdown — see the
 * header. Everything else is `ensure`, so a re-run cannot churn content an
 * operator may have edited.
 */
async function refresh(model: any, id: string, values: Record<string, any>) {
  const existing = await model.findByPk(id, { paranoid: false });
  if (existing) {
    await existing.update(values);
    bump(`${model.getTableName()} (re-anchored)`);
    return existing;
  }
  const row = await model.create({ id, ...values });
  bump(model.getTableName());
  return row;
}

// ===========================================================================
// AREA: trader personas
// ===========================================================================

/**
 * WHY THIS SCRIPT MINTS ITS OWN USERS RATHER THAN BORROWING THE OTHER SEEDERS'.
 *
 * `binary_ai_engine_user_cooldown.userId` is a foreign key with ON DELETE NO
 * ACTION. Pointing a cooldown at a persona owned by seed-docs-products would
 * mean that script's `--undo` fails with a constraint error until this one has
 * run first — a coupling between two independent seeders that nothing declares
 * and nobody would expect. Six accounts of our own cost one argon2 hash and
 * leave both teardowns independent.
 */
interface Trader {
  n: number;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  country: string;
}

const TRADERS: Trader[] = [
  { n: 1, email: "dara.whitfield@example.com", username: "dara_whitfield", firstName: "Dara", lastName: "Whitfield", country: "IE" },
  { n: 2, email: "kenji.mori@example.com", username: "kenji_mori", firstName: "Kenji", lastName: "Mori", country: "JP" },
  { n: 3, email: "alina.kovacs@example.com", username: "alina_kovacs", firstName: "Alina", lastName: "Kovacs", country: "HU" },
  { n: 4, email: "rafael.duarte@example.com", username: "rafael_duarte", firstName: "Rafael", lastName: "Duarte", country: "BR" },
  { n: 5, email: "ingrid.sollberg@example.com", username: "ingrid_sollberg", firstName: "Ingrid", lastName: "Sollberg", country: "NO" },
  { n: 6, email: "tunde.adeyemi@example.com", username: "tunde_adeyemi", firstName: "Tunde", lastName: "Adeyemi", country: "NG" },
];

const T: Record<number, string> = {};
for (const t of TRADERS) T[t.n] = uid("user", t.n);

async function seedTraders() {
  const userRole = await models.role.findOne({ where: { name: "User" } });
  if (!userRole) throw new Error("No 'User' role found - cannot seed trader personas");

  let hashed: string | null = null;
  for (const t of TRADERS) {
    const id = uid("user", t.n);
    const existing = await models.user.findByPk(id, { paranoid: false });
    if (existing) {
      skipped++;
      continue;
    }
    // Hash once, lazily: argon2 is deliberately slow and a re-run does none.
    if (!hashed) hashed = await hashPassword(TRADER_PASSWORD);
    await models.user.create({
      id,
      email: t.email,
      password: hashed,
      firstName: t.firstName,
      lastName: t.lastName,
      username: t.username,
      emailVerified: true,
      roleId: userRole.id,
      status: "ACTIVE",
      lastLogin: hoursAgo(2 + t.n),
      profile: { bio: "", location: { country: t.country }, social: {} },
      createdAt: daysAgo(300 - t.n * 11),
      updatedAt: hoursAgo(2 + t.n),
    });
    bump("user");
  }
}

// ===========================================================================
// AREA: binary AI engine user cooldowns
// ===========================================================================

/**
 * A cooldown cannot exist without an engine — `engineId` is a NOT NULL foreign
 * key onto `binary_ai_engine`, whose own `marketMakerId` is a UNIQUE foreign
 * key onto `ai_market_maker`. Minting an engine here would therefore mean
 * claiming one of the install's market makers, which is a live trading object.
 * The cooldown page does not need that, so this attaches to whatever engine the
 * install already has and says so plainly if there is none.
 */
async function resolveEngine(): Promise<{ id: string; config: any } | null> {
  const engine: any = await models.binaryAiEngine.findOne({
    order: [["createdAt", "ASC"]],
  });
  if (!engine) return null;
  return {
    id: engine.id,
    config: {
      // DECIMAL comes back as a STRING from MySQL. Number() it before comparing,
      // or `"1000.00000000" > 900` compares as text.
      bigWinThreshold: Number(engine.bigWinThreshold),
      cooldownDurationMinutes: Number(engine.cooldownDurationMinutes),
      cooldownWinRateReduction: Number(engine.cooldownWinRateReduction),
      // Neither column exists on this schema; BinaryAiEngine.ts falls back to
      // exactly these two defaults via `int(engine.x, n)`.
      streakThreshold: Number(engine.streakThreshold ?? 3),
      streakCooldownDuration: Number(engine.streakCooldownDuration ?? 30),
    },
  };
}

interface CooldownSeed {
  n: number;
  trader: number;
  reason: "BIG_WIN" | "STREAK" | "MANUAL";
  /** BIG_WIN: a win in quote currency. STREAK: a streak length. MANUAL: 0. */
  trigger: number;
  /** Minutes before now that the cooldown started. */
  startedMinutesAgo: number;
  /** Only MANUAL chooses these two; BIG_WIN/STREAK take them from the engine. */
  manualMinutes?: number;
  manualReduction?: number;
  /** False once the expiry sweep has marked it dead. */
  isActive: boolean;
}

const COOLDOWNS: CooldownSeed[] = [
  // --- live --------------------------------------------------------------
  { n: 1, trader: 1, reason: "BIG_WIN", trigger: 2450, startedMinutesAgo: 22, isActive: true },
  { n: 2, trader: 2, reason: "BIG_WIN", trigger: 1180.5, startedMinutesAgo: 9, isActive: true },
  { n: 3, trader: 2, reason: "MANUAL", trigger: 0, startedMinutesAgo: 120, manualMinutes: 1440, manualReduction: 0.25, isActive: true },
  { n: 4, trader: 3, reason: "STREAK", trigger: 5, startedMinutesAgo: 12, isActive: true },
  { n: 5, trader: 5, reason: "STREAK", trigger: 3, startedMinutesAgo: 3, isActive: true },
  { n: 6, trader: 6, reason: "MANUAL", trigger: 0, startedMinutesAgo: 30, manualMinutes: 360, manualReduction: 0.3, isActive: true },
  // --- expired, not yet swept. `deactivateExpiredCooldowns` runs on a timer,
  //     so this state is real and the table shows it several times a day -----
  { n: 7, trader: 4, reason: "BIG_WIN", trigger: 1620.75, startedMinutesAgo: 70, isActive: true },
  // --- expired and swept --------------------------------------------------
  { n: 8, trader: 1, reason: "STREAK", trigger: 4, startedMinutesAgo: 5 * 60, isActive: false },
  { n: 9, trader: 3, reason: "BIG_WIN", trigger: 3200, startedMinutesAgo: 2 * 24 * 60, isActive: false },
  { n: 10, trader: 4, reason: "MANUAL", trigger: 0, startedMinutesAgo: 6 * 24 * 60, manualMinutes: 1440, manualReduction: 0.15, isActive: false },
  { n: 11, trader: 5, reason: "BIG_WIN", trigger: 5400, startedMinutesAgo: 9 * 24 * 60, isActive: false },
  { n: 12, trader: 6, reason: "BIG_WIN", trigger: 1025.4, startedMinutesAgo: 14 * 24 * 60, isActive: false },
];

async function seedCooldowns(): Promise<string | null> {
  const engine = await resolveEngine();
  if (!engine) {
    return "no binary_ai_engine row exists on this install, and one cannot be minted without claiming an ai_market_maker";
  }

  const cfg = engine.config;
  const liveByReason = new Map<string, string>();

  for (const c of COOLDOWNS) {
    const startsAt = minutesAgo(c.startedMinutesAgo);

    let durationMinutes: number;
    let reduction: number;
    if (c.reason === "MANUAL") {
      durationMinutes = c.manualMinutes as number;
      reduction = c.manualReduction as number;
    } else if (c.reason === "BIG_WIN") {
      durationMinutes = cfg.cooldownDurationMinutes;
      reduction = cfg.cooldownWinRateReduction;
      if (c.trigger < cfg.bigWinThreshold) {
        throw new Error(
          `cooldown #${c.n}: a BIG_WIN of ${c.trigger} does not clear the engine's bigWinThreshold of ${cfg.bigWinThreshold} — the engine would never have applied it`
        );
      }
    } else {
      durationMinutes = cfg.streakCooldownDuration;
      reduction = cfg.cooldownWinRateReduction;
      if (c.trigger < cfg.streakThreshold) {
        throw new Error(
          `cooldown #${c.n}: a streak of ${c.trigger} does not clear streakThreshold ${cfg.streakThreshold}`
        );
      }
    }

    const expiresAt = plusMinutes(startsAt, durationMinutes);

    /*
     * The invariant `upsertCooldown` enforces, asserted here rather than
     * trusted: at most ONE live-and-unexpired cooldown per (user, reason). A
     * second one is a row the engine could not have produced, and an operator
     * who knows the product would spot it.
     */
    if (c.isActive && expiresAt > NOW) {
      const key = `${c.trader}:${c.reason}`;
      if (liveByReason.has(key)) {
        throw new Error(
          `cooldown #${c.n}: trader ${c.trader} already holds a live ${c.reason} cooldown (#${liveByReason.get(key)}); upsertCooldown would have refreshed it, not inserted a second row`
        );
      }
      liveByReason.set(key, String(c.n));
    }

    await refresh(models.binaryAiEngineUserCooldown, uid("cooldown", c.n), {
      engineId: engine.id,
      userId: T[c.trader],
      reason: c.reason,
      triggerOrderId: null,
      triggerAmount: c.trigger,
      winRateReduction: reduction,
      startsAt,
      expiresAt,
      isActive: c.isActive,
      createdAt: startsAt,
      // A swept row was last touched when the sweep ran, i.e. at expiry.
      updatedAt: c.isActive ? startsAt : expiresAt,
    });
  }

  return null;
}

// ===========================================================================
// AREA: AI support agents
// ===========================================================================

/**
 * ONLY THE OLDEST ACTIVE AGENT ANSWERS, and the page says so in a banner.
 *
 * `getActiveAgent()` is `findOne({ where: { status: true }, order: createdAt
 * ASC })`. So exactly one row here is active, it is the oldest, and it is the
 * only one whose persona can ever reach a customer. Every other row is inert by
 * construction — which is precisely the picture the banner describes and
 * therefore the one worth photographing.
 *
 * The active one is COPILOT: it drafts and a human presses Send. `autonomy` is
 * otherwise raised from the dashboard behind a server-side evidence gate
 * (reviewed drafts, unedited-send rate), and a seeder must not hand an
 * autonomous agent to an install that has not passed it. The AUTO_TICKET and
 * AUTO_ALL rows below are all INACTIVE, so none of them can act.
 *
 * `model` is a MashDiv AI tier or null, never a vendor id: null means "inherit
 * from Settings", and a vendor id is exactly what the model select exists to
 * keep off this screen.
 *
 * NOTE: the persona sits inside a cached prompt prefix that the admin routes
 * clear with `invalidateInstallProfile()`. A script writing straight to the
 * model cannot reach that cache in the running backend — the agents LIST reads
 * the database and is correct immediately, but restart the backend before
 * judging what the assistant SAYS.
 */
interface AgentSeed {
  n: number;
  name: string;
  slug: string;
  persona: string[];
  disclosureText: string | null;
  model: string | null;
  effort: "low" | "medium" | "high" | "xhigh" | "max" | null;
  maxTokens: number;
  autonomy: "COPILOT" | "AUTO_TICKET" | "AUTO_ALL";
  channels: string[];
  languages: string[];
  timezone: string;
  status: boolean;
  createdDaysAgo: number;
}

const AGENTS: AgentSeed[] = [
  {
    n: 1,
    name: "Aria",
    slug: "aria-front-desk",
    persona: [
      "You are the front-desk support assistant for this trading platform.",
      "",
      "Answer only from the documentation and articles you are given. If they do not cover the question, say so plainly and hand over to a human rather than guessing — a wrong answer about money or account access costs far more than a slow one.",
      "",
      "Be brief. Two or three sentences is usually right. Link to the page you took the answer from.",
      "",
      "Never state fees, limits, processing times or supported countries from memory. Those are set by this operator and change; if they are not in the documentation you were given, escalate.",
      "",
      "Never ask for a password, a 2FA code, a seed phrase or a private key. No one at this company will ever ask for those, and you should say so if a customer offers one.",
    ],
    disclosureText:
      "You are chatting with an AI assistant. Ask for a human at any time and one will take over.",
    model: null,
    effort: null,
    maxTokens: 4000,
    autonomy: "COPILOT",
    channels: ["chat", "ticket"],
    languages: ["en"],
    timezone: "UTC",
    status: true,
    createdDaysAgo: 96,
  },
  {
    n: 2,
    name: "Ledger",
    slug: "ledger-deposits-withdrawals",
    persona: [
      "You handle deposit and withdrawal questions only.",
      "",
      "Establish three facts before advising anything: which asset, which network, and whether the money is arriving or leaving. Most tickets in this queue are a network mismatch, and the advice for the two directions is not the same.",
      "",
      "Confirmation counts, fees and processing windows are configured per install. Quote them only from the documentation you were given, never from memory.",
      "",
      "You may not tell a customer a transaction will be recovered. Describe what the recovery process is and hand the ticket to a human.",
    ],
    disclosureText:
      "You are chatting with an AI assistant. Ask for a human at any time and one will take over.",
    model: "mashdiv-core",
    effort: "medium",
    maxTokens: 6000,
    autonomy: "AUTO_TICKET",
    channels: ["ticket"],
    languages: ["en", "es"],
    timezone: "Europe/Lisbon",
    status: false,
    createdDaysAgo: 71,
  },
  {
    n: 3,
    name: "Atlas",
    slug: "atlas-onboarding",
    persona: [
      "You help brand-new accounts take their first three steps: verify the email, complete identity verification, and make a first deposit.",
      "",
      "Assume no prior knowledge. Expand an acronym the first time you use it. One step per reply — a wall of instructions is how a new customer abandons onboarding.",
      "",
      "Verification outcomes are not yours to predict. Describe what happens next and how long the queue usually takes according to the documentation, and stop there.",
    ],
    disclosureText: null,
    model: "mashdiv-lite",
    effort: "low",
    maxTokens: 4000,
    autonomy: "COPILOT",
    channels: ["chat"],
    languages: ["en"],
    timezone: "UTC",
    status: false,
    createdDaysAgo: 54,
  },
  {
    n: 4,
    name: "Kestrel",
    slug: "kestrel-account-security",
    persona: [
      "You answer questions about account security: two-factor authentication, sessions, API keys and suspicious-activity reports.",
      "",
      "Treat every message in this queue as potentially written by someone who is not the account holder. Never confirm whether an email address has an account, never read back part of a phone number, and never describe what a specific account holds.",
      "",
      "If a customer reports losing access to their 2FA device, do not attempt to resolve it. Explain that recovery is handled by a human with an identity check, and escalate.",
      "",
      "Nobody at this company will ever ask for a password, a 2FA code, a seed phrase or a private key. Say so, unprompted, whenever the conversation goes near that subject.",
    ],
    disclosureText:
      "You are chatting with an AI assistant. Anything to do with account recovery is handled by a person — ask for a human at any time.",
    model: null,
    effort: "high",
    maxTokens: 8000,
    autonomy: "COPILOT",
    channels: ["chat", "ticket"],
    languages: ["en"],
    timezone: "UTC",
    status: false,
    createdDaysAgo: 33,
  },
  {
    n: 5,
    name: "Vega",
    slug: "vega-after-hours",
    persona: [
      "You cover the desk outside staffed hours.",
      "",
      "Your job is to answer what the documentation plainly covers and to hold everything else until the desk reopens. Say when that is. A customer told 'someone will pick this up at 08:00 UTC' is better served than one given a confident guess at 02:00.",
      "",
      "Anything involving a balance, a withdrawal that has not arrived, or a locked account waits for a human. Acknowledge it, record the detail, and stop.",
    ],
    disclosureText:
      "The desk is closed right now. You are chatting with an AI assistant; a person will pick this up when the desk reopens.",
    model: "mashdiv-max",
    effort: "xhigh",
    maxTokens: 12000,
    autonomy: "AUTO_ALL",
    channels: ["chat", "ticket", "email"],
    languages: ["en", "de", "fr"],
    timezone: "Asia/Singapore",
    status: false,
    createdDaysAgo: 12,
  },
];

async function seedAgents() {
  const live = AGENTS.filter((a) => a.status);
  if (live.length !== 1) {
    throw new Error(
      `exactly one agent may be active — getActiveAgent() serves the OLDEST active row and every other one is inert, so ${live.length} active rows would be a picture the product cannot produce`
    );
  }
  const oldest = [...AGENTS].sort((a, b) => b.createdDaysAgo - a.createdDaysAgo)[0];
  if (live[0].n !== oldest.n) {
    throw new Error(
      "the active agent must be the OLDEST row, or the one shown as active is not the one that would answer"
    );
  }

  for (const a of AGENTS) {
    const createdAt = daysAgo(a.createdDaysAgo);
    await ensure(models.aiSupportAgent, uid("agent", a.n), {
      name: a.name,
      slug: a.slug,
      avatar: null,
      persona: a.persona.join("\n"),
      disclosureText: a.disclosureText,
      model: a.model,
      effort: a.effort,
      maxTokens: a.maxTokens,
      autonomy: a.autonomy,
      toolsEnabled: null,
      channels: a.channels,
      languages: a.languages,
      // Written by the admin routes and read by NOTHING — office hours live in
      // the `aiSupportOfficeHours*` settings keys. Left null so this seed does
      // not manufacture a second source for a fact that already has one.
      workingHours: null,
      timezone: a.timezone,
      status: a.status,
      createdAt,
      updatedAt: createdAt,
    });
  }
}

// ===========================================================================
// AREA: Mailwizard reusable blocks
// ===========================================================================

/**
 * `design` is not free text — it is the JSON the Unlayer editor loads.
 *
 * The Blocks panel takes an array of ROW objects (one entry of
 * `design.body.rows`), and `block/create/page.tsx` stores
 * `{ body: { rows, values } }`. Hand either side the wrong depth and it fails
 * SILENTLY: a whole design in the `blocks` option renders an empty panel, and a
 * bare row passed to `loadDesign` opens the editor blank. So every block here is
 * built by `row()` below, in the shape the editor emits, and stored at the depth
 * the create page uses.
 */
let contentSeq = 0;
function content(type: string, values: Record<string, any>) {
  contentSeq++;
  return {
    id: `docsblk${String(contentSeq).padStart(4, "0")}`,
    type,
    values: {
      containerPadding: "10px",
      anchor: "",
      hideDesktop: false,
      displayCondition: null,
      _meta: {
        htmlID: `u_content_${type}_${contentSeq}`,
        htmlClassNames: `u_content_${type}`,
      },
      selectable: true,
      draggable: true,
      duplicatable: true,
      deletable: true,
      hideable: true,
      ...values,
    },
  };
}

const LINK_STYLE = {
  inherit: true,
  linkColor: "#2563eb",
  linkHoverColor: "#2563eb",
  linkUnderline: true,
  linkHoverUnderline: true,
};

function text(html: string, extra: Record<string, any> = {}) {
  return content("text", {
    fontSize: "14px",
    textAlign: "left",
    lineHeight: "160%",
    linkStyle: LINK_STYLE,
    text: html,
    ...extra,
  });
}

function heading(html: string, headingType = "h2", fontSize = "22px") {
  return content("heading", {
    headingType,
    fontSize,
    textAlign: "left",
    lineHeight: "140%",
    linkStyle: LINK_STYLE,
    text: html,
  });
}

function button(label: string, href: string, background = "#2563eb") {
  return content("button", {
    href: { name: "web", values: { href, target: "_blank" } },
    buttonColors: {
      color: "#FFFFFF",
      backgroundColor: background,
      hoverColor: "#FFFFFF",
      hoverBackgroundColor: background,
    },
    size: { autoWidth: true, width: "100%" },
    fontSize: "14px",
    textAlign: "center",
    lineHeight: "120%",
    padding: "12px 24px",
    border: {},
    borderRadius: "6px",
    text: `<span style="line-height: 16.8px;">${label}</span>`,
  });
}

function divider() {
  return content("divider", {
    width: "100%",
    border: {
      borderTopWidth: "1px",
      borderTopStyle: "solid",
      borderTopColor: "#e5e7eb",
    },
    textAlign: "center",
  });
}

let rowSeq = 0;
function row(cells: number[], columns: any[][], values: Record<string, any> = {}) {
  rowSeq++;
  return {
    id: `docsrow${String(rowSeq).padStart(3, "0")}`,
    cells,
    columns: columns.map((contents, i) => ({
      id: `docscol${String(rowSeq).padStart(3, "0")}${i}`,
      contents,
      values: {
        backgroundColor: "",
        padding: "0px",
        border: {},
        borderRadius: "0px",
        _meta: { htmlID: `u_column_${rowSeq}${i}`, htmlClassNames: "u_column" },
      },
    })),
    values: {
      displayCondition: null,
      columns: false,
      backgroundColor: "",
      columnsBackgroundColor: "",
      backgroundImage: {
        url: "",
        fullWidth: true,
        repeat: "no-repeat",
        size: "custom",
        position: "center",
      },
      padding: "16px",
      anchor: "",
      hideDesktop: false,
      _meta: { htmlID: `u_row_${rowSeq}`, htmlClassNames: "u_row" },
      selectable: true,
      draggable: true,
      duplicatable: true,
      deletable: true,
      hideable: true,
      ...values,
    },
  };
}

/** Stored exactly as `block/create/page.tsx` stores it. */
function design(...rows: any[]) {
  return JSON.stringify({ body: { rows, values: {} } });
}

interface BlockSeed {
  n: number;
  name: string;
  category: string;
  build: () => string;
  createdDaysAgo: number;
}

const BLOCKS: BlockSeed[] = [
  {
    n: 1,
    name: "Brand header — logo and tagline",
    category: "Headers",
    createdDaysAgo: 128,
    build: () =>
      design(
        row(
          [1],
          [
            [
              heading("<span>Your exchange</span>", "h1", "28px"),
              text('<p style="color:#6b7280;">Markets, wallets and settlement in one account.</p>'),
            ],
          ],
          { backgroundColor: "#f8fafc" }
        )
      ),
  },
  {
    n: 2,
    name: "Announcement bar",
    category: "Headers",
    createdDaysAgo: 121,
    build: () =>
      design(
        row(
          [1],
          [
            [
              text(
                '<p style="text-align:center;color:#ffffff;font-weight:600;">Scheduled maintenance this Sunday, 02:00-04:00 UTC. Trading is unaffected.</p>',
                { containerPadding: "8px" }
              ),
            ],
          ],
          { backgroundColor: "#1e293b", padding: "0px" }
        )
      ),
  },
  {
    n: 3,
    name: "Hero — headline, blurb, primary button",
    category: "Content",
    createdDaysAgo: 117,
    build: () =>
      design(
        row([1], [
          [
            heading("<span>Your account is ready</span>", "h2", "24px"),
            text("<p>Finish verification to raise your daily limits and unlock fiat withdrawals. It usually takes a few minutes.</p>"),
            button("Complete verification", "https://example.com/user/profile"),
          ],
        ])
      ),
  },
  {
    n: 4,
    name: "Two-column feature",
    category: "Content",
    createdDaysAgo: 110,
    build: () =>
      design(
        row([1, 1], [
          [
            heading("<span>Spot</span>", "h3", "18px"),
            text("<p>Limit, market and stop orders on every listed pair.</p>"),
          ],
          [
            heading("<span>Earn</span>", "h3", "18px"),
            text("<p>Fixed-term staking with the rate agreed at the time you lock.</p>"),
          ],
        ])
      ),
  },
  {
    n: 5,
    name: "Market snapshot table",
    category: "Content",
    createdDaysAgo: 96,
    build: () =>
      design(
        row([1], [
          [
            heading("<span>This week on your watchlist</span>", "h3", "18px"),
            text(
              '<table style="width:100%;border-collapse:collapse;"><tr><td style="padding:6px 0;">BTC/USDT</td><td style="text-align:right;padding:6px 0;">+2.4%</td></tr><tr><td style="padding:6px 0;">ETH/USDT</td><td style="text-align:right;padding:6px 0;">-1.1%</td></tr><tr><td style="padding:6px 0;">SOL/USDT</td><td style="text-align:right;padding:6px 0;">+5.8%</td></tr></table>'
            ),
          ],
        ])
      ),
  },
  {
    n: 6,
    name: "Deposit call to action",
    category: "Calls to action",
    createdDaysAgo: 88,
    build: () =>
      design(
        row(
          [1],
          [
            [
              heading("<span>Fund your account</span>", "h3", "20px"),
              text("<p>Deposits credit automatically once the network confirms them.</p>"),
              button("Make a deposit", "https://example.com/finance/deposit", "#16a34a"),
            ],
          ],
          { backgroundColor: "#f0fdf4" }
        )
      ),
  },
  {
    n: 7,
    name: "Referral promotion",
    category: "Calls to action",
    createdDaysAgo: 74,
    build: () =>
      design(
        row(
          [1],
          [
            [
              heading("<span>Invite a friend</span>", "h3", "20px"),
              text("<p>Share your referral link and earn a share of their trading fees for as long as they trade.</p>"),
              button("Get my link", "https://example.com/affiliate", "#7c3aed"),
            ],
          ],
          { backgroundColor: "#faf5ff" }
        )
      ),
  },
  {
    n: 8,
    name: "Security notice",
    category: "Notices",
    createdDaysAgo: 61,
    build: () =>
      design(
        row(
          [1],
          [
            [
              text(
                '<p style="color:#7f1d1d;"><strong>We will never ask for your password, 2FA code, seed phrase or private key.</strong> If a message asks for any of them, it is not from us.</p>'
              ),
            ],
          ],
          { backgroundColor: "#fef2f2" }
        )
      ),
  },
  {
    n: 9,
    name: "Support footer",
    category: "Footers",
    createdDaysAgo: 47,
    build: () =>
      design(
        row([1], [
          [
            divider(),
            text(
              '<p style="text-align:center;color:#6b7280;font-size:12px;">Need a hand? Reply to this email or open a ticket from your account.</p>'
            ),
          ],
        ])
      ),
  },
  {
    n: 10,
    name: "Legal and unsubscribe footer",
    category: "Footers",
    createdDaysAgo: 39,
    build: () =>
      design(
        row([1], [
          [
            divider(),
            text(
              '<p style="text-align:center;color:#9ca3af;font-size:11px;">You are receiving this because you hold an account with us.<br /><a href="{{unsubscribeUrl}}">Unsubscribe</a> from marketing email. Service notices are always sent.</p>'
            ),
          ],
        ])
      ),
  },
];

async function seedBlocks() {
  for (const b of BLOCKS) {
    const createdAt = daysAgo(b.createdDaysAgo);
    const stored = b.build();
    // Fail loudly rather than storing a design the editor would silently
    // refuse: a row-less block renders an empty Blocks panel and no error.
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed?.body?.rows) || parsed.body.rows.length === 0) {
      throw new Error(
        `block "${b.name}" produced no rows — the editor's Blocks panel would render nothing`
      );
    }
    await ensure(models.mailwizardBlock, uid("block", b.n), {
      name: b.name,
      category: b.category,
      design: stored,
      createdAt,
      updatedAt: createdAt,
    });
  }
}

// ===========================================================================
// AREA: blog — Ava's author profile and her posts
// ===========================================================================

/**
 * /blog/author/manage renders `GET /api/blog/author`, which is
 * `author.findOne({ where: { userId: <session user> }, include: posts })` and
 * 404s when there is no author row. So the page is empty for exactly one
 * reason: the account it is photographed as is not an author yet.
 *
 * The posts therefore belong to AVA, not to a persona of this script's own —
 * putting them anywhere else would leave the screenshot unchanged.
 */
interface PostSeed {
  n: number;
  title: string;
  slug: string;
  category: 1 | 2 | 3;
  status: "PUBLISHED" | "DRAFT";
  description: string;
  content: string;
  views: number;
  daysAgo: number;
}

const BLOG_CATEGORIES = [
  {
    n: 1,
    name: "Getting Started",
    slug: "getting-started",
    description: "First steps: opening an account, verification and your first deposit.",
    from: "#1d4ed8",
    to: "#0ea5e9",
  },
  {
    n: 2,
    name: "Market Notes",
    slug: "market-notes",
    description: "Weekly reads on liquidity, spreads and what moved.",
    from: "#0f766e",
    to: "#65a30d",
  },
  {
    n: 3,
    name: "Account Security",
    slug: "account-security",
    description: "Keys, sessions, two-factor authentication and staying out of trouble.",
    from: "#6d28d9",
    to: "#be123c",
  },
];

/**
 * COVER IMAGES ARE GENERATED, one per category.
 *
 * The card is `<Image src={post.image || "/placeholder.svg"} />`, and the
 * placeholder is an SVG — which next/image answers with a 400 on this platform,
 * so "leave it null" is not a neutral choice, it is a broken image on every
 * card. The three files this install already carries under
 * `uploads/blog/posts` are worse still for documentation: two are the same
 * marketing screenshot with a Windows taskbar along the bottom edge, and the
 * third is a screenshot of an unrelated server admin panel.
 *
 * So they are drawn here, the same way seed-docs-demo draws its persona
 * avatars: no binaries in the repo, nothing recognisable, and `--undo` deletes
 * them. sharp is a backend dependency and renders SVG through librsvg.
 */
const BLOG_IMAGE_DIR = path.resolve(
  __dirname,
  "..",
  "..",
  "frontend",
  "public",
  "uploads",
  "blog",
  "posts"
);
const blogImageFile = (slug: string) => `docs-platform-${slug}.webp`;
const blogImagePath = (slug: string) => `/uploads/blog/posts/${blogImageFile(slug)}`;

async function writeBlogCovers(): Promise<boolean> {
  let sharp: any;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    sharp = require("sharp");
  } catch {
    console.log("  ! sharp unavailable — blog posts will be seeded without covers");
    return false;
  }
  fs.mkdirSync(BLOG_IMAGE_DIR, { recursive: true });
  for (const c of BLOG_CATEGORIES) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${c.from}"/><stop offset="100%" stop-color="${c.to}"/>
        </linearGradient>
        <radialGradient id="h" cx="0.78" cy="0.22" r="0.6">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.22"/>
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#g)"/>
      <rect width="1600" height="900" fill="url(#h)"/>
      <g stroke="#ffffff" stroke-opacity="0.14" stroke-width="3" fill="none">
        <circle cx="1240" cy="250" r="150"/>
        <circle cx="1240" cy="250" r="240"/>
        <circle cx="1240" cy="250" r="330"/>
      </g>
    </svg>`;
    // Deliberately no caption. The card already prints the category name in a
    // badge over the top-left of this image, and a second copy of it baked into
    // the artwork reads as a rendering bug.
    await sharp(Buffer.from(svg))
      .webp({ quality: 88 })
      .toFile(path.join(BLOG_IMAGE_DIR, blogImageFile(c.slug)));
    bump("blog cover .webp");
  }
  return true;
}

function undoBlogCovers() {
  for (const c of BLOG_CATEGORIES) {
    const f = path.join(BLOG_IMAGE_DIR, blogImageFile(c.slug));
    if (fs.existsSync(f)) {
      fs.unlinkSync(f);
      bump("blog cover .webp removed");
    }
  }
}

const POSTS: PostSeed[] = [
  {
    n: 1,
    title: "Opening your first account: what verification actually asks for",
    slug: "opening-your-first-account",
    category: 1,
    status: "PUBLISHED",
    views: 4187,
    daysAgo: 74,
    description:
      "A walk through the three verification steps, what each one is for, and how long each usually takes.",
    content:
      "<p>Verification exists for two reasons: it is what lets us raise your limits, and it is what lets us return your money to you if something goes wrong. It asks for three things, in this order.</p><h3>1. Your email</h3><p>A single confirmation click. Nothing else on the account works until this is done, because every security notice we send goes here.</p><h3>2. A government ID</h3><p>A passport, a national ID card or a driving licence. The photo needs the whole document in frame, all four corners, no glare across the machine-readable strip.</p><h3>3. A selfie</h3><p>Taken live, not uploaded from your camera roll. This is the step people redo most often, and almost always because the room was too dark.</p><p>Most submissions are decided within the hour. If yours takes longer it is usually the ID photo, not you.</p>",
  },
  {
    n: 2,
    title: "Deposits: why the network you choose matters more than the coin",
    slug: "deposits-network-matters",
    category: 1,
    status: "PUBLISHED",
    views: 6520,
    daysAgo: 61,
    description:
      "The single most common support ticket, and the ten seconds of checking that avoids it.",
    content:
      "<p>Almost every stuck deposit is the same mistake: the right token, sent over the wrong network.</p><p>A deposit address is issued <em>for one network</em>. An address issued for BEP-20 will not credit a token sent over ERC-20 — the funds are not lost on the chain, but they are not where your balance is read from either, and recovering them is a manual process with no guaranteed outcome.</p><p>The habit worth building: before you paste anything, check that the network shown on the withdrawal screen you are sending from is the same word as the network shown above the deposit address. Not similar. The same.</p>",
  },
  {
    n: 3,
    title: "Reading an order book without getting hypnotised by it",
    slug: "reading-an-order-book",
    category: 2,
    status: "PUBLISHED",
    views: 3094,
    daysAgo: 45,
    description:
      "What the two ladders actually tell you, and the three things people wrongly read into them.",
    content:
      "<p>An order book is a list of intentions, not a list of facts. Everything resting on it can be cancelled a millisecond from now, and on a thin market most of it will be.</p><h3>What it does tell you</h3><p>The spread — the gap between the best bid and the best ask — is the cost of changing your mind immediately. On a liquid pair it is a rounding error. On a thin one it is the trade.</p><h3>What it does not tell you</h3><p>Depth is not support. A wall of bids two percent below the mid is not a floor; it is an offer that can be withdrawn faster than you can react to its withdrawal.</p>",
  },
  {
    n: 4,
    title: "Spreads, slippage and the difference between them",
    slug: "spreads-and-slippage",
    category: 2,
    status: "PUBLISHED",
    views: 2411,
    daysAgo: 31,
    description: "Two costs that get blamed on each other, separated with a worked example.",
    content:
      "<p>The spread is what you pay for being in a hurry. Slippage is what you pay for being large.</p><p>Take a pair with a best bid of 100.00 and a best ask of 100.10. The spread is ten basis points. If you buy one unit at market you pay 100.10 and that is the whole story.</p><p>Now buy four hundred units into a book that only holds eighty at 100.10. The rest fills at 100.20, then 100.45, then wherever the next resting order sits. Your average price is not the ask you saw. That difference is slippage, and it is a function of your size against the book's depth — not of the spread you were quoted.</p>",
  },
  {
    n: 5,
    title: "Two-factor authentication: which second factor to pick",
    slug: "choosing-a-second-factor",
    category: 3,
    status: "PUBLISHED",
    views: 5266,
    daysAgo: 22,
    description: "App, key or SMS — the trade-offs, and the recovery plan each one needs.",
    content:
      "<p>All three are better than none. They are not equivalent.</p><h3>An authenticator app</h3><p>The sensible default. The code is generated on your device and never travels, so there is nothing to intercept. Its weakness is the device: lose it without your recovery codes and you have locked yourself out.</p><h3>A hardware key</h3><p>The strongest of the three, because it will not sign a challenge for a lookalike domain — it defeats the phishing page that an app-generated code walks straight into. Buy two and register both.</p><h3>SMS</h3><p>Better than nothing, and the weakest of the three: a SIM swap defeats it entirely.</p><p>Whichever you choose, print the recovery codes today and put them somewhere that is not the device.</p>",
  },
  {
    n: 6,
    title: "API keys: scope them, restrict them, and rotate them",
    slug: "api-keys-scope-and-rotate",
    category: 3,
    status: "PUBLISHED",
    views: 1873,
    daysAgo: 11,
    description: "A key that can only do one thing is a key that can only cost you one thing.",
    content:
      "<p>An API key is a password that never sleeps. Treat it accordingly.</p><ul><li><strong>Scope it.</strong> A key made for reading balances does not need to place orders, and a key that trades does not need withdrawal rights. Grant the narrowest set that makes your script work.</li><li><strong>Restrict it by IP.</strong> If the script runs on one machine, say so. A leaked key that only works from an address the attacker does not control is an inconvenience rather than an incident.</li><li><strong>Rotate it.</strong> Minting a new secret and retiring the old one takes a minute and turns an unknown-age exposure into a bounded one.</li></ul>",
  },
  {
    n: 7,
    title: "Fixed-term staking: what you are actually agreeing to",
    slug: "fixed-term-staking-explained",
    category: 1,
    status: "DRAFT",
    views: 0,
    daysAgo: 6,
    description:
      "Draft — needs the settlement-timing section checked against the current rules before it goes out.",
    content:
      "<p>A fixed-term stake is two promises: yours, that the asset stays locked for the whole term, and ours, that the rate agreed at the moment you lock is the rate you are paid.</p><p>TODO: confirm whether interest settles at maturity or accrues daily on this install before publishing — the two produce very different numbers for an early exit, and this post must not guess.</p>",
  },
  {
    n: 8,
    title: "A short history of every stuck withdrawal I have seen",
    slug: "why-withdrawals-get-stuck",
    category: 2,
    status: "DRAFT",
    views: 0,
    daysAgo: 3,
    description: "Draft — first pass. Needs real examples and a pass for tone.",
    content:
      "<p>Withdrawals stall for a small number of reasons and they are almost never mysterious. Notes so far:</p><ul><li>Pending review because the amount crossed a threshold the account had not crossed before.</li><li>Network congestion — broadcast, unconfirmed, nothing wrong.</li><li>An address in the right format for the wrong chain.</li></ul><p>TODO: work out which of these deserve their own post.</p>",
  },
  {
    n: 9,
    title: "Phishing pages are getting better. Here is what still gives them away",
    slug: "spotting-a-phishing-page",
    category: 3,
    status: "DRAFT",
    views: 0,
    daysAgo: 1,
    description: "Draft — outline only.",
    content:
      "<p>Outline:</p><ul><li>The domain is the tell, and it is the only tell you can trust.</li><li>A hardware key refuses to sign for a lookalike domain. That is the whole argument for one.</li><li>Nobody here will ever ask for a code. Not support, not by email, not on the phone.</li></ul>",
  },
];

async function seedBlog(): Promise<string | null> {
  const ava: any = await models.user.findOne({ where: { email: AVA_EMAIL } });
  if (!ava) {
    return `the documentation customer ${AVA_EMAIL} does not exist — run scripts/seed-docs-demo.ts first`;
  }
  if (String(ava.email).toLowerCase() === FORBIDDEN_EMAIL) {
    throw new Error("refusing to write against the owner's real account");
  }

  const haveCovers = await writeBlogCovers();

  for (const c of BLOG_CATEGORIES) {
    await ensure(models.category, uid("blogcat", c.n), {
      name: c.name,
      slug: c.slug,
      description: c.description,
      image: haveCovers ? blogImagePath(c.slug) : null,
      createdAt: daysAgo(90),
      updatedAt: daysAgo(90),
    });
  }

  /*
   * `author.userId` carries a UNIQUE index. If Ava already has an author row
   * under somebody else's id, adopt it rather than colliding — the page reads
   * by userId and does not care which row supplied it.
   */
  const authorId = uid("blogauthor", 1);
  const existingAuthor: any = await models.author.findOne({
    where: { userId: ava.id },
    paranoid: false,
  });
  let effectiveAuthorId = authorId;
  if (existingAuthor) {
    effectiveAuthorId = existingAuthor.id;
    skipped++;
  } else {
    await models.author.create({
      id: authorId,
      userId: ava.id,
      status: "APPROVED",
      createdAt: daysAgo(80),
      updatedAt: daysAgo(80),
    });
    bump("author");
  }

  for (const p of POSTS) {
    const at = daysAgo(p.daysAgo);
    await ensure(models.post, uid("blogpost", p.n), {
      title: p.title,
      slug: p.slug,
      content: p.content,
      description: p.description,
      categoryId: uid("blogcat", p.category),
      authorId: effectiveAuthorId,
      status: p.status,
      // A DRAFT has never been seen by anybody, so its view count is 0 — a
      // draft with 400 views is the kind of detail a careful reader notices.
      views: p.status === "DRAFT" ? 0 : p.views,
      image: haveCovers ? blogImagePath(BLOG_CATEGORIES[p.category - 1].slug) : null,
      createdAt: at,
      updatedAt: at,
    });
  }

  return null;
}

// ===========================================================================
// AREA: database backups (FILES, not rows)
// ===========================================================================

/**
 * THE BACKUP PAGE READS A DIRECTORY, NOT A TABLE.
 *
 * `admin/system/database/backup/index.get.ts` does
 * `readdir(path.resolve(process.cwd(), "backup"))`, keeps every `*.sql`, and
 * derives the timestamp from the FILENAME:
 *
 *   parse(filename.split(".")[0], "yyyy_MM_dd_HH_mm_ss", new Date())
 *
 * That leaves no room for a marker in the name, and it is not merely cosmetic:
 * a `.sql` file whose stem does not parse yields an Invalid Date, `formatDate`
 * throws a RangeError on it, and the whole endpoint answers 500 — one badly
 * named file empties the page for every operator. So each file written here is
 * named exactly as the product's own Create Backup button names one:
 * `format(new Date(), "yyyy_MM_dd_HH_mm_ss")` in LOCAL time, matching
 * index.post.ts, so `parse` (also local) round-trips. The marker lives INSIDE
 * the file.
 *
 * ---------------------------------------------------------------------------
 * THESE ARE FIXTURES, AND EACH ONE SAYS SO ON ITS FIRST LINE
 * ---------------------------------------------------------------------------
 * A real dump of this database is roughly 300 MB — writing several of those into
 * the working tree so a table renders six rows is not a trade worth making. So
 * the files are small, and each opens with a banner stating what it is and what
 * must not be done with it.
 *
 * `backend/backup/` was not gitignored when this script was written, which meant
 * a `git add -A` would have committed whatever the Create Backup button had left
 * there — a database dump, with everyone's data in it. That entry was added to
 * `.gitignore` alongside this file; it protects real backups, not only these.
 *
 * What makes that safe enough to do at all: the restore control is DEAD on this
 * screen. `backup/page.tsx` holds a `restoreFile` state and a `RestoreModal`,
 * and `setRestoreFile` is never called from anywhere — no row action, no button
 * — so `POST /api/admin/system/database/restore` is unreachable from the UI.
 * That endpoint DROPs and recreates the database before executing whatever file
 * it is handed, which is equally destructive against a genuine backup taken an
 * hour ago; it is the endpoint that deserves the warning, not these files.
 *
 * `--undo` deletes them, and only ever the ones carrying the marker.
 */
const BACKUP_DIR = path.resolve(process.cwd(), "backup");
/** Written into every file, and what `--undo` matches on to know it owns one. */
const BACKUP_MARKER = "DOCS-PLATFORM-FIXTURE";

/**
 * A plausible retention set: one an operator took by hand a few hours ago,
 * then a nightly job at 03:15, thinning out as it ages.
 *
 * The clock times are STATED rather than derived from the moment of the run.
 * Six ages expressed as "N hours ago" all land on the same minute-and-second as
 * each other, and a reader who notices six backups taken at 13:51:07 has found
 * a machine rather than a schedule.
 */
const BACKUPS: Array<{ daysAgo: number; h: number; m: number; s: number }> = [
  { daysAgo: 0, h: 9, m: 42, s: 18 }, // taken by hand before an upgrade
  { daysAgo: 1, h: 3, m: 15, s: 6 },
  { daysAgo: 2, h: 3, m: 15, s: 9 },
  { daysAgo: 4, h: 3, m: 15, s: 4 },
  { daysAgo: 8, h: 3, m: 15, s: 11 },
  { daysAgo: 15, h: 3, m: 15, s: 7 },
];

function backupBody(filename: string, at: Date): string {
  return [
    `-- ${BACKUP_MARKER}`,
    "-- ===========================================================================",
    "-- THIS IS NOT A DATABASE BACKUP.",
    "--",
    "-- It is a fixture written by backend/scripts/seed-docs-platform.ts so that",
    "-- Admin > System > Database > Backups has rows to photograph for the product",
    "-- documentation. It contains no schema and no data.",
    "--",
    "-- DO NOT RESTORE IT. The restore endpoint DROPs and recreates the database",
    "-- before executing the file it is given, so restoring this would destroy the",
    "-- install and replace it with nothing.",
    "--",
    "-- Remove it with:",
    "--   npx tsx -r dotenv/config scripts/seed-docs-platform.ts \\",
    "--     dotenv_config_path=../.env --undo",
    "-- ===========================================================================",
    `-- filename : ${filename}`,
    `-- generated: ${at.toISOString()}`,
    "",
    "-- A real backup, made by the Create Backup button on that page, is produced",
    "-- by mysqldump and is roughly 300 MB on this install. Nothing follows.",
    "",
  ].join("\n");
}

function seedBackups(): string | null {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  for (const b of BACKUPS) {
    // Built in LOCAL fields, because the filename is written by `format()` and
    // read back by `parse()`, both of which are local. Constructing this in UTC
    // would shift every displayed timestamp by the machine's offset.
    const at = new Date(NOW.getTime() - b.daysAgo * DAY);
    at.setHours(b.h, b.m, b.s, 0);
    if (at.getTime() > NOW.getTime()) {
      // A backup dated in the future is the one thing this table cannot show
      // honestly. Happens when the run is earlier in the day than the slot.
      at.setTime(at.getTime() - DAY);
    }
    const filename = `${format(at, "yyyy_MM_dd_HH_mm_ss")}.sql`;
    const full = path.join(BACKUP_DIR, filename);
    if (fs.existsSync(full)) {
      skipped++;
      continue;
    }
    fs.writeFileSync(full, backupBody(filename, at), "utf8");
    // Make the file's mtime agree with its name, so anything sorting by mtime
    // matches the column the page shows.
    fs.utimesSync(full, at, at);
    bump("backup/*.sql");
  }
  return null;
}

function undoBackups() {
  if (!fs.existsSync(BACKUP_DIR)) return;
  for (const name of fs.readdirSync(BACKUP_DIR)) {
    if (!name.endsWith(".sql")) continue;
    const full = path.join(BACKUP_DIR, name);
    let head = "";
    try {
      head = fs.readFileSync(full, "utf8").slice(0, 200);
    } catch {
      continue;
    }
    // Only ever deletes a file this script wrote. A real operator backup sitting
    // in the same directory is never touched.
    if (!head.includes(BACKUP_MARKER)) continue;
    fs.unlinkSync(full);
    bump("backup/*.sql removed");
  }
}

// ===========================================================================
// UNDO
// ===========================================================================

/**
 * Reverse dependency order. `force: true` because the paranoid models here
 * (post, author, category, mailwizard_block, ai_support_agent) would otherwise
 * keep their rows — and, for the agent, its UNIQUE slug — occupying the index,
 * so a later re-run would fail on a duplicate key.
 */
async function undo() {
  const where = { id: { [Op.like]: ID_LIKE } } as any;

  const steps: Array<[string, any]> = [
    ["post", models.post],
    ["author", models.author],
    ["category", models.category],
    ["binaryAiEngineUserCooldown", models.binaryAiEngineUserCooldown],
    ["aiSupportAgent", models.aiSupportAgent],
    ["mailwizardBlock", models.mailwizardBlock],
    ["user", models.user],
  ];

  for (const [name, model] of steps) {
    if (!model) continue;
    const n = await model.destroy({ where, force: true });
    if (n) bump(`${name} removed`, n);
  }

  undoBackups();
  undoBlogCovers();
}

// ===========================================================================
// MAIN
// ===========================================================================

async function main() {
  const skippedAreas: Array<{ area: string; why: string }> = [];

  if (UNDO) {
    await undo();
  } else {
    if (wants("users")) await seedTraders();
    if (wants("cooldowns")) {
      const why = await seedCooldowns();
      if (why) skippedAreas.push({ area: "cooldowns", why });
    }
    if (wants("agents")) await seedAgents();
    if (wants("blocks")) await seedBlocks();
    if (wants("blog")) {
      const why = await seedBlog();
      if (why) skippedAreas.push({ area: "blog", why });
    }
    if (wants("backups")) {
      const why = seedBackups();
      if (why) skippedAreas.push({ area: "backups", why });
    }
  }

  const rows = Object.entries(created).sort(([a], [b]) => a.localeCompare(b));
  console.log(UNDO ? "\nRemoved:" : "\nWritten:");
  if (!rows.length) console.log("  (nothing — everything was already in place)");
  for (const [label, n] of rows) console.log(`  ${String(n).padStart(4)}  ${label}`);
  if (skipped) console.log(`\n  ${skipped} item(s) already present, left alone`);
  for (const s of skippedAreas) console.log(`\n  SKIPPED ${s.area}: ${s.why}`);
  console.log("");
}

main()
  .then(async () => {
    await sequelize.close();
    process.exit(0);
  })
  .catch(async (e: any) => {
    console.error("\nFAILED:", e?.message || e);
    try {
      await sequelize.close();
    } catch {
      /* the connection is already gone */
    }
    process.exit(1);
  });

/**
 * ===========================================================================
 * WHY /hb/console IS NOT HERE
 * ===========================================================================
 * The Bot Console is a MIRROR of a Hummingbot process running on the customer's
 * own hardware. Nothing on that page is stored for it; every panel is derived,
 * live, from two things this database does not own:
 *
 *   HEALTH ("No bot connected yet")
 *     `GET /api/hb/setup` -> `deriveLink()`, which reads `apiKey.lastUsedAt` —
 *     a column stamped by `verifyHmacRequest` on each HMAC-signed request that
 *     authenticates. With no HB key the state is `no-key`, which is the exact
 *     sentence the empty capture shows. Minting a key row and back-dating
 *     `lastUsedAt` would flip that lamp to "connected" and assert, on the one
 *     page whose whole job is to answer "is my bot alive", that a process which
 *     does not exist is talking to us. It would also change /hb/setup and
 *     /hb/keys, which are not empty and photograph truthfully today.
 *
 *   MARKETS / LADDER / ACTIVITY
 *     `buildTradingSnapshot()` -> `getEcoOrdersByUserId()` /
 *     `getFuturesOrdersByUserId()`, i.e. the ScyllaDB partitions of the live
 *     matching engine. `symbols` is built from OPEN orders only, so nothing
 *     renders without resting orders in Scylla for that account.
 *
 * An OPEN ecosystem order is not a display record — it is money. It is funded by
 * a HOLD moved out of the wallet's `balance` into `inOrder`; the engine can
 * match it against a real counterparty; and cancelling it credits the wallet
 * from the ORDER ROW (`ecosystem/order/[id]/index.del.ts` computes the refund
 * from the order's own remaining amount). A hand-written order carries no
 * matching hold, so cancelling it MINTS the refund. Seeding it properly would
 * also mean writing the orderbook level under the level lock, with a delta, a
 * tick and a TTL, or it leaves ghost depth in the PUBLIC book that every other
 * customer trades against.
 *
 * And the ACTIVITY tape cannot be seeded even in principle: `trackFills` seeds
 * from orders whose `updatedAt` falls inside a FIVE-MINUTE window, so any fill
 * a script writes is invisible to a screenshot taken six minutes later.
 *
 * Observed on this install, signed in as the documentation customer:
 *
 *   GET /api/hb/console -> 200
 *   {"at":...,"engines":{"spot":true,"perp":true},"symbols":[],"positions":[],
 *    "fills":[],"stats":{"openOrders":0,...,"twoSided":false}}
 *   GET /api/hb/setup   -> 200
 *   {"link":{"state":"no-key",...},"agent":{"connected":false,...},
 *    "keys":{"state":"none","total":0,...}}
 *
 * Both engines are installed and answering; there is simply no bot and no order.
 * The honest way to photograph this page is with a Hummingbot instance actually
 * connected to a test account — not with rows.
 */
