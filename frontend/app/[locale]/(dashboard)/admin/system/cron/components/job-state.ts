/**
 * Presentation helpers for the cron page.
 *
 * The STATE derivation itself (`cronJobState` and friends) lives in the store
 * beside the types it reads, because the job filter needs it too and two copies
 * of "is this job actually working?" is precisely the drift this page was
 * rebuilt to remove. It is re-exported here so components have one import.
 */
export {
  cronJobState,
  isNotWorking,
  needsAttention,
  type CronJobState,
} from "@/store/cron";

/**
 * `ecosystem` -> `Ecosystem`, `ai_market_maker` -> `AI Market Maker`.
 *
 * Categories are registry keys, not copy, and there are 17 of them across core
 * and the addons. Title-casing them at each call site would have put the same
 * `.replace(/_/g, " ")` in four files, and the acronyms would have come out as
 * "Ai Market Maker" in all four.
 */
const CATEGORY_WORDS: Record<string, string> = {
  ai: "AI",
  mlm: "MLM",
  nft: "NFT",
  ico: "ICO",
  p2p: "P2P",
  fx: "FX",
};

export function categoryLabel(category?: string | null): string {
  const raw = (category || "normal").trim();
  return raw
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map(
      (word) =>
        CATEGORY_WORDS[word.toLowerCase()] ??
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join(" ");
}

/**
 * A period in milliseconds as an operator reads it: `15s`, `30m`, `6h`, `1d`.
 *
 * Whole units only, and deliberately: every registered period is a round number
 * of seconds/minutes/hours, so a fractional rendering would only ever be noise.
 */
export function formatPeriod(ms?: number | null): string {
  if (!ms || ms <= 0) return "—";
  const seconds = ms / 1000;
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
  return `${Math.round(seconds / 86400)}d`;
}

/** A run duration. Sub-second work is the common case, so ms is the base unit. */
export function formatDuration(ms?: number | null): string {
  if (ms === undefined || ms === null) return "—";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms / 60_000)}m`;
}

/**
 * Parse a date that arrived over JSON.
 *
 * ALWAYS through this: `lastRun` is typed `Date | string | null` and is a
 * STRING on every real response. An `instanceof Date` test is what made the old
 * list view print "Never" for jobs that had just run.
 */
export function toDate(value?: Date | string | null): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * When this job is next due.
 *
 * NOT simply `job.nextScheduledRun`. That field is stamped by the scheduler at
 * the end of a run and only reaches this page on the 20-second HTTP poll, while
 * `lastRun` is refreshed live over the WebSocket — so on a 5-second job the
 * declared value is routinely older than the last tick and rendered as
 * "6 seconds ago", which is not a thing a NEXT run can be. Taking the later of
 * the two keeps the field honest between polls without inventing a schedule:
 * `lastRun + period` is exactly the arithmetic the backend does.
 */
export function nextRunAt(job: {
  lastRun?: Date | string | null;
  nextScheduledRun?: Date | string | null;
  period?: number;
}): Date | null {
  const declared = toDate(job.nextScheduledRun);
  const last = toDate(job.lastRun);
  const projected =
    last && job.period ? new Date(last.getTime() + job.period) : null;

  if (declared && projected) {
    return declared.getTime() >= projected.getTime() ? declared : projected;
  }
  return declared ?? projected;
}
