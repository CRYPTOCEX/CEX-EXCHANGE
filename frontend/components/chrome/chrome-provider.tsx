"use client";

import * as React from "react";

import {
  DEFAULT_CHROME,
  getNavbarVariant,
  normalizeChrome,
  type ChromeConfig,
} from "@/lib/chrome/variants";

/**
 * The message the admin chrome editor posts into its preview iframe.
 *
 * Exported so the editor imports the same literal rather than retyping it. A
 * typo'd type string is a silent no-op: the preview simply never updates, and
 * there is nothing in either console to say why.
 */
export const CHROME_PREVIEW_MESSAGE = "mashdiv:chrome-preview";

/**
 * The whole config travels, not just the two variant ids.
 *
 * The message started as `{navbarVariant, footerVariant}`, and when menu and
 * footer-content editing landed those extra fields were simply absent from it —
 * so `normalizeChrome` filled them with DEFAULTS and the preview confidently
 * showed an unedited menu while the rail showed the edits. A preview that
 * disagrees with the editor is worse than no preview, so the payload is the
 * config itself and cannot drift from it field by field.
 */
export interface ChromePreviewMessage extends ChromeConfig {
  type: typeof CHROME_PREVIEW_MESSAGE;
}

/**
 * Carries the server-resolved chrome selection down to the header and footer.
 * ============================================================================
 *
 * WHY A CONTEXT AND NOT A PROP
 *
 * `SiteHeader` is mounted in 48 places — every dashboard layout, every extension
 * layout, several pages directly. Threading `navbarVariant` through all of them
 * would mean 48 edits to ship one feature, 48 more for the next chrome field,
 * and a guarantee that some layout added later forgets and silently renders the
 * default while the rest of the site renders the owner's choice.
 *
 * WHY NOT A ZUSTAND STORE, which is how this codebase usually shares state:
 * the persisted stores rehydrate from localStorage AFTER the first paint, so the
 * navbar would render `classic`, then swap. A variant is a component tree, so
 * that swap is visible — this is exactly the flash the catch-all CMS page has
 * today from reading `landingPageType` client-side behind a `setTimeout(100)`.
 *
 * The value is fetched in the root layout (a server component) and passed in
 * here, so the correct navbar is in the server HTML and never changes.
 *
 * The default is the shipped chrome, so a subtree mounted outside the provider —
 * a portal, a test, a storybook — renders the header the platform has always
 * had rather than crashing on an undefined context.
 */
const ChromeContext = React.createContext<ChromeConfig>(DEFAULT_CHROME);

export function ChromeProvider({
  value,
  children,
}: {
  value: ChromeConfig;
  children: React.ReactNode;
}) {
  /**
   * A chrome pushed in by the admin editor while this page is its preview.
   *
   * `null` for every real visitor — the listener below never arms outside an
   * iframe, so this stays null and the provider is exactly what it was.
   */
  const [preview, setPreview] = React.useState<ChromeConfig | null>(null);

  /**
   * THE PREVIEW BRIDGE — why the admin editor can preview REAL pages.
   * --------------------------------------------------------------------------
   * The sibling design manager previews live routes by writing custom
   * properties straight onto the iframe's `documentElement`. That mechanism
   * cannot carry a chrome variant: a variant is a component tree, and no CSS
   * property swaps one. So the frame has to be told, and it has to be told in a
   * way that survives navigating around inside the preview.
   *
   * The alternative was a fake preview page rendering a header over some
   * representative blocks. That only ever proves the mock-up renders — the
   * question an owner is actually asking is "what does MY homepage look like
   * with this navbar", and a mock-up cannot answer it.
   *
   * WHY THIS IS NOT NEW ATTACK SURFACE. Two gates, both required:
   *
   *   1. `window.parent !== window` — nothing is listening unless this document
   *      is framed. A visitor on the real site never installs the handler.
   *   2. `event.origin === window.location.origin` — only our own pages.
   *
   * Past those gates the sender is a same-origin parent document, which can
   * already reach into this frame and set state through `contentWindow`
   * directly; that is precisely how the design preview works today. So this
   * grants a capability that origin already had, and does it through a narrow
   * declared message instead of arbitrary scripting.
   *
   * The payload runs through `normalizeChrome`, so a malformed or unknown id
   * renders the default rather than blanking the chrome mid-preview.
   */
  React.useEffect(() => {
    if (typeof window === "undefined" || window.parent === window) return;

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as Partial<ChromePreviewMessage> | null;
      if (!data || data.type !== CHROME_PREVIEW_MESSAGE) return;
      setPreview(normalizeChrome(data));
    };

    window.addEventListener("message", onMessage);
    /* Tell the parent this document is ready to be painted. Without it the
       editor would have to guess when the frame finished hydrating, and a
       message posted too early is dropped with no error — the preview would
       show the SAVED chrome and look like the editor was ignoring the click. */
    window.parent.postMessage({ type: `${CHROME_PREVIEW_MESSAGE}:ready` }, window.location.origin);

    return () => window.removeEventListener("message", onMessage);
  }, []);

  const resolved = preview ?? value;

  /**
   * Height has to move with the variant, and only the inline style can do it.
   *
   * `--header-height` is written by the root layout into an `@layer admin-theme`
   * rule from the SAVED variant. A preview cannot re-render that server tag, and
   * a layer rule cannot be beaten by another stylesheet rule of lower layer
   * order — but an INLINE style is not in any layer and wins outright. Without
   * this the preview shows a two-row navbar over the one-row clearance and the
   * hero sits under the bar, which is the single most misleading thing a chrome
   * preview could get wrong.
   */
  React.useEffect(() => {
    if (!preview) return;
    const root = document.documentElement;
    root.style.setProperty("--header-height", getNavbarVariant(preview.navbarVariant).height);
    /* Braces are load-bearing: `removeProperty` returns a string, and an arrow
       with an implicit return hands React a string where it wants a destructor. */
    return () => {
      root.style.removeProperty("--header-height");
    };
  }, [preview]);

  /* `value` arrives from a server component and is a new object literal on every
     request, but it is stable for the life of a client render, so memoising on
     its fields keeps consumers from re-rendering on unrelated parent updates.

     `menuOverrides` and `footerContent` are objects and are therefore compared
     by IDENTITY here, not by value. That is correct for both sources: the
     server value is one object per request, and a preview replaces the whole
     object. Do NOT "fix" this by JSON-stringifying them into the dep array —
     it would run on every render of every page for a value that is `{}` on
     almost every install. */
  const memo = React.useMemo(
    () => ({
      navbarVariant: resolved.navbarVariant,
      footerVariant: resolved.footerVariant,
      menuOverrides: resolved.menuOverrides,
      footerContent: resolved.footerContent,
    }),
    [
      resolved.navbarVariant,
      resolved.footerVariant,
      resolved.menuOverrides,
      resolved.footerContent,
    ]
  );

  return <ChromeValueProvider value={memo}>{children}</ChromeValueProvider>;
}

/**
 * The raw context, with NO preview bridge attached.
 *
 * For nesting a narrower value inside the root provider — specifically
 * `AdminChromeProvider`, which adds back the admin-only menu scopes that the
 * public endpoint deliberately withholds. Nesting the full `ChromeProvider`
 * there would install a second `message` listener and a second
 * `--header-height` effect for a subtree that is never previewed, so the bridge
 * is separated from the plumbing rather than duplicated.
 */
export function ChromeValueProvider({
  value,
  children,
}: {
  value: ChromeConfig;
  children: React.ReactNode;
}) {
  return <ChromeContext.Provider value={value}>{children}</ChromeContext.Provider>;
}

/** The active chrome selection. Always defined; falls back to the shipped one. */
export function useChrome(): ChromeConfig {
  return React.useContext(ChromeContext);
}
