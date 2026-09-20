"use client";

/* Kept even though `framer-motion` is gone and nothing here uses a hook: the
   `breadcrumb` slot renders `@/i18n/routing`'s `Link`, and every one of the 77
   call sites is already a client module. Dropping the directive would change
   which side of the boundary this file lands on for no measured gain. The
   directive stays FIRST — a leading comment is legal before it, but bundlers
   have historically disagreed about that, and it is not worth finding out. */

import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/routing";
import { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { WorkspaceGround } from "@/components/layout/workspace-ground";
import { HeadingStats, type HeadingStat } from "@/components/layout/heading-stats";

/**
 * The page heading band, for a page that is NOT a DataTable.
 *
 * ===========================================================================
 * WHAT THIS USED TO BE, AND WHY IT IS NOT THAT ANY MORE
 * ===========================================================================
 * A full-bleed decorative hero. Each of its 79 call sites chose:
 *
 *   - `background.orbs[]` — 2–3 blurred circles at an arbitrary `color`, i.e.
 *     a per-page palette handed to a renderer as DATA, invisible to the
 *     class-based design-system ratchet exactly like the DataTable hero's
 *     `primaryColor` was. 73 of 79 sites passed one.
 *   - `particles` — a canvas of 6–20 animated dots, on 73 of 79 sites.
 *   - `background.pattern` — a second grid/dot texture at a different pitch
 *     from the one the page ground already draws.
 *   - `TitlePart.gradient` — 113 of them, clipping a two-stop gradient through
 *     the `<h1>`. DESIGN-SYSTEM Phase 14 measured that pattern at **1.03:1**
 *     when the stops drift, and no test catches it.
 *   - `badge.gradient` / `iconColor` / `textColor` / `borderColor` — a fourth
 *     and fifth colour, per page, on the eyebrow.
 *
 * The result was ninety-odd pages that each looked like a different product,
 * over a hard `border-b` seam where the tinted band met the flat page. The
 * gateway console read blue; the staking pool read emerald; neither hue meant
 * anything.
 *
 * ===========================================================================
 * WHAT IT IS NOW
 * ===========================================================================
 * The same band the DataTable hero draws, on the same ground:
 *
 *   - `WorkspaceGround` behind the whole page — a masked hairline grid, one
 *     surface-ramp step and a single 4% stop of the brand accent, all of it
 *     spent in the top ~380px and gone before the content. It is what p2p, the
 *     support console and every table page now sit on, so a gallery page, a
 *     table page and a board are recognisably one product.
 *   - No band background, no border. Over one continuous ground a rule under
 *     the title is a line across the middle of nothing; the ground's own ramp
 *     fades out around there and is the soft edge the border was drawing hard.
 *   - One eyebrow treatment, one title scale, one description scale — the
 *     DataTable's, verbatim, because that is the shape 106 admin pages already
 *     ship and a second opinion is what produced 41 distinct `<h1>` strings.
 *   - Painted AT REST. The old ladder staggered badge/title/description/slot
 *     at 0.5s each with delays out to +0.5s, so the page heading arrived up to
 *     a second after the content under it had drawn, in the wrong place, and
 *     slid over. Nothing here MOVES between two states, so there is nothing
 *     for an entrance to express — the same finding recorded on the DataTable
 *     hero, and R12's ≤300ms budget besides. `framer-motion` is gone from this
 *     file: it was mounting eight animated nodes per page to move nothing.
 *
 * Everything STRUCTURAL is unchanged and still per page: badge text and icon,
 * breadcrumb, title, description, `children`, `titleLeftContent` (the avatar
 * or logo rail), `leftContent` / `rightContent` for the split layouts, and
 * `bottomSlot` for a stats row. Those say what the page IS. Only the axes that
 * said what colour it was are gone, and they are gone from the TYPE, so a
 * leftover is a compile error rather than a value silently ignored.
 */

// ============================================================================
// TITLE
// ============================================================================

interface TitlePart {
  /**
   * `ReactNode` so a pending title segment can be a `<Loadable/>` — the
   * multi-part form is the way to give this heading a title that is still
   * being fetched. Rendered only as a child, so nothing treats it as text.
   */
  text: ReactNode;
  className?: string;
}

/**
 * NOT widened to `ReactNode`, deliberately.
 *
 * The renderer discriminates the two forms with `typeof title === "string"`,
 * so anything non-string is treated as `TitlePart[]` and mapped over. Adding
 * `ReactNode` here would make a single element — or worse, a `ReactNode[]` —
 * satisfy the type while falling into the array branch and being read for a
 * `.text` it does not have. Pass a pending title as a one-element
 * `TitlePart[]` instead: `title={[{ text: <Loadable …/> }]}`.
 */
type TitleConfig = string | TitlePart[];

// ============================================================================
// EYEBROW — a badge or a back-link, never both
// ============================================================================

interface BadgeConfig {
  icon?: ReactNode;
  /**
   * `ReactNode` so a badge whose text is still being fetched can be passed as
   * `<Loadable …/>` rather than a placeholder string. Rendered only as a child,
   * so nothing here treats it as text.
   *
   * It was `string`, and pages worked around that by passing a non-breaking
   * space to hold the line box open. That reserves the right height and says
   * nothing about why the space is empty.
   */
  text: ReactNode;
}

interface BreadcrumbConfig {
  icon?: ReactNode;
  /** `ReactNode` for the same reason as `BadgeConfig.text`. */
  text: ReactNode;
  href: string;
  className?: string;
}

// ============================================================================
// PROPS
// ============================================================================

interface HeroSectionProps {
  /**
   * The eyebrow. Choose one — a badge states WHAT this page is, a breadcrumb
   * states where it sits. Passing both renders only the breadcrumb.
   */
  badge?: BadgeConfig;
  breadcrumb?: BreadcrumbConfig;

  title: TitleConfig;
  titleClassName?: string;

  /**
   * `ReactNode` so a pending description can be a `<Loadable/>`.
   *
   * `descriptionAsHtml` still needs a real string — you cannot inject a React
   * element through `dangerouslySetInnerHTML` — so the HTML branch below
   * narrows it and falls back to empty. That is the honest behaviour: a caller
   * asking for HTML while its content is still a pending element has no HTML
   * to render yet.
   */
  description?: ReactNode;
  descriptionClassName?: string;
  descriptionAsHtml?: boolean;

  /**
   * The page's headline figures, as a rail under the description.
   *
   * PREFER THIS OVER `bottomSlot`. Eleven pages were putting a grid of
   * `StatsCard` in that slot — full KPI tiles, ~96px tall, inside a heading —
   * which pushed the page's first real control below the fold and made every
   * one of them a slightly different shape. See `layout/heading-stats.tsx`.
   */
  stats?: HeadingStat[];
  /** Draw the figures as skeletons. Labels and icons still render. */
  statsLoading?: boolean;

  // Content slots
  children?: ReactNode; // below the description
  titleLeftContent?: ReactNode; // avatar / logo, left of the title block
  titleLeftContentClassName?: string;
  leftContent?: ReactNode; // "split-reverse" only
  rightContent?: ReactNode; // "split" only, and below the title otherwise
  /**
   * Full-container-width content below the whole heading.
   *
   * What is LEFT for this after `stats`: a progress bar, a filter strip, a
   * funding meter — something that is not a list of figures. If it is a list of
   * figures, it is `stats`.
   */
  bottomSlot?: ReactNode;

  /**
   * - `default`       stacked, left-aligned
   * - `centered`      stacked, centred — marketing surfaces only
   * - `split`         title/description left, `rightContent` right
   * - `split-reverse` `leftContent` left, title/description right
   */
  layout?: "default" | "centered" | "split" | "split-reverse";
  maxWidth?: string;
  containerClassName?: string;
  contentClassName?: string;
  leftContentClassName?: string;
  rightContentAlign?: "start" | "center" | "end";

  paddingTop?: string;
  paddingBottom?: string;

  /**
   * Opt OUT of drawing the ground.
   *
   * A second ground nested under a mounted one is already hidden by the dedupe
   * rule in `globals.css`, so this is not for that case. It is for a heading
   * over a surface that owns its own background — a landing shell, a photo, a
   * canvas — where the ground would sit behind an opaque thing and cost a
   * composited full-viewport layer for nothing.
   */
  ground?: boolean;
}

/**
 * The eyebrow chip. ONE tint, and it is the brand token.
 *
 * Identical to the DataTable hero's badge — same padding ramp, same
 * `bg-primary/10`, same `text-primary` — because a page heading is chrome and
 * R2 lets chrome take the accent, while a per-page hue on it is what made two
 * pages in the same section look like two products.
 */
function Eyebrow({ badge, centered }: { badge: BadgeConfig; centered: boolean }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "w-fit border-0 bg-primary/10 px-2 py-1 backdrop-blur-sm sm:px-3 sm:py-1.5",
        centered && "mx-auto"
      )}
    >
      {badge.icon ? (
        <span className="mr-1 text-primary sm:mr-1.5">{badge.icon}</span>
      ) : null}
      <span className="text-[10px] font-medium text-primary sm:text-xs">
        {badge.text}
      </span>
    </Badge>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export function HeroSection({
  badge,
  breadcrumb,
  title,
  /**
   * The DataTable hero's scale, verbatim. It was
   * `text-3xl md:text-4xl lg:text-5xl` — a full step larger than the title on
   * a table page in the same section — and the sites that noticed were already
   * overriding it back down to `text-3xl md:text-4xl` by hand.
   */
  titleClassName = "text-2xl sm:text-3xl md:text-4xl",
  description,
  descriptionClassName = "text-sm sm:text-base md:text-lg",
  descriptionAsHtml = false,
  stats,
  statsLoading,
  children,
  titleLeftContent,
  titleLeftContentClassName = "",
  leftContent,
  rightContent,
  bottomSlot,
  layout = "default",
  maxWidth = "max-w-4xl",
  containerClassName = "",
  contentClassName = "",
  leftContentClassName = "",
  rightContentAlign = "start",
  /**
   * `pt-header-clear` is `--header-height + 2rem`. `site-header.tsx` is
   * `fixed top-0`, so without this the first line of the page renders UNDER
   * the bar; the token rather than a `pt-24` literal is what keeps that true
   * for a navbar variant of a different height.
   */
  paddingTop = "pt-header-clear",
  /**
   * Was `pb-12`. Nearly every page that uses this heading follows it with its
   * own `container … py-8`, so the two paddings stacked into an 80px void
   * between the description and the first control — a gap that only read as
   * deliberate while a `border-b` was drawn across it. `pb-4` plus the page's
   * own top padding lands on the same ~40px the DataTable pages use.
   */
  paddingBottom = "pb-4",
  ground = true,
}: HeroSectionProps) {
  const centered = layout === "centered";

  const renderTitle = () => (
    <h1 className={cn("font-bold tracking-tight text-foreground", titleClassName)}>
      {typeof title === "string"
        ? title
        : title.map((part, index) => (
            <span key={index} className={part.className}>
              {/* THE PARTS ARE WORDS OF ONE SENTENCE, AND THIS OWNS THE SPACE
                  BETWEEN THEM.

                  The old renderer appended `{" "}` after EVERY part, last one
                  included, and most call sites had also written the space into
                  the part itself (`text: t("discover") + " "`) because the
                  gradient split fell mid-sentence. Both, so headings rendered
                  "Discover  Staking Pools" with a double space and a trailing
                  one — visible in the DOM and in the accessible name.

                  Trimming a STRING part and joining with a single separator
                  makes the spacing a property of the renderer rather than a
                  convention 79 call sites each had to remember. A non-string
                  part (a `<Loadable/>`) is left alone — there is nothing to
                  trim and its own markup decides its edges. */}
              {typeof part.text === "string" ? part.text.trim() : part.text}
              {index < title.length - 1 ? " " : null}
            </span>
          ))}
    </h1>
  );

  const renderAboveTitle = () => {
    if (breadcrumb) {
      return (
        <Link
          href={breadcrumb.href}
          className={cn(
            "inline-flex w-fit items-center gap-2 text-sm font-medium transition-colors",
            breadcrumb.className || "text-muted-foreground hover:text-foreground",
            centered && "mx-auto"
          )}
        >
          {breadcrumb.icon || <ArrowLeft className="h-4 w-4" />}
          {breadcrumb.text}
        </Link>
      );
    }
    if (badge) return <Eyebrow badge={badge} centered={centered} />;
    return null;
  };

  const renderDescription = () => {
    if (!description) return null;
    if (descriptionAsHtml) {
      return (
        <div
          className={cn(
            "prose max-w-none text-muted-foreground dark:prose-invert prose-p:my-2 prose-headings:my-2",
            descriptionClassName
          )}
          dangerouslySetInnerHTML={{
            __html: typeof description === "string" ? description : "",
          }}
        />
      );
    }
    return (
      <p
        className={cn(
          "text-muted-foreground",
          !centered && "max-w-2xl",
          descriptionClassName
        )}
      >
        {description}
      </p>
    );
  };

  const renderTitleBlock = () => {
    const titleContent = (
      <div className="flex flex-col gap-2 sm:gap-3">
        {renderTitle()}
        {renderDescription()}
        {/* Inside the title block, not after it: the figures are a caption on
            the title, and in a `split` layout they belong on the left with the
            words rather than stretched across the full container. */}
        {stats?.length ? (
          <HeadingStats stats={stats} loading={statsLoading} className="mt-1" />
        ) : null}
        {children ? <div>{children}</div> : null}
      </div>
    );

    if (!titleLeftContent) return titleContent;

    return (
      <div className="flex flex-col items-start gap-6 md:flex-row">
        <div className={cn("shrink-0", titleLeftContentClassName)}>
          {titleLeftContent}
        </div>
        <div className="grow">{titleContent}</div>
      </div>
    );
  };

  const isSplit = layout === "split" || layout === "split-reverse";

  return (
    /* TRANSPARENT, AND WITH NO EDGE OF ITS OWN — see the file note. The band is
       a window onto the ground, not a surface. `overflow-hidden` is kept only
       so a long unbroken title cannot put a horizontal scrollbar on the
       document; the ground is mounted outside this element, so nothing that
       matters is clipped. */
    <div
      className={cn(
        "relative overflow-hidden",
        paddingTop,
        paddingBottom,
        containerClassName
      )}
    >
      {ground ? <WorkspaceGround /> : null}

      <div className="container relative z-10 mx-auto">
        {isSplit ? (
          <div
            className={cn(
              "flex flex-col gap-8 lg:flex-row lg:justify-between lg:gap-12",
              /* Was `lg:items-${rightContentAlign}` — an interpolated class
                 name, which Tailwind's scanner cannot see, so it compiled to
                 nothing and all three values behaved identically. */
              rightContentAlign === "center"
                ? "items-start lg:items-center"
                : rightContentAlign === "end"
                  ? "items-start lg:items-end"
                  : "items-start"
            )}
          >
            {layout === "split-reverse" && leftContent ? (
              <div className={cn("shrink-0", leftContentClassName)}>
                {leftContent}
              </div>
            ) : null}

            <div className={cn("flex grow flex-col gap-2 sm:gap-3", contentClassName)}>
              {renderAboveTitle()}
              {renderTitleBlock()}
            </div>

            {layout === "split" && rightContent ? (
              <div className="shrink-0">{rightContent}</div>
            ) : null}
          </div>
        ) : (
          <div
            className={cn(
              "flex flex-col gap-2 sm:gap-3",
              centered && "mx-auto text-center",
              maxWidth,
              contentClassName
            )}
          >
            {renderAboveTitle()}
            {renderTitleBlock()}
            {rightContent ? <div className="mt-4">{rightContent}</div> : null}
          </div>
        )}

        {bottomSlot ? <div className="mt-6">{bottomSlot}</div> : null}
      </div>
    </div>
  );
}
