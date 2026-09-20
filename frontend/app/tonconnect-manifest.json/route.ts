import { NextResponse } from "next/server";

/**
 * TON Connect's app manifest, SERVED rather than shipped as a static file.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY IT IS A ROUTE AND NOT `public/tonconnect-manifest.json`.
 *
 * TON Connect validates that the manifest's `url` matches the origin the dapp is
 * served from — and it is fetched by THE WALLET, not by the browser. On a phone
 * that fetch comes over the TON Connect bridge from the wallet's own network.
 *
 * A static file has to hardcode an origin, and this product is deployed by
 * operators to hosts nobody here knows. A hardcoded `example.com` fails the
 * origin check; a hardcoded production domain breaks every staging install. And
 * the failure is quiet: the wallet shows a blank app name and refuses to
 * connect, with nothing in our logs and nothing in the browser console.
 *
 * Built from the REQUEST instead, so one build is correct on every host the
 * operator points at it.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * `x-forwarded-*` IS READ FIRST because this app runs behind a reverse proxy on
 * essentially every real deployment. `request.url` there reports the internal
 * origin — `http://localhost:3000` — which is exactly the value that would fail
 * the wallet's origin check while working perfectly in local development.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const headers = request.headers;

  const proto = headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const host = headers.get("x-forwarded-host") ?? headers.get("host") ?? url.host;
  const origin = `${proto}://${host}`;

  const name = process.env.NEXT_PUBLIC_SITE_NAME || "Bicrypto";

  return NextResponse.json(
    {
      url: origin,
      /*
        TON Connect renders this in the wallet's approval sheet, so it is what a
        user reads when deciding whether to sign. The site's own name, not
        "Swap" — the user connected to this site, and a name they do not
        recognise on a signing prompt is a reason to refuse.
      */
      name,
      iconUrl: `${origin}/img/logo/logo.png`,
    },
    {
      headers: {
        /*
          CORS IS REQUIRED. The manifest is fetched cross-origin by the wallet
          (and by the TON Connect bridge), so without this the fetch is blocked
          and the connection fails with no useful error anywhere.
        */
        "access-control-allow-origin": "*",
        // Short, because the origin is per-host and an operator changing their
        // domain should not be serving a stale one for a day.
        "cache-control": "public, max-age=300",
      },
    }
  );
}
