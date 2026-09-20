"use client";

/**
 * One live preview of the real site, driven by BOTH editors at once.
 * ============================================================================
 *
 * The theme editor and the chrome editor used to own a preview each, because
 * they were separate pages. They are one page now, and they must be: picking a
 * navbar and picking the colour it is painted in are the same decision taken
 * twice, and doing them in two tabs meant saving one, navigating, and hoping.
 *
 * Two different mechanisms reach into the same iframe, and they are different
 * for a real reason:
 *
 *   THEME  — custom properties written straight onto the frame's
 *            `documentElement`. Same-origin, so no cooperation from the page is
 *            needed, and an inline declaration beats every cascade layer.
 *   CHROME — a `postMessage` the page's `ChromeProvider` listens for. A variant
 *            is a COMPONENT TREE and no CSS property swaps one, so the frame has
 *            to be told and has to re-render.
 *
 * The scaling, the retry burst and the loading indicator live in
 * `PreviewFrame`, which is shared with the page editors. Everything specific to
 * *this* screen — the two mechanisms above, and which routes are worth
 * previewing — stays here.
 */

import * as React from "react";
import { useParams } from "next/navigation";

import { applySchemeTo, applyVarsTo, type Scheme } from "@/components/admin/design/use-design-draft";
import {
  PreviewFrame,
  PreviewSchemeToggle,
  type PreviewFrameHandle,
} from "@/components/admin/studio/preview-frame";
import {
  CHROME_PREVIEW_MESSAGE,
  type ChromePreviewMessage,
} from "@/components/chrome/chrome-provider";
import type { DesignTheme } from "@/lib/design-theme";
import type { ChromeConfig } from "@/lib/chrome/variants";
import { useTranslations } from "next-intl";

/**
 * `showsFooter` is not decoration. `SiteFooter` is mounted by seven call sites —
 * the landing page, the blog and legal layouts, a few extension pages — and not
 * by the rest of the app. Previewing a footer choice on a page that has no
 * footer shows nothing changing, which reads as a broken picker.
 */
const ROUTES: readonly { label: string; path: string; showsFooter: boolean }[] = [
  { label: "Home", path: "/", showsFooter: true },
  { label: "Blog", path: "/blog", showsFooter: true },
  { label: "Market — header only", path: "/market", showsFooter: false },
  /**
   * The component specimen. An ADMIN route in a list of public ones, and it has
   * to be: the component tokens move tables, dialogs, form fields and KPI
   * tiles, and not one of those appears anywhere on the public site. Without
   * this entry the whole Components tab would edit things the preview cannot
   * show, which is indistinguishable from the controls being dead.
   *
   * Same-origin, so the theme still applies the same way. It has no site
   * footer and no site navbar — it is chromeless — hence `showsFooter: false`.
   */
  { label: "Components", path: "/admin/design/specimen", showsFooter: false },
];

/** The route each editor group opens on. */
const FOCUS_ROUTE: Record<string, string> = {
  site: "/",
  components: "/admin/design/specimen",
};

const SPECIMEN = "/admin/design/specimen";

export function SitePreview({
  theme,
  chrome,
  scheme,
  onSchemeChange,
  focus = "site",
  focusGroup,
  className,
}: {
  theme: DesignTheme;
  chrome: ChromeConfig;
  scheme: Scheme;
  onSchemeChange: (s: Scheme) => void;
  /**
   * Which editor group is open. Switching groups swings the preview to the
   * route that group can actually be judged on — colour work wants the home
   * page, table density wants the specimen.
   */
  focus?: "site" | "components";
  /**
   * The token group being edited (`table`, `control`, …). The specimen renders
   * ONLY that family.
   *
   * It used to render all five at once, so pressing "Cards" left you looking at
   * a table — the thing you had just stopped editing — with the cards somewhere
   * below the fold. A preview you have to scroll to find is not a preview of
   * the control you are holding.
   */
  focusGroup?: string;
  className?: string;
}) {
  const t = useTranslations("components");
  const params = useParams();
  const locale = typeof params?.locale === "string" ? params.locale : "en";
  const frameRef = React.useRef<PreviewFrameHandle>(null);
  /**
   * The route is DERIVED, with a manual override — not state pushed by an
   * effect.
   *
   * It was an effect, and that cost a wasted document load on every switch into
   * a component section: the render that saw the new group still had the old
   * route, so the frame loaded the home page, the effect then set the route,
   * and the frame reloaded onto the specimen. Two loads and a visible flash of
   * the wrong page for a change that is knowable synchronously.
   *
   * The override is what keeps the route select live — an owner can check a
   * table change against the home page. It clears when the group changes,
   * because at that point they have asked for something else.
   */
  const [manualRoute, setManualRoute] = React.useState<string | null>(null);
  React.useEffect(() => {
    setManualRoute(null);
  }, [focus, focusGroup]);

  const route = manualRoute ?? FOCUS_ROUTE[focus] ?? ROUTES[0].path;
  const setRoute = setManualRoute;

  /* Locale-prefixed so the frame lands on the page directly. `/` would work —
     Next redirects it — but a redirect is another document load, and everything
     has to be re-applied on each one.

     The `?only=` carried on the specimen narrows it to the family being edited.
     It goes in the URL rather than over `postMessage` because `PreviewFrame`
     keys the iframe on `src`, so a change here remounts and the page comes back
     already showing the right family — and `onPaint` re-applies the draft on
     every load, so there is no flash of the saved theme. A message would have
     needed the specimen to hold its own filter state and stay in step with a
     remount it cannot see. */
  const only = route === SPECIMEN && focusGroup ? `?only=${encodeURIComponent(focusGroup)}` : "";
  const src = `/${locale}${route === "/" ? "" : route}${only}`;

  const paint = React.useCallback(
    (doc: Document, win: Window) => {
      applySchemeTo(doc, scheme);
      applyVarsTo(doc, theme, scheme);
      const message: ChromePreviewMessage = { type: CHROME_PREVIEW_MESSAGE, ...chrome };
      win.postMessage(message, window.location.origin);
    },
    [chrome, scheme, theme]
  );

  /* The frame announcing itself is an optimisation on top of the burst, never a
     precondition — see the `PreviewFrame` header for the measurement. */
  React.useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== `${CHROME_PREVIEW_MESSAGE}:ready`) return;
      frameRef.current?.repaint();
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const activeRoute = ROUTES.find((r) => r.path === route) ?? ROUTES[0];

  return (
    <PreviewFrame
      ref={frameRef}
      src={src}
      onPaint={paint}
      className={className}
      toolbarEnd={
        <>
          <div className="mx-1 h-4 w-px bg-border" aria-hidden="true" />
          <select
            value={route}
            onChange={(e) => setRoute(e.target.value)}
            className="h-7 rounded-lg border border-input bg-card px-1.5 text-xs text-foreground"
            aria-label={t("preview_page")}
          >
            {ROUTES.map((r) => (
              <option key={r.path} value={r.path}>
                {r.label}
              </option>
            ))}
          </select>
          <div className="mx-1 h-4 w-px bg-border" aria-hidden="true" />
          <PreviewSchemeToggle scheme={scheme} onChange={onSchemeChange} />
        </>
      }
      note={
        activeRoute.showsFooter ? null : (
          <>
            {t("this_page_does_not_render_the")}
          </>
        )
      }
    />
  );
}
