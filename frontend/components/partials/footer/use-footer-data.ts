"use client";

import { useMemo, type ElementType } from "react";
import { useTranslations } from "next-intl";
import { BarChart3, BookOpen, Coins, Globe } from "lucide-react";
import { useSettings } from "@/hooks/use-settings";
import { useChrome } from "@/components/chrome/chrome-provider";
import { useBrandBoot } from "@/store/brand-boot";
import { resolveLogoDisplay, type LogoDisplay } from "@/lib/brand/logo-display";
import { renderCopyright } from "@/lib/chrome/content";
import {
  applyMenuOverride,
  type MenuNodeLike,
  type MenuOverride,
} from "@/lib/chrome/menu-overrides";

/**
 * Everything the footer knows, derived exactly once.
 * ============================================================================
 *
 * The footer's content is not static: which trading links exist depends on
 * `settings`, which product links exist depends on installed `extensions`, and
 * the social row is a JSON blob an admin edits. Three layouts now render that
 * content, and if each one re-derived it we would have three chances to
 * disagree about whether Futures is installed — the same failure the navbar
 * already had when two code paths computed "is this nav item active" their own
 * way and answered differently on the same URL.
 *
 * So the derivation lives here, once, and a layout receives ready-made data.
 * A layout arranges. It never asks `settings` a question.
 *
 * WHAT THE ADMIN CAN CHANGE, AND WHERE IT ENTERS
 *
 * `chrome.footerContent` (see `lib/chrome/content.ts`) enters in exactly four
 * places, all of them here:
 *
 *   siteName / siteDescription -> `brand`, ahead of the NEXT_PUBLIC_* fallback
 *   links                      -> a PATCH over the generated section tree
 *   socials                    -> replaces the settings-derived row when set
 *   copyright                  -> replaces the legal line when set
 *
 * Every one of those is `null` by default and `null` means "use what the
 * platform derived", so an install that never opens the editor renders exactly
 * what it rendered before this file learned about `footerContent`.
 *
 * WHY THE LINK NAMES ARE NOT TRANSLATED
 *
 * They never were. The section titles and link labels are English literals in
 * the shipped footer, and inventing translation keys for them here would be a
 * separate change wearing this one's clothes — it would also silently ship 90
 * message files' worth of missing keys. `all_rights_reserved` is the one string
 * that was translated, and it still is: it is read through `useTranslations`
 * whenever the admin has NOT supplied a copyright line, which is the default.
 * An admin-authored string is a literal by definition — there is no key for it
 * to resolve — so `applyMenuOverride` flags renamed items `_customTitle`
 * exactly as the menu engine does, and nothing here looks up a key that would
 * never exist.
 */

/* ---------------------------------------------------------------------------
   KEY DERIVATION — the contract the admin's stored edits point at.

   THE RULE: a key is STRUCTURAL and LOCALE-INDEPENDENT.

     - a SECTION's key is a literal declared right here in code
       (`footer:trading`), never its heading;
     - a LINK's key is `${sectionKey}::${href}` — the route it navigates to,
       which is the same string in Arabic as it is in English.

   WHY IT MATTERS ENOUGH TO SAY OUT LOUD. The stored override addresses items by
   key: `hidden: ["footer:company::/about"]` is how "hide the About link" is
   written down. Derive that key from the DISPLAY TITLE instead and the
   reference breaks the moment the title changes — which happens on every locale
   switch, and again whenever an addon renames a label. Nothing errors. The
   hidden link simply reappears, the rename evaporates, the custom item lands in
   the wrong group, and it does so only for visitors reading the site in another
   language, which is the hardest possible way to notice.

   The href is SECTION-QUALIFIED because two sections may legitimately point at
   the same page — Investment and AI Investment both resolve to `/investment` —
   and an unqualified key would leave one of them unaddressable, so hiding one
   would hide both. (Within a section a duplicate href is prevented at the
   source: the AI Investment entry checks for an existing `/investment` before
   pushing, which is also what keeps these keys unique.)
   ------------------------------------------------------------------------ */

/** Stable, shipped section identities. Persisted in overrides — never rename. */
const SECTION_KEYS = {
  trading: "footer:trading",
  products: "footer:products",
  resources: "footer:resources",
  company: "footer:company",
} as const;

const linkKey = (sectionKey: string, href: string): string => `${sectionKey}::${href}`;

/**
 * Section icon ids, resolved back to components after the patch.
 *
 * The override engine carries icons as STRING ids (it has to — an override is
 * JSON in a database and cannot hold a React component), so the shipped icon
 * travels as an id and is resolved here. An unknown id — a stale override, or
 * one naming an icon a later build dropped — falls back to `Globe` rather than
 * rendering `undefined` as a component, which throws.
 */
const SECTION_ICONS: Record<string, ElementType> = {
  "bar-chart-3": BarChart3,
  coins: Coins,
  "book-open": BookOpen,
  globe: Globe,
};

/** The shape `settings.customSocialLinks` is stored in (string or parsed). */
interface SocialLinkSetting {
  id: string;
  name: string;
  url: string;
  icon: string;
}

export interface FooterLink {
  /** Structural. `${sectionKey}::${href}`. See the key-derivation note above. */
  key: string;
  name: string;
  href: string;
  icon?: ElementType;
}

export interface FooterSection {
  /** Structural. One of `SECTION_KEYS`, or an admin-added `custom:` key. */
  key: string;
  title: string;
  icon: ElementType;
  /** Recessive by design: the section heading beside it already names the
   *  section, so the icon carries no information a colour could add. Was a
   *  different hue per section. */
  iconColor: string;
  /**
   * Set ONLY when this top-level entry is really a LINK and not a group.
   *
   * A GROUP has children; a LINK does not. An admin who adds a footer item at
   * the top level with nothing under it has written down a link, not a heading —
   * see the note on `sections` below — so it travels with its own href and
   * `links: []`, and the layouts render it as a destination. No shipped section
   * has an href, so this is `undefined` on every untouched install and the
   * branches that read it are dead code there.
   */
  href?: string;
  links: FooterLink[];
}

/**
 * A section's link, flattened for the layouts that have no columns.
 *
 * Was a separate type carrying its own composed `key`, because `FooterLink` had
 * none. Now that a link owns a stable key of its own there is nothing left to
 * add, and a second shape would only be a second chance to compose the key
 * differently in the flat layouts than in the column one.
 */
export type FooterFlatLink = FooterLink;

export interface FooterSocial {
  id: string;
  label: string;
  href: string;
  icon: string;
}

/**
 * How the brand mark is drawn — the SAME setting the navbar reads.
 *
 * `navbarLogoDisplay` is one admin choice about one logo, and a footer that
 * ignored it would put a second, different mark on every page. The values are
 * the navbar's, so `FULL_LOGO_ONLY` means the wordmark image carries the name
 * and no name text is drawn beside it.
 *
 * An ALIAS, not a second copy of the union — the three layouts that switch on
 * this must keep compiling against whatever the navbar draws, and a re-typed
 * union would let a fourth value be added on one side only.
 */
export type FooterLogoDisplay = LogoDisplay;

export interface FooterBrand {
  name: string;
  description: string;
  /**
   * Settings' `navbarLogoDisplay`, normalised. Derived here rather than read in
   * the layouts, because a layout arranges what it is given — and because three
   * layouts reading the store themselves is three chances to default it
   * differently.
   */
  logoDisplay: FooterLogoDisplay;
}

export interface FooterData {
  /** Settings have arrived. Until then there is no honest footer to draw. */
  ready: boolean;
  brand: FooterBrand;
  /** Grouped, for the column layout. Admin patch already applied. */
  sections: FooterSection[];
  /**
   * The generated tree BEFORE the admin patch, for the editor to list.
   *
   * The editor must show what CAN be edited, including items an override
   * currently hides — otherwise hiding a link removes the control that would
   * bring it back.
   */
  shippedSections: FooterNode[];
  /** The same links in one list, for the layouts with no columns. */
  flatLinks: FooterFlatLink[];
  socials: FooterSocial[];
  legal: readonly FooterLink[];
  year: number;
  /** Translated tail of the copyright line. Used when `copyright` is null. */
  allRightsReserved: string;
  /**
   * The admin's own legal line, placeholders already filled, or `null`.
   *
   * `null` is the default and means the layouts render the line they always
   * rendered — the one built from `year`, `brand.name` and the TRANSLATED
   * `allRightsReserved`. A non-null value is an admin literal and replaces it
   * whole; it is not translated, because there is no message key for a string
   * someone typed into a form five minutes ago.
   */
  copyright: string | null;
}

/**
 * Build-time brand text, now only the FALLBACK.
 *
 * `NEXT_PUBLIC_*` is inlined at build time, so these cannot be changed on a
 * hosted install without a rebuild — which is the whole reason the editable
 * values exist. They stay as the fallback so an install that never opens the
 * editor is unaffected.
 */
const ENV_SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || "Bicrypto";
const ENV_SITE_DESCRIPTION =
  process.env.NEXT_PUBLIC_SITE_DESCRIPTION ||
  "The most trusted cryptocurrency platform with advanced trading tools and secure storage.";

/** Constant everywhere, so it is not rebuilt per render or per layout. */
const LEGAL_LINKS: readonly FooterLink[] = Object.freeze([
  { key: "footer:legal::/privacy", name: "Privacy", href: "/privacy" },
  { key: "footer:legal::/terms", name: "Terms", href: "/terms" },
  // Google Play requires the account-deletion URL be reachable by someone who
  // has already uninstalled the app, and in practice that means findable rather
  // than merely existing. /account-deletion was live but linked from nowhere —
  // the only other occurrence of the path in the tree was the i18n manifest.
  {
    key: "footer:legal::/account-deletion",
    name: "Delete account",
    href: "/account-deletion",
  },
]);

/* ---------------------------------------------------------------------------
   Admin-supplied URLs
   ------------------------------------------------------------------------ */

/**
 * Is this href safe to put in an `href` attribute?
 *
 * Returns the href, or `null` if it must not be rendered.
 *
 * WHY THIS IS NOT PARANOIA. Custom footer items and social links carry an
 * admin-authored URL straight from the database into `<a href>`. `Link` in
 * `@/i18n/routing` passes anything that is not a rooted path through to
 * `next/link` untouched, so a stored `javascript:fetch('/api/...')` would be
 * rendered verbatim and would execute in the visitor's session on click — on
 * EVERY page, because the footer is on every page. React logs a warning about
 * `javascript:` URLs and then renders them anyway, so the warning is not a
 * defence.
 *
 * The scheme check is done on a probe with C0 controls and spaces removed,
 * because `"java\tscript:alert(1)"` is a live `javascript:` URL in every
 * browser — the parser drops those characters before it reads the scheme, and a
 * naive `startsWith("javascript:")` sees a harmless relative path.
 *
 * DENY, DO NOT REWRITE. An unsafe href drops the whole item rather than being
 * neutered to `#`, because a dead link that looks fine is the version an admin
 * will not notice and will not fix; a missing one sends them back to the
 * editor. The editor should reject it at save time too — this is the last line,
 * not the only one.
 *
 * Exported so the admin editor can validate against the same rule instead of
 * writing a second, subtly different one.
 */
export function safeFooterHref(href: unknown): string | null {
  if (typeof href !== "string") return null;
  const trimmed = href.trim();
  if (!trimmed) return null;

  /* The control-character class is the POINT: a scheme hidden behind a tab
     or a NUL must be stripped before the check, or the probe and the
     browser's URL parser disagree about what this href is. */
  // eslint-disable-next-line no-control-regex
  const probe = trimmed.replace(/[\u0000-\u0020]/g, "").toLowerCase();

  /* Protocol-relative. Looks internal, is not: `//evil.com` leaves the site.
     It also survives `addLocalePrefix`, which only checks for a leading "/". */
  if (probe.startsWith("//")) return null;
  /* Internal route, or an in-page anchor. */
  if (probe.startsWith("/") || probe.startsWith("#")) return trimmed;
  /* The only external schemes a footer link has any business using. */
  if (/^(?:https?|mailto|tel):/.test(probe)) return trimmed;

  return null;
}

/**
 * A bare host: `facebook.com/acme`, `www.x.com/acme`, `example.co.uk:8080/x`.
 *
 * Anchored end to end, and every part of it is deliberately narrow:
 *
 *   - labels are `[a-z0-9]` with inner hyphens, so nothing but a hostname fits;
 *   - a TLD of at least two LETTERS is required, so `about` and `1.2.3.4` are
 *     not hosts — an under-specified relative word stays rejected;
 *   - the only colon allowed is a port, and a port is DIGITS. That is the
 *     clause that makes this safe to prefix: `javascript`, `data`, `vbscript`
 *     and every other scheme fails, because a scheme's colon is followed by
 *     something that is not one to five digits and not the end of the host.
 *
 * The consequence worth stating plainly: whatever matches this can only ever be
 * turned into `https://<hostname>…`, which is an ordinary external link. There
 * is no input to `normalizeFooterHref` that produces a dangerous scheme.
 */
const BARE_HOST =
  /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}(?::\d{1,5})?(?:[/?#][^\s]*)?$/i;

/**
 * `safeFooterHref`, plus: a scheme-less host is COMPLETED rather than dropped.
 *
 * WHY THIS EXISTS. The pre-editor footer put `link.url` from the settings blob
 * straight into `href` with no filter at all. `safeFooterHref` closed a real
 * hole in that (a stored `javascript:` URL executed on every page), but it also
 * takes an honest value with it: the system-settings social editor is a plain
 * text box with an `https://…` PLACEHOLDER and no validation, so `facebook.com`
 * is a value real installs have stored. Rejecting it means an install that
 * never opened the new editor silently loses social links it has been rendering
 * for years — which breaks the one promise the whole feature rests on.
 *
 * So the rule splits the two failures apart, because they are not the same
 * failure:
 *
 *   UNSAFE  — a scheme that can execute or smuggle (`javascript:`, `data:`,
 *             `//host`). Still DROPPED. Completing it would be inventing an
 *             intention nobody can have had.
 *   UNDER-SPECIFIED — a bare host. NORMALISED to `https://`, because the
 *             admin's intention is not in doubt and the alternative is a link
 *             that disappears with no message anywhere.
 *
 * `https` and not `http`: a footer link is a plain navigation, every host worth
 * linking to serves TLS, and guessing downward would silently downgrade a
 * secure destination.
 *
 * Note this is strictly MORE permissive than `safeFooterHref` and strictly LESS
 * permissive than the pre-change pass-through. `safeFooterHref` stays exported
 * and unchanged as the security predicate; this is the ingestion rule.
 */
export function normalizeFooterHref(href: unknown): string | null {
  const safe = safeFooterHref(href);
  if (safe) return safe;
  if (typeof href !== "string") return null;

  /* The same C0-and-space strip `safeFooterHref` probes with, so a value that
     hides its scheme behind a tab cannot reach `BARE_HOST` in one shape and the
     browser's parser in another. Matching on the stripped string and RETURNING
     the stripped string keeps those two the same value. */
  /* The control-character class is the POINT: a scheme hidden behind a tab
     or a NUL must be stripped before the check, or the probe and the
     browser's URL parser disagree about what this href is. */
  // eslint-disable-next-line no-control-regex
  const probe = href.replace(/[\u0000-\u0020]/g, "");
  if (!BARE_HOST.test(probe)) return null;
  return `https://${probe}`;
}

/* ---------------------------------------------------------------------------
   Social icons
   ------------------------------------------------------------------------ */

const SOCIAL_ICON_FALLBACK = "/img/social/globe.svg";

/** The id used when nothing better is known. Must be in `SOCIAL_ICON_IDS`. */
export const DEFAULT_SOCIAL_ICON_ID = "globe";

/**
 * The svgs actually shipped in `public/img/social` — the ONE list.
 *
 * Exported because the admin editor has to offer exactly these and no others.
 * A hand-copied list in the editor would drift the moment an svg is added or
 * renamed, and the symptom of that drift is silent: an icon id the resolver
 * does not know falls through to the globe, so the admin picks "Reddit", sees a
 * globe, and has nothing to read that explains it.
 */
export const SOCIAL_ICON_IDS: readonly string[] = Object.freeze([
  "discord",
  "facebook",
  "github",
  "globe",
  "instagram",
  "linkedin",
  "reddit",
  "telegram",
  "tiktok",
  "twitter",
  "youtube",
]);

const SOCIAL_ICON_ID_SET = new Set<string>(SOCIAL_ICON_IDS);

/**
 * Hosts that name an icon on sight, so the common case needs no interaction.
 *
 * Keyed by the registrable domain and matched by suffix, so `www.facebook.com`,
 * `m.facebook.com` and `de-de.facebook.com` all resolve without being listed —
 * and `evil-x.com` does not resolve to `x.com`, because a suffix match is
 * anchored on the dot.
 */
const SOCIAL_ICON_HOSTS: Readonly<Record<string, string>> = Object.freeze({
  "discord.com": "discord",
  "discord.gg": "discord",
  "discordapp.com": "discord",
  "facebook.com": "facebook",
  "fb.com": "facebook",
  "fb.me": "facebook",
  "github.com": "github",
  "instagram.com": "instagram",
  "linkedin.com": "linkedin",
  "reddit.com": "reddit",
  "t.me": "telegram",
  "telegram.me": "telegram",
  "telegram.org": "telegram",
  "tiktok.com": "tiktok",
  "twitter.com": "twitter",
  "x.com": "twitter",
  "youtu.be": "youtube",
  "youtube.com": "youtube",
});

/**
 * Guess the icon for a social URL, or `null` when there is nothing to guess.
 *
 * `null` is a real answer and not an error: a link to a Mastodon instance or a
 * company blog has no icon in the shipped set, and the caller falls back to the
 * globe rather than picking a wrong logo.
 *
 * The href is normalised FIRST, so a bare `twitter.com/acme` — the shape the
 * settings editor lets people store — is recognised exactly like the fully
 * written one. A rooted path, an anchor, `mailto:` and `tel:` all yield no
 * host and therefore no guess.
 */
export function inferSocialIconId(href: unknown): string | null {
  const normalized = normalizeFooterHref(href);
  if (!normalized) return null;

  let host: string;
  try {
    host = new URL(normalized).hostname.toLowerCase();
  } catch {
    /* `/about` and `#top` have no base and throw; they are not social URLs. */
    return null;
  }
  if (!host) return null;

  for (const [domain, id] of Object.entries(SOCIAL_ICON_HOSTS)) {
    if (host === domain || host.endsWith(`.${domain}`)) return id;
  }
  return null;
}

/**
 * Turn a stored icon value into something `next/image` can accept.
 *
 * Two vocabularies meet here. The settings blob stores PATHS
 * (`/img/social/twitter.svg`); `lib/chrome/content.ts` normalises a missing
 * icon to the bare id `"link"` and documents the field as "an icon id
 * understood by the footer's icon resolver". This is that resolver.
 *
 * It matters more than tidiness: `<Image src="twitter">` does not degrade, it
 * THROWS ("Failed to parse src"), and the footer renders on every page — so one
 * bad icon id takes the whole site down. Every value the settings path can
 * legitimately hold (a rooted path, an absolute http(s) URL) passes through
 * unchanged, so this is a pass-through for existing data and a rescue only for
 * values that would otherwise crash the render.
 */
function resolveSocialIconSrc(icon: unknown): string {
  if (typeof icon !== "string") return SOCIAL_ICON_FALLBACK;
  const value = icon.trim();
  if (!value) return SOCIAL_ICON_FALLBACK;
  /* Rooted path, but not protocol-relative — `//host/x.svg` is remote. */
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  if (/^https?:\/\//i.test(value)) return value;
  const id = value.toLowerCase().replace(/\.svg$/, "");
  return SOCIAL_ICON_ID_SET.has(id) ? `/img/social/${id}.svg` : SOCIAL_ICON_FALLBACK;
}

/* ---------------------------------------------------------------------------
   The generated tree, in the shape the override engine walks
   ------------------------------------------------------------------------ */

/**
 * A footer section or link as `applyMenuOverride` sees it.
 *
 * The engine is structural — it walks `{key, title, href?, icon?, child?}` — so
 * the footer is expressed in that shape for the length of the patch and mapped
 * back to `FooterSection` afterwards. The alternative was a second override
 * engine for two-level footer trees, which is one more place for "hidden" to
 * mean something slightly different.
 *
 * `icon` is a string here and an `ElementType` in `FooterSection`; that is the
 * whole reason for the round trip rather than patching `FooterSection` in place.
 */
export interface FooterNode extends MenuNodeLike {
  key: string;
  title: string;
  href?: string;
  icon?: string;
  child?: FooterNode[];
}

const linkNode = (sectionKey: string, name: string, href: string): FooterNode => ({
  key: linkKey(sectionKey, href),
  title: name,
  href,
});

export function useFooterData(): FooterData {
  const tComponents = useTranslations("components");
  const { extensions, settings, settingsFetched } = useSettings();
  const { footerContent } = useChrome();
  const brandBoot = useBrandBoot();

  const hasExtension = (name: string) => extensions?.includes(name) ?? false;
  const getSetting = (key: string) => {
    if (!settings) return false;
    const value = settings[key];
    return value === true || value === "true";
  };

  const isSpotEnabled = getSetting("spotWallets");
  const isEcosystemEnabled = hasExtension("ecosystem");
  const showSpotTrading = isSpotEnabled || isEcosystemEnabled;

  const brandName = footerContent.siteName ?? ENV_SITE_NAME;
  const brandDescription = footerContent.siteDescription ?? ENV_SITE_DESCRIPTION;
  /* Unknown values fall back to the platform default rather than to "draw
     nothing": the setting is TEXT (see MEMORY: settings are TEXT), so anything
     could be in there, and a footer with no mark at all is worse than a footer
     with the default one.

     `resolveLogoDisplay` is the navbar's rule, imported rather than restated —
     this was a third hand-written copy of the same string comparisons, and the
     footer and the navbar disagreeing about the mark is the one outcome neither
     can be allowed to produce. The boot value is passed for the same reason it
     is in the navbar: it is what the server knows. The footer is gated on
     `ready` so it does not currently draw before settings arrive, but that gate
     is the footer's business and this line should not depend on it. */
  const brandLogoDisplay: FooterLogoDisplay = resolveLogoDisplay({
    boot: brandBoot.logoDisplay,
    stored: settings?.navbarLogoDisplay,
    storedIsFresh: settingsFetched,
  });
  /* One value, so the legal line and a `{year}` placeholder cannot disagree
     across a midnight-on-31-December render. */
  const year = new Date().getFullYear();

  const contentSocials = footerContent.socials;
  const linkOverride: MenuOverride = footerContent.links;

  const socials = useMemo<FooterSocial[]>(() => {
    /* An explicit list REPLACES the settings-derived one, and `[]` is a real
       answer meaning "show none" — see `lib/chrome/content.ts`. Collapsing the
       two would make "remove the last social link" inexpressible, so this
       branch tests for null and not for length. */
    if (contentSocials) {
      return contentSocials.flatMap((social) => {
        const href = normalizeFooterHref(social.href);
        if (!href) return [];
        return [
          {
            id: social.id,
            label: social.label,
            href,
            icon: resolveSocialIconSrc(social.icon),
          },
        ];
      });
    }

    if (!settings) return [];
    const customLinks = settings.customSocialLinks;
    if (!customLinks) return [];

    try {
      const parsed: SocialLinkSetting[] =
        typeof customLinks === "string" ? JSON.parse(customLinks) : customLinks;

      if (!Array.isArray(parsed)) return [];

      return parsed
        .filter((link) => link.url && link.url.trim() !== "")
        .flatMap((link) => {
          /* NORMALISE, do not merely validate. The system-settings social
             editor is a text box with an `https://…` placeholder and no
             validation, so `facebook.com/acme` is a value real installs have
             stored — and dropping it would take away a social link from every
             install that never opened the new editor. See
             `normalizeFooterHref`. */
          const href = normalizeFooterHref(link.url);
          if (!href) return [];
          return [
            {
              id: link.id,
              label: link.name,
              href,
              icon: resolveSocialIconSrc(link.icon || SOCIAL_ICON_FALLBACK),
            },
          ];
        });
    } catch {
      return [];
    }
  }, [settings, contentSocials]);

  /**
   * The generated tree BEFORE any admin patch.
   *
   * Split out of the `sections` memo — rather than left inline — because the
   * admin editor has to render the list of things that CAN be edited, and that
   * is this tree, not the patched one. Feeding the editor the patched result
   * would make a hidden link disappear from the very screen that exists to
   * un-hide it, and a reordered list would re-anchor on itself every save.
   *
   * It also narrows the dependencies: this rebuilds when the site's features
   * change, and the patch below reapplies when the admin edits. Previously one
   * memo did both and every keystroke in the editor rebuilt the whole tree.
   */
  const shippedSections = useMemo<FooterNode[]>(() => {
    const shipped: FooterNode[] = [];

    // Trading Section
    const tradingLinks: FooterNode[] = [];
    if (showSpotTrading) {
      tradingLinks.push(linkNode(SECTION_KEYS.trading, "Spot Trading", "/trade"));
    }
    if (getSetting("binaryStatus")) {
      tradingLinks.push(linkNode(SECTION_KEYS.trading, "Binary Options", "/binary"));
    }
    if (hasExtension("futures")) {
      tradingLinks.push(linkNode(SECTION_KEYS.trading, "Futures", "/futures"));
    }
    if (hasExtension("p2p")) {
      tradingLinks.push(linkNode(SECTION_KEYS.trading, "P2P Trading", "/p2p"));
    }
    if (hasExtension("forex")) {
      tradingLinks.push(linkNode(SECTION_KEYS.trading, "Forex", "/forex"));
    }
    tradingLinks.push(linkNode(SECTION_KEYS.trading, "Markets", "/market"));

    if (tradingLinks.length > 0) {
      shipped.push({
        key: SECTION_KEYS.trading,
        title: "Trading",
        icon: "bar-chart-3",
        child: tradingLinks,
      });
    }

    // Products Section
    const productLinks: FooterNode[] = [];
    if (getSetting("investment")) {
      productLinks.push(linkNode(SECTION_KEYS.products, "Investment", "/investment"));
    }
    if (hasExtension("staking")) {
      productLinks.push(linkNode(SECTION_KEYS.products, "Staking", "/staking"));
    }
    if (hasExtension("ico")) {
      productLinks.push(linkNode(SECTION_KEYS.products, "Token Sales", "/ico"));
    }
    if (
      hasExtension("ai_investment") &&
      !productLinks.some((l) => l.href === "/investment")
    ) {
      productLinks.push(linkNode(SECTION_KEYS.products, "AI Investment", "/investment"));
    }
    if (hasExtension("nft")) {
      productLinks.push(linkNode(SECTION_KEYS.products, "NFT Marketplace", "/nft"));
    }
    if (hasExtension("ecommerce")) {
      productLinks.push(linkNode(SECTION_KEYS.products, "Store", "/ecommerce"));
    }

    if (productLinks.length > 0) {
      shipped.push({
        key: SECTION_KEYS.products,
        title: "Products",
        icon: "coins",
        child: productLinks,
      });
    }

    // Resources Section
    const resourceLinks: FooterNode[] = [
      linkNode(SECTION_KEYS.resources, "API Documentation", "/api-docs"),
      linkNode(SECTION_KEYS.resources, "Help Center", "/support"),
    ];
    if (hasExtension("knowledge_base")) {
      resourceLinks.push(linkNode(SECTION_KEYS.resources, "FAQ", "/faq"));
    }
    resourceLinks.push(linkNode(SECTION_KEYS.resources, "Blog", "/blog"));

    shipped.push({
      key: SECTION_KEYS.resources,
      title: "Resources",
      icon: "book-open",
      child: resourceLinks,
    });

    // Company Section
    shipped.push({
      key: SECTION_KEYS.company,
      title: "Company",
      icon: "globe",
      child: [
        linkNode(SECTION_KEYS.company, "About", "/about"),
        linkNode(SECTION_KEYS.company, "Contact", "/contact"),
        linkNode(SECTION_KEYS.company, "KYC Verification", "/user/kyc"),
        ...(hasExtension("mlm")
          ? [linkNode(SECTION_KEYS.company, "Affiliate", "/affiliate")]
          : []),
      ],
    });

    return shipped;
  }, [extensions, settings, showSpotTrading]);

  const sections = useMemo<FooterSection[]>(() => {
    /* THE PATCH. `applyMenuOverride` returns the input ARRAY ITSELF when the
       override is empty, which is the default on every install — so the whole
       editable-footer feature costs one `isEmptyMenuOverride` check until
       somebody actually edits something. */
    const patched = applyMenuOverride(shippedSections, linkOverride);

    /**
     * WHAT A TOP-LEVEL ENTRY IS. Children decide it, nothing else:
     *
     *   has children -> a GROUP. Renders as a heading over its links, and only
     *                   its LINKS reach the column-less layouts, exactly as the
     *                   four shipped sections always have.
     *   no children  -> a LINK. It carries its own href and reaches every
     *                   layout as a destination.
     *   no children,
     *   no safe href -> nothing. Dropped.
     *
     * This is the fix for a real hole. `custom` items with `parent: ""` are
     * spliced into the TOP level by the override engine, which made every one of
     * them a section — and a section's links are `child ?? []`, which a custom
     * node does not have. So an admin's top-level item was a heading with
     * nothing under it: kept alive by a `customSections` escape hatch in the
     * column layout, and INVISIBLE in `compact` and `centered`, because those
     * render `flatLinks` and a section with no links flattens to nothing. Three
     * layouts, two answers about whether the item exists.
     *
     * A top-level item with an href is a link — that is what an admin who typed
     * a URL into it meant — so it is one everywhere, and the empty heading that
     * was the other reading is now unrepresentable.
     */
    return patched.flatMap((section) => {
      const links = (section.child ?? []).flatMap((child) => {
        /* Shipped hrefs are literals and always pass unchanged; this only ever
           completes or removes an admin-authored one. */
        const href = normalizeFooterHref(child.href);
        if (!href) return [];
        return [{ key: child.key, name: child.title, href }];
      });

      const href =
        links.length > 0 ? undefined : (normalizeFooterHref(section.href) ?? undefined);

      /* Neither a group nor a link. A heading over nothing is a stray word. */
      if (links.length === 0 && !href) return [];

      return [
        {
          key: section.key,
          title: section.title,
          icon: SECTION_ICONS[section.icon ?? ""] ?? Globe,
          iconColor: "text-muted-foreground",
          href,
          links,
        },
      ];
    });
  }, [shippedSections, linkOverride]);

  /* Flattened for `compact` and `centered`, which have no columns to group by.
     Derived from `sections` rather than from settings a second time, so the
     column layout and the row layouts can never advertise different pages —
     and, now, can never disagree about the patch either.

     A top-level entry that is a LINK contributes ITSELF; a GROUP contributes
     its links and not its heading, which is what the shipped sections have
     always done. `href` is set only when `links` is empty, so the two branches
     can never both fire and an item can never appear twice. */
  const flatLinks = useMemo<FooterFlatLink[]>(
    () =>
      sections.flatMap((section) =>
        section.href
          ? [{ key: section.key, name: section.title, href: section.href }]
          : section.links
      ),
    [sections]
  );

  return {
    ready: settingsFetched,
    brand: {
      name: brandName,
      description: brandDescription,
      logoDisplay: brandLogoDisplay,
    },
    sections,
    shippedSections,
    flatLinks,
    socials,
    legal: LEGAL_LINKS,
    year,
    allRightsReserved: tComponents("all_rights_reserved"),
    copyright: renderCopyright(footerContent.copyright, brandName, year),
  };
}
