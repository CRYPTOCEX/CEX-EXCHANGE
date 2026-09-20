import type { Metadata } from "next";
import HomeRouteClient from "./components/home-route-client";
import { fetchDefaultPage, readStoredSeo } from "./components/page-seo";
import type { LandingStats } from "./home";
import { fetchLanding } from "@/lib/fetchers/landing";
import { getSettings } from "@/lib/fetchers/settings";

/**
 * The home page's stored SEO, finally reachable.
 *
 * This route was a "use client" component, which cannot export
 * `generateMetadata` — so the most-visited page on the site had nothing but
 * the root layout's `NEXT_PUBLIC_SITE_NAME` fallback in its title, and the SEO
 * fields the default-page editor writes for `home` went nowhere. The client
 * half now lives in `./components/home-route-client`.
 *
 * Two stores are consulted, in the order an owner would expect:
 *
 *   `meta`       what the editor's SEO tab writes, so hand-typed input wins.
 *   `variables`  the home document, whose `seo` block the backend seeds. It is
 *                passed whole rather than as `variables.seo` because
 *                `readStoredSeo` looks for the nested shape itself.
 *
 * Anything still missing is simply omitted: a page that returns no title
 * inherits the layout's `title.default`, whereas returning the site name here
 * would be run through the layout's "%s - {site}" template and printed twice.
 */
export async function generateMetadata(): Promise<Metadata> {
  const data = await fetchDefaultPage("home");
  if (!data) return {};

  const stored = readStoredSeo(data.meta);
  const seeded = readStoredSeo(data.variables);

  const title = stored.title ?? seeded.title;
  const description = stored.description ?? seeded.description;
  const keywords = stored.keywords ?? seeded.keywords;

  return {
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    ...(keywords ? { keywords } : {}),
  };
}

/**
 * The home route, rendered on the server with the owner's real page.
 * ============================================================================
 *
 * MEASURED: this route was the last one on the site over Google's CLS
 * threshold — 0.101, page height +80px between the pending and settled passes.
 * Everything below is what those two numbers turned out to be, and they were
 * two separate defects that happened to land in the same second. Both are the
 * failure mode `plans/SKELETONS.md` calls "the server rendered a different
 * page", and neither is a skeleton-sizing bug: the harness counted 21 sections
 * in both passes.
 *
 * DEFECT 1 — CONTENT SUBSTITUTION, the +80px.
 *
 *   DISAPPEARED  -565px  "Start Trading in Minutes"    <- built-in default copy
 *   APPEARED     +585px  "Start Your Trading Journey"  <- the owner's stored copy
 *   RESIZED       +60px  "Built for Professional Traders"  (630 -> 690)
 *                 ----
 *                  +80px, exactly the page-height delta
 *
 * `DefaultHomePage` reads every heading, step list and feature list out of
 * `variables` on the `home` default-page document, and it was fetching that
 * document from the BROWSER. So the server shipped the built-in fallback copy
 * baked into the JSX, the document landed a second later, and three sections
 * ~13,000px down the page changed their text and therefore their height.
 *
 * DEFECT 2 — SIXTEEN MISSING SECTIONS, the whole 0.0885 frame at ~1.4s.
 *
 * The frame the harness blamed was NOT the copy swap. Its source was the
 * "Built for Professional Traders" section going from viewport y=828 to
 * nothing, and it read y=828 because at that moment it sat directly under the
 * hero: the ~11,700px of product sections that belong above it did not exist.
 * They are derived from `settings` / `extensions`, which `DefaultHomePage` read
 * from `useConfigStore` — filled by `<Providers>` from an EFFECT, and effects
 * do not run on the server. `plans/SKELETONS.md` catalogues this exact instance
 * ("16 sections missing from the server HTML"); confirmed by fetching `/en`
 * directly, whose HTML contained no "Trade with precision", no "Amplify your
 * trades", no product section at all.
 *
 * BOTH are fixed the same way, which is the way that file prescribes: anything
 * that decides a BOX arrives as a prop through the server render.
 *
 * NO DOUBLE FETCH, and this route asks for three things.
 *
 *   `fetchDefaultPage("home")` is also called by `generateMetadata` above, for
 *   the `seo` block on the same document. Next runs metadata and the page body
 *   in ONE render pass, and that function is wrapped in React's `cache()`, so
 *   the second caller never reaches `fetch`.
 *
 *   `getSettings()` is already called by the locale layout, for `<Providers>`.
 *   It has been `cache()`d since it was written, for exactly this reason, so
 *   this is a memo hit rather than a second `/api/settings` request.
 *
 *   `fetchLanding("/api/content/landing-stats")` is the one genuinely NEW
 *   request, and it has no second caller — `generateMetadata` does not touch it.
 *   It replaces a browser request rather than adding to one: the effect in
 *   `./home` now fetches only whichever of its two payloads arrived `null`.
 *   The trade is a slower TTFB for a homepage that does not rearrange itself
 *   after paint. That endpoint runs 47 aggregates with no response cache, so
 *   if it ever becomes the reason `/` feels slow, the fix is a short TTL
 *   inside the endpoint, not a fetch cache out here — see
 *   `lib/fetchers/landing.ts` for why.
 *
 * Neither is a cache with a lifetime — both are request-scoped memoisation and
 * cannot serve a stale value, which is the property `lib/fetchers/chrome.ts`
 * and `lib/fetchers/settings.ts` each paid for once already.
 *
 * ABSENT DOCUMENT. A fresh install has no `home` row, and `fetchDefaultPage`
 * answers `null` for that and for every failure (backend down, non-2xx, bad
 * JSON). `null` flows straight through to `DefaultHomePage`, whose `getContent`
 * helper already returns its `defaultValue` when `variables` is missing — so
 * the built-in copy renders, and it renders on the SERVER. `getSettings()` is
 * the same shape of promise: it never throws and answers `{}` when the backend
 * is unreachable. The fallback is a server decision in every direction;
 * nothing waits for the client to make it.
 */
export default async function Home(): Promise<React.JSX.Element> {
  /* All three in parallel, deliberately. The landing stats are NOT gated on
     `landingPageType` even though a CUSTOM install renders a builder document:
     `showBuilderPage` in `./components/home-route-client` requires
     `hasMounted`, which is false on the server by construction, so the
     built-in homepage is what every install server-renders. Gating would
     serialise this fetch behind `getSettings()` to save a request on a branch
     that needs it anyway. */
  const [homeDocument, config, landingStats] = await Promise.all([
    fetchDefaultPage("home"),
    getSettings(),
    fetchLanding<LandingStats>("/api/content/landing-stats"),
  ]);

  /* `getSettings()` returns `settings: Record<string, string>` on the happy
     path and a bare `{}` on each of its four failure paths, so its inferred
     type is a union that no key can be read off. Widened once, here, rather
     than re-narrowed at every use — and `any` rather than `string` because
     settings are TEXT in the database but arrive already coerced to booleans
     for some keys, which is a distinction `settingsToObject` does not draw. */
  const settings = (config.settings ?? {}) as Record<string, any>;
  const extensions = (config.extensions ?? []) as string[];

  /* `landingPageType` decides WHICH TREE renders — the built-in homepage or a
     builder document — which is precisely the class of decision
     `lib/fetchers/chrome.ts` exists to keep off the client, and whose header
     comment names THIS page as the failure it was written to avoid. Resolved
     here, it arrives as a prop and the client's `setTimeout(100)` guess goes
     away.

     Coerced to the two ids rather than passed through, for the same reason
     `normalizeChrome` coerces: settings are TEXT, an unset key reads as
     `undefined`, and `config/menu.ts` already resolves this exact key as
     `settings?.landingPageType || "DEFAULT"`. Anything that is not the literal
     "CUSTOM" means the platform's own homepage. */
  const landingPageType =
    settings?.landingPageType === "CUSTOM" ? "CUSTOM" : "DEFAULT";

  /* `null`, not `{}` / `[]`, when the backend did not answer. Downstream this
     is the difference between "spot is switched off" and "we have not been
     told" — `settingsKnown` in `../home` tests for exactly this — and an empty
     object would assert the first while meaning the second. `getSettings()`
     returns `{}` on failure AND `error` set, so the error field is what
     distinguishes them here. */
  const settingsResolved = Object.keys(settings).length > 0;

  return (
    <HomeRouteClient
      landingPageType={landingPageType}
      homeDocument={homeDocument}
      initialStats={landingStats}
      initialSettings={settingsResolved ? settings : null}
      initialExtensions={settingsResolved ? extensions : null}
    />
  );
}
