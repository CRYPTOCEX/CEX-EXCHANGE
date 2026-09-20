import { NextProxy, NextResponse } from "next/server";

export type MiddlewareFactory = (middleware: NextProxy) => NextProxy;

/**
 * The request header the terminal below stamps with the current path.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS EXISTS
 * ---------------------------------------------------------------------------
 * App Router hands a layout only `params`. `app/[locale]/layout.tsx` therefore
 * knows the locale but NOT the path, which is why it ships the CORE translation
 * set and leaves the current route's remainder — including the ~69 KB menu
 * chunk — to `TranslationProvider` to fetch after hydration. That works, but the
 * fetch cannot start until the client bundle has booted, so nav labels spend
 * that window showing their English fallback on a non-English install.
 *
 * With the path in a header the layout can resolve the route itself and
 * `preload()` those exact chunks, so the browser starts fetching them while it
 * is still parsing the HTML instead of after hydration. It does NOT ship them in
 * the document — that would be 69 KB on every response, forever, to fix a blip
 * that lasts one page load.
 *
 * ---------------------------------------------------------------------------
 * IT IS A HINT, AND MUST ONLY EVER BE USED AS ONE
 * ---------------------------------------------------------------------------
 * A client can send `x-pathname` itself. The terminal OVERWRITES it on every
 * request it handles, so a spoofed value cannot survive on any route that
 * renders — but `proxy.ts`'s matcher deliberately excludes `/api`, `/_next` and
 * static paths, and nothing overwrites it there. So never make an authorisation
 * or routing decision from this value. Picking which translation chunk to hint
 * at is exactly the right weight of decision: the worst a forged header can do
 * is warm the wrong JSON file.
 */
export const PATHNAME_HEADER = "x-pathname";

export function stackMiddlewares(
  functions: MiddlewareFactory[] = [],
  index = 0
): NextProxy {
  const current = functions[index];
  if (current) {
    const next = stackMiddlewares(functions, index + 1);
    return current(next);
  }
  /* THE TERMINAL IS THE ONLY PLACE THIS CAN GO.
     -------------------------------------------------------------------------
     Every middleware in the stack either returns a response of its own (a
     redirect, a 404 — none of which render a layout) or delegates until it
     reaches here, so stamping the header at the end covers every request that
     actually renders, without any of the four middlewares needing to know about
     it.

     `NextResponse.next({ request })` is what makes the header visible to the
     render; it encodes the override onto the response for Next to apply to the
     onward request. That override travels with THIS response object, so a
     middleware upstream that mutates and returns it (i18n adds a locale cookie
     on one branch) keeps it, while one that builds a fresh `NextResponse.next()`
     would drop it. Nothing does the latter today on a path that renders — and
     it would degrade to the pre-existing behaviour, a slightly later chunk
     fetch, rather than break. */
  return (request) => {
    const headers = new Headers(request.headers);
    headers.set(PATHNAME_HEADER, request.nextUrl.pathname);
    return NextResponse.next({ request: { headers } });
  };
}
