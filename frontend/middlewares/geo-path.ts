/**
 * The path the geo gate asks the backend about, reduced to what a rule can match.
 *
 * Separate from `geo.ts` because it is the frontend half of a contract whose
 * other half lives in the backend (`handler/utils/injection-patterns.ts`), and
 * a test that holds the two together must be able to import this without
 * dragging in `next/server`.
 */

/**
 * A path segment as any real route spells one.
 *
 * No dot: `proxy.ts`'s matcher already excludes every path containing one, so
 * a dotted segment can only arrive on the two `has:` matcher entries (a
 * server-action or multipart probe) — and a dot is what the sanitiser's
 * `win.ini` / `boot.ini` patterns key on.
 */
const PLAIN_SEGMENT = /^[A-Za-z0-9_~@$+-]+$/;

/**
 * The path the backend is asked about, reduced to its matchable prefix.
 *
 * The verdict endpoint uses this value for ONE thing: prefix-matching against
 * the paths an operator scoped a rule to. It is never echoed, never stored and
 * never interpolated — so forwarding a probe URL verbatim buys nothing, and
 * costs plenty. The platform sanitises every query parameter before routing
 * (backend `handler/Request.ts`) and refuses anything that looks like an
 * injection attempt, which is exactly what a scanner's path looks like:
 * `/<script>alert(1)`, `/%2e%2e%2fetc%2fpasswd`, `/onerror=1`. Those requests
 * came back 400, which reads here as "no verdict" — so the feature-off latch
 * never engaged and EVERY subsequent request paid another backend round trip,
 * while the backend logged a refusal for each one.
 *
 * Truncating at the first segment that no route could contain keeps the part a
 * rule can actually match (a rule is scoped to `/trade` or `/finance`, never to
 * a segment full of angle brackets) and drops the part that only ever trips the
 * sanitiser. `..` is dropped too: a traversal segment cannot name a page.
 */
export function matchablePath(path: string): string {
  const kept: string[] = [];
  for (const segment of path.split("/")) {
    if (!segment) continue;
    // Not `segment === ".."`: a segment merely CONTAINING it rebuilds a
    // traversal once the "/" is joined back on ("a.." -> "/a../b"), and
    // `/\.\.[\/\\]/` is the first thing the sanitiser looks for.
    if (segment.includes("..") || segment === ".") break;
    if (!PLAIN_SEGMENT.test(segment)) break;
    kept.push(segment);
    // Rules are scoped by prefix, so depth beyond this adds no precision and
    // only lengthens a URL an attacker controls the size of.
    if (kept.length === 4) break;
  }
  return kept.length ? `/${kept.join("/")}` : "/";
}
