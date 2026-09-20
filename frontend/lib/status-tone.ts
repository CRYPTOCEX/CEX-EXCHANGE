import type { BadgeTone } from "@/components/ui/badge";

/**
 * The single status -> tone table for the whole platform.
 *
 * MEASURED PROBLEM (2026-07-29): there were **239 hand-written status colour
 * mappers** across **125 distinct helper names** (`getStatusColor`,
 * `getStatusBadge`, `statusConfig`, `getStatusStyles`, `STATUS_BADGE_CLASSES`,
 * `getSeverityColor`, `riskConfig`, ...). Between them they painted **43
 * statuses with 168 distinct class strings**, and **13 statuses carried more
 * than one semantic hue**:
 *
 *   - `CANCELLED` was amber in ICO and red in the other 10 mappers.
 *   - Admin and user views of the SAME investment record disagreed on three of
 *     four statuses (`ACTIVE`, `COMPLETED`, `REJECTED`).
 *   - `SUSPENDED` was warning in two modules and destructive in two others.
 *
 * Only 4 of the 239 contained a hardcoded colour, so this was never a
 * tokenization problem — it was 239 independent *decisions*. An admin design
 * panel can change what `--success` is, but it can never make the app
 * self-consistent while 239 files each decide which statuses are "success".
 *
 * ---------------------------------------------------------------------------
 * THE RULE THAT RESOLVES MOST CONFLICTS
 *
 * A status pill is a STATE, and DESIGN-SYSTEM.md R2 reserves the accent
 * (`primary`) for things you CLICK — "accent != state". So no status wears
 * `primary`, however many mappers currently do. That one rule settles ACTIVE,
 * COMPLETED, REJECTED, RUNNING, INFO, PROCESSING, SHIPPED, OPEN, DISPUTED and
 * HIGH; the remaining ties were broken toward the measured majority.
 *
 * Where a status is genuinely in-flight rather than good/bad it takes `info`,
 * which exists precisely for "a state you read".
 * ---------------------------------------------------------------------------
 */
export const STATUS_TONE: Record<string, BadgeTone> = {
  // ---- terminal, good ------------------------------------------------------
  ACTIVE: "success",          // 15 of 19 sites; the 3 `primary` ones broke R2
  COMPLETED: "success",       // 11 of 16; was also primary and info
  APPROVED: "success",
  SUCCESS: "success",
  DELIVERED: "success",
  PUBLISHED: "success",
  MATCHED: "success",
  RESOLVED: "success",
  // The decisive marker in a forex execution trace. A trace is mostly SKIPPED
  // noise, so the one line stating the actual routing decision has to stand out
  // from it — as `neutral` the two were byte-identical grey chips.
  APPLIED: "success",
  REPLIED: "success",
  ANSWERED: "success",
  VERIFIED: "success",
  CONFIRMED: "success",
  ENABLED: "success",
  ONLINE: "success",
  HEALTHY: "success",
  PAID: "success",
  SETTLED: "success",
  RELEASED: "success",
  CONNECTED: "success",
  FILLED: "success",          // a fully-filled order is a completed one
  // Added after the second consolidation pass (2026-07-29). Every one of these
  // was coloured by a local mapper and, being absent here, silently resolved to
  // `neutral` the moment that mapper was deleted — which is the single failure
  // mode this table has. The adversarial verify caught them by diffing each
  // deleted mapper's case list against these keys.
  EXECUTED: "success",        // copy-trading's successful terminal
  /* The other half of copy-trading's terminal pair, and it was MISSING — so on
     the admin leader page a successfully copied trade wore the same grey chip
     as an unrecognised value, while `REPLICATION_FAILED` two rows below it wore
     that chip too. The two opposite outcomes were byte-identical. */
  REPLICATED: "success",
  READY: "success",
  SOLD: "success",            // NFT listing's successful terminal
  ESCROW_RELEASED: "success", // sibling of RELEASED
  WIN: "success",
  UP: "success",
  BUY: "success",
  LONG: "success",
  LOW: "success",             // low RISK is the good end of the scale
  OPEN: "success",            // an open position/offer is live, not "clickable"
  RUNNING: "success",         // healthy, not an accent
  LIVE: "success",

  // ---- in flight — a state you read, never the accent ----------------------
  PROCESSING: "info",
  SUBMITTED: "info",
  SHIPPED: "info",
  IN_PROGRESS: "info",
  IN_REVIEW: "info",
  PARTIALLY_FILLED: "info",
  QUEUED: "info",
  INFO: "info",
  // The cron timeline's four event types are started/completed/failed/
  // scheduled. `STARTED` was missing, so it fell to neutral and became
  // byte-identical to `scheduled` — the two states swapped rather than
  // migrated. Sibling of STARTING.
  STARTED: "info",
  // P2P escrow hand-off steps: something has happened and the other party is
  // now expected to act. In flight, not done.
  BUYER_CONFIRMED: "info",
  SELLER_CONFIRMED: "info",
  ESCROW_REVIEW: "info",
  MINTING: "info",
  UPLOADING: "info",
  // The `completed | current | upcoming` step rail (KYC application). `CURRENT`
  // is the step you are on, so it reads as IN_PROGRESS; `UPCOMING` has to be
  // quieter than it, which is why that one is neutral below rather than info.
  CURRENT: "info",
  NEW: "info",
  // Swept from the real enums in use (`status === "X"` across app/ and
  // components/), not just the 43 the mapper audit happened to cover — a
  // status missing from this table silently resolves to `neutral`, which is
  // how PAYMENT_SENT lost its colour during the first migration pass.
  PAYMENT_SENT: "info",
  MANUAL_REVIEW: "info",
  VERIFICATION: "info",
  ROUTING: "info",
  STARTING: "info",
  STOPPING: "info",
  CLOSING: "info",            // a position winding down; sibling of STOPPING
  INITIALIZING: "info",
  TRANSIT: "info",
  MINTED: "info",
  TRIGGERED: "info",
  COMING_SOON: "info",
  /* Added 2026-07-30 by the whole-platform sweep. Each was MISSING, so each
     resolved to `neutral` — which is why six gateway/NFT files were still
     deciding these hues locally: routing them through this table would have
     greyed them out, so the local map was the lesser evil. With the keys here,
     those files can drop their private tables.

     `SENT` follows `PAYMENT_SENT` above: dispatched and awaiting confirmation is
     in-flight, not terminal-good. `INVESTIGATING` is a dispute being worked —
     the same shape as `IN_REVIEW`. */
  SENT: "info",
  INVESTIGATING: "info",

  // ---- needs attention -----------------------------------------------------
  PENDING: "warning",         // unanimous across all 16 of its sites
  /* Blocked on someone else acting — the `PENDING` shape rather than the
     `IN_REVIEW` shape, because nothing is progressing until a reply arrives. */
  AWAITING_RESPONSE: "warning",
  // A bot the operator just put into cooldown must not wear the same grey chip
  // as an unrecognised status. Sibling of PAUSED, and it matches this module's
  // own activityConfig, which already called COOLDOWN a warning.
  COOLDOWN: "warning",
  // Priority rungs on the NFT onboarding checklist: 7 of its 9 tasks are
  // "important", so without this the three-rung scale collapsed to red-vs-grey.
  IMPORTANT: "warning",
  // The PENDING_* family follows PENDING. Filing them under "in flight" made a
  // submitted-and-waiting record read as merely informational and lost the
  // needs-attention signal — caught by the migration's verify pass on staking
  // positions, trading-bot strategies and gateway payouts.
  PENDING_APPROVAL: "warning",
  PENDING_WITHDRAWAL: "warning",
  PENDING_REVIEW: "warning",
  PENDING_REPLICATION: "warning",
  // A bot that hit its cap is stopped-and-needs-attention, not an error.
  LIMIT_REACHED: "warning",
  PAUSED: "warning",
  MEDIUM: "warning",
  WARNING: "warning",
  FLAGGED: "warning",
  DISPUTED: "warning",
  ADDITIONAL_INFO_REQUIRED: "warning",
  ON_HOLD: "warning",
  UNVERIFIED: "warning",
  DEGRADED: "warning",
  PARTIAL: "warning",
  REFUNDED: "warning",
  PARTIALLY_REFUNDED: "warning",
  HALTED: "warning",
  CLOSE_ONLY: "warning",

  // ---- bad / blocking ------------------------------------------------------
  REJECTED: "destructive",    // 9 of 14; was also primary and muted
  CANCELLED: "destructive",   // 10 of 15; the ICO amber outlier is gone
  FAILED: "destructive",
  /* A scheduled job that returned without doing its work because this process
     must not do it (backend cron/refusal.ts). Destructive rather than warning,
     and deliberately not a sibling of SKIPPED (neutral): a skipped RULE is
     inert by design, whereas a refused JOB is work the operator believes is
     happening and which is not. */
  REFUSED: "destructive",
  REPLICATION_FAILED: "destructive", // sibling of FAILED; see REPLICATED above
  ERROR: "destructive",
  CRITICAL: "destructive",
  HIGH: "destructive",        // high severity/risk
  /* Added because it was MISSING, and an absent key is the worst outcome this
     table can produce: it resolves to `neutral`, so the top rung of a severity
     scale paints grey — quieter than the rung below it. Found in the NFT gas
     estimator's LOW/MEDIUM/HIGH/VERY_HIGH congestion scale, which for that
     reason still decides its own colours locally.

     Note the limit this exposes rather than solves: a 4-rung ORDINAL scale is
     not four statuses. `HIGH` and `VERY_HIGH` both land on destructive here, so
     the top two rungs are indistinguishable by tone alone and anything using a
     scale like that needs an ordinal ramp (or a second encoding) instead. This
     entry exists so the failure is "two rungs look alike" rather than "the worst
     rung looks inert". */
  VERY_HIGH: "destructive",
  /* An escalated dispute has left normal handling. `DISPUTED` above is warning —
     the disagreement exists; `ESCALATED` is the step past that. */
  ESCALATED: "destructive",
  BANNED: "destructive",
  DISABLED: "destructive",
  // An enforcement action like DISABLED/BANNED, not a passive state. The 3-vs-3
  // warning/destructive split is broken toward the enforcement family.
  SUSPENDED: "destructive",
  LOSS: "destructive",
  DOWN: "destructive",
  SELL: "destructive",
  SHORT: "destructive",
  OFFLINE: "destructive",
  UNHEALTHY: "destructive",
  // Live members of the `transaction.status` ENUM. Both were destructive in the
  // finance mappers and in forex; neither was here, so all three finance detail
  // pages rendered them as the same grey chip an unrecognised value gets.
  FROZEN: "destructive",
  TIMEOUT: "destructive",
  EXPIRED_ERROR: "destructive",
  CRASHED: "destructive",
  LIQUIDATED: "destructive",
  PARTIALLY_LIQUIDATED: "destructive",

  // ---- inert / no state ----------------------------------------------------
  DRAFT: "neutral",           // 5 of 8; a draft is an absence of state
  INACTIVE: "neutral",
  STOPPED: "neutral",
  CLOSED: "neutral",
  ARCHIVED: "neutral",
  EXPIRED: "neutral",         // lapsed, not an error
  DRAW: "neutral",
  UNKNOWN: "neutral",
  NONE: "neutral",
  SKIPPED: "neutral",         // explicit: a passed-over rule IS inert
  OPTIONAL: "neutral",
  DELETED: "neutral",
  // "Not yet". These have to stay QUIETER than the in-flight bucket or the
  // step rails and timelines that pair them lose their reading:
  //   cron timeline   started(info) vs scheduled(neutral)
  //   KYC step rail   current(info) vs upcoming(neutral)
  //   ICO offers      live(success) vs upcoming(neutral)
  // `SCHEDULED` moved here from `info` for exactly that reason — as info it was
  // indistinguishable from the event that says a run actually began.
  SCHEDULED: "neutral",
  UPCOMING: "neutral",
  IDLE: "neutral",            // was only ever neutral by falling through
  NOT_STARTED: "neutral",     // ditto — now declared rather than accidental
  // An auction that ran its course. Sibling of CLOSED/EXPIRED. It was
  // `secondary` in one NFT column and uncoloured in another, so the same value
  // already disagreed with itself inside one module.
  ENDED: "neutral",
};

/** Statuses that are the same thing under another spelling. */
const ALIASES: Record<string, string> = {
  CANCELED: "CANCELLED",       // single-L US spelling
  COMPLETE: "COMPLETED",
  SUCCEEDED: "SUCCESS",
  SUCCESSFUL: "SUCCESS",
  ACCEPT: "APPROVED",
  ACCEPTED: "APPROVED",
  DECLINE: "REJECTED",
  DECLINED: "REJECTED",
  DENY: "REJECTED",
  DENIED: "REJECTED",
  ACTIVATED: "ACTIVE",
  DEACTIVATED: "INACTIVE",
  ENABLE: "ENABLED",
  DISABLE: "DISABLED",
  ERRORED: "ERROR",
  FAIL: "FAILED",
  WON: "WIN",
  LOST: "LOSS",
  AWAITING: "PENDING",
  WAITING: "PENDING",
  REVIEW: "IN_REVIEW",         // bare `REVIEW`; IN_REVIEW/PENDING_REVIEW existed

  // Binary-option direction names. R1 makes direction a first-class pair
  // (`--up`/`--down`), and BUY/SELL/LONG/SHORT/UP/DOWN were already here — but
  // the binary side names were not, so every binary table kept a private
  // `GREEN_SIDES = ["BUY","RISE","HIGHER","TOUCH","CALL","UP"]` list beside it.
  RISE: "UP",
  HIGHER: "UP",
  TOUCH: "UP",
  CALL: "UP",
  FALL: "DOWN",
  LOWER: "DOWN",
  NO_TOUCH: "DOWN",
  PUT: "DOWN",
};

/**
 * Normalise whatever the backend sent — `"in_progress"`, `"In Progress"`,
 * `"IN-PROGRESS"` — into a table key.
 */
function normalise(status: string): string {
  return status.trim().toUpperCase().replace(/[\s-]+/g, "_");
}

/**
 * DOMAIN OVERRIDES — for the handful of statuses that are genuine homonyms.
 * ---------------------------------------------------------------------------
 * A flat table cannot resolve a word that means different things in different
 * parts of the product, and forcing one answer is worse than admitting two.
 *
 * `OPEN` is the case that forced this. On a trading position or a P2P offer,
 * "open" means live and working — success, and the table's comment says so. On a
 * SUPPORT TICKET it means "waiting for us to reply", which is not an
 * achievement; painting it green makes an unanswered ticket read as resolved.
 * The table's own rule already gives the right answer for that reading — "where
 * a status is genuinely in-flight rather than good/bad it takes `info`" — so the
 * support module's original `info` was correct and a well-meant migration to the
 * shared table quietly regressed it.
 *
 * Keep this map SMALL. Every entry is an admission that one word carries two
 * meanings; if it starts filling up, the statuses need renaming at the source
 * instead. It is deliberately not a general escape hatch for "I prefer a
 * different colour here" — that is the 239-mappers problem this file exists to
 * end.
 */
export const DOMAIN_STATUS_TONE: Record<string, Record<string, BadgeTone>> = {
  support: {
    OPEN: "info",
  },
};

/**
 * Resolve a status string to its tone.
 *
 * Unknown statuses return `neutral`, NOT the Badge default. That matters: one
 * mapper did `colors[status] || ""` and fell through to Badge's default
 * `bg-primary` fill, so any new backend enum value silently rendered as a solid
 * brand pill — a value nobody had styled read as "promoted". A second mapper
 * fell through to `destructive`, so an unstyled enum read as an error.
 *
 * `domain` opts into `DOMAIN_STATUS_TONE` above. Optional, so every existing
 * call site keeps its behaviour unchanged.
 */
export function statusTone(
  status?: string | null,
  domain?: keyof typeof DOMAIN_STATUS_TONE | (string & {})
): BadgeTone {
  if (!status) return "neutral";
  const key = normalise(String(status));
  if (domain) {
    const override = DOMAIN_STATUS_TONE[domain]?.[key];
    if (override) return override;
  }
  return STATUS_TONE[key] ?? STATUS_TONE[ALIASES[key] ?? ""] ?? "neutral";
}

/** `IN_PROGRESS` -> `In Progress`, for when the raw enum is shown to a user. */
export function statusLabel(status?: string | null): string {
  if (!status) return "";
  return normalise(String(status))
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}
