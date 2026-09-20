/**
 * The chrome variant registry — navbar and footer designs an admin can pick.
 * ============================================================================
 *
 * A "variant" is a LAYOUT, not a colour. Colours already have a home: the design
 * manager writes custom-property overrides into an SSR `<style>` and every
 * surface follows. That mechanism cannot do this one — a CSS variable cannot
 * swap a component tree, so "put the nav in the centre and the actions on a
 * second row" is not expressible as a token, and trying would produce a
 * `display:none` maze instead of a design.
 *
 * So a variant is a component. What makes several of them safe to swap is that
 * they all consume the SAME SLOTS, computed once by `site-header.tsx`:
 *
 *     brand | nav | actions | mobileTrigger | overlays
 *
 * The header's state — auth, unread counts, wallet, active route, mega-dropdown
 * data, scroll position — is computed ONCE and handed down as ready-made nodes.
 * A variant arranges them. It never re-derives state, which is what stops the
 * second variant from quietly disagreeing with the first about which nav item is
 * active (there were already two divergent active-state algorithms in the file
 * before this).
 *
 * WHY A REGISTRY AND NOT JUST A UNION TYPE
 *
 * The admin picker, the SSR resolver and the seed data all need to agree on
 * what exists, and two of those live on the other side of an HTTP boundary. A
 * registry gives one list with declared capabilities, so the picker can grey out
 * a variant that cannot show a search box rather than letting an owner choose it
 * and wonder where their search went.
 *
 * HEIGHT IS DECLARED, NOT ASSUMED. `--header-height` drives both the bar and
 * every page's top clearance (`h-header`, `pt-header`, `pt-header-clear`), so a
 * variant that is 96px tall says so here and the whole app moves with it. A
 * variant that changed its own height with a local class would push content
 * under itself on ~40 page templates and nothing would report it.
 */

import { DEFAULT_FOOTER_CONTENT, normalizeFooterContent, type FooterContent } from "./content";
import { normalizeMenuOverrides, type MenuOverrides } from "./menu-overrides";

export type ChromeSlot = "brand" | "nav" | "actions" | "mobileTrigger" | "overlays";

export interface NavbarVariantMeta {
  /** Stable id. Persisted, so never rename one — add a new id instead. */
  id: string;
  /** Shown in the admin picker. */
  label: string;
  /** One line on what makes it different, for the picker card. */
  description: string;
  /**
   * The bar height this variant needs, as a CSS length.
   *
   * Applied by overriding `--header-height`, which every page's clearance is
   * derived from. Declaring it here rather than hardcoding a class inside the
   * variant is the difference between "a taller navbar" and "a taller navbar
   * that hides the first line of every page".
   */
  height: string;
  /**
   * What the layout can actually show. The picker uses these to explain a
   * trade-off BEFORE the choice, instead of the owner discovering it after.
   */
  capabilities: {
    /** Renders the desktop nav row at all (a minimal bar may not). */
    nav: boolean;
    /** Has room for the full action cluster vs a collapsed menu. */
    actions: boolean;
    /** Renders the command-palette / search trigger. */
    search: boolean;
    /** Nav sits on its own row below the brand row. */
    twoRow: boolean;
  };
}

/**
 * The shipped navbar variants.
 *
 * `classic` is the CURRENT header, registered as a variant so that "pick a
 * navbar" has a truthful default and an owner can always get back to what they
 * had. It must stay byte-identical in output to the pre-variant header — that is
 * the regression test for the whole refactor.
 */
export const NAVBAR_VARIANTS: readonly NavbarVariantMeta[] = Object.freeze([
  {
    id: "classic",
    label: "Classic",
    description:
      "Logo left, navigation beside it, controls right. The layout the platform ships with.",
    height: "4rem",
    capabilities: { nav: true, actions: true, search: true, twoRow: false },
  },
  {
    id: "centered",
    label: "Centered",
    /* Describes what `CenteredNavbar` actually renders — a
       `grid-cols-[1fr_auto_1fr]` with brand in the leading cell and the NAV in
       the centre one. This read "logo centred with navigation split either
       side", which is a different layout entirely; it was written before the
       component and never reconciled. The picker shows this text as the reason
       to choose a variant, so a stale sentence here is a wrong choice made
       confidently. */
    description:
      "Navigation centred in the bar, brand at the start, controls at the end. The centre column takes the room the search trigger needed, so that is dropped.",
    height: "4rem",
    capabilities: { nav: true, actions: true, search: false, twoRow: false },
  },
  {
    id: "stacked",
    label: "Stacked",
    description:
      "Brand and controls on top, a full-width navigation row beneath. Best for sites with many top-level sections.",
    height: "6.5rem",
    capabilities: { nav: true, actions: true, search: true, twoRow: true },
  },
  {
    id: "minimal",
    label: "Minimal",
    description:
      "Logo and essential controls only; all navigation moves into the menu drawer. The quietest option.",
    height: "3.5rem",
    capabilities: { nav: false, actions: true, search: false, twoRow: false },
  },
]);

export const DEFAULT_NAVBAR_VARIANT = "classic";

export function getNavbarVariant(id: string | null | undefined): NavbarVariantMeta {
  return (
    NAVBAR_VARIANTS.find((v) => v.id === id) ??
    NAVBAR_VARIANTS.find((v) => v.id === DEFAULT_NAVBAR_VARIANT)!
  );
}

/**
 * Is `id` something this build knows how to render?
 *
 * Load-bearing on the SERVER path. A stored id can outlive the code that
 * rendered it — an owner picks `stacked`, the site is rolled back, and the
 * database still says `stacked`. Resolving an unknown id to the default is the
 * difference between "the navbar looks like the old one" and "the layout throws
 * during SSR and the whole page 500s".
 */
export function isKnownNavbarVariant(id: unknown): boolean {
  return typeof id === "string" && NAVBAR_VARIANTS.some((v) => v.id === id);
}

/**
 * The `href` the root layout hoists the chrome-metrics <style> under, and so the
 * `data-href` it carries in the DOM. Shared with the admin editor, which
 * rewrites the tag in place when a navbar is saved — see `lib/live-style.ts`.
 */
export const CHROME_METRICS_STYLE_HREF = "chrome-metrics";

/**
 * The variant's declared height, as the CSS the root layout emits.
 *
 * UNLAYERED, and that is a correction rather than a preference. This used to be
 * wrapped in `@layer admin-theme` "because globals.css declares that layer
 * last" — globals.css does not, and has not since the design theme was
 * unlayered. A layer's priority is fixed by where it is FIRST declared, so an
 * `admin-theme` block reaching the parser ahead of the stylesheet link
 * registered the layer FIRST and became the LOWEST-priority layer — losing to
 * the `--header-height: 4rem` default that globals.css sets in `@layer base`.
 * A taller navbar would then sit over the first line of every page. Unlayered
 * beats every layer whatever the source order, which is the same fix, and the
 * same argument, as `buildThemeCss`.
 *
 * `height` is not caller input — it comes from the frozen registry above, which
 * only ever yields one of the declared lengths — so no stored value can poison
 * this string.
 */
export function buildChromeMetricsCss(navbarVariant: string | null | undefined): string {
  const height = getNavbarVariant(navbarVariant).height;
  return height ? `:root{--header-height:${height}}` : "";
}

/* ---------------------------------------------------------------------------
   Footer variants — declared here in phase 2 so phase 4 has somewhere to land,
   and so the admin surface is built once against one registry shape rather than
   twice against two.
   ------------------------------------------------------------------------ */

export interface FooterVariantMeta {
  id: string;
  label: string;
  description: string;
  /** How many link columns the layout is designed around. */
  columns: number;
  capabilities: {
    newsletter: boolean;
    socials: boolean;
    /** A tall brand block with tagline, vs a single compact line. */
    brandBlock: boolean;
  };
}

export const FOOTER_VARIANTS: readonly FooterVariantMeta[] = Object.freeze([
  {
    id: "columns",
    label: "Columns",
    description:
      "Brand block with a tagline, four link columns, socials and a legal bar. The layout the platform ships with.",
    columns: 4,
    /* `newsletter: false`, and it is false on ALL THREE variants, because no
       footer in this app has ever rendered a signup form — grep the whole
       `partials/footer` tree for "newsletter" and there is nothing. This was
       declared `true` when the registry was written ahead of the components,
       and the admin picker renders capabilities as the reason to choose a
       layout, so it was promising an owner a feature that does not exist. The
       flag stays in the shape rather than being deleted: it is the natural home
       for the signup when one is built, and a footer content editor is the next
       phase. Turn it on in the same change that renders the form. */
    capabilities: { newsletter: false, socials: true, brandBlock: true },
  },
  {
    id: "compact",
    label: "Compact",
    description: "A single row: logo, inline links, socials. For sites with few pages.",
    columns: 0,
    capabilities: { newsletter: false, socials: true, brandBlock: false },
  },
  {
    id: "centered",
    label: "Centered",
    description: "Centred logo, one centred link row, socials beneath. Quiet and symmetrical.",
    columns: 1,
    capabilities: { newsletter: false, socials: true, brandBlock: true },
  },
]);

export const DEFAULT_FOOTER_VARIANT = "columns";

export function getFooterVariant(id: string | null | undefined): FooterVariantMeta {
  return (
    FOOTER_VARIANTS.find((v) => v.id === id) ??
    FOOTER_VARIANTS.find((v) => v.id === DEFAULT_FOOTER_VARIANT)!
  );
}

export function isKnownFooterVariant(id: unknown): boolean {
  return typeof id === "string" && FOOTER_VARIANTS.some((v) => v.id === id);
}

/**
 * The whole chrome selection, as stored and as delivered to the layout.
 *
 * Deliberately a small, flat, serialisable shape: it crosses an HTTP boundary
 * and is read during SSR on every request, so it must be cheap to fetch and
 * impossible to half-apply.
 */
export interface ChromeConfig {
  navbarVariant: string;
  footerVariant: string;
  /**
   * Per-menu patches, keyed by scope (`admin`, `user`, `ext_staking`, …).
   *
   * A PATCH, not a stored menu — see `menu-overrides.ts` for why a snapshot
   * cannot work here. Usually `{}`, and the resolver short-circuits on that, so
   * an install that never opens the menu editor pays nothing.
   */
  menuOverrides: MenuOverrides;
  /** Brand text, footer link patch and socials. */
  footerContent: FooterContent;
}

export const DEFAULT_CHROME: ChromeConfig = Object.freeze({
  navbarVariant: DEFAULT_NAVBAR_VARIANT,
  footerVariant: DEFAULT_FOOTER_VARIANT,
  menuOverrides: {},
  footerContent: DEFAULT_FOOTER_CONTENT,
});

/**
 * Coerce anything into a renderable config.
 *
 * Every field falls back independently: a row with a valid navbar and a garbage
 * footer keeps the navbar. The alternative — rejecting the whole row — turns one
 * bad value into "the site lost its chrome".
 */
export function normalizeChrome(raw: unknown): ChromeConfig {
  const input = (raw ?? {}) as Partial<ChromeConfig>;
  return {
    navbarVariant: isKnownNavbarVariant(input.navbarVariant)
      ? (input.navbarVariant as string)
      : DEFAULT_NAVBAR_VARIANT,
    footerVariant: isKnownFooterVariant(input.footerVariant)
      ? (input.footerVariant as string)
      : DEFAULT_FOOTER_VARIANT,
    /* Each normaliser degrades to empty on its own. A corrupt menu override must
       not cost the owner their footer text — the failures are unrelated, and
       coupling them would turn one bad field into "the site lost its chrome". */
    menuOverrides: normalizeMenuOverrides((input as Record<string, unknown>).menuOverrides),
    footerContent: normalizeFooterContent((input as Record<string, unknown>).footerContent),
  };
}
