import { cache } from "react";

import { $serverFetch } from "@/lib/api";

/**
 * The `/landing` payloads, fetched during SSR.
 * ============================================================================
 *
 * WHY THIS EXISTS
 *
 * Every marketing surface on this platform — the homepage and the eight
 * extension landing pages — was a client component that asked its own
 * `/api/<ext>/landing` endpoint from an EFFECT. Effects do not run on the
 * server, so the HTML that actually shipped was the pending pass of each of
 * those pages: placeholder hero figures, an empty feature list, a metric strip
 * made of grey bars. The real numbers arrived a beat after paint and every
 * section under them moved. `app/[locale]/page.tsx` carries the measurement
 * that motivated this (0.101 CLS, 11,772px of settle on the homepage alone);
 * this fetcher is how the other pages get the same treatment.
 *
 * IT MUST NEVER THROW, and it never surfaces a reason.
 *
 * These are marketing pages. A backend hiccup must not turn one of them into a
 * 500, and the failure must not be describable from the RSC payload either —
 * an error string in the HTML of a landing page is worse than no data at all.
 * So every failure collapses to `null`, which is the value each of these
 * client components already carries as its initial state. The client-side
 * fetch they were built around is still there and still runs when the prop is
 * `null`, so a page whose server fetch missed fills itself in exactly the way
 * it does today. That is what makes the conversion safe: the degrade path is
 * not new, it is the current behaviour.
 *
 * `$serverFetch` is the right tool and not a shortcut: it resolves an absolute
 * loopback base (SSR runs on the same machine as the backend), it never
 * throws — non-2xx, unparseable JSON and a thrown `fetch` all come back as
 * `{ data: null, error }` — and it aborts at 10s so a wedged backend cannot
 * hold a render open forever. It forwards no cookies, which is correct here:
 * every `/landing` endpoint on this platform is anonymous and returns the same
 * payload to a signed-in visitor as to a stranger.
 *
 * WHY THERE IS NO CACHE — and this is the third file to have to say so.
 *
 * `cache()` from React is request-scoped memoisation: two components asking
 * for the same URL in ONE render pass make one call, and the memo dies with
 * the request. It CANNOT go stale. What is deliberately absent is a cache with
 * a lifetime — `next: { revalidate }`, `"use cache"`, `cacheLife`, `cacheTag`.
 * Next's fetch cache is stale-while-revalidate, so the first request after the
 * window still serves the old value and merely schedules the refresh; the
 * header of `lib/fetchers/chrome.ts` records the two attempts that were made
 * to make that behave and `lib/fetchers/settings.ts` records the production
 * verification. An owner who switches an extension on and reloads the homepage
 * must see it, and "reload twice, a minute apart" is the defect that got
 * reported both previous times. If one of these endpoints ever shows up in a
 * profile, cache it in the BACKEND — same process as the writer, so
 * invalidation is an assignment rather than a protocol.
 */
/* ONE LINE PER URL PER OUTAGE WINDOW, NOT ONE PER REQUEST.
   ---------------------------------------------------------------------------
   `cache()` above dedupes only WITHIN a single render pass, so without this
   gate a warn fires on every visit to every one of these seven pages. Two
   shapes make that expensive rather than merely noisy:

     · A backend outage, where each visit emits an uncooled line here PLUS the
       cooldowned `[ssr]` line `$serverFetch` already writes — so the volume is
       set by traffic, not by the length of the outage.
     · An install that simply does not have an extension enabled, where the 404
       is PERMANENT and every crawler hit appends a line forever.

   pm2's logs on this platform are unbounded (no `max_size`, no rotation in the
   shipped configs), so "forever" means until the disk fills. Keyed per URL so a
   single broken extension cannot mask a second one going down inside the same
   window, and the cooldown matches `TRANSPORT_LOG_COOLDOWN_MS` in `lib/api.ts`
   so both halves of one failure age out together. */
const LOG_COOLDOWN_MS = 5_000;
const lastWarnAt = new Map<string, number>();

const readLanding = cache(async (url: string): Promise<unknown> => {
  const { data, error } = await $serverFetch(null, { url });

  if (error || !data) {
    /* One compact line, worded like `chrome.ts`'s, because these run on every
       render of a public page and a stack trace per visit would bury the log
       of a genuinely broken install. `error` is already a string on every
       failure path `$serverFetch` has. */
    const now = Date.now();
    if (now - (lastWarnAt.get(url) ?? 0) > LOG_COOLDOWN_MS) {
      lastWarnAt.set(url, now);
      console.warn(
        `SSR: ${url} answered ${error ?? "no data"} — rendering without landing data`
      );
    }
    return null;
  }

  return data;
});

/**
 * Fetch one `/landing` payload for a server component, or `null`.
 *
 * The type parameter lives on this wrapper rather than inside `cache()` on
 * purpose: `cache()` memoises on its argument list, so the memoised function
 * has to have a plain `(url: string)` signature for two callers of the same
 * URL to collide. `T` is a compile-time cast over the endpoint's untyped JSON,
 * the same honesty `home-route-client.tsx` applies to the `home` document —
 * nothing validates the shape, and the consumers all walk it defensively
 * because the prop can be `null` anyway.
 */
export async function fetchLanding<T>(url: string): Promise<T | null> {
  return (await readLanding(url)) as T | null;
}
