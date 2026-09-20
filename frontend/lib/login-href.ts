/**
 * The sign-in link a P2P surface should offer, carrying the way back.
 *
 * WHY THIS EXISTS
 * ---------------
 * `backend-error.ts` next door resolves an expired session onto a panel whose
 * one action is "Sign in". Every one of those panels linked to a bare `/login`,
 * which drops the person on the site root — so a room with a payment window
 * running, a half-filled offer, or a list of payment methods they were in the
 * middle of editing all became "start again from the home page". The panel
 * promised continuity and the link did not deliver it.
 *
 * `login/page.tsx` now honours `?return=`, so the link can keep the promise.
 * This builds it in one place because getting the SHAPE right is fiddly and
 * every wrong shape fails the same silent way — `safeReturnTo` returns null and
 * the user lands on `/` exactly as before, with nothing to indicate the link was
 * malformed rather than simply ignored.
 *
 * THE SHAPE, CHECKED AGAINST `safeReturnTo` IN `app/[locale]/login/page.tsx`
 * -------------------------------------------------------------------------
 *   - ONE `encodeURIComponent` over the whole path+query. That is the contract
 *     `lib/api.ts` already writes when the platform's own 401 handler redirects
 *     (`encodeURIComponent(pathname + search)`), and it is what makes a `?` and
 *     an `&` inside the return value stop being parameters of the LOGIN url.
 *   - A single leading `/`. `//host`, `/\host` and `/scheme:` are all refused
 *     up front rather than emitted and refused at the far end, so a caller that
 *     hands over something unusable gets a plain `/login` — a link that works —
 *     instead of one that looks parameterised and behaves like it is not.
 *   - NO locale prefix. `usePathname()` from `@/i18n/routing` already strips it
 *     and the `Link`/`router` it is handed back to re-adds one; the login page
 *     strips a stray one defensively, but two layers agreeing is not a reason
 *     to send it a value that needs fixing.
 *
 * THE DOUBLE-DECODE TRAP
 * ----------------------
 * The login page reads the value with `useSearchParams().get("return")`, which
 * has ALREADY percent-decoded it, and then calls `decodeURIComponent` on the
 * result — a second decode. For an ordinary path that is a no-op, which is why
 * this has never bitten. For a path carrying a literal escape it is not: a
 * segment written `a%252Fb` arrives as `a%2Fb` and decodes again to `a/b`, a
 * DIFFERENT page, reached silently. So a target that does not survive a second
 * decode unchanged is not sent: the query is dropped first, and the whole
 * return value after that. Landing on the page you asked for, or on the home
 * page, are both acceptable; landing on a third page is not.
 */

const LOGIN = "/login";

/** A path we would be sending somewhere other than this origin. */
function isOffOrigin(path: string): boolean {
  // `//evil.example` is protocol-relative — the browser reads it as a host.
  // `/\evil.example` is the same trick with the slash several parsers fold.
  if (path.startsWith("//") || path.startsWith("/\\")) return true;
  // `/javascript:…` and friends.
  return /^\/[a-z][a-z0-9+.-]*:/i.test(path);
}

/** True when a second `decodeURIComponent` would change the value. */
function survivesSecondDecode(value: string): boolean {
  try {
    return decodeURIComponent(value) === value;
  } catch {
    // A malformed escape — the login page's own try/catch turns this into a
    // null return, i.e. the home page. Don't send it.
    return false;
  }
}

/**
 * @param pathname Locale-free path, as returned by `usePathname()` from
 *   `@/i18n/routing`. Anything else — null, a relative string, an absolute URL
 *   — yields a plain `/login` rather than a broken parameter.
 * @param search Optional query string, with or without the leading `?`. Pass it
 *   only where the URL carries state worth restoring (the market board's
 *   filters); a page that never reads its own query gains nothing from it.
 * @returns `/login` or `/login?return=…`, for `Link`/`router` from
 *   `@/i18n/routing` (both add the locale prefix).
 */
export function loginHref(
  pathname: string | null | undefined,
  search?: string | null
): string {
  if (typeof pathname !== "string") return LOGIN;

  const path = pathname.trim();
  if (!path.startsWith("/") || isOffOrigin(path)) return LOGIN;
  // Already where the fallback would put them.
  if (path === "/") return LOGIN;

  const query = typeof search === "string" ? search.replace(/^\?/, "").trim() : "";
  const withQuery = query ? `${path}?${query}` : path;

  const target = survivesSecondDecode(withQuery)
    ? withQuery
    : survivesSecondDecode(path)
      ? path
      : null;

  if (!target) return LOGIN;
  return `${LOGIN}?return=${encodeURIComponent(target)}`;
}
