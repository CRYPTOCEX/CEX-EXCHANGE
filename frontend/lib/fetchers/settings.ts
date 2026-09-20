import { cache } from "react";
import {
  classifyTransportError,
  transportErrorDetail,
} from "@/lib/errors/transport";

interface SettingsData {
  [key: string]: any;
}

function getBaseURL() {
  const backendPort = process.env.NEXT_PUBLIC_BACKEND_PORT || 4000;
  // SSR always runs on the same machine as the backend
  return `http://127.0.0.1:${backendPort}`;
}

/**
 * WHY THERE IS NO FETCH CACHE HERE.
 *
 * This started as `next: { revalidate: 60 }`, and that is what made
 * `/admin/design` get reported as "saving does nothing on the live site".
 * Two compounding reasons, both measured:
 *
 *   - 60 seconds of staleness on the ONE setting whose only observable
 *     behaviour is whether the save happened. The admin sees their own change
 *     instantly (the panel writes the draft to the DOM), so the report is
 *     always "it works for me and not for anyone else" — the hardest shape of
 *     bug to act on.
 *   - Next's fetch cache is stale-while-revalidate, so the first request AFTER
 *     the window ALSO serves the old value and merely schedules the refresh.
 *     That is two reloads, a minute apart, before a saved palette appears —
 *     which reads as "it never took effect", not "it was slow".
 *
 * `lib/fetchers/chrome.ts` hit this first and has the longer write-up,
 * including why the tag + `revalidateTag`/`updateTag` route does NOT fix it:
 * marking an entry stale is not evicting it.
 *
 * What the cache was buying: one loopback call to `/api/settings` per render.
 * What it cost: a design manager that looked broken. There is also no static
 * rendering being given up — this is the only caller, it runs in the locale
 * root layout, and that layout already calls `getChrome` with `no-store`, so
 * every page under it is dynamic regardless (verified in production:
 * `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate`).
 *
 * `cache()` from React stays: it dedupes within ONE render pass, so a layout
 * and a page asking for settings in the same request still make one call. That
 * is request-scoped memoisation, not a cache with a lifetime, and it cannot go
 * stale.
 *
 * If this ever shows up in a profile, cache it in the BACKEND — same process as
 * the writer, so invalidation is an assignment rather than a distributed cache
 * protocol. `CacheManager` there already does exactly that, and
 * `PUT /api/admin/system/settings` already clears it.
 */
export const getSettings = cache(async () => {
  const siteUrl = getBaseURL();

  if (!siteUrl) {
    console.error("SSR: No site URL configured for settings fetch");
    return { settings: {}, extensions: [], error: "No site URL configured" };
  }

  try {
    const apiUrl = `${siteUrl}/api/settings`;

    // Use AbortController with timeout to prevent hanging when backend is not ready
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    let res: Response;
    try {
      res = await fetch(apiUrl, {
        /* UNCACHED ON PURPOSE — see the note above `getSettings`. */
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      });
    } finally {
      // In a finally so a thrown fetch can't leave the abort timer pending.
      clearTimeout(timeoutId);
    }

    if (!res.ok) {
      // Don't log for common startup scenarios
      if (res.status !== 404) {
        console.warn(
          `SSR: /api/settings answered ${res.status} ${res.statusText} — rendering without settings`
        );
      }
      // Return empty defaults instead of throwing
      return { settings: {}, extensions: [], error: `HTTP ${res.status}` };
    }

    let data;
    try {
      data = await res.json();
    } catch (parseError: any) {
      // A truncated body (connection dropped mid-response) is a transport
      // failure, not malformed JSON from a healthy server — don't cry wolf.
      if (classifyTransportError(parseError) === null) {
        console.warn("SSR: Failed to parse settings response:", parseError);
      }
      return {
        settings: {},
        extensions: [],
        error: "Failed to parse response",
      };
    }

    // Convert settings array to object
    const settingsObj = settingsToObject(data?.settings);

    return {
      settings: settingsObj || {},
      extensions: data?.extensions || [],
      error: null
    };
  } catch (error: any) {
    const kind = classifyTransportError(error);
    if (kind === null) {
      console.error("SSR: Error fetching settings:", error);
    } else {
      // Expected while the backend boots; still worth one line, because the
      // page it renders will be missing every setting.
      console.warn(
        `SSR: /api/settings unreachable — rendering without settings (${transportErrorDetail(error)})`
      );
    }
    // Return empty defaults instead of throwing
    return {
      settings: {},
      extensions: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

function settingsToObject(
  settings: Setting[] | undefined
): Record<string, string> {
  if (!Array.isArray(settings)) return {};
  return settings.reduce(
    (obj, setting) => {
      obj[setting.key] = setting.value instanceof File ? "" : setting.value;
      return obj;
    },
    {} as Record<string, string>
  );
}
