"use client";

/**
 * "How the footer will read" — the draft, in words, at full size.
 * ============================================================================
 *
 * NOT A PREVIEW, and deliberately not one. Site Design owns the live iframe;
 * duplicating it here would be a second answer to "what does my site look like",
 * and two previews that can disagree is worse than one. What this screen edits
 * is TEXT — a brand line, a legal line, a list of destinations — and text is
 * read, not looked at. A 81%-scaled iframe is the worst possible way to check
 * whether a tagline is too long or whether the About link is still there.
 *
 * WHY IT RE-RESOLVES THE LINK TREE INSTEAD OF ASKING `useFooterData`
 *
 * `useFooterData` resolves against the chrome the PROVIDER holds — what the
 * server sent on page load — so its `sections` are the SAVED footer, not the
 * draft in this editor. Asking it would show an owner the state they are trying
 * to change. So the same two exported helpers the renderer uses
 * (`applyMenuOverride`, `normalizeFooterHref`) are re-applied to the SHIPPED
 * tree with the DRAFT patch, and the two rules that decide what a top-level
 * entry is are mirrored from `use-footer-data.ts` with a comment at the spot.
 */

import * as React from "react";
import Image from "next/image";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { FooterContent } from "@/lib/chrome/content";
import { renderCopyright } from "@/lib/chrome/content";
import { applyMenuOverride } from "@/lib/chrome/menu-overrides";
import {
  SOCIAL_ICON_IDS,
  normalizeFooterHref,
  type FooterLink,
  type FooterNode,
  type FooterSocial as ResolvedSocial,
} from "@/components/partials/footer/use-footer-data";
import { useTranslations } from "next-intl";

/**
 * A stored icon value as something `next/image` can accept.
 *
 * Mirrors the renderer's own resolver, minus its absolute-URL branch: an
 * off-allowlist remote host THROWS inside `next/image`'s render rather than
 * degrading, and a read-out is not worth taking the page down for. An id the
 * shipped set does not contain resolves to the globe, which is exactly what the
 * footer will draw for it.
 */
function socialIconSrc(icon: string): string {
  const value = icon.trim();
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  const id = value.toLowerCase().replace(/\.svg$/, "");
  return SOCIAL_ICON_IDS.includes(id) ? `/img/social/${id}.svg` : "/img/social/globe.svg";
}

interface ReadoutSection {
  key: string;
  title: string;
  /** Set only when this top-level entry is a LINK rather than a group. */
  href?: string;
  links: { key: string; name: string; href: string }[];
}

/** A labelled row. The whole read-out is one grid, so the labels line up. */
function Row({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground sm:pt-0.5 sm:text-end">
        {label}
      </div>
      <div className={cn("min-w-0", className)}>{children}</div>
    </>
  );
}

export function FooterReadout({
  content,
  shipped,
  ready,
  year,
  allRightsReserved,
  fallbackName,
  fallbackDescription,
  legal,
  settingsSocials,
}: {
  content: FooterContent;
  /** The generated tree BEFORE the draft patch. */
  shipped: FooterNode[];
  /** Settings have arrived, so the link tree is the real one. */
  ready: boolean;
  year: number;
  /** The translated tail the shipped legal line uses. */
  allRightsReserved: string;
  fallbackName: string;
  fallbackDescription: string;
  legal: readonly FooterLink[];
  /**
   * The settings-derived social row, when it can be known — i.e. when the SAVED
   * chrome also has `socials: null`, so the renderer's answer is the settings
   * one. `null` when the draft and the saved state disagree and showing the
   * hook's list would be showing the wrong source.
   */
  settingsSocials: readonly ResolvedSocial[] | null;
}) {
  const t = useTranslations("components");
  const name = content.siteName ?? fallbackName;
  const description = content.siteDescription ?? fallbackDescription;

  const sections = React.useMemo<ReadoutSection[]>(() => {
    const patched = applyMenuOverride(shipped, content.links);
    return patched.flatMap((section) => {
      const links = (section.child ?? []).flatMap((child) => {
        const href = normalizeFooterHref(child.href);
        return href ? [{ key: child.key, name: child.title, href }] : [];
      });
      /* The rule from `use-footer-data.ts`: children decide what a top-level
         entry is. Has children -> a group. No children but a safe href -> a
         link. Neither -> nothing, because a heading over nothing is a stray
         word. */
      if (links.length > 0) return [{ key: section.key, title: section.title, links }];
      const href = normalizeFooterHref(section.href);
      return href ? [{ key: section.key, title: section.title, href, links: [] }] : [];
    });
  }, [shipped, content.links]);

  const copyright =
    renderCopyright(content.copyright, name, year) ?? `© ${year} ${name}. ${allRightsReserved}.`;

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border bg-card">
        <div className="grid gap-x-4 gap-y-3 p-3 sm:grid-cols-[6.5rem_minmax(0,1fr)]">
          <Row label="Brand">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="text-sm font-semibold text-foreground">{name}</span>
              <SourceChip custom={content.siteName !== null} />
            </div>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="text-xs leading-snug text-muted-foreground">{description}</span>
              <SourceChip custom={content.siteDescription !== null} />
            </div>
          </Row>

          <Row label="Links">
            {!ready ? (
              <p className="text-xs text-muted-foreground">
                {t("waiting_for_site_settings_the_link")}
              </p>
            ) : sections.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {t("every_section_is_hidden_the_footer")}
              </p>
            ) : (
              <ul className="space-y-1.5">
                {sections.map((section) => (
                  <li key={section.key} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="text-xs font-medium text-foreground">{section.title}</span>
                    {section.href ? (
                      <>
                        <Badge variant="muted" size="xs">
                          link
                        </Badge>
                        <span className="truncate text-[11px] text-subtle-foreground">
                          {section.href}
                        </span>
                      </>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">
                        {section.links.map((link) => link.name).join(" · ")}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Row>

          <Row label="Socials">
            <SocialsReadout socials={content.socials} settingsSocials={settingsSocials} />
          </Row>

          <Row label="Legal">
            <p className="text-xs text-foreground">{copyright}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {content.copyright === null
                ? t("the_shipped_line_with_the_translated")
                : t("your_line_it_is_not_translated")}
            </p>
            <p className="mt-1 text-[11px] text-subtle-foreground">
              {legal.map((link) => link.name).join(" · ")} — always shown, not editable here.
            </p>
          </Row>
        </div>
      </div>

      <p className="text-[11px] leading-snug text-muted-foreground">
        {t("this_is_what_the_footer_will")}
      </p>
    </div>
  );
}

/** Default vs overridden, said the same way in every row. */
function SourceChip({ custom }: { custom: boolean }) {
  return custom ? (
    <Badge tone="primary" size="xs">
      Custom
    </Badge>
  ) : (
    <Badge variant="muted" size="xs">
      Default
    </Badge>
  );
}

/**
 * The three social states, each named out loud.
 *
 * `null` and `[]` are DIFFERENT answers — "use the settings table" and "show
 * none" — and the whole reason the field is nullable is that collapsing them
 * would make removing the last social link impossible: it would spring back on
 * the next save.
 */
function SocialsReadout({
  socials,
  settingsSocials,
}: {
  socials: FooterContent["socials"];
  settingsSocials: readonly ResolvedSocial[] | null;
}) {
  const t = useTranslations("components");
  const tCommon = useTranslations("common");
  if (socials === null) {
    return (
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="muted" size="xs">
            {t("from_site_settings")}
          </Badge>
          {settingsSocials ? (
            <span className="text-xs text-foreground">
              {settingsSocials.length === 0
                ? t("none_configured_there")
                : settingsSocials.map((social) => social.label).join(" · ")}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">
              {t("whatever_is_configured_under_system_settings")}
            </span>
          )}
        </div>
      </div>
    );
  }

  if (socials.length === 0) {
    return (
      <p className="text-xs text-foreground">
        {t("none_the_footer_shows_no_social_row_at_all")}
      </p>
    );
  }

  return (
    <ul className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      {socials.map((social) => {
        const href = normalizeFooterHref(social.href);
        return (
          <li
            key={social.id}
            className={cn("flex items-center gap-1.5", !href && "opacity-50")}
            title={href ?? t("this_link_will_be_dropped")}
          >
            <Image
              src={socialIconSrc(social.icon)}
              alt=""
              width={12}
              height={12}
              className="opacity-80 dark:invert"
            />
            <span className={cn("text-xs text-foreground", !href && "line-through")}>
              {social.label || tCommon("untitled")}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
