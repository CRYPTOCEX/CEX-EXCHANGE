/**
 * Geographic Restriction Middleware (page requests)
 *
 * The backend gate covers the API. Pages are served by Next, never touch the
 * uWebSockets server, and would therefore stay fully browsable to a restricted
 * visitor — they would see the whole product and only hit a wall once a call
 * was made. This closes that half.
 *
 * How it works:
 *   1. Skip anything that must stay reachable (the notice page itself, static
 *      assets, auth pages when the wind-down carve-out is on).
 *   2. Ask the backend for a verdict, relaying the visitor's address and CDN
 *      geo headers so the decision is made on the real client, not on the SSR
 *      hop's loopback address.
 *   3. Cache the verdict per address for a short window — a page load is many
 *      requests, and one backend round-trip per navigation would be a
 *      noticeable tax on every visitor, restricted or not.
 *
 * Failure is always ALLOW here. The backend gate is the authoritative control
 * and still refuses the API calls; if this middleware cannot reach it, taking
 * the whole site down as well would turn a backend blip into a total outage.
 */

import { NextResponse } from "next/server";
import type { NextRequest, NextFetchEvent } from "next/server";
import { MiddlewareFactory } from "./stackHandler";
import { config as i18nConfig } from "@/i18n/config";
import { matchablePath } from "./geo-path";

const backendPort = process.env.NEXT_PUBLIC_BACKEND_PORT || 4000;
// SSR runs on the same machine as the backend (same assumption as auth.ts).
const apiUrl = `http://127.0.0.1:${backendPort}`;

/** Where a restricted visitor is sent. */
const RESTRICTED_PATH = "/restricted";

/**
 * Paths that must never be redirected.
 *
 * `/restricted` itself is the obvious one — redirecting it would loop. The
 * others are the page-level twin of the backend's wind-down carve-out: an
 * existing customer in a newly restricted country still needs to reach the
 * login form and their wallet to get their balance out. The backend decides
 * whether that carve-out applies; these entries just make sure the page can
 * be rendered when it does.
 */
const ALWAYS_ALLOWED_PATHS = [
  RESTRICTED_PATH,
  "/login",
  "/logout",
  "/register/verify",
  "/reset",
  "/confirm",
  "/unsubscribe",
  "/error-page",
  "/support",
  // Admin pages carry their own bypass on the backend; locking staff out of
  // the panel that undoes a bad rule is the one failure mode this feature
  // must never have.
  "/admin",
];

/** CDN geo headers relayed verbatim so the backend sees the same evidence. */
const GEO_HEADERS = [
  "cf-ipcountry",
  "cf-connecting-ip",
  "cloudfront-viewer-country",
  "x-vercel-ip-country",
  "fastly-geo-country",
  "x-appengine-country",
  "x-geo-country",
  "x-country-code",
  "true-client-ip",
  "x-real-ip",
  "x-forwarded-for",
];

interface GeoVerdict {
  enabled: boolean;
  restricted: boolean;
}

/**
 * Per-address verdict cache, held in the middleware process.
 *
 * Deliberately NOT a cookie: a cookie carrying "you are allowed" would be
 * trivially forgeable and would hand every visitor a bypass. Server-side
 * memory cannot be touched by the client.
 */
const verdictCache = new Map<string, { verdict: GeoVerdict; expiresAt: number }>();
const CACHE_TTL_MS = 60_000;
const CACHE_LIMIT = 10_000;

/**
 * Feature-off latch.
 *
 * The feature ships disabled, and while it is disabled the answer is the same
 * for every visitor — so caching it per address would still cost one backend
 * round-trip per address per minute for a feature nobody switched on. This
 * latch collapses that to a single probe every few minutes for the whole
 * process, and short-circuits before any address handling at all.
 *
 * Re-probed rather than latched permanently so that enabling the feature takes
 * effect on its own, without a frontend restart.
 */
const DISABLED_RECHECK_MS = 300_000;
let disabledUntil = 0;

function readCache(key: string): GeoVerdict | null {
  const hit = verdictCache.get(key);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) {
    verdictCache.delete(key);
    return null;
  }
  return hit.verdict;
}

function writeCache(key: string, verdict: GeoVerdict): void {
  if (verdictCache.size >= CACHE_LIMIT) {
    // Insertion-ordered, so the first keys are the oldest. Shed a slice rather
    // than one entry to avoid churning on every write once full.
    let toDrop = Math.ceil(CACHE_LIMIT * 0.1);
    for (const key of verdictCache.keys()) {
      verdictCache.delete(key);
      if (--toDrop <= 0) break;
    }
  }
  verdictCache.set(key, { verdict, expiresAt: Date.now() + CACHE_TTL_MS });
}

/** Strips the locale prefix so the allowlist can be written once. */
function stripLocale(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length && i18nConfig.locales.includes(segments[0])) {
    return `/${segments.slice(1).join("/")}`;
  }
  return pathname;
}

function isAlwaysAllowed(path: string): boolean {
  if (path === "/") return false;
  return ALWAYS_ALLOWED_PATHS.some(
    (allowed) => path === allowed || path.startsWith(`${allowed}/`)
  );
}

/** Best-effort client address, used only as a cache key here. */
function clientAddress(request: NextRequest): string {
  for (const header of ["cf-connecting-ip", "true-client-ip", "x-real-ip"]) {
    const value = request.headers.get(header);
    if (value) return value.trim();
  }
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}

async function fetchVerdict(
  request: NextRequest,
  address: string,
  path: string
): Promise<GeoVerdict | null> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  for (const name of GEO_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers[name] = value;
  }
  // Relayed explicitly for the case where the backend is directly exposed
  // (TRUST_PROXY off): it honours this header only from a loopback peer, which
  // is exactly this server-side call.
  if (address !== "unknown") headers["x-geo-client-ip"] = address;

  try {
    const controller = new AbortController();
    // Tight budget: this sits in front of every page render, so a slow backend
    // must degrade to "allow" quickly rather than stall the response.
    const timer = setTimeout(() => controller.abort(), 1500);

    const response = await fetch(
      `${apiUrl}/api/geo/status?path=${encodeURIComponent(path)}`,
      { method: "GET", headers, cache: "no-store", signal: controller.signal }
    );
    clearTimeout(timer);

    if (!response.ok) return null;
    const data = await response.json();
    if (typeof data?.restricted !== "boolean") return null;
    return { enabled: Boolean(data.enabled), restricted: data.restricted };
  } catch {
    // Network error, timeout, backend restarting — fall through to allow.
    return null;
  }
}

export const geoMiddleware: MiddlewareFactory =
  (next) => async (request: NextRequest, event: NextFetchEvent) => {
    // Feature off (the shipped default): hand straight back to the next
    // middleware without reading the path, the address or anything else. This
    // is the branch every request takes on an install that never enabled geo
    // restrictions, so it must cost nothing.
    if (Date.now() < disabledUntil) {
      return next(request, event);
    }

    const { pathname } = request.nextUrl;
    const path = stripLocale(pathname);

    if (isAlwaysAllowed(path)) {
      return next(request, event);
    }

    const address = clientAddress(request);
    // Reduced ONCE, then used for both the question and the key it is cached
    // under. Keying on the raw path would let a scanner mint a fresh cache
    // entry per probe — thousands of distinct junk first segments, all of them
    // asking the identical question — and push real visitors' verdicts out of a
    // cache that sheds its oldest tenth when full.
    const lookupPath = matchablePath(path);
    const cacheKey = `${address}|${lookupPath.split("/")[1] || "root"}`;

    let verdict = readCache(cacheKey);
    if (!verdict) {
      const fetched = await fetchVerdict(request, address, lookupPath);
      // A failed lookup is not cached: the next navigation should try again
      // rather than inherit a minute of "unknown means allowed".
      if (!fetched) return next(request, event);
      verdict = fetched;

      if (!verdict.enabled) {
        // Latch the whole process rather than this one address — see
        // DISABLED_RECHECK_MS. Re-probed periodically so switching the feature
        // on takes effect without restarting the frontend.
        disabledUntil = Date.now() + DISABLED_RECHECK_MS;
        return next(request, event);
      }

      writeCache(cacheKey, verdict);
    }

    if (!verdict.enabled || !verdict.restricted) {
      return next(request, event);
    }

    const segments = pathname.split("/").filter(Boolean);
    const locale = i18nConfig.locales.includes(segments[0]) ? segments[0] : null;

    const url = request.nextUrl.clone();
    url.pathname = locale ? `/${locale}${RESTRICTED_PATH}` : RESTRICTED_PATH;
    url.search = "";
    return NextResponse.redirect(url);
  };
