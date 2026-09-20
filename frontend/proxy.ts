import { stackMiddlewares } from "@/middlewares/stackHandler";
import { i18nMiddleware } from "@/middlewares/i18n";
import { authMiddleware } from "@/middlewares/auth";
import { geoMiddleware } from "@/middlewares/geo";
import { serverActionGuardMiddleware } from "@/middlewares/serverActionGuard";

// serverActionGuard must run first: it rejects server-action probe traffic
// (this app defines no server actions) before auth does any token/role work.
//
// geo runs before auth so a restricted visitor is turned away before any
// session work happens, and after serverActionGuard so probe traffic does not
// cost a geo lookup. It exempts /admin outright, so it can never lock staff
// out of the panel that would undo a bad country rule.
const middlewares = [
  serverActionGuardMiddleware,
  geoMiddleware,
  authMiddleware,
  i18nMiddleware,
];

// Next.js 16 requires the function to be named 'proxy'
export default function proxy(...args: Parameters<ReturnType<typeof stackMiddlewares>>) {
  return stackMiddlewares(middlewares)(...args);
}

export const config = {
  matcher: [
    // Match root path specifically
    "/",
    // Match paths for i18n and authentication, excluding API routes, static files, etc.
    "/((?!api|_next|_vercel|assets|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)",
    // Server-action-shaped requests on ALL paths, including the ones excluded above:
    // scanners also probe dotted/static paths, where Next would still invoke the action
    // dispatcher (the not-found route is force-dynamic) and log "Failed to find Server
    // Action". serverActionGuard 404s these; non-action requests that only matched here
    // are passed through untouched (see isExcludedPath in middlewares/serverActionGuard.ts).
    {
      source: "/:path*",
      has: [{ type: "header", key: "next-action" }],
    },
    {
      source: "/:path*",
      has: [
        {
          type: "header",
          key: "content-type",
          value: "multipart/form-data.*",
        },
      ],
    },
  ],
};
