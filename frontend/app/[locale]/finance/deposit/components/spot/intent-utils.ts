/**
 * SPOT DEPOSIT INTENTS, AS THE WEB SCREEN SEES THEM.
 *
 * A spot deposit lands at the platform's ONE exchange address per network, so
 * something has to say which customer it came from. The admin picks how with
 * `spotDepositMode` (plans/done/SPOT-DEPOSIT-MODES.md), and the answer changes what
 * the deposit screen asks for BEFORE it shows an address:
 *
 *   hash_claim         amount -> address -> the customer pastes the hash
 *   amount_match       amount -> address + an EXACT figure to send, no hash
 *   ecosystem_custody  network only -> the customer's OWN address, no hash
 *
 * The setting is the platform's default; the intent row carries the mode it was
 * actually created in, and that one wins — ecosystem custody falls back to
 * amount_match per ineligible network (D2), so the screen must never assume the
 * setting describes the intent in front of it.
 *
 * WHY THE AMOUNT HELPERS DO NOT USE `Number`. `declaredAmount` and
 * `expectedAmount` are DECIMAL(36,18): MySQL hands them back as STRINGS
 * ("12.573100000000000000"), and under amount_match the last decimals are the
 * whole point — they are what tells two customers' deposits apart. Parsing that
 * through a double loses digits at 17 significant figures and would print an
 * amount that does not match the one the matcher is waiting for. So the trim is
 * textual, and the string the server sent is the string the customer is shown.
 */

export const SPOT_DEPOSIT_MODES = [
  "hash_claim",
  "amount_match",
  "ecosystem_custody",
] as const;

export type SpotDepositMode = (typeof SPOT_DEPOSIT_MODES)[number];

/** Must match DEFAULT_SPOT_DEPOSIT_MODE in backend/src/utils/spot-deposit/settings.ts. */
export const DEFAULT_SPOT_DEPOSIT_MODE: SpotDepositMode = "hash_claim";

/**
 * The mode a settings blob or an intent row names, or the default.
 *
 * Deliberately tolerant: `settings` is a `Record<string, any>` filled from the
 * public settings endpoint, where every value is TEXT, and a key that is absent
 * (an install that has never opened the deposit screen, so the backend has not
 * materialised the row yet) must read as the default rather than as an empty
 * flow.
 */
export function readSpotDepositMode(raw: unknown): SpotDepositMode {
  const value = String(raw ?? "").trim();
  return (SPOT_DEPOSIT_MODES as readonly string[]).includes(value)
    ? (value as SpotDepositMode)
    : DEFAULT_SPOT_DEPOSIT_MODE;
}

export const SPOT_INTENT_STAGES = [
  "waiting",
  "received",
  "moving",
  "on_exchange",
  "credited",
  "review",
  "failed",
  "expired",
] as const;

export type SpotIntentStage = (typeof SPOT_INTENT_STAGES)[number];

/** `stageOf` on the server computes these; an unknown word is treated as "waiting". */
export function readSpotIntentStage(raw: unknown): SpotIntentStage {
  const value = String(raw ?? "").trim();
  return (SPOT_INTENT_STAGES as readonly string[]).includes(value)
    ? (value as SpotIntentStage)
    : "waiting";
}

/**
 * Stages that mean this intent will never move again on its own.
 *
 * `review` is NOT one of them: an admin approving from the deposit-intent
 * console flips REVIEW to CREDITED, and that transition broadcasts on the same
 * stream — a screen that unsubscribed would miss its own good news.
 */
export const FINISHED_STAGES: readonly SpotIntentStage[] = ["credited", "failed", "expired"];

/** The happy path this mode actually walks, in order. */
export function stagesForMode(mode: SpotDepositMode): SpotIntentStage[] {
  return mode === "ecosystem_custody"
    ? ["waiting", "received", "moving", "on_exchange", "credited"]
    : ["waiting", "received", "credited"];
}

/** Networks are compared the way the server stores them: trimmed and upper-cased. */
export function normaliseNetwork(network: unknown): string {
  return String(network ?? "").trim().toUpperCase();
}

export function isSameNetwork(a: unknown, b: unknown): boolean {
  const left = normaliseNetwork(a);
  return left.length > 0 && left === normaliseNetwork(b);
}

/**
 * A DECIMAL(36,18) string as a human would write it: "12.573100000000000000"
 * becomes "12.5731", "5.000000000000000000" becomes "5". Anything that is not a
 * plain decimal is handed back untouched rather than mangled.
 */
export function trimDecimalString(raw: unknown): string {
  if (raw === null || raw === undefined) return "";
  const value = String(raw).trim();
  if (!value) return "";
  if (!/^-?\d+(\.\d+)?$/.test(value)) return value;
  if (!value.includes(".")) return value;
  const trimmed = value.replace(/0+$/, "").replace(/\.$/, "");
  return trimmed === "" || trimmed === "-" ? "0" : trimmed;
}

/**
 * The sweep fee to quote on a mode C address step, from wherever it is known.
 *
 * The intent POST answers with a fresh `quoteSweepFee` result, but only when it
 * CREATES the intent: a reload resumes the row through the list route, which
 * carries no quote. So the row's own metadata is read as well — `sweepFeeQuote`
 * if the backend ever persists the quote, and `sweepFee` (the figure actually
 * charged), which the ecosystem side writes once the sweep is built. Absent all
 * three the fee line is simply not drawn, which is honest: a number invented
 * here would be a promise nobody made.
 */
export function resolveSweepFee(
  quoted: any,
  intent: any
): { amount: string; currency: string } | null {
  const metadata = intent?.metadata && typeof intent.metadata === "object" ? intent.metadata : {};
  const candidates = [quoted, metadata.sweepFeeQuote, metadata.sweepFee];
  for (const candidate of candidates) {
    if (candidate === null || candidate === undefined) continue;
    const amount =
      typeof candidate === "object" ? trimDecimalString(candidate.amount) : trimDecimalString(candidate);
    if (!amount || amount === "0") continue;
    const currency =
      (typeof candidate === "object" ? candidate.currency : null) || intent?.currency || "";
    return { amount, currency: String(currency) };
  }
  return null;
}
