import { cache } from "react";

import { DEFAULT_CHROME, normalizeChrome, type ChromeConfig } from "@/lib/chrome/variants";

/**
 * The site's chrome selection, fetched during SSR.
 * ============================================================================
 *
 * WHY THIS IS A SERVER FETCH AND NOT A ZUSTAND STORE
 *
 * A navbar variant decides WHICH COMPONENT TREE renders. That is not something
 * a client store can decide after hydration without the visitor watching one
 * navbar be replaced by another — and unlike a colour, there is no way to hide
 * it behind a CSS variable, because a custom property cannot swap a layout.
 *
 * The catch-all CMS page already demonstrates the failure this avoids: it reads
 * `settings.landingPageType` from a client store behind a `setTimeout(100)`, so
 * it renders nothing server-side and the real content appears a beat later. The
 * chrome must not work that way — it is on every page, above the fold.
 *
 * `cache()` dedupes this within a single render pass, so a layout and a page
 * asking for the chrome in the same request make ONE call.
 *
 * IT MUST NEVER THROW. This runs in the root layout: an exception here is not a
 * missing navbar, it is a 500 on every route. Every failure path returns the
 * defaults, which render the header the platform has always shipped.
 */
/**
 * WHY THERE IS NO CACHE HERE, after two attempts at one.
 *
 * This started as `next: { revalidate: 60 }`. That is what made the feature get
 * reported as doing nothing: a save took 25 seconds to show, and because Next's
 * fetch cache is stale-while-revalidate, the first load AFTER the window also
 * served the old value and merely triggered the refresh. Two reloads, a minute
 * apart, to see your own change.
 *
 * The fix was supposed to be a tag plus a Server Action calling
 * `revalidateTag` — then `updateTag` as well, which exists precisely for
 * read-your-own-writes. Measured, that still left the next request serving the
 * previous chrome: marking an entry stale is not the same as evicting it, and
 * the refresh happens behind whoever asked first.
 *
 * So the cache came out. What it was actually buying, measured on this install:
 * ~1ms, for a single-row primary-key lookup over the loopback. What it cost was
 * an entire class of "I saved it and nothing happened", on the one setting whose
 * only observable behaviour IS whether the save happened. The pages that read it
 * are dynamically rendered anyway (`Cache-Control: no-cache, must-revalidate`),
 * so there is no static generation being given up either.
 *
 * `cache()` from React stays: it dedupes within ONE render pass, so a layout and
 * a page asking for the chrome in the same request still make one call. That is
 * request-scoped memoisation, not a cache with a lifetime, and it cannot go
 * stale.
 *
 * If this ever does show up in a profile, cache it in the BACKEND — same process
 * as the writer, so invalidation is a variable assignment rather than a
 * distributed cache protocol.
 */
function getBaseURL() {
  const backendPort = process.env.NEXT_PUBLIC_BACKEND_PORT || 4000;
  // SSR always runs on the same machine as the backend.
  return `http://127.0.0.1:${backendPort}`;
}

export const getChrome = cache(async (): Promise<ChromeConfig> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    let res: Response;
    try {
      res = await fetch(`${getBaseURL()}/api/content/chrome`, {
        method: "GET",
        /* Uncached on purpose — see the note at the top of this file. A saved
           layout must be live on the very next request, and no cache in front
           of a 1ms loopback lookup is worth the staleness. */
        cache: "no-store",
        signal: controller.signal,
      });
    } finally {
      // In a finally so a thrown fetch cannot leave the abort timer pending.
      clearTimeout(timeoutId);
    }

    if (!res.ok) {
      if (res.status !== 404) {
        console.warn(
          `SSR: /api/content/chrome answered ${res.status} — rendering default chrome`
        );
      }
      return DEFAULT_CHROME;
    }

    /* `normalizeChrome` is not belt-and-braces here. A stored id can outlive the
       build that renders it — an owner picks "stacked", the deploy is rolled
       back, and the row still says "stacked". Coercing per-field to a known id
       is what turns that into "the navbar looks like the old one" instead of a
       crash inside the layout. */
    return normalizeChrome(await res.json());
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.warn(`SSR: chrome fetch failed (${reason}) — rendering default chrome`);
    return DEFAULT_CHROME;
  }
});
