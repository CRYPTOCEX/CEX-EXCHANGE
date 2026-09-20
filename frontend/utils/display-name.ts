/**
 * WHAT ONE USER IS ALLOWED TO SEE ANOTHER USER CALLED — the browser half.
 *
 * THE PROBLEM THIS CLOSES
 * -----------------------
 * `backend/src/utils/display-name.ts` already answers this question on the
 * server: `redactPublicNames` rewrites every person in a public payload so that
 * `name` is the handle (or "First L."), `firstName` is the addressable form,
 * and the SURNAME IS DELETED.
 *
 * The browser then ignored that answer and rebuilt its own. Roughly a dozen
 * public surfaces render
 *
 *     {user.firstName} {user.lastName}
 *
 * which today happens to come out right — there is no `lastName` left to
 * append, so the pair renders the redacted first field and a stray space. It is
 * right BY ACCIDENT. The moment one endpoint is added, copied or refactored
 * without `redactPublicNames`, every one of those surfaces starts publishing
 * the name on the author's identity document, and nothing in the frontend
 * notices, because the frontend never asked whose name it was rendering.
 *
 * So the browser gets the same ladder, and the surname stops being a thing a
 * component is even able to print:
 *
 *   1. `username` — the handle, if the payload carries the raw column.
 *   2. `name` — what the server already decided a stranger may see.
 *   3. "First L." — assembled HERE from a payload that never went through
 *      redaction. This is the safety net, and it is why the surname is reduced
 *      to an initial rather than joined: an un-redacted response must still not
 *      be able to put a legal surname on a public page.
 *   4. `fallback` — "Author", "Anonymous". A person with no name at all is a
 *      real state and must not render as an empty string, which reads as a
 *      broken page rather than as a missing name.
 *
 * NOT FOR: admin consoles, KYC review, receipts, or anything showing a person
 * their OWN record. Those want the legal name and are correct to keep it —
 * the same carve-out the server module makes.
 */

export interface PublicPerson {
  username?: string | null;
  /** What the server already resolved: handle, else "First L.". */
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}

const trimmed = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

/**
 * The public name for one user, as seen by anybody else.
 *
 * @param fallback what to render when the row carries no name at all. Pass a
 *   translated string — this module holds no copy of its own.
 */
export function publicName(
  user: PublicPerson | null | undefined,
  fallback = ""
): string {
  const handle = trimmed(user?.username);
  if (handle) return handle;

  const resolved = trimmed(user?.name);
  if (resolved) return resolved;

  const first = trimmed(user?.firstName);
  const last = trimmed(user?.lastName);
  if (!first && !last) return fallback;

  // Never `${first} ${last}`. A surname that reached the browser is a payload
  // that skipped redaction, and the initial is the smallest thing that keeps
  // two authors apart without republishing the document it came from.
  const initial = last ? ` ${last[0]!.toUpperCase()}.` : "";
  return `${first}${initial}`.trim() || fallback;
}

/**
 * The name to address somebody by in a sentence — "About Greg", "Reply to Greg".
 *
 * A handle is used WHOLE: splitting `greg_mint` on its underscore to get a
 * "first name" would invent a name they never chose. Only a real given name is
 * shortened, because that is what a given name IS.
 */
export function publicShortName(
  user: PublicPerson | null | undefined,
  fallback = ""
): string {
  const handle = trimmed(user?.username);
  if (handle) return handle;

  // Post-redaction `firstName` IS the short form the server chose, so it is
  // read before `name` here — `name` may already carry the "F. L." decoration
  // this function exists to avoid.
  const first = trimmed(user?.firstName);
  if (first) return first;

  return trimmed(user?.name) || fallback;
}

/**
 * The handle on its own, for surfaces that want to render it as `@handle`.
 * Empty when the account has never chosen one — callers decide what to do with
 * that rather than being handed a fabricated substitute.
 */
export function publicHandle(user: PublicPerson | null | undefined): string {
  return trimmed(user?.username);
}
