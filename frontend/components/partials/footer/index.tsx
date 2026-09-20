"use client";

import React from "react";
import { defaultSiteConfig, useThemeStore } from "@/store";
import FooterLayout from "./footer-layout";
import { useMounted } from "@/hooks/use-mounted";
import { siteName } from "@/lib/siteInfo";
import { footerVariants } from "@/lib/variants/layout";
import { useTranslations } from "next-intl";

/**
 * What the SERVER always renders with, and therefore what the client's FIRST
 * render must render with too.
 *
 * DERIVED, not retyped. It used to be the literal `"default"` with a comment
 * asking whoever changed `defaultSiteConfig` to remember to change this too.
 * That got the dependency exactly backwards: the unguarded first render reads
 * `defaultSiteConfig.footerType` AUTOMATICALLY (see the note in
 * `store/index.ts`), so a drifted copy here would not merely be stale — it
 * would CREATE the hydration mismatch this constant exists to avoid. A
 * hand-copied value cannot be the safe side of a contract it does not control.
 */
const SERVER_FOOTER_TYPE = defaultSiteConfig.footerType;

/**
 * WHY THIS IS NOT `if (!mounted) return null` ANY MORE
 * ====================================================
 * That line put the footer in NO first paint, anywhere in the app — it was
 * absent from the server HTML and from the client's first render, then
 * inserted. Probed on `/en/admin/affiliate`: at t=592ms there is no `<footer>`
 * element at all and `<main>` is 900px; at t=1084ms the footer appears and main
 * drops to 847. In a flex-column layout that arrival STEALS the footer's own
 * height from main, so it lands 53px inside the fold and everything it does
 * afterwards is scored as layout shift. It was the last thing moving on all 19
 * extension back offices, and it moved on every other page too.
 *
 * THIS GUARD IS *NOT* HYDRATION-MISMATCH PROTECTION — measured, not assumed
 * ------------------------------------------------------------------------
 * An earlier version of this comment claimed it was, and that claim was wrong.
 * It is recorded here because it is a genuinely tempting piece of reasoning and
 * every step of it is true except the conclusion:
 *
 *   `useThemeStore` is `persist()`ed with no `partialize`; `webStorage()`
 *   returns `window.localStorage`, a SYNCHRONOUS `StateStorage`;
 *   `createJSONStorage().getItem` returns the parsed object directly for a
 *   non-Promise storage; `persist` feeds it through `toThenable`, whose `then`
 *   runs INLINE; and `hydrate()` is called during store creation, at module
 *   evaluation, before React renders.
 *
 * All verified. The persisted value really is in the store before the first
 * render. It still cannot reach that render, and one line is why:
 *
 *   `zustand/esm/middleware.mjs:378` —  api.getInitialState = () => configResult
 *
 * `persist` OVERWRITES the accessor so it returns the coded defaults rather
 * than the hydrated state. `zustand/esm/react.mjs` passes that accessor as
 * `useSyncExternalStore`'s `getServerSnapshot`, and react-dom uses
 * `getServerSnapshot` whenever `isHydrating`. So the hydration render sees
 * `defaultSiteConfig`, never localStorage.
 *
 * Measured on this component and the header: seeded `theme-store` with a
 * hostile value, loaded UNGUARDED, and got zero hydration errors with the first
 * render reading the default. A matched-pair control confirmed the harness
 * could see a mismatch at all — forcing the server DOM to the persisted value
 * made React warn in the opposite direction, printing the diff itself.
 *
 * SO WHY KEEP IT
 * --------------
 * Because the safety lives in an undocumented zustand internal under a caret
 * range (`^5.0.14`). This guard states the contract locally instead of resting
 * it on line 378 surviving an upgrade. It is also the shape the header uses,
 * and the two should not disagree about how to read the same store.
 *
 * WHAT *IS* UNSAFE, and this guard would not save you from it: a render-phase
 * `useThemeStore.getState()`, a `useState(() => …persisted…)`, or a direct
 * `localStorage` read feeding JSX. Those bypass the hook and DO see the
 * persisted value on render #1. Do not introduce one and assume this file
 * protects you.
 *
 * WHAT REPLACES IT
 * ----------------
 * `mounted` no longer decides WHETHER to render, only WHICH VARIANT. Before
 * mount both sides compute `SERVER_FOOTER_TYPE`, so the markup is identical and
 * hydration is clean; after mount the persisted/configured value takes over.
 * The footer's BOX is therefore in the first paint and never moves — only its
 * styling may settle.
 *
 * That settle is free in practice: `footerVariants` is `"sticky bottom-0"` vs
 * `""` (lib/variants/layout.ts). `position: sticky` still occupies flow, so
 * even the sticky variant does not change where the box sits.
 *
 * THE ONE DELIBERATE SHIFT — `footerType: "hidden"`
 * ------------------------------------------------
 * "hidden" is a real configuration and still works: the footer renders on the
 * server and is REMOVED after mount. An owner who has chosen "hidden" therefore
 * gets one shift on first load. That is the deliberate trade — a minority-case
 * shift for the people who asked for no footer, instead of a guaranteed shift
 * for every visitor on every page. It cannot be avoided from here, because
 * "hidden" is only knowable from client state at this point in the tree.
 *
 * WHERE THE VALUE ACTUALLY COMES FROM
 * -----------------------------------
 * Not localStorage — that is only a cache. The authority is the admin's
 * `settings.layout` JSON, which `provider/dashboard.provider.tsx` pushes into
 * this store from a `useLayoutEffect` on every load. It currently resolves to
 * `"static"`, which maps to `"default"`, which is what the server renders — so
 * for the shipped configuration the post-mount variant is byte-identical to the
 * pre-mount one and nothing changes at all.
 *
 * The real fix, when someone owns that path: `settings.layout` already reaches
 * the server render, so `footerType` could be threaded through as a prop the
 * way `ChromeConfig` carries `navbarVariant` — at which point the server would
 * render the true variant, this file would need no `mounted` at all, and even
 * the "hidden" shift would disappear.
 */
const Footer = () => {
  const { footerType } = useThemeStore();
  const mounted = useMounted();

  /* Pre-mount, both sides agree on the default; post-mount, the real value. */
  const effectiveFooterType = mounted ? footerType : SERVER_FOOTER_TYPE;

  if (effectiveFooterType === "hidden") {
    return null;
  }

  // Convert footerType to our variant value: "sticky" or "default"
  const finalFooterType =
    effectiveFooterType === "sticky" ? "sticky" : "default";
  const footerClasses = footerVariants({
    footerType: finalFooterType,
  });
  return (
    <div className="w-full z-50">
      <FooterLayout className={footerClasses}>
        <FooterContent />
      </FooterLayout>
    </div>
  );
};
export default Footer;
const FooterContent = () => {
  const t = useTranslations("components");
  return (
    <div className="container block md:flex md:justify-between text-muted-foreground">
      <p className="sm:mb-0 text-xs md:text-sm">
        {t("copyright")} {new Date().getFullYear()} {siteName} {t("all_rights_reserved")}
      </p>
    </div>
  );
};
