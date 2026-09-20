// RootLayout.tsx (Updated for Custom i18n)
import React from "react";
import "../fonts.css";
import "../globals.css";
import Providers from "@/provider/providers";
import DirectionProvider from "@/provider/direction.provider";
import { config } from "@/i18n/config";
import { isRTL } from "@/i18n/utils";
import { TranslationProvider } from "next-intl";
import { loadLayoutMessages, routeChunkUrls, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
/* `preload` is React's resource hint, not a Next helper. It is exported by
   react-dom's `react-server` build, so it is callable from this Server
   Component and React hoists what it emits into <head>. See the call site. */
import { preload } from "react-dom";
import { getUserProfile } from "@/lib/fetchers/user";
import { getSettings } from "@/lib/fetchers/settings";
import ConditionalLayoutProvider from "@/components/layout/conditional-layout-provider";
import { ChromeProvider } from "@/components/chrome/chrome-provider";
import { AdminChromeProvider } from "@/components/chrome/admin-chrome-provider";
import { getChrome } from "@/lib/fetchers/chrome";
import {
  buildChromeMetricsCss,
  CHROME_METRICS_STYLE_HREF,
} from "@/lib/chrome/variants";
import { SettingsStatus } from "@/components/development/settings-status";
import { GlobalAuthDetector } from "@/components/auth/global-auth-detector";
import GuidanceHost from "@/components/guidance/guidance-host";
import AdminAssistant from "@/components/admin-assistant/admin-assistant-lazy";
import { PRELOAD_FONTS } from "@/lib/fonts-preload";
import { ThemeTransition } from "@/components/theme-transition";
import {
  buildThemeCss,
  parseStoredTheme,
  DESIGN_THEME_SETTING_KEY,
  DESIGN_THEME_STYLE_HREF,
} from "@/lib/design-theme";

/* ---------------------------------------------------------------------------
   TYPEFACES — ten families, VENDORED. See `app/fonts.css`.
   ---------------------------------------------------------------------------
   These used to be ten `next/font/google` calls right here. They are now a
   plain stylesheet plus the woff2 files in `public/fonts/`, generated from
   next/font's own output by `scripts/vendor-fonts.mjs` — read that file's
   header before changing anything here, including how to add a family.

   WHY. `next/font/google` fetches every woff2 from fonts.gstatic.com at COMPILE
   time, which made two different failures possible. Turbopack's fetcher has no
   retry and memoizes the failure, so on 2026-08-06 a single dropped connection
   out of 51 downloads (Inter's Cyrillic subset) took every route in the app to
   a 500 for the rest of the dev session. Worse, the same fetch runs during
   `next build`, so a customer on a firewalled server — or in a region that
   blocks Google — could not build the frontend at all. Neither failure names
   the network: both surface as `Can't resolve
   '@vercel/turbopack-next/internal/font/google/font'`.

   WHAT IS PRESERVED. The generated CSS is next/font's, copied rather than
   re-derived, so all of the following still hold exactly as before:

   · Prices, sizes and balances are set in JetBrains Mono (DESIGN-SYSTEM.md R4).

   · SELECTABLE TYPEFACES — the admin design manager's typography axis. The
     owner picks a family in /admin/content/design and it lands in `--font-sans`
     (see lib/design-theme.ts FONT_STACKS). All ten are declared, but only ONE
     is ever painted, and a declared-but-unselected family costs disk — not
     runtime bytes. That is bought by NOT preloading them: `PRELOAD_FONTS` holds
     only the latin subset of the three always-painted families (Geist, Geist
     Mono, JetBrains Mono, ~82 KB). Preloading all ten would make the browser
     eagerly fetch every woff2 on every page, which is exactly the "affects
     performance" failure this feature must not have. Unpreloaded, the CSS
     carries a few `@font-face` blocks and the browser fetches a file only when
     text actually renders in it.

   · The selectable families keep `font-display: optional`, not `swap`, and this
     is the one place the "no layout shift" promise is bought rather than
     inherited. Because they are not preloaded, a selected font is discovered
     only after the CSS is parsed. Under `swap` the browser would paint in the
     fallback and then re-paint in the real face, reflowing every line of text —
     on a fast connection invisible (measured: the font arrived in 12ms locally
     and added 0.000 CLS against a true no-theme baseline), but on a slow one a
     real shift. `optional` removes the possibility entirely: the face is used
     if it arrives inside the block period and otherwise skipped for that page
     load, so there is never a swap to reflow. The cost is honest and small: a
     first-time visitor on a slow connection sees the metric-matched fallback
     instead of the chosen face, and every later navigation gets the real one
     from cache. The three DEFAULT families keep `swap` + a preload, so an owner
     who changes nothing is unaffected.

   · Each family still has its metric-matched `"<Family> Fallback"` face
     (`size-adjust`, `ascent-override`, …). That face is what makes `optional`
     shift-free, and it is computed by next/font from capsize metrics rather
     than served by Google — which is precisely why the generator copies
     next/font's output instead of calling the Google API itself.

   The `--font-*` variables are declared on `:root` by `fonts.css`, so unlike
   the hashed classes next/font returned there is nothing left to attach to the
   wrong element (see the <html> comment further down for the bug that was).
   --------------------------------------------------------------------------- */

export const metadata = {
  title: {
    default: process.env.NEXT_PUBLIC_SITE_NAME || "My App",
    template: `%s - ${process.env.NEXT_PUBLIC_SITE_NAME || "My App"}`,
  },
  description: process.env.NEXT_PUBLIC_SITE_DESCRIPTION || "My App Description",
};

// Type for settings result with fallback flag
type SettingsResult = {
  settings: Record<string, any>;
  extensions: any[];
  _fallback?: boolean;
};

// Safe wrapper for SSR API calls with better error handling
async function safeGetUserProfile(retries = 2) {
  const isDevelopment = process.env.NODE_ENV === "development";

  for (let i = 0; i < retries; i++) {
    try {
      const profile = await getUserProfile();
      return profile;
    } catch (error) {
      const isLastAttempt = i === retries - 1;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (isDevelopment) {
        console.warn(
          `SSR: Profile fetch attempt ${i + 1}/${retries} failed:`,
          errorMessage
        );
      }

      if (isLastAttempt) {
        if (isDevelopment) {
          console.warn(
            "SSR: All profile fetch attempts failed, continuing without profile"
          );
        }
        return null;
      }

      // Shorter wait for profile as it's less critical
      if (isDevelopment && i < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }
  }

  return null;
}

async function safeGetSettings(retries = 3): Promise<SettingsResult> {
  const isDevelopment = process.env.NODE_ENV === "development";

  for (let i = 0; i < retries; i++) {
    try {
      const result = await getSettings();
      if (result && (result.settings || result.extensions)) {
        return result as SettingsResult;
      }
      // If result is empty but no error, treat as failed attempt
      throw new Error("Empty settings result");
    } catch (error) {
      const isLastAttempt = i === retries - 1;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (isDevelopment) {
        console.warn(
          `SSR: Settings fetch attempt ${i + 1}/${retries} failed:`,
          errorMessage
        );
      }

      if (isLastAttempt) {
        console.error(
          "SSR: All settings fetch attempts failed, using fallback"
        );
        return {
          settings: {},
          extensions: [],
          _fallback: true, // Flag to indicate this is fallback data
        };
      }

      // Wait before retry (exponential backoff in development)
      if (isDevelopment && i < retries - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, i) * 100)
        );
      }
    }
  }

  return { settings: {}, extensions: [], _fallback: true };
}

interface RootLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function RootLayout(
  props: RootLayoutProps
): Promise<React.JSX.Element> {
  const t = await getTranslations("common");
  try {
    const params = await props.params;
    const { children } = props;
    const { locale } = params;

    // Validate locale first
    if (!config.locales.includes(locale)) {
      // Only log in development to avoid noise from bot attacks
      if (process.env.NODE_ENV === "development") {
        console.warn(
          `Invalid locale: ${locale}. Available locales: ${config.locales.join(", ")}`
        );
      }
      notFound();
    }

    /* THE TRANSLATIONS THAT GO INTO THE FLIGHT PAYLOAD — CORE, NOT EVERYTHING.
       ----------------------------------------------------------------------
       This line was `loadAllNamespaces(locale)`, and it was the single largest
       thing in every document this app serves. It put the ENTIRE catalogue —
       1.53 MB, 62 namespaces, 22,107 keys — into the RSC payload of every page,
       for every visitor, on every hard navigation. Measured on `/en/login`:
       455 KB gzipped, 97% of the document, to render a form with about a dozen
       labels on it. The homepage paid the same price. So did a 404.

       `loadLayoutMessages` ships the CORE set instead: every key reachable from
       this layout chain — header, sidebar, error and not-found boundaries — plus
       the shared tail that a quarter or more of routes ask for (buttons,
       DataTable chrome, form and toast strings). About 570 keys, ~25 KB of `en`.
       The current route's own remainder — a mean of 3.3 KB, worst case 56 KB —
       is topped up by `TranslationProvider` itself, which reads `usePathname()`
       and can therefore ask a question a layout cannot: App Router hands a
       layout only `params`, and this project has no middleware to put the path
       in a header. See the doc comment on `loadLayoutMessages` in i18n/loader.ts,
       which is where the call shape below comes from.

       WHAT STOPS THIS PAINTING RAW KEYS, which is the failure that matters here
       — `pay_with_stripe` on the deposit gateway buttons shipped to production
       once already, and shrinking the payload makes a momentary miss ORDINARY
       rather than exotic:

         · A miss no longer returns the key. `t()`, `rich()` and the no-provider
           fallback all return `humanizeKey(key)` — "Open menu", not "open_menu" —
           and `humanizeKey` is pure so the server's HTML and the browser's first
           render agree and React does not throw the SSR output away.
         · A miss also ASKS for the real string: a one-shot-per-namespace rescue
           pulls the full locale file through a path that needs no generated
           artifact, so it cannot itself be the thing that is missing.
         · A chunk that exists but is stale or truncated is DISCARDED, not
           half-used — the generator stamps its leaf count and `isChunkUsable`
           checks it. On the server a discarded chunk falls back to the full
           catalogue, which is free there (the locale file is already a resident
           module) and complete.

       THIS IS LIVE. `pnpm build:i18n` has been run against this tree (504
       routes, 33 menus, 567 core keys, zero zero-key routes), so
       `core.<locale>.json` exists and `isChunkUsable` accepts it. Measured on
       the server path with `NEXT_PUBLIC_I18N_CHUNKS=1`:

         full catalogue      1,455,762 B   62 namespaces
         loadLayoutMessages     25,395 B    8 namespaces   (-98.3%)

       IT IS ONLY LIVE IN PRODUCTION BUILDS, and that is deliberate rather than
       a gap: `chunksEnabled()` (i18n/loader.ts) is false in development, so dev
       keeps the whole catalogue and HMR on `messages/<locale>.json` shows up
       without regenerating. `NEXT_PUBLIC_I18N_CHUNKS=1` is the only way to
       exercise the production path locally — without it a chunking bug is not
       reproducible until a release build, and a dev-server measurement of this
       line will show no change at all.

       IT MUST BE REGENERATED ON EVERY RELEASE. `build:frontend` already runs
       `build:i18n` first, so a normal release is covered. A build that skips it
       is not broken — a missing or unstamped core chunk is rejected outright and
       the loader degrades to `loadAllNamespaces`, which is today's payload and
       today's behaviour. Nothing half-applies: route and menu chunks are only
       ever read once a core chunk was accepted.

       WHAT THE CLIENT STILL TOPS UP, so nobody re-measures this and thinks the
       route total regressed: the layout ships CORE only, and
       `TranslationProvider` fetches the current route's delta as a cacheable
       static asset. For `/en/login` that delta is 70 KB, but 46 KB of it is
       `support_assistant` (admin-only, lazily mounted) and 23 KB is `menu` —
       the page's own body strings are already in core. */
    const messages = await loadLayoutMessages(locale);

    /* WARM THE ROUTE'S CHUNKS — HINT THEM, DO NOT SHIP THEM.
       ----------------------------------------------------------------------
       The remainder above is fetched by `TranslationProvider` in an effect, so
       it cannot begin until the client bundle has booted. On a non-English
       install that gap is visible: `menu-translator.tsx` falls back to each nav
       item's hardcoded English title, so the navigation reads English for a
       beat and then settles.

       `preload()` closes most of it for about a hundred bytes. React hoists
       these into <head>, so the browser opens those requests while it is still
       parsing the HTML — in parallel with the JS rather than behind it — and by
       the time the provider's effect calls `fetch()` the responses are already
       in flight or done.

       WHY NOT JUST PUT THE CHUNKS IN THE PAYLOAD. Because the menu chunk is
       ~69 KB and would then be in EVERY document, uncacheable, forever — to fix
       a blip that lasts one page load and then never recurs, since
       `next.config.js` now serves versioned chunks `immutable`. The whole point
       of this layout shipping CORE only was to stop paying per-document for
       bytes that can be cached once.

       The path comes from `PATHNAME_HEADER` in `middlewares/stackHandler.ts`
       (`"x-pathname"`), which App Router does not otherwise give a layout. It is
       a HINT and nothing more — a client can forge the header on any path the
       proxy matcher skips, and the worst that buys them is warming the wrong
       JSON file. Never promote it to a routing or authorisation input.

       `routeChunkUrls` returns [] whenever there is nothing to warm — dev, no
       usable core, or an unmatched path — because a preload nobody consumes
       costs a request and earns a console warning. */
    const pathname = (await headers()).get("x-pathname");
    for (const url of await routeChunkUrls(locale, pathname)) {
      preload(url, { as: "fetch" });
    }

    // Fetch global configuration with improved error handling
    const isDevelopment = process.env.NODE_ENV === "development";
    let profile = null;
    let settingsResult: SettingsResult = { settings: {}, extensions: [] };

    try {
      // In development, use Promise.allSettled for better error isolation
      // In production, fail fast if needed
      const fetchPromises = [safeGetUserProfile(), safeGetSettings()];

      const [profileResult, settingsResultPromise] =
        await Promise.allSettled(fetchPromises);

      if (profileResult.status === "fulfilled") {
        profile = profileResult.value;
      } else {
        if (isDevelopment) {
          console.warn("Profile fetch failed:", profileResult.reason);
        }
      }

      if (settingsResultPromise.status === "fulfilled") {
        settingsResult = settingsResultPromise.value || {
          settings: {},
          extensions: [],
        };

        // In development, warn if we're using fallback data
        if (isDevelopment && settingsResult._fallback) {
          console.warn(
            "⚠️  Using fallback settings data - menu might not be complete"
          );
        }
      } else {
        if (isDevelopment) {
          console.warn("Settings fetch failed:", settingsResultPromise.reason);
        }
        settingsResult = { settings: {}, extensions: [], _fallback: true };
      }
    } catch (error) {
      console.error("Error fetching layout data:", error);
      // Continue with defaults
      settingsResult = { settings: {}, extensions: [], _fallback: true };
    }

    // Ensure we have valid settings structure
    const { settings = {}, extensions = [], _fallback } = settingsResult || {};

    // In development, add helpful debugging info
    if (isDevelopment && _fallback) {
      console.info(
        "🔧 Development tip: If menu is missing, try refreshing or check backend connection"
      );
    }

    /* Built here rather than inline in the JSX so a malformed stored theme
       cannot throw inside the render tree — `parseStoredTheme` and
       `buildThemeCss` are both total, but keeping the call at the top of the
       function means any future change to them fails loudly in one place. */
    const designThemeCss = buildThemeCss(
      parseStoredTheme(settings?.[DESIGN_THEME_SETTING_KEY])
    );

    /* The chrome selection, resolved on the SERVER.
       ----------------------------------------------------------------------
       A navbar variant decides which component tree renders, so it cannot be
       resolved after hydration without the visitor watching one navbar be
       replaced by another. `getChrome` never throws — every failure path
       returns the shipped defaults — because an exception here is not a missing
       navbar, it is a 500 on every route.

       The variant's declared HEIGHT is emitted as a `--header-height` override
       in the same `<style>` pass as the theme. That single value drives the bar
       (`h-header`) AND every page's top clearance (`pt-header`,
       `pt-header-clear`), so a taller navbar cannot end up covering the first
       line of a page — which is what would happen if the variant set its own
       height with a local class. */
    const chrome = await getChrome();
    const chromeMetricsCss = buildChromeMetricsCss(chrome.navbarVariant);

    /* ANTI-FOUC: resolve the colour scheme BEFORE the first paint.
       ----------------------------------------------------------------------
       The server cannot know a visitor's stored preference, so `<html>` ships
       with no `light`/`dark` class and the CSS `:root` block — the LIGHT half —
       is what matches until something adds one. next-themes does add it, but
       its inline script sits inside <body>, which is late enough to lose the
       race on a slow device.

       Measured with real composited frames (CDP screencast) before this
       existed: at 4x CPU throttle 3 of 3 routes, and at 6x 6 of 6, painted a
       full-viewport light frame for 39-203ms before the first dark frame. No
       flash at 1x or 2x, which is exactly why an unthrottled check called it
       clean — the earlier "no flash" claim in this file was measured on a fast
       machine and was wrong.

       This mirrors next-themes' own resolution (same storage key, same
       `system` handling) and runs synchronously in <head>, so the class is on
       the element before any paint. next-themes then computes the same value
       and re-applies it, which is a no-op. `<html>` already carries
       suppressHydrationWarning for exactly this reason. */
    const defaultTheme =
      (settings?.siteTheme as string) ||
      process.env.NEXT_PUBLIC_DEFAULT_THEME ||
      "system";
    const themeBootScript =
      "(function(){try{var d=document.documentElement,c=d.classList," +
      "s=null;try{s=localStorage.getItem('theme')}catch(e){}" +
      "var t=s||" +
      JSON.stringify(defaultTheme) +
      ";if(t==='system'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}" +
      "if(t!=='light'&&t!=='dark'){t='light'}" +
      "c.remove('light','dark');c.add(t);d.style.colorScheme=t;}catch(e){}})();";

    /* THE PINNED ASSISTANT, resolved before the first paint too.
       ----------------------------------------------------------------------
       An administrator who has pinned the assistant is asking for a page that
       is 26rem narrower. Applying that from a `useEffect` means the browser
       paints the full-width layout first and then snaps it — a layout shift on
       every single admin navigation and reload, which is exactly what pinning
       was asked for in order to avoid.

       So it runs here, blocking, beside the theme script and for the same
       measured reason. It sets an attribute; globals.css does the rest.

       PATH-GATED. The preference is stored per browser and the storefront,
       dashboard and every customer page share that storage — without this test
       a pinned admin would find their public site indented by an assistant that
       is not there. `location.pathname` is the only route information available
       this early, and it is enough: the rail itself refuses to mount off
       `/admin` anyway, so the two agree.

       Failures are swallowed. `localStorage` throws in a sandboxed iframe and
       in private mode, and this runs on EVERY page — an unguarded read here
       would take the whole site down on those browsers to remember a
       preference about a panel. */
    const railBootScript =
      "(function(){try{" +
      "if(!/\\/admin(\\/|$)/.test(location.pathname))return;" +
      // The SAME breakpoint the stylesheet and the panel use. Reserving a gutter
      // a phone cannot spare, one frame before the CSS declines to honour it, is
      // a flash of a broken layout for no gain.
      "if(!window.matchMedia('(min-width: 1280px)').matches)return;" +
      "var p=null;try{p=localStorage.getItem('ai-admin-pinned')}catch(e){}" +
      "if(p==='1')document.documentElement.setAttribute('data-assistant-pinned','true');" +
      "}catch(e){}})();";

    // Always return a valid layout, even if some data is missing
    // The font variables are declared on `:root` by app/fonts.css. They used to
    // be next/font's hashed `variable` classes, applied here — and before that,
    // applied to <body>, which put `--font-geist-sans` OUT of scope at :root, so
    // globals.css could not reference it from `@theme` and the app silently
    // rendered in Tailwind's default system stack while downloading Geist on
    // every page load and never painting it. Declaring on :root makes that
    // whole class of mistake unreachable: there is no class left to misplace.
    return (
      <html
        lang={locale}
        /*
         * `dir` BELONGS ON <html>, AND IS SET HERE ON THE SERVER.
         *
         * It used to live only on a wrapper <div> inside DirectionProvider,
         * which is too late and too low: logical CSS properties, the scrollbar
         * side, text selection, and the browser's own bidi handling all key off
         * the document element. A <div dir> also means the first paint is LTR
         * and flips after hydration.
         *
         * `isRTL()` covers the full RTL_LOCALES set — the provider previously
         * hardcoded `locale === "ar"`, so Persian, Urdu, Hebrew, Pashto, Sindhi
         * and Kurdish rendered left-to-right. Persian is ~1% untranslated and
         * was unusable for that one reason.
         */
        dir={isRTL(locale) ? "rtl" : "ltr"}
        suppressHydrationWarning
        data-scroll-behavior="smooth"
        className="notranslate"
        translate="no"
      >
        <head>
          {/* Must be the FIRST thing in <head> and must stay blocking: its whole
              job is to run before the browser paints. See themeBootScript above. */}
          <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
          {/* Same rule: blocking, in <head>, before anything paints. */}
          <script dangerouslySetInnerHTML={{ __html: railBootScript }} />
          {/*
            The three ALWAYS-PAINTED families, preloaded — what next/font did for
            a family declared `preload: true`. A plain stylesheet emits no
            preloads of its own, so without these the browser does not discover
            the font until it has parsed the CSS, and first paint falls back for
            a frame. The seven selectable families are deliberately absent; see
            the typefaces comment at the top of this file.

            REACT EMITS EACH OF THESE TWICE, and that is expected — do not
            "fix" it by deleting them. React 19 treats `<link rel="preload">` as
            a hoistable resource, so it writes its own canonical copy into <head>
            AND renders the element; the two differ only in attribute order.
            Moving them into <body> was tried and changes nothing (React hoists
            from there to the same place). `react-dom`'s `preload()` is the other
            documented route and emits NOTHING from this Server Component — zero
            `as="font"` links in the HTML — because the RSC layer never reaches
            the DOM float dispatcher.

            The duplicate is cosmetic and was measured, not assumed: Chromium
            issues exactly ONE network request per file and logs no
            preload warning. The cost is ~120 bytes of head. Dropping the
            preloads to avoid it would be the worse trade.

            `crossOrigin` is REQUIRED even though these are same-origin: fonts
            are always fetched in CORS mode, so a preload without it does not
            match the later font request — the browser would download the file
            twice and warn that the preload went unused.
          */}
          {PRELOAD_FONTS.map((href) => (
            <link
              key={href}
              rel="preload"
              as="font"
              type="font/woff2"
              href={href}
              crossOrigin="anonymous"
            />
          ))}
          {/*
            THE ADMIN DESIGN MANAGER'S PALETTE.
            ------------------------------------------------------------------
            Emitted first in <head> and built from the `settings` already
            resolved above, so it costs no extra request and is parsed before
            the first stylesheet-driven paint. That is what makes a themed site
            load with NO flash of the default palette and NO layout shift: the
            tokens are correct in the very first frame, exactly as if they had
            been authored into globals.css.

            It is custom-property declarations only, on `:root` and `.dark`.
            Nothing here needs JavaScript, so light/dark, hydration and
            client-side navigation all keep working untouched.

            `buildThemeCss` validates every value against a per-token pattern
            and DROPS anything that fails — these strings are administrator
            input landing in a <style> element, so a value like
            `red}html{display:none` has to be impossible rather than merely
            unlikely. It returns "" when nothing is customised, and this
            renders nothing at all in that case.

            `href` + `precedence` are what make React 19 treat this as a
            HOISTABLE RESOURCE keyed by href rather than as an ordinary element
            it has to reconcile positionally. Two reasons that matters:

              - Measured, this tag is written first in the server HTML and ends
                up at index 69 of <head> in the live DOM, because the dev server
                and React's own stylesheet handling insert ahead of it. A
                positionally-reconciled element that moves is exactly what
                produces "a tree hydrated but some attributes of the server
                rendered HTML didn't match".
              - A cached HTML shell and a freshly-rendered RSC payload can
                legitimately disagree about the theme for one navigation — the
                owner can save between the two. Keyed by href, React reuses the
                existing tag instead of diffing its contents. (The settings
                fetch itself is `no-store`, so the window is now a single
                in-flight navigation rather than the old 60s revalidate, but the
                disagreement is still possible and still must not throw a
                hydration mismatch.)

            Ordering is irrelevant here BY CONSTRUCTION: the CSS is wrapped in
            `@layer admin-theme`, which globals.css declares last, so wherever
            React puts the tag it still outranks the default tokens. That is the
            whole reason the layer exists rather than relying on source order.

            Children rather than dangerouslySetInnerHTML because a hoistable
            style must carry its CSS as a text child — and it is safe here
            precisely because the validator forbids `<`, `>` and `&` in any
            token value.

            No `id` prop: React strips it on a hoistable resource and emits
            `data-href="design-theme"` instead, which is the attribute to look
            for when debugging. Verified in the served HTML:
            `<style data-precedence="high" data-href="design-theme">`, landing at
            index 1 of <head> rather than 69.

            Being keyed by href is also why SAVING a theme cannot repaint the tab
            it was saved from: React reuses this tag and never diffs its
            contents, so no amount of re-rendering the layout changes the CSS
            inside it. The admin editor therefore rewrites the tag directly on
            save — same builder, same bytes a reload would produce. See
            `lib/live-style.ts`.
          */}
          {designThemeCss ? (
            <style href={DESIGN_THEME_STYLE_HREF} precedence="high" suppressHydrationWarning>
              {designThemeCss}
            </style>
          ) : null}
          {/*
            The navbar variant's height, in the same first-paint pass as the
            theme, and unlayered for the same reason — see `buildChromeMetricsCss`
            for why the `@layer admin-theme` wrapper this used to carry made the
            override inert instead of authoritative.
          */}
          {chromeMetricsCss ? (
            <style href={CHROME_METRICS_STYLE_HREF} precedence="high" suppressHydrationWarning>
              {chromeMetricsCss}
            </style>
          ) : null}
          {/*
            Lit (pulled in by the wallet-connect modal) ships a development
            build in dev and announces itself on every page load with
            "Lit is in dev mode. Not recommended for production!". It is
            unactionable here — the production bundle already uses Lit's
            non-dev entry, so the warning cannot reach users.

            Lit dedupes its warnings through `globalThis.litIssuedWarnings`,
            keyed by either the full message or the short code. Seeding the
            code before Lit's module init runs suppresses this one message and
            leaves every other Lit warning working. Must stay a plain, blocking
            inline script so it executes ahead of the bundles.
          */}
          <script
            dangerouslySetInnerHTML={{
              __html:
                "(function(){try{var g=globalThis;(g.litIssuedWarnings||(g.litIssuedWarnings=new Set())).add('dev-mode');}catch(e){}})();",
            }}
          />
          {/* PWA Manifest */}
          <link rel="manifest" href="/manifest.json" />
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="default" />
          {/* Favicons - files are replaced directly via admin upload */}
          <link rel="icon" type="image/webp" sizes="16x16" href="/img/logo/favicon-16x16.webp" />
          <link rel="icon" type="image/webp" sizes="32x32" href="/img/logo/favicon-32x32.webp" />
          <link rel="icon" type="image/webp" sizes="96x96" href="/img/logo/favicon-96x96.webp" />
          <link rel="apple-touch-icon" sizes="180x180" href="/img/logo/apple-icon-180x180.webp" />
          {/* Preload TradingView library for trading charts */}
          <script
            src="/lib/chart/charting_library/charting_library/charting_library.standalone.js"
            async
          />
        </head>
        {/* --radius used to be set inline here, which beat globals.css and
            pinned every corner to 0.5rem. It now comes from the token block
            (Obsidian is 0.25rem). Do not reintroduce it. */}
        <body className="antialiased" suppressHydrationWarning>
          <ThemeTransition />
          <TranslationProvider locale={locale} messages={messages}>
            <Providers
              profile={profile}
              settings={settings}
              extensions={extensions}
            >
              <DirectionProvider locale={locale}>
                <ChromeProvider value={chrome}>
                {/* Adds back the admin-only menu scopes that the public chrome
                    endpoint withholds. A passthrough on every non-admin page —
                    it is mounted here rather than in a dashboard layout because
                    admin lives under two route groups and the 19 extension back
                    offices each have their own layout. */}
                <AdminChromeProvider>
                <ConditionalLayoutProvider>
                  {children}
                  <SettingsStatus />
                  <GlobalAuthDetector />
                  {/*
                    The assistant's guidance, mounted ABOVE the router.

                    It is here rather than in a dashboard layout for one
                    reason: it is the only thing in the product that must
                    outlive a navigation. A walkthrough of the withdrawal page
                    begins in a chat on /support/ticket/[id] and has to still
                    be running after `router.push` has unmounted that whole
                    tree — and a workflow's steps deliberately move the
                    customer between pages, which is precisely when they most
                    need to see which step they are on.

                    Both pieces render nothing at all until there is something
                    to show, and the rail does not even ask the server unless
                    somebody is signed in. See components/guidance/.
                  */}
                  <GuidanceHost />
                  {/*
                    The OPERATOR's assistant, mounted here for the same reason
                    and one that is sharper.

                    An admin procedure carries somebody across four or five
                    screens — gateways, then currencies, then methods, then the
                    log — and `/admin/crm/*` lives under the `(dashboard)` route
                    group while `/admin/ai/support/*` lives under `(ext)`. Those
                    are separate layout trees, so a rail mounted in either one
                    would unmount the moment a procedure stepped between them.

                    It renders nothing at all off `/admin`, nothing for a signed-
                    out visitor, and nothing until the server confirms the
                    assistant is switched on for this install. See
                    components/admin-assistant/.

                    Which is exactly why the import here is the LAZY wrapper and
                    not the component: mounted above the router it is in every
                    visitor's bundle, and 75 KB that is structurally incapable of
                    drawing anything for almost all of them is not a cost this
                    placement has to carry. `admin-assistant-lazy.tsx` explains
                    why `ssr: false` is exactly equivalent here rather than
                    merely convenient — do not "simplify" it back to a static
                    import.
                  */}
                  <AdminAssistant />
                </ConditionalLayoutProvider>
                </AdminChromeProvider>
                </ChromeProvider>
              </DirectionProvider>
            </Providers>
          </TranslationProvider>
        </body>
      </html>
    );
  } catch (error) {
    // Return a minimal fallback layout that won't cause additional errors
    // Note: In the error case, we can't load translations, so use hardcoded strings
    // The font variables reach this branch on their own now — fonts.css declares
    // them on `:root`. They used to have to be repeated here by hand, and the
    // comment this replaces recorded why: without them `--font-sans` had no
    // `--font-geist-sans` to resolve against, so this screen — the one a visitor
    // sees when something has already gone wrong — rendered in a different
    // typeface from the rest of the site. The design theme is still deliberately
    // NOT injected here: building it needs the settings fetch, and this branch
    // exists precisely because something in that path threw.
    return (
      <html
        lang="en"
        suppressHydrationWarning
        data-scroll-behavior="smooth"
        className="notranslate"
        translate="no"
      >
        <body className="min-h-screen bg-background font-sans antialiased">
          <div className="flex h-screen w-full flex-col items-center justify-center space-y-4">
            <div className="text-center">
              <h1 className="text-2xl font-bold">{t("application_error")}</h1>
              <p className="text-muted-foreground mt-2">
                {t("failed_to_initialize_the_application_please")}
              </p>
              <p className="text-xs text-muted-foreground mt-4">
                {t("error")} {error instanceof Error ? error.message : "Unknown error"}
              </p>
            </div>
          </div>
        </body>
      </html>
    );
  }
}
