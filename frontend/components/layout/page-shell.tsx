import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { WorkspaceGround } from "@/components/layout/workspace-ground";

/**
 * The page frame: ground, container, gutter, header clearance and rhythm.
 *
 * This is for a page rendered INSIDE the site chrome. For a route whose layout
 * has removed that chrome and which owns the whole viewport — an editor, a
 * builder, a terminal — reach for `components/layout/editor-shell.tsx`
 * instead: every axis below (clearance, container, rhythm, `min-h-screen`) is
 * the opposite of what such a route needs.
 *
 * WHY THIS EXISTS
 * ---------------
 * Nothing owned the page frame before. `ExtensionLayoutWrapper` renders a bare
 * `<main className="flex-1">` and there is no `layout.tsx` at either admin root,
 * so all 560 page/client files had to invent their own frame. They did:
 *
 *   ext addons   57 distinct container strings over 85 files that have one
 *                19 distinct page grounds
 *                41 distinct <h1> class strings over 70 headings
 *   admin        49 distinct container strings, 26 <h1> treatments,
 *                4 shared shells that disagree about top padding
 *
 * That is the "each page has a fully different design" the frame is responsible
 * for. One component with named options replaces all of it.
 *
 * THE CORRECTNESS PART — header clearance
 * ---------------------------------------
 * `site-header.tsx` is `fixed top-0` over an `h-16` bar, so a page that does not
 * supply 64px of top clearance renders its first element UNDER the header. 56
 * ext files and at least 8 admin pages currently do exactly that — one of them
 * (`ai/market-maker/market/[id]`) has no vertical padding at all.
 *
 * Clearance is not something a page should have to remember, so the shell
 * derives it: a full-bleed `header` (a HeroSection) already carries `pt-24`, so
 * the container below it only needs its own rhythm; without one, the container
 * itself must clear the bar. `hasHeader` picks between the two. That single
 * rule fixes every under-header page it is applied to.
 */
/**
 * THE GROUND IS `WorkspaceGround` NOW, AND IT IS THE DEFAULT.
 *
 * The two grounds a page could previously ask for were both wrong, in opposite
 * directions, and between them they covered 96 of the 96 call sites:
 *
 *   `plain`  (29 sites, the default) — nothing. Inherit the body colour. A flat
 *            field, which is what "this page is unfinished" looks like next to
 *            any page that has structure.
 *   `subtle` (67 sites) — `bg-linear-to-b from-background via-muted/10 to-
 *            background`, a vertical wash. It is OPAQUE, so a page passing it
 *            painted straight over anything its layout had drawn (which is why
 *            the AI-support console had to carve Settings out of the ground it
 *            gave every other route); and a grey that fades in and back out over
 *            the page height is not structure, it is the absence of a decision.
 *
 * Both now draw the ground the rest of the product draws — the DataTable hero's
 * and `ui/hero-section.tsx`'s: a masked hairline grid, one surface-ramp step and
 * a single 4% stop of the brand accent, all of it spent in the top ~380px and
 * gone before the content.
 *
 * `subtle` is kept as a NAME so that 67 call sites need no edit; it is now an
 * alias of the default, and new code should simply omit the prop. What survives
 * as a real choice is the two opt-outs: `flat` for a page whose content the grid
 * would fight, and `none` for a page that paints its own (a photo, a canvas, a
 * landing shell).
 *
 * The class list is `min-h-screen` only. The ground itself is `fixed inset-0`,
 * so the shell still has to be tall enough to own the viewport — but it must not
 * carry a background colour of its own, or it paints over the thing it just
 * asked for.
 */
const groundVariants = cva("", {
  variants: {
    ground: {
      /** The workspace ground. */
      plain: "min-h-screen",
      /** The workspace ground — retained alias, see the note above. */
      subtle: "min-h-screen",
      /** Flat, explicit page ground where the grid would fight the content. */
      flat: "min-h-screen bg-background",
      /** Caller paints its own ground (photo, video, canvas). */
      none: "",
    },
  },
  defaultVariants: { ground: "plain" },
});

/** The variants that mean "give this page the shared ground". */
const GROUND_DRAWN = new Set(["plain", "subtle", undefined, null]);

const containerVariants = cva("mx-auto w-full px-4", {
  variants: {
    width: {
      narrow: "max-w-3xl",
      default: "container",
      wide: "container",
      full: "max-w-none",
    },
    rhythm: {
      none: "",
      sm: "space-y-4",
      md: "space-y-6",
      lg: "space-y-8",
    },
    /**
     * `pt-24` is not a taste call — it is the value 47 of 47 `HeroSection`
     * call sites pass for `paddingTop`, and the value the 45-file
     * `PAGE_PADDING` convention already uses. `pb-16` likewise.
     */
    clearance: {
      /* `pt-header-clear` is `--header-height + 2rem`, which at the default
         4rem bar is exactly the `pt-24` this replaces — a no-op today, and the
         thing that keeps every page clear of a TALLER navbar variant tomorrow
         without editing 40 page templates. */
      true: "pt-header-clear pb-16",
      false: "py-8",
    },
  },
  defaultVariants: { width: "default", rhythm: "md", clearance: true },
});

export interface PageShellProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title">,
    VariantProps<typeof groundVariants>,
    Pick<VariantProps<typeof containerVariants>, "width" | "rhythm"> {
  /**
   * Full-bleed content above the container — normally a `<HeroSection>`.
   * When present it owns the top clearance and the container drops to `py-8`.
   */
  header?: React.ReactNode;
  /** Classes for the inner container, not the ground. */
  containerClassName?: string;
}

export const PageShell = React.forwardRef<HTMLDivElement, PageShellProps>(
  (
    {
      className,
      containerClassName,
      ground,
      width,
      rhythm,
      header,
      children,
      ...props
    },
    ref
  ) => (
    <div ref={ref} className={cn(groundVariants({ ground }), className)} {...props}>
      {/* `flat` and `none` are the opt-outs; everything else gets the ground.
          A second ground nested under a layout that already mounts one is
          hidden by the dedupe rule in `globals.css`, so this is safe on the
          ai/support and /support pages whose layouts draw their own. */}
      {GROUND_DRAWN.has(ground) ? <WorkspaceGround /> : null}
      {header}
      <div
        className={cn(
          containerVariants({ width, rhythm, clearance: !header }),
          containerClassName
        )}
      >
        {children}
      </div>
    </div>
  )
);
PageShell.displayName = "PageShell";

/**
 * The plain page heading, for pages that want a title without a hero.
 *
 * The size is `text-2xl font-bold tracking-tight sm:text-3xl` because that is
 * already what `DataTable` renders for its 106 admin pages
 * (`blocks/data-table/header/index.tsx`). Adopting it verbatim means a bespoke
 * page and a table page carry the same title, and it is a superset of the two
 * most common hand-rolled variants (`text-2xl font-bold` and
 * `text-3xl font-bold tracking-tight`) rather than a third new thing.
 */
export interface PageHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Buttons etc., right-aligned on wide viewports and wrapped below on narrow. */
  actions?: React.ReactNode;
  /** Renders the title as `<h2>`. Use only where an `<h1>` already exists. */
  as?: "h1" | "h2";
}

export const PageHeader = React.forwardRef<HTMLDivElement, PageHeaderProps>(
  ({ className, title, description, actions, as: Tag = "h1", ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
        className
      )}
      {...props}
    >
      <div className="space-y-1.5">
        <Tag className="text-2xl font-bold tracking-tight sm:text-3xl">
          {title}
        </Tag>
        {description ? (
          <p className="text-muted-foreground max-w-2xl">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  )
);
PageHeader.displayName = "PageHeader";
