/**
 * Server Action Guard Middleware
 *
 * This app defines ZERO Next.js Server Actions (see .next/server/server-reference-manifest.json:
 * node/edge are both empty). Every request that tries to invoke one is therefore illegitimate:
 *
 * 1. Exploit scanners probing for the React2Shell RCE family (CVE-2025-55182 / CVE-2025-66478)
 *    send POSTs with a junk "Next-Action" header (e.g. "x"). Next.js 16.1.6 is patched, but each
 *    probe reaches the RSC action dispatcher, burns CPU, and logs:
 *      Error: Failed to find Server Action "x". This request might be from an older or newer deployment.
 * 2. Stale browser tabs from builds older than 2026-04-17 (the last build that shipped a real
 *    server action) can replay real 40-hex action IDs that no longer exist — same error, and the
 *    invocation was going to fail regardless; those tabs need a reload either way.
 *
 * With an empty action manifest, Next 16.1.6 emits that log line for exactly two request shapes
 * (node_modules/next/dist/server/app-render/action-handler.js — the !hasServerActions() branch):
 *   - a POST carrying a "Next-Action" header (fetch-based invocation)
 *   - a POST with a multipart/form-data content-type (no-JS form invocation; content-type alone
 *     triggers the dispatcher, the body is not consulted first)
 * URL-encoded POSTs never reach that branch (handleAction bails on isURLEncodedAction before the
 * manifest check), so ordinary third-party form POSTs (e.g. payment-gateway returns) are not
 * action-shaped and are deliberately NOT touched here.
 *
 * Rejecting the two action shapes before rendering (silent 404, same pattern as the
 * malicious-path block in i18n.ts) eliminates the log spam and shields the server-function
 * endpoint from CPU-exhaustion probes. proxy.ts adds header-conditional matcher entries so this
 * also covers paths the general matcher excludes (dotted paths, /assets, /_vercel, ...), which
 * scanners probe too.
 *
 * IMPORTANT: if server actions are ever (re)introduced in this app, set ENABLE_SERVER_ACTIONS=true
 * in the root .env (runtime flag — a pm2 restart is enough, no rebuild) so this guard steps
 * aside — otherwise every action invocation will 404. When enabling actions, also pin
 * NEXT_SERVER_ACTIONS_ENCRYPTION_KEY at build time so action IDs stay stable across product
 * updates (https://nextjs.org/docs/messages/failed-to-find-server-action).
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { MiddlewareFactory } from "./stackHandler";

/**
 * Mirrors Next's own server-action detection (getServerActionRequestMetadata) so we block
 * exactly the shapes that would enter the action dispatcher. The header check is intentionally
 * method-agnostic: no legitimate request ever carries "Next-Action" while this app has no actions.
 */
function isServerActionRequest(request: NextRequest): boolean {
  if (request.headers.get("next-action") !== null) {
    return true;
  }
  return (
    request.method === "POST" &&
    (request.headers.get("content-type") || "").startsWith("multipart/form-data")
  );
}

/**
 * Mirror of the paths the general matcher in proxy.ts excludes. Requests on these paths only
 * reach the middleware via the action-signature matcher entries; when such a request turns out
 * not to be action-shaped (e.g. a GET with a stray multipart content-type on a static asset),
 * it must bypass auth/i18n, which never ran for these paths before the guard existed.
 */
function isExcludedPath(pathname: string): boolean {
  return (
    pathname !== "/" &&
    (/^\/(?:api|_next|_vercel|assets)/.test(pathname) || pathname.includes("."))
  );
}

export const serverActionGuardMiddleware: MiddlewareFactory = (next) => {
  return async (request: NextRequest, event) => {
    // Runtime read on purpose (server-only var, never inlined at build): flipping it in the
    // root .env plus a pm2 restart is enough to disable the guard.
    if (
      process.env.ENABLE_SERVER_ACTIONS !== "true" &&
      isServerActionRequest(request)
    ) {
      // Return 404 immediately without logging to avoid spam (probes are constant background noise)
      return new NextResponse(null, { status: 404 });
    }
    if (isExcludedPath(request.nextUrl.pathname)) {
      return NextResponse.next();
    }
    return next(request, event);
  };
};
