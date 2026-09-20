"use client";

import React from "react";
import { defaultSiteConfig, useThemeStore } from "@/store";
import { useMounted } from "@/hooks/use-mounted";
import { usePathname } from "@/i18n/routing";
import SiteHeader from "./site-header";

function getPathAfterLocale(pathname: string) {
  return pathname.replace(/^\/[a-z]{2}(\/|$)/, "/");
}

/**
 * What the SERVER always renders with, and therefore what the client's FIRST
 * render must render with too.
 *
 * DERIVED, not retyped. It used to be the literal `"sticky"` with a comment
 * asking whoever changed `defaultSiteConfig` to remember to change this too.
 * That got the dependency backwards: the unguarded first render reads
 * `defaultSiteConfig.navbarType` AUTOMATICALLY (see the note in
 * `store/index.ts`), so a drifted copy here would CREATE the mismatch this
 * constant exists to avoid. (It is also the value
 * `provider/dashboard.provider.tsx` falls back to.)
 */
const SERVER_NAVBAR_TYPE = defaultSiteConfig.navbarType;

/**
 * Main Header Component
 *
 * This is the default header used throughout the application.
 * It automatically detects whether you're in admin or user area
 * and renders the appropriate navigation style.
 *
 * For extension pages that need custom menus, use SiteHeader directly:
 *
 * @example
 * // For extension with custom menu
 * import SiteHeader from "@/components/partials/header/site-header";
 *
 * <SiteHeader
 *   variant="extension"
 *   menu={customMenuItems}
 *   adminPath="/admin/my-extension"
 *   colorSchema={myColorSchema}
 * />
 */
const Header = () => {
  const { navbarType } = useThemeStore();
  const mounted = useMounted();
  const pathname = usePathname();
  const normalizedPath = getPathAfterLocale(pathname);

  /*
   * WHY `mounted` IS HERE — the footer's pattern, and what it is really for.
   *
   * `useThemeStore` is `persist()`ed as `"theme-store"` with no `partialize`,
   * so `navbarType` is written to localStorage. `if (navbarType === "hidden")
   * return null` therefore looks like a server/client divergence: the server
   * renders the whole header from the coded default, and a returning operator
   * whose stored value is "hidden" renders nothing.
   *
   * IT DOES NOT ACTUALLY MISMATCH TODAY, AND THE REASON IS NOT IN THIS FILE.
   * ----------------------------------------------------------------------
   * Verified rather than assumed, because the answer decides whether this guard
   * is load-bearing. Seeding `theme-store` with `navbarType: "hidden"` and
   * loading `/en/admin` against the UNGUARDED version reports zero hydration
   * errors, and instrumenting the first client render shows it reading
   * `"sticky"` — the coded default — not the persisted `"hidden"`.
   *
   * zustand is what absorbs it, but NOT for the reason first written here.
   * `useStore` passing `() => selector(api.getInitialState())` as
   * `useSyncExternalStore`'s getServerSnapshot (`zustand/esm/react.mjs`) is
   * necessary and NOT sufficient: vanilla's `getInitialState` closes over
   * `initialState`, and for a persisted store `persistImpl` returns
   * `stateFromStorage || configResult` — so vanilla's accessor would hand back
   * the HYDRATED state and the mismatch would be real.
   *
   * The line that actually decides it is:
   *
   *   `zustand/esm/middleware.mjs:378` —  api.getInitialState = () => configResult
   *
   * `persist` overwrites the accessor with one that returns the coded defaults.
   * That was proved directly with a spy middleware capturing the accessor
   * before persist replaced it: vanilla's original returned the hydrated state,
   * persist's override returned the defaults. It is also why this guard is
   * worth keeping — that line is an undocumented internal under a caret range
   * (`^5.0.14`), so the contract is stated here rather than borrowed.
   *
   * (The console harness was proved able to see mismatches at all by injecting
   * a `typeof window` branch here, which it reported immediately.)
   *
   * WHAT THE GUARD IS THEN
   * ----------------------
   * It moves the removal from "the commit immediately after hydration, because
   * an external store snapshot changed" to "the mount effect", and it says the
   * contract out loud instead of resting it on a zustand internal that React
   * 19 + zustand 6 could reasonably change. Both sides compute
   * `SERVER_NAVBAR_TYPE` before mount, so the markup is identical by
   * construction; after mount the configured value takes over. It is the same
   * shape as `components/partials/footer/index.tsx`, which is the point — the
   * two components read the same store for the same kind of decision and
   * should not disagree about how to do it.
   *
   * Behaviourally this is a no-op for the shipped configuration. Nothing in
   * this codebase calls `setNavbarType`; the authority is the admin's
   * `settings.layout` JSON, which `provider/dashboard.provider.tsx` pushes into
   * this store from a `useLayoutEffect` on every load, and it resolves to
   * `"sticky"` — identical to `SERVER_NAVBAR_TYPE`. An owner who configures
   * "hidden" still gets it, one commit later than before.
   */
  const effectiveNavbarType = mounted ? navbarType : SERVER_NAVBAR_TYPE;

  if (effectiveNavbarType === "hidden") {
    return null;
  }

  // Auto-detect variant based on path
  const isInAdmin = normalizedPath.startsWith("/admin");

  return (
    <SiteHeader
      variant={isInAdmin ? "admin" : "user"}
      menu={isInAdmin ? "admin" : "user"}
    />
  );
};

export default Header;

// Re-export SiteHeader for direct use
export { default as SiteHeader } from "./site-header";
export type { SiteHeaderProps } from "./site-header";
