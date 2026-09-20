"use client";

import { createContext, useContext } from "react";

import type { LogoDisplay } from "@/lib/brand/logo-display";

/**
 * The brand mark the SERVER resolved for THIS request.
 * =============================================================================
 *
 * WHY THIS EXISTS — the swap it removes
 * -------------------------------------
 * The navbar draws one of two marks, chosen by the `navbarLogoDisplay` setting:
 * a 40px square plus the site name in text, or a ~220px wordmark image. The
 * component read that setting from `useConfigStore`, which is persisted to
 * localStorage and written by an effect — so on every single page load the
 * server rendered the CODED DEFAULT (square + name) and the browser replaced it
 * a moment later with the mark the install actually uses.
 *
 * Measured on this install, whose setting is `FULL_LOGO_ONLY`: the server HTML
 * contains `/img/logo/logo.webp` and one `data-navbar-logo-name` span, neither
 * of which survives hydration. The visible result is the one reported — the bar
 * shows a small logo and a word, then becomes the full wordmark — and it takes
 * the whole nav sideways with it, because the two marks are ~40px and ~220px
 * wide.
 *
 * `header/site-header.tsx` already reserves the taller of the two HEIGHTS
 * (`BRAND_BOX`) so the row cannot grow, and the note there records the rest of
 * the diagnosis and names this as the real fix: the setting has to reach the
 * server render. This is that.
 *
 * WHY A CONTEXT AND NOT A WRITE TO THE CONFIG STORE
 * ------------------------------------------------
 * Exactly the reason spelled out in `store/auth-boot.ts`, which this mirrors
 * deliberately: `useConfigStore` is a module-scope `create()`, and in the SSR
 * bundle that is ONE object shared by every concurrent render in the Node
 * process. A render-phase write on the server is visible to every other
 * in-flight request. It is a smaller leak than the auth one — a logo choice is
 * not private — but it is the same mechanism, and a second install's brand
 * appearing in this one's HTML is not a defect anybody would enjoy diagnosing.
 *
 * A React context is per-render-tree by construction. The server reads THIS;
 * the client reads whichever source `resolveLogoDisplay` picks. Both halves
 * come from the same `settings` object the root layout fetched, so they agree.
 *
 * WHY IT IS NOT PART OF `ChromeConfig`, which already carries `navbarVariant`
 * and looks like the obvious home: that config is fetched from
 * `/api/content/chrome` and round-tripped by the admin chrome editor, which
 * sends the whole object back on save. A field that lives in `settings` and
 * merely travels beside it would be read as editable there and written to a row
 * that has no column for it.
 */
export interface BrandBoot {
  /**
   * The resolved mark, or `null` for "the server did not say".
   *
   * `null` is reachable in practice: `getSettings()` returns `{}` when the
   * backend is still booting, and the root layout renders anyway rather than
   * 500ing every route. Consumers fall back through `resolveLogoDisplay`.
   */
  logoDisplay: LogoDisplay | null;
}

/** What a tree rendered outside the provider sees — "nothing was resolved". */
export const BRAND_BOOT_UNRESOLVED: BrandBoot = { logoDisplay: null };

const BrandBootContext = createContext<BrandBoot>(BRAND_BOOT_UNRESOLVED);

export const BrandBootProvider = BrandBootContext.Provider;

export function useBrandBoot(): BrandBoot {
  return useContext(BrandBootContext);
}
