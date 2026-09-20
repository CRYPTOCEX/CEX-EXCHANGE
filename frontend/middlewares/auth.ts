import { NextResponse } from "next/server";
import type { NextRequest, NextFetchEvent } from "next/server";
import { verifyToken } from "@/lib/token/access-token";
import { MiddlewareFactory } from "../types/MiddlewareFactory";
import permissions from "@/middlewares/permissions.json";
import { config as i18nConfig } from "@/i18n/config";

const dev = process.env.NODE_ENV !== "production";
const backendPort = process.env.NEXT_PUBLIC_BACKEND_PORT || 4000;
// SSR always runs on the same machine as the backend
const apiUrl = `http://127.0.0.1:${backendPort}`;

interface Role {
  name: string;
  permissions: string[];
}
interface RolesCache {
  [key: number]: Role;
}
let rolesCache: RolesCache | null = null;
let rolesCachePromise: Promise<void> | null = null;
let rolesCacheExpiry: number = 0;
const ROLES_CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

async function fetchRolesAndPermissions() {
  const now = Date.now();

  // Return cached data if still valid
  if (rolesCache && rolesCacheExpiry > now) {
    return;
  }

  // If already fetching, wait for existing promise
  if (rolesCachePromise) {
    return rolesCachePromise;
  }

  // Create new fetch promise
  rolesCachePromise = (async () => {
    try {
      const endpoint = `${apiUrl}/api/auth/role`;

      // Use AbortController with shorter timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout

      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        next: { revalidate: 300 }, // Cache for 5 minutes
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error(
          `Failed to fetch roles and permissions: ${response.status} ${response.statusText}`
        );
        rolesCache = rolesCache || {}; // Keep old cache on error
        return;
      }

      // Check if response is JSON
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error(
          `Invalid response format: expected JSON, got ${contentType || "unknown"}. Response: ${text}`
        );
        rolesCache = rolesCache || {}; // Keep old cache on error
        return;
      }

      const data = await response.json();
      if (Array.isArray(data)) {
        rolesCache = data.reduce((acc: RolesCache, role: any) => {
          if (role && role.id && role.name && Array.isArray(role.permissions)) {
            acc[role.id] = {
              name: role.name,
              permissions: role.permissions.map((p: any) => p.name),
            };
          }
          return acc;
        }, {});
        // Set cache expiry
        rolesCacheExpiry = now + ROLES_CACHE_TTL;
      } else {
        console.error("Invalid roles data format received");
        rolesCache = rolesCache || {}; // Keep old cache on error
      }
    } catch (error: any) {
      // Silently handle connection errors (ECONNRESET, ECONNREFUSED, abort)
      // These are common during server restarts or high load
      // Note: fetch errors have the code on error.cause, not directly on error
      const errorCode = error?.code || error?.cause?.code;
      const isConnectionError =
        errorCode === "ECONNRESET" ||
        errorCode === "ECONNREFUSED" ||
        error?.name === "AbortError" ||
        error?.message?.includes("aborted") ||
        error?.message?.includes("fetch failed");

      if (!isConnectionError) {
        console.error("Error fetching roles and permissions:", error);
      }
      rolesCache = rolesCache || {}; // Keep old cache on error
    } finally {
      rolesCachePromise = null;
    }
  })();

  return rolesCachePromise;
}

async function refreshToken(request: NextRequest) {
  try {
    // Use AbortController with timeout to prevent hanging connections
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const res = await fetch(`${apiUrl}/api/auth/session`, {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        cookie: request.headers.get("cookie") || "",
      },
      cache: "no-store", // Prevent caching issues
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      // Use getSetCookie() to properly handle multiple Set-Cookie headers
      // res.headers.get("set-cookie") may only return the first cookie
      const cookies = res.headers.getSetCookie?.() || [];
      for (const cookie of cookies) {
        // Match accessToken with or without trailing semicolon
        const match = cookie.match(/^accessToken=([^;]+)/);
        if (match) {
          return match[1];
        }
      }
      // Fallback: try the old method in case getSetCookie is not available
      const setCookie = res.headers.get("set-cookie");
      if (setCookie) {
        const accessToken = setCookie.match(/accessToken=([^;]+)/)?.[1];
        if (accessToken) {
          return accessToken;
        }
      }
    } else {
      console.error("Failed to refresh token:", res.status, res.statusText);
    }
  } catch (error: any) {
    // Silently handle connection errors (ECONNRESET, ECONNREFUSED, abort)
    // Note: fetch errors have the code on error.cause, not directly on error
    const errorCode = error?.code || error?.cause?.code;
    const isConnectionError =
      errorCode === "ECONNRESET" ||
      errorCode === "ECONNREFUSED" ||
      error?.name === "AbortError" ||
      error?.message?.includes("aborted") ||
      error?.message?.includes("fetch failed");

    if (!isConnectionError) {
      console.error("Error refreshing token:", error);
    }
  }
  return null;
}

const AUTH_PAGES = ["/auth"];
const defaultUserPath = process.env.NEXT_PUBLIC_DEFAULT_USER_PATH || "/user";

/**
 * Paths that mean nothing without a session, and so must not be rendered to a
 * signed-out visitor at all.
 *
 * Only `/admin` was guarded here; every other private page relied on the page
 * itself noticing. Most of them happen to render a site header with a "Sign in"
 * button, which reads like a guard but is not one — and `/user/profile`, which
 * has no header, rendered its whole shell to a visitor: "Back to Dashboard",
 * a completion ring at 0%, empty Profile and Security tabs. A dead end that
 * looks like an empty account.
 *
 * Redirecting here (rather than teaching each page) puts one answer in front of
 * the whole group, and carries a `return` so the visitor lands where they meant
 * to go after signing in — the same contract AUTH_PAGES already honours above.
 */
const PRIVATE_PREFIXES = [
  "/user",
  "/finance",
  "/binary",
  // Whole sections above; individual paths below, because their parents are
  // genuinely public. `/investment` and `/support` are landing pages anyone may
  // read, and `/blog/author` plus `/blog/author/[id]` are public author profiles
  // — only the account-specific pages underneath them are private.
  //
  // Each of these rendered its private shell to a visitor: an empty ticket list
  // with its counters at zero, a "your posts" manager with no posts, an
  // investment dashboard with nothing in it.
  //
  // `/blog/author/apply` is deliberately NOT here. It is the page that recruits
  // authors, so a visitor should be able to read the guidelines; it was fixed at
  // the page instead (it never stopped loading without a user id, and its Apply
  // button did nothing) rather than hidden behind a sign-in.
  "/investment/dashboard",
  "/investment/history",
  "/support/ticket",
  "/blog/author/manage",
];
// Maintenance mode is now handled by a separate maintenance server
// that runs automatically when the main server is stopped


// === PERMISSIONS MATCHER ===
function matchPermission(strippedPath: string): string | null {
  // 1. Exact match
  const matched = permissions.find((perm) => perm.path === strippedPath);
  if (matched) return matched.permission;

  // 2. Dynamic segments ([id], [slug], etc)
  for (const perm of permissions) {
    const regex = new RegExp(
      "^" + perm.path.replace(/\[.*?\]/g, "[^/]+") + "$"
    );
    if (regex.test(strippedPath)) return perm.permission;
  }
  return null;
}

async function hasPermission(roleId: number, strippedPath: string) {
  if (!rolesCache || Object.keys(rolesCache).length === 0) return false;
  const role = rolesCache[roleId];
  if (!role) return false;
  if (role.name === "Super Admin") return true;

  const requiredPermission = matchPermission(strippedPath);
  // Fail closed: unlisted admin paths require the base "access.admin"
  // permission rather than being granted by default.
  if (!requiredPermission) return role.permissions.includes("access.admin");
  return role.permissions.includes(requiredPermission);
}

export const authMiddleware: MiddlewareFactory =
  (next) => async (request: NextRequest, event: NextFetchEvent) => {
    const { pathname } = request.nextUrl;
    const locales = i18nConfig.locales;
    // Extract locale from path, e.g. /en/admin
    let strippedPath = pathname;
    let currentLocale: string | null = null;
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length > 0 && locales.includes(segments[0])) {
      currentLocale = segments[0];
      strippedPath = "/" + segments.slice(1).join("/");
    }
    // Fetch roles if not loaded - non-blocking for first request
    if (!rolesCache) {
      // Initialize empty cache to prevent blocking on first load
      rolesCache = {};
      // Fetch in background without awaiting
      fetchRolesAndPermissions().catch(err =>
        console.error("Background role fetch failed:", err)
      );
    } else if (Object.keys(rolesCache).length === 0 || rolesCacheExpiry < Date.now()) {
      // Only await if cache is expired and we have time
      await fetchRolesAndPermissions();
    }

    const accessToken = request.cookies.get("accessToken")?.value;
    let payload: any = null;
    let isTokenValid = false;
    let refreshedAccessToken: string | null = null;

    if (accessToken) {
      const verified = await verifyToken(accessToken);
      if (verified) {
        payload = verified;
        isTokenValid = true;
      }
    }
    if (!isTokenValid) {
      const sessionId = request.cookies.get("sessionId")?.value;
      if (sessionId) {
        try {
          const newAccessToken = await refreshToken(request);
          if (newAccessToken) {
            const verified = await verifyToken(newAccessToken);
            if (verified) {
              payload = verified;
              isTokenValid = true;
              refreshedAccessToken = newAccessToken;
            }
          }
        } catch (error) {
          console.error("Error during token refresh:", error);
          // Continue with invalid token state
        }
      }
    }

    // A refreshed token must ride on whatever response ends this request.
    // Returning early right after the refresh would skip the permission
    // checks below AND the i18n middleware, so locale-less URLs (e.g. the
    // license page's window.location redirects) would 404 instead of being
    // redirected to /<locale>/...
    const withRefreshedToken = (response: unknown) => {
      if (refreshedAccessToken && response instanceof NextResponse) {
        response.cookies.set("accessToken", refreshedAccessToken, {
          httpOnly: true,
          secure: !dev,
          sameSite: "lax",
          path: "/",
        });
      }
      return response as any;
    };

    // Maintenance mode removed - handled by separate maintenance server

    // If logged in and tries to access auth page, redirect to defaultUserPath
    if (
      isTokenValid &&
      AUTH_PAGES.some((page) => strippedPath.startsWith(page))
    ) {
      const returnUrl =
        request.nextUrl.searchParams.get("return") || defaultUserPath;
      const url = request.nextUrl.clone();
      url.pathname = currentLocale
        ? `/${currentLocale}${returnUrl}`
        : returnUrl;
      url.searchParams.delete("return");
      return withRefreshedToken(NextResponse.redirect(url));
    }

    // A signed-out visitor has no business on a private page.
    if (
      !isTokenValid &&
      PRIVATE_PREFIXES.some(
        (prefix) => strippedPath === prefix || strippedPath.startsWith(`${prefix}/`)
      )
    ) {
      const url = request.nextUrl.clone();
      url.pathname = currentLocale ? `/${currentLocale}/login` : "/login";
      url.search = "";
      url.searchParams.set("return", strippedPath);
      return withRefreshedToken(NextResponse.redirect(url));
    }

    // Handle admin routes
    if (strippedPath.startsWith("/admin")) {
      const authParam = request.nextUrl.searchParams.get("auth");

      if (!isTokenValid) {
        // No session at all: send them to sign in, like every other private
        // path. Leaving them on `?auth=false` rendered the admin shell around
        // the backend's own words — "Error loading dashboard / Authentication
        // Required: Missing session ID" with a Retry button — which reads as a
        // broken site rather than "please sign in".
        //
        // `auth=false` is kept below for the case it was designed for: a caller
        // who IS signed in but lacks the permission, where a redirect to login
        // would be both wrong and a loop.
        const url = request.nextUrl.clone();
        url.pathname = currentLocale ? `/${currentLocale}/login` : "/login";
        url.search = "";
        url.searchParams.set("return", strippedPath);
        return withRefreshedToken(NextResponse.redirect(url));
      } else {
        // User is authenticated, check permissions
        const roleId = payload?.sub?.role;

        if (roleId && (await hasPermission(roleId, strippedPath))) {
          // User has permission, remove auth parameter if present and allow access
          if (authParam === "false") {
            const url = request.nextUrl.clone();
            url.searchParams.delete("auth");
            return withRefreshedToken(NextResponse.redirect(url));
          }
          // User has access, continue normally
        } else {
          // User is authenticated but doesn't have admin permissions
          if (authParam !== "false") {
            const url = request.nextUrl.clone();
            url.searchParams.set("auth", "false");
            return withRefreshedToken(NextResponse.redirect(url));
          }
          // If auth=false is already present, let the request continue to show no permission state
        }
      }
    }

    // Continue to next middleware
    return withRefreshedToken(await next(request, event));
  };
