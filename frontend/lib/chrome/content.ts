/**
 * Editable site content that the chrome renders — brand, footer links, socials.
 * ============================================================================
 *
 * WHY THE FOOTER LINKS REUSE THE MENU OVERRIDE ENGINE
 *
 * A footer is a two-level menu: sections with links under them. It has the same
 * problem too — the sections are GENERATED from which extensions are installed
 * and which settings are on, so storing an edited copy would freeze the footer
 * at today's feature set and silently drop the links for anything installed
 * later. Same problem, same answer: store a patch keyed by a stable key, and an
 * item nobody mentioned is unchanged. `applyMenuOverride` does that already, so
 * this file adds a content shape and no second engine.
 *
 * WHY `siteName` AND `siteDescription` LIVE HERE
 *
 * They were `process.env.NEXT_PUBLIC_SITE_NAME` and `..._SITE_DESCRIPTION`,
 * read at module scope in the footer. `NEXT_PUBLIC_*` is inlined at BUILD time,
 * so "change your site name" meant editing an env file and rebuilding the
 * frontend — which an owner of a hosted install cannot do at all. Moving them
 * into the chrome store makes them editable at runtime; the env values remain
 * the fallback, so an install that never touches the editor renders exactly
 * what it renders today.
 */

import {
  normalizeMenuOverride,
  type MenuOverride,
  EMPTY_MENU_OVERRIDE,
} from "./menu-overrides";

/**
 * A social link.
 *
 * `null` for the whole collection means "derive from settings", which is the
 * current behaviour — the footer reads `customSocialLinks` out of the settings
 * table. Storing an explicit list here takes over from that, and an EMPTY array
 * is a real answer meaning "show none", distinct from `null`. Collapsing those
 * two would make "remove the last social link" impossible to express.
 */
export interface FooterSocial {
  id: string;
  label: string;
  href: string;
  /** Icon id understood by the footer's icon resolver. */
  icon: string;
}

export interface FooterContent {
  /** `null` = fall back to NEXT_PUBLIC_SITE_NAME, then to the shipped default. */
  siteName: string | null;
  siteDescription: string | null;
  /**
   * The legal line. Supports `{year}` and `{siteName}` placeholders so it stays
   * correct without the admin editing it every January — a hardcoded year is
   * exactly the kind of edit that silently rots.
   */
  copyright: string | null;
  /** Patch over the GENERATED section tree. */
  links: MenuOverride;
  /** `null` = derive from settings. `[]` = show none. */
  socials: FooterSocial[] | null;
}

export const DEFAULT_FOOTER_CONTENT: FooterContent = Object.freeze({
  siteName: null,
  siteDescription: null,
  copyright: null,
  links: EMPTY_MENU_OVERRIDE,
  socials: null,
}) as FooterContent;

function asNullableString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  /* An empty string is stored by a cleared input box and means "use the
     default", not "render nothing" — an empty site name would render a footer
     with no brand and no way to tell whether that was intended. */
  return trimmed.length ? trimmed : null;
}

function asSocials(value: unknown): FooterSocial[] | null {
  if (value === null) return null;
  if (!Array.isArray(value)) return null;
  const out: FooterSocial[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const s = raw as Record<string, unknown>;
    const href = typeof s.href === "string" ? s.href.trim() : "";
    const label = typeof s.label === "string" ? s.label.trim() : "";
    if (!href || !label) continue;
    out.push({
      id: typeof s.id === "string" && s.id ? s.id : href,
      label,
      href,
      /* "globe" — a REAL icon id. This defaulted to "link", which is not one
         of the shipped svgs, so every social stored without an icon resolved to
         the globe fallback anyway. The rendered result was identical; the
         STORED value was a lie, and the next person to read the row would have
         gone looking for a link icon that does not exist. Pinned to the
         renderer's list by a test in menu-overrides.test.ts. */
      icon: typeof s.icon === "string" && s.icon ? s.icon : "globe",
    });
  }
  return out;
}

export function normalizeFooterContent(raw: unknown): FooterContent {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return DEFAULT_FOOTER_CONTENT;
  const input = raw as Record<string, unknown>;
  return {
    siteName: asNullableString(input.siteName),
    siteDescription: asNullableString(input.siteDescription),
    copyright: asNullableString(input.copyright),
    links: normalizeMenuOverride(input.links),
    /* `socials` is the one field where absent and empty differ, so it cannot go
       through the same helper as the strings. */
    socials: "socials" in input ? asSocials(input.socials) : null,
  };
}

/**
 * Fill `{year}` and `{siteName}` in the copyright line.
 *
 * Unknown placeholders are left alone rather than blanked: an owner who typed
 * `{yaer}` should see their typo and be able to fix it, not an empty gap.
 */
export function renderCopyright(
  template: string | null,
  siteName: string,
  year: number
): string | null {
  if (!template) return null;
  return template.replace(/\{(year|siteName)\}/g, (_, token: string) =>
    token === "year" ? String(year) : siteName
  );
}
