import Image from "next/image";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/routing";
import Logo from "@/components/elements/logo";
import { cn } from "@/lib/utils";
import type {
  FooterBrand,
  FooterFlatLink,
  FooterLink,
  FooterSection,
  FooterSocial,
} from "./use-footer-data";
import { useTranslations } from "next-intl";

/**
 * The footer layouts — how one set of footer content is ARRANGED.
 * ============================================================================
 *
 * These components own nothing but arrangement. Every link, every social icon
 * and every string they place was derived once by `use-footer-data.ts` from
 * settings and installed extensions. A layout never re-derives any of it, which
 * is what stops `compact` from advertising a Futures page that `columns`
 * decided was not installed.
 *
 * WHAT A LAYOUT MAY NOT DO
 *
 * - It may not own the `<footer>`. The shell — the surface, the border, the
 *   gradient wash — is shared by `user-footer.tsx`, so switching arrangement
 *   never switches the page's bottom edge. A layout renders the shell's
 *   CHILDREN: a content block, then the legal bar.
 * - It may not filter the content it is given. `capabilities` in the registry
 *   is a promise made to the admin in the picker, and it is honoured here by
 *   ARRANGEMENT — `compact` declares `brandBlock: false` and therefore has no
 *   brand block to render, rather than being handed one and hiding it. A layout
 *   that hid what it was given would leave the picker describing a footer
 *   nobody ships.
 * - It may not use physical direction utilities. This app ships Arabic and
 *   Farsi; `text-start` flips with the document, `text-left` does not. The one
 *   exception is inside `ColumnsFooter`, which is frozen (see below).
 *
 * WHY `columns` IS FROZEN
 *
 * It is the layout every existing site already renders. Its markup here is
 * byte-equivalent to the pre-variant footer, down to the `sm:text-left` that
 * should have been `sm:text-start`. Fixing that here would change what every
 * site that never picked a variant sees, in a change whose entire premise is
 * that picking nothing changes nothing. It is a separate fix.
 *
 * Frozen means frozen for CONTENT THE PLATFORM SHIPS. The one branch added
 * since — a top-level entry that is a link rather than a group — is reachable
 * only from `FooterSection.href`, which nothing but an admin-added item ever
 * sets, so an untouched install renders the original markup unchanged.
 *
 * The brand mark is the one deliberate exception, and it is deliberate in all
 * three layouts at once: the frozen markup drew a `TrendingUp` glyph, never the
 * site's logo, so freezing it meant freezing a placeholder onto every page of
 * every install that had uploaded one. See `BrandMark`.
 */

export interface FooterLayoutProps {
  /** Variant id from the chrome registry. Unknown ids fall back to "columns". */
  variant: string;
  brand: FooterBrand;
  /** Grouped links, for the layout that has columns. */
  sections: FooterSection[];
  /** The same links in one list, for the layouts that do not. */
  flatLinks: FooterFlatLink[];
  socials: FooterSocial[];
  legal: readonly FooterLink[];
  year: number;
  allRightsReserved: string;
  /** Admin's own legal line, already interpolated, or `null` for the built one. */
  copyright: string | null;
  /**
   * Optional trust mark, rendered alongside the legal links in every layout.
   *
   * `undefined` on an untouched install — the setting behind it ships off — so the
   * frozen `columns` markup is unchanged for every site that never opted in, which
   * is the condition the freeze actually protects.
   */
  badge?: ReactNode;
}

type LayoutData = Omit<FooterLayoutProps, "variant">;

/**
 * The legal line, in one place for all three layouts.
 *
 * `null` is the default and renders the line the platform has always rendered —
 * the same children, in the same order, so the served HTML is byte-identical
 * (a Fragment emits no markup of its own and does not change where React puts
 * its text separators; `footer-content.test.tsx` asserts that against the
 * pre-change JSX rather than trusting the claim).
 *
 * A non-null value is an admin literal, placeholders already filled by
 * `renderCopyright`, and it replaces the whole line including the translated
 * tail — there is no message key for a string somebody typed into a form, and
 * splicing a translated fragment into an authored sentence would produce
 * grammar no locale asked for.
 */
export function CopyrightLine({
  brand,
  year,
  allRightsReserved,
  copyright,
}: Pick<LayoutData, "brand" | "year" | "allRightsReserved" | "copyright">) {
  if (copyright) return <>{copyright}</>;
  return (
    <>
      © {year} {brand.name}. {allRightsReserved}.
    </>
  );
}

/**
 * One social button.
 *
 * Shared by all three layouts so the hit area, the hover treatment and the
 * `dark:invert` on the icon cannot drift apart. The invert is not a token hack:
 * the icons are admin-supplied image URLs, and no colour token can recolour a
 * file the platform did not draw.
 */
function SocialIcon({ social }: { social: FooterSocial }) {
  return (
    <a
      href={social.href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={social.label}
      title={social.label}
      className="w-10 h-10 flex items-center justify-center rounded-lg bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
    >
      <Image
        src={social.icon}
        alt={social.label}
        width={20}
        height={20}
        className="dark:invert opacity-70 hover:opacity-100 transition-opacity"
      />
    </a>
  );
}

/**
 * The brand mark — the site's OWN logo, drawn the way the navbar draws it.
 *
 * It used to be a `TrendingUp` glyph in a gradient tile: a placeholder that was
 * never the site's mark, on an install that has uploaded one. So a visitor met
 * the real logo in the header and a stock chart arrow in the footer, on every
 * page, and re-uploading the logo changed only half of them.
 *
 * `Logo` is the same component `NavbarLogo` and the sidebar render, so the
 * theme-aware source (`logo-dark.webp` in dark), the cache-buster that makes a
 * fresh upload appear without a hard reload, and the "LOGO" fallback tile for a
 * missing file all come along — none of which a bespoke `<img>` here would get.
 *
 * `brand.logoDisplay` is settings' `navbarLogoDisplay`, so the three shapes are
 * the navbar's shapes: wordmark alone, square alone, or square plus name.
 * FULL_LOGO_ONLY draws no name text because the image already carries it.
 *
 * The name stays `brand.name` — the footer editor's value, which the copyright
 * line also uses — not the build-time `siteName` the navbar reads, so an admin
 * who renamed the footer brand does not get the old name back beside the logo.
 */
function BrandMark({
  brand,
  size = "lg",
  className,
}: {
  brand: FooterBrand;
  /** `sm` is the one-line compact row; `lg` is a brand block. */
  size?: "lg" | "sm";
  className?: string;
}) {
  const isFullLogo = brand.logoDisplay === "FULL_LOGO_ONLY";

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Logo
        type={isFullLogo ? "text" : "icon"}
        className={cn(
          "object-contain",
          isFullLogo
            ? size === "sm"
              ? "h-9 lg:h-9 w-auto max-w-[180px]"
              : "h-10 lg:h-12 w-auto max-w-[220px]"
            : size === "sm"
              ? "h-9 w-9 lg:h-9 lg:w-9"
              : "h-10 w-10 lg:h-10 lg:w-10"
        )}
      />
      {brand.logoDisplay === "SQUARE_WITH_NAME" && (
        <span
          className={cn(
            "font-bold text-foreground",
            size === "sm" ? "text-lg" : "text-xl"
          )}
        >
          {brand.name}
        </span>
      )}
    </div>
  );
}

/**
 * The layout the platform ships with, and the regression baseline.
 *
 * Brand block with tagline and CTA, a social cluster opposite it, four link
 * columns beneath, then the legal bar. This markup is byte-equivalent to the
 * pre-variant footer — the settings gating, the icons, the `grid-cols-2 /
 * sm:grid-cols-3 / lg:grid-cols-4` breakpoints and the enlarged mobile tap
 * targets (`py-2.5 sm:py-0`) are all the originals. Changing it changes every
 * site that never picked a variant, so treat it as frozen.
 */
function ColumnsFooter({
  brand,
  sections,
  socials,
  legal,
  year,
  allRightsReserved,
  copyright,
  badge,
}: LayoutData) {
  const t = useTranslations("components");
  const tCommon = useTranslations("common");
  return (
    <>
      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        {/* Top Section - Logo and Social */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8 lg:gap-12 pb-10 lg:pb-12 border-b border-border/50">
          {/* Brand */}
          <div className="max-w-sm">
            <BrandMark brand={brand} className="mb-4" />
            <p className="text-muted-foreground text-sm leading-relaxed mb-6">
              {brand.description}
            </p>
            {/* CTA Button */}
            <div className="flex flex-wrap gap-3">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded-lg transition-colors"
              >
                {tCommon("get_started")}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Social Links from Settings */}
          {socials.length > 0 && (
            <div className="flex flex-col items-start lg:items-end gap-4">
              <span className="text-sm text-muted-foreground">{t("follow_us")}</span>
              <div className="flex items-center gap-3 flex-wrap">
                {socials.map((social) => (
                  <SocialIcon key={social.id} social={social} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Links Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-8 lg:gap-12 py-10 lg:py-12">
          {/* Keyed by the STRUCTURAL key, not the title: a React key must be
              stable, and two admin-added items may share a label. React keys
              are not rendered, so this changes no output. */}
          {sections.map((section) => (
            <div key={section.key}>
              {/* A top-level entry that is a LINK, not a group — an item the
                  admin added with nothing under it. It renders as a link, at
                  heading weight so it still reads as a column, because the two
                  column-less layouts render it (via `flatLinks`) and all three
                  must agree that it exists. The alternative this replaces was a
                  heading over an empty list: a stray word here, and nothing at
                  all in `compact` and `centered`.

                  `href` is `undefined` for every shipped section, so on an
                  untouched install this branch is never taken and the markup
                  below is the frozen original. */}
              {section.href ? (
                <Link
                  href={section.href}
                  className="text-foreground hover:text-primary font-semibold text-sm mb-4 flex items-center gap-2 transition-colors"
                >
                  <section.icon className={cn("w-4 h-4", section.iconColor)} />
                  {section.title}
                </Link>
              ) : (
                <h3 className="text-foreground font-semibold text-sm mb-4 flex items-center gap-2">
                  <section.icon className={cn("w-4 h-4", section.iconColor)} />
                  {section.title}
                </h3>
              )}
              {section.links.length > 0 ? (
                <ul className="space-y-1 sm:space-y-3">
                  {section.links.map((link) => (
                    <li key={link.key}>
                      <Link
                        href={link.href}
                        className="text-muted-foreground hover:text-foreground text-sm transition-colors inline-block py-2.5 sm:py-0"
                      >
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-border/50 bg-muted/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-muted-foreground text-sm text-center sm:text-left">
              <CopyrightLine
                brand={brand}
                year={year}
                allRightsReserved={allRightsReserved}
                copyright={copyright}
              />
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
              <span className="text-sm">{badge}</span>
              {legal.map((link) => (
                <Link
                  key={link.key}
                  href={link.href}
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors inline-block py-2.5 sm:py-0"
                >
                  {link.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * One row: mark and name, every link inline, socials at the end.
 *
 * `brandBlock: false` in the registry is the whole shape of this layout — there
 * is no tagline, no CTA and no column grid, so the footer is one band roughly
 * the height of the navbar. The links are the SAME links the column layout
 * shows, flattened: a compact footer that quietly dropped pages would be a
 * broken site map, not a smaller footer.
 *
 * The row is a column below `lg`. That is what keeps 18 links and 6 social
 * buttons from overflowing a 320px viewport — the link list wraps inside its
 * own track (`min-w-0` so the flex item may actually shrink below its content
 * width, which is what a flex item refuses to do by default) and the three
 * groups stack rather than compete for one line.
 */
function CompactFooter({
  brand,
  flatLinks,
  socials,
  legal,
  year,
  allRightsReserved,
  copyright,
  badge,
}: LayoutData) {
  return (
    <>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
          {/* Brand — one line, no tagline: `brandBlock: false`. */}
          <BrandMark brand={brand} size="sm" className="shrink-0" />

          {/* Every link, inline. */}
          <nav className="min-w-0 lg:flex-1">
            <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 lg:gap-x-6">
              {flatLinks.map((link) => (
                <li key={link.key}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-foreground text-sm transition-colors inline-block py-2.5 sm:py-1"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {socials.length > 0 && (
            <div className="flex items-center justify-center gap-2 flex-wrap shrink-0">
              {socials.map((social) => (
                <SocialIcon key={social.id} social={social} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Legal bar — thinner than the column layout's, same content. */}
      <div className="border-t border-border/50 bg-muted/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-muted-foreground text-xs text-center sm:text-start">
              <CopyrightLine
                brand={brand}
                year={year}
                allRightsReserved={allRightsReserved}
                copyright={copyright}
              />
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
              <span className="text-xs">{badge}</span>
              {legal.map((link) => (
                <Link
                  key={link.key}
                  href={link.href}
                  className="text-muted-foreground hover:text-foreground text-xs transition-colors inline-block py-2.5 sm:py-0"
                >
                  {link.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * A centred stack: brand, one link row, socials beneath, legal last.
 *
 * `columns: 1` in the registry means exactly one link track, so the links are
 * flattened into a single centred row rather than split into a grid — the
 * symmetry is the point, and a 4-column grid with a centred heading above it
 * would just be `columns` with extra steps.
 *
 * `brandBlock: true`, so the tagline and the sign-up CTA survive; they sit
 * centred above the links instead of beside them. Everything is centred at
 * every width, so the mobile and desktop renderings differ only in measure —
 * there is no reflow to get wrong.
 */
function CenteredFooter({
  brand,
  flatLinks,
  socials,
  legal,
  year,
  allRightsReserved,
  copyright,
  badge,
}: LayoutData) {
  const tCommon = useTranslations("common");
  return (
    <>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        {/* Brand block, centred. */}
        <div className="flex flex-col items-center text-center">
          <BrandMark brand={brand} />
          <p className="text-muted-foreground text-sm leading-relaxed mt-4 max-w-md">
            {brand.description}
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-4 py-2.5 mt-6 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded-lg transition-colors"
          >
            {tCommon("get_started")}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* One centred link row. */}
        <nav className="mt-10 lg:mt-12 pt-8 lg:pt-10 border-t border-border/50">
          <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 sm:gap-x-8">
            {flatLinks.map((link) => (
              <li key={link.key}>
                <Link
                  href={link.href}
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors inline-block py-2.5 sm:py-1"
                >
                  {link.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Socials beneath. */}
        {socials.length > 0 && (
          <div className="flex items-center justify-center gap-3 flex-wrap mt-8">
            {socials.map((social) => (
              <SocialIcon key={social.id} social={social} />
            ))}
          </div>
        )}
      </div>

      {/* Legal bar — centred at every width, unlike the column layout's. */}
      <div className="border-t border-border/50 bg-muted/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-6">
            <p className="text-muted-foreground text-sm text-center">
              <CopyrightLine
                brand={brand}
                year={year}
                allRightsReserved={allRightsReserved}
                copyright={copyright}
              />
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
              <span className="text-sm">{badge}</span>
              {legal.map((link) => (
                <Link
                  key={link.key}
                  href={link.href}
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors inline-block py-2.5 sm:py-0"
                >
                  {link.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Pick a layout for `variant`, falling back to `columns`.
 *
 * The fallback is load-bearing, not defensive noise. A stored id outlives the
 * code that renders it — an owner picks `compact`, the build is rolled back,
 * and the database still says `compact`. Rendering the shipped footer is the
 * difference between "the footer looks like the old one" and a page whose
 * bottom third is blank.
 */
export default function FooterLayout({ variant, ...data }: FooterLayoutProps) {
  switch (variant) {
    case "compact":
      return <CompactFooter {...data} />;
    case "centered":
      return <CenteredFooter {...data} />;
    case "columns":
    default:
      return <ColumnsFooter {...data} />;
  }
}

export { FooterLayout };
