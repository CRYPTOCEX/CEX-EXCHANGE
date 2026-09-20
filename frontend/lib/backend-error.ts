/**
 * What a backend error string is actually telling the person reading it.
 *
 * WHY EVERY P2P SURFACE NEEDS THIS AND WHY IT KEPT GETTING RE-SOLVED WRONG
 * -----------------------------------------------------------------------
 * `$fetch` hands back `error` as the server's own sentence, and these screens
 * render it. Most of the time that is right — "This offer is no longer
 * available", "Amount is below the seller's minimum" — those are written for a
 * person and are the most useful thing we could say.
 *
 * Two classes are not written for a person, and both shipped to users:
 *
 *   AUTH   "Authentication Required: Session expired, please sign in again"
 *          A protocol diagnostic addressed to a client. Worse, the ONE action
 *          that fixes it — sign in — was never offered, and the "Try again"
 *          beside it re-issues the identical request forever. This is not only
 *          the signed-out case: nothing clears `user` on a 401, so a tab left
 *          open past token expiry (or a Redis restart evicting sessions) has a
 *          populated `user` and a dead session, and every session-derived guard
 *          says "signed in". The error string is the only witness.
 *
 *   INTERNAL  "Internal Server Error", "Failed to …", "Validation error: …"
 *          Machine text. Says nothing actionable and reads as our fault
 *          without saying what we will do about it.
 *
 * Classifying in one place is the point. Each surface that solved this alone
 * solved a different subset — the trade room caught `Authentication Required`
 * but folded it into the "our end" copy, which is the dead end above; payment
 * methods caught nothing at all and printed the sentence verbatim.
 */

export type BackendErrorKind = "auth" | "internal" | "message";

/**
 * `Middleware.ts` answers every auth failure with a 401 whose message begins
 * "Authentication Required", optionally with a colon and a reason ("Missing
 * session ID", "Session ended", "Session expired, please sign in again",
 * "Session unreadable"). The prefix is the stable part, so that is what is
 * matched — a reason list would silently stop matching the day one is added.
 *
 * AUTHENTICATION IS NOT AUTHORISATION, AND 401 IS USED FOR BOTH HERE.
 * ------------------------------------------------------------------
 * A first draft of this matched a bare `^unauthorized`, which also catches
 *   p2p/payment-method/[id]/index.put.ts -> "Unauthorized - you can only edit
 *                                           your own payment methods"  (401)
 *   p2p/payment-method/[id]/index.del.ts -> "Unauthorized - you can only
 *                                           delete your own …"          (401)
 * Those are ownership facts. Classifying them as auth tells somebody with a
 * perfectly live session that it has ended, and hands them a sign-in link that
 * cannot possibly help — a worse failure than the raw string, because it is
 * confidently wrong instead of merely unfriendly.
 *
 * So bare `Unauthorized` matches only when it is the WHOLE message. The moment
 * a layer attaches prose to it, it is making a statement about the request, not
 * about the session, and it is shown as written.
 */
const AUTH =
  /^(authentication required|unauthenticated|session (expired|not found|ended)|unauthorized\s*$)/i;

/**
 * Text addressed to a developer, not to the person holding the screen.
 *
 * The validator prefixes are the REAL ones, checked against
 * `backend/src/handler/utils/param-validator.ts`: it emits `Parameter "amount":
 * …` and `Validation error for query parameter "amount": …`. An earlier
 * `validation error:` pattern here matched neither, so it was a rule that
 * documented a behaviour it did not have — the class this whole module exists
 * to stop.
 */
const INTERNAL =
  /^(internal server error|failed to |validation error(:| for )|parameter "|error:|typeerror|cannot read )/i;

export function classifyBackendError(raw: unknown): BackendErrorKind {
  const text = typeof raw === "string" ? raw.trim() : "";
  if (!text) return "internal";
  if (AUTH.test(text)) return "auth";
  if (INTERNAL.test(text)) return "internal";
  return "message";
}

/**
 * The sentence to show, given the server's.
 *
 * `auth` deliberately has no sentence of its own here: it is not a message, it
 * is a different SCREEN — one with a sign-in button on it. A caller that renders
 * this string for an auth failure has kept the dead end. Check
 * `classifyBackendError() === "auth"` first and branch.
 *
 * `authFallback` exists because the safety-net sentence below is HARDCODED
 * ENGLISH, which is correct for the P2P surfaces this was written for (their
 * copy is English throughout) and wrong for a product whose every other string
 * comes out of a 90-locale bundle. A localised caller passes its own translated
 * sentence; a caller that does not gets the English net rather than a blank.
 */
export function backendErrorText(
  raw: unknown,
  fallback: string,
  authFallback = "Your session has ended. Sign in again to continue."
): string {
  const kind = classifyBackendError(raw);
  if (kind === "message") return String(raw).trim();
  if (kind === "auth") return authFallback;
  return fallback;
}

/** True when the only way forward is to sign in again. */
export function isAuthError(raw: unknown): boolean {
  return classifyBackendError(raw) === "auth";
}

/* ---------------------------------------------------------------------------
   A failed request, as the two things a surface needs from it.

   This pair lived in `p2p/payment-methods/components/use-payment-methods.ts`,
   which made it reachable only from that one page's subtree. The payment-method
   COMPOSER is shared kit — the offer builder opens it too — and kit importing
   from a page module is the wrong direction, so the definition moved down here
   beside the classifier it is built out of. `use-payment-methods` re-exports it,
   so its existing importers are untouched.
   ------------------------------------------------------------------------- */

export interface RequestFailure {
  /** The sentence to show. Never a protocol diagnostic. */
  text: string;
  /**
   * True when the only way forward is to sign in again — so the caller owes the
   * reader a door, not a sentence. `text` is filled in either way, because a
   * caller that forgets should still not leak; but a caller that only prints it
   * has kept the dead end this whole helper exists to close.
   */
  auth: boolean;
}

/**
 * Pull the message out of whatever `$fetch` handed back.
 *
 * Kept separate from the classifier so the RAW string is available to log:
 * once `describeFailure` has turned it into copy, the evidence is gone.
 */
function rawErrorMessage(error: unknown): string | null {
  if (typeof error === "string" && error.trim()) return error.trim();
  if (error && typeof error === "object") {
    const candidate =
      (error as any).message ?? (error as any).error ?? (error as any).statusText;
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  }
  return null;
}

/**
 * What to say, and whether saying anything is enough.
 *
 * The good case is why this is not simply "Something went wrong": the P2P
 * payment-method POST caps methods at 20 and refuses duplicate names with
 * sentences written for a person to read, and those come through verbatim. Only
 * machine text — "Authentication Required: Session expired…" — is swapped for
 * the caller's fallback, and a dead session comes back as a flag because no
 * amount of pressing Save can fix that one.
 */
export function describeFailure(error: unknown, fallback: string): RequestFailure {
  const message = rawErrorMessage(error);
  return {
    text: backendErrorText(message, fallback),
    auth: isAuthError(message),
  };
}
