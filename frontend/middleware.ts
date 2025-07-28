import { stackMiddlewares } from "@/middlewares/stackHandler";
import { i18nMiddleware } from "@/middlewares/i18n";
import { authMiddleware } from "@/middlewares/auth";

const middlewares = [authMiddleware, i18nMiddleware];

export default stackMiddlewares(middlewares);

export const config = {
  matcher: [
    // Match root path specifically
    "/",
    // Match paths for i18n and authentication, excluding API routes, static files, etc.
    "/((?!api|_next|_vercel|assets|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)",
  ],
};
