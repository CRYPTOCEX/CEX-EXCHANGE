"use client";
import React, { useEffect, useRef, useState, useMemo } from "react";
import { useExtensionStore } from "@/store/extension";
import {
  usePatchNotesStore,
  getTypeFromProductId,
  type ProductPatchNotesData,
  type PatchNoteVersion,
} from "@/store/patch-notes";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SkeletonBlock, SkeletonText } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WorkspaceGround } from "@/components/layout/workspace-ground";
import { HeroSection } from "@/components/ui/hero-section";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
/*
 * `framer-motion` IS GONE FROM THIS FILE, and the reason is a measurement.
 *
 * Twenty animated nodes, all of them pure entrance — no `whileHover`, no
 * `whileTap`, no exit, nothing bound to a state CHANGE. They ran as one ladder
 * on the showcase view: the heading at +0.4s, the features grid at +0.5s
 * staggering each card by 50ms, benefits at +0.6s, their list items at +0.7s
 * staggering by 100ms, the route list at +0.6/+0.7s, the CTA at +0.8s, and the
 * closing panel at +0.9s with its inner tile springing in at +1.0s.
 *
 * So the last element of this page finished arriving A FULL SECOND after the
 * first, every time it opened, and an operator who scrolled during that second
 * watched the content they were scrolling toward slide out from under them.
 * R12's motion budget is 300ms.
 *
 * `hero-section.tsx` records the same finding for the 90-odd headings it
 * replaced — "nothing here MOVES between two states, so there is nothing for an
 * entrance to express" — and the products list one directory up has just had
 * its own ten-node ladder removed for it. The page is painted at rest. What
 * motion is left is the two `loading` spinners on the update controls, each
 * bound to a request that is genuinely open.
 */
import { cn } from "@/lib/utils";
import {
  getProductShowcase,
  type ProductShowcase,
} from "@/lib/product-features";
import * as LucideIcons from "lucide-react";
import {
  Check,
  ArrowRight,
  ArrowUpRight,
  ExternalLink,
  Star,
  Zap,
  Key,
  Download,
  RefreshCw,
  CheckCircle2,
  FileText,
  Activity,
  Loader2,
  Info,
  LayoutDashboard,
  History,
  ChevronRight,
  Compass,
  Users,
  Hash,
  TrendingUp,
  Package,
} from "lucide-react";
import { MarkdownRenderer, isMarkdownContent } from "@/lib/markdown-renderer";
import { storeArtForProduct } from "@/lib/store-products";
import { ThemedArt } from "@/components/ui/themed-art";
/* Was a private copy in this file. `admin/system/update` needs the identical
   rule against the identical three disagreeing sources, and two copies is how
   the two consoles start ranking releases differently — see the file note. */
import { compareVersions } from "@/lib/version-compare";
import { PanelTitle, DataRow } from "@/components/admin/system/panel";
import { ReleaseRail } from "@/components/admin/system/release-rail";

/**
 * Hero art for a product row.
 *
 * Prefers the animated MashDiv store art (same source as the products grid) and
 * only then the DB `image` column — rows seeded before the store art landed
 * still point at /img/extensions/*.png files that were never shipped, which
 * renders as a broken image.
 */
function productArt(extension: any): string | null {
  return (
    storeArtForProduct({
      category: extension?.category,
      name: extension?.name,
      chain: extension?.chain,
    }) ||
    extension?.image ||
    null
  );
}

// Dynamic icon component
function DynamicIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const IconComponent = (LucideIcons as any)[name];
  if (!IconComponent) {
    return <LucideIcons.Box className={className} />;
  }
  return <IconComponent className={className} />;
}

// ============================================================================
// SHARED PANEL LANGUAGE
// ============================================================================
/* `PanelTitle` and `DataRow` MOVED to `components/admin/system/panel.tsx`.
   `admin/system/update` is the same screen for the core product and had grown a
   fifth spelling of the panel heading; copying these across would have
   re-created, one directory over, the exact drift they were written to end. */

/**
 * A section heading BETWEEN panels — the showcase view's only use for an `<h2>`.
 *
 * `text-lg`, not the `text-2xl font-bold` it replaces. The page `<h1>` is
 * `text-2xl sm:text-3xl md:text-4xl`, so a `text-2xl` h2 lands on the same step
 * as the title at the small breakpoint and above it in weight — the heading
 * ladder ran backwards on every viewport under 640px.
 */
function SectionHeading({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: React.ReactNode;
  description?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-surface-3 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0">
        <h2 className="text-lg font-semibold leading-tight tracking-tight">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
    </div>
  );
}

// ============================================================================
// THE ROUTE MAP
// ============================================================================
/**
 * WHERE THE ADD-ON ACTUALLY LIVES — and this is the block the licensed view was
 * missing entirely.
 *
 * `ProductShowcase` carries TWO route lists, `adminRoutes` and `userRoutes`,
 * and the licensed management view rendered only the first, as a grid of
 * `variant="outline"` buttons showing the LABEL and hiding the PATH. So the one
 * screen an operator opens after switching an add-on on could not tell them the
 * URL their users would be visiting — which, for a product whose whole purpose
 * is to add pages to the platform, is the single most useful fact on the page.
 *
 * A row, not a button: the label and the path are two lines of one record, and
 * a `<Button>` cannot hold two lines without the `h-auto py-4 flex-col` override
 * that made the old Quick Actions row three 72px-tall blocks.
 */
function RouteRows({
  routes,
  onOpen,
  className,
}: {
  routes: { path: string; label: string }[];
  onOpen: (path: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("-mx-2 space-y-0.5", className)}>
      {routes.map((route) => (
        <button
          key={route.path}
          type="button"
          onClick={() => onOpen(route.path)}
          className="group flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-accent focus-visible:outline-hidden focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">
              {route.label}
            </span>
            <code className="block truncate font-mono text-xs text-muted-foreground">
              {route.path}
            </code>
          </span>
          <ChevronRight
            className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
            aria-hidden
          />
        </button>
      ))}
    </div>
  );
}

/**
 * The route map as one panel, in the shape both the licensed Overview and the
 * unlicensed showcase render. They used to draw it twice with different markup:
 * two `Card`s side by side with a `Badge` in the title on the showcase, and a
 * three-column grid of outline buttons on the licensed view. Same data, two
 * layouts, and only one of them showed the paths.
 */
function RouteMapPanel({
  showcase,
  onOpen,
  interactive,
}: {
  showcase: ProductShowcase | null;
  /** Absent on the unlicensed view — those pages are not reachable yet. */
  onOpen?: (path: string) => void;
  interactive: boolean;
}) {
  const t = useTranslations("dashboard_admin");
  const adminRoutes = showcase?.adminRoutes ?? [];
  const userRoutes = showcase?.userRoutes ?? [];
  const hasAny = adminRoutes.length > 0 || userRoutes.length > 0;
  /*
   * MOST PRODUCTS SHIP ONLY ADMIN ROUTES — `ai_investment` is one of them — and
   * a two-column grid of GROUPS then leaves the whole right half of a
   * full-width panel empty. When there is one group, the columns go on its ROWS
   * instead, so the panel fills either way and the row height never changes.
   */
  const oneGroup = adminRoutes.length === 0 || userRoutes.length === 0;
  const rowColumns = oneGroup ? "sm:grid sm:grid-cols-2 sm:gap-x-4 sm:space-y-0" : "";

  return (
    <Card>
      <CardHeader>
        <PanelTitle icon={Compass}>{t("what_you_get")}</PanelTitle>
        <CardDescription>
          {interactive
            ? t("the_pages_this_add_on_installs")
            : t("the_pages_this_add_on_installs_1")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {hasAny ? (
          /* The GROUPS grid and the ROWS grid are mutually exclusive, and
             getting that wrong is measurable rather than a matter of taste:
             leaving `sm:grid-cols-2` on here while `rowColumns` also splits the
             single group halved the width twice, so a 162px cell had to
             truncate `/admin/ai/investment/duration` — a path shown expressly
             so it can be read. */
          <div className={cn("grid gap-6", !oneGroup && "sm:grid-cols-2")}>
            {adminRoutes.length > 0 ? (
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <LayoutDashboard
                    className="h-3.5 w-3.5 text-muted-foreground"
                    aria-hidden
                  />
                  <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t("admin_dashboard_pages")}
                  </h3>
                </div>
                {interactive && onOpen ? (
                  <RouteRows
                    routes={adminRoutes}
                    onOpen={onOpen}
                    className={rowColumns}
                  />
                ) : (
                  <StaticRoutes routes={adminRoutes} columns={oneGroup} />
                )}
              </div>
            ) : null}

            {userRoutes.length > 0 ? (
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <Users
                    className="h-3.5 w-3.5 text-muted-foreground"
                    aria-hidden
                  />
                  <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t("user_facing_pages")}
                  </h3>
                </div>
                {interactive && onOpen ? (
                  <RouteRows
                    routes={userRoutes}
                    onOpen={onOpen}
                    className={rowColumns}
                  />
                ) : (
                  <StaticRoutes routes={userRoutes} columns={oneGroup} />
                )}
              </div>
            ) : null}
          </div>
        ) : (
          /* An honest empty state rather than a hidden panel: a product with no
             published route map is not a product with no pages, and silently
             dropping the section leaves the operator to guess which of the two
             it is. */
          <p className="text-sm text-muted-foreground">
            {t("no_page_map_is_published_for")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/** The same rows, without the affordance, for a product you cannot open yet. */
function StaticRoutes({
  routes,
  columns,
}: {
  routes: { path: string; label: string }[];
  columns?: boolean;
}) {
  return (
    <ul
      className={cn(
        "space-y-1.5",
        columns && "sm:grid sm:grid-cols-2 sm:gap-x-4 sm:gap-y-1.5 sm:space-y-0"
      )}
    >
      {routes.map((route) => (
        <li key={route.path} className="min-w-0">
          <span className="block truncate text-sm font-medium">
            {route.label}
          </span>
          <code className="block truncate font-mono text-xs text-muted-foreground">
            {route.path}
          </code>
        </li>
      ))}
    </ul>
  );
}

// ============================================================================
// FEATURES / BENEFITS / HIGHLIGHTS — one rendering, used by both views
// ============================================================================
/**
 * These three datasets were each rendered TWICE, in two different designs.
 *
 *   features    a 3-up grid of `Card` with a `h-12 w-12 rounded-lg
 *               bg-primary/15` tile on the showcase; the same 3-up grid with
 *               the same tile but a different hover rule on the Features tab.
 *   benefits    `Card` with `border-l-4 border-l-success` and a `text-success`
 *               heading on the showcase; a `bg-success/5 border-success/20`
 *               inner box with a `text-success` heading on the tab.
 *   highlights  a `bg-primary/10` circle around a check on the showcase; a bare
 *               `text-primary` check on the tab.
 *
 * THE GREEN IS THE PART THAT HAD TO GO, in both of its costumes. `--success`
 * means an operation succeeded; "Increase User Engagement" is a sales claim,
 * not a state, and painting a marketing panel in the status colour is R2's
 * accent-as-decoration and R8's colour-carrying-a-verdict at once. The same
 * argument retires the six `bg-primary/15` feature tiles: six accent squares in
 * one grid is the accent spent on chrome.
 *
 * Two columns rather than three. At three, on a 1360px container, each
 * description wrapped to four lines in a 380px column while the row's tallest
 * cell set the height for all of them — the ragged bottom edge the screenshots
 * show. Two columns gives the prose a line length it can actually use.
 */
function FeatureGrid({ features }: { features: ProductShowcase["features"] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {features.map((feature, index) => (
        <Card key={index} padding="md" className="flex gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-surface-3 text-primary">
            <DynamicIcon name={feature.icon} className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold leading-tight">
              {feature.title}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {feature.description}
            </p>
          </div>
        </Card>
      ))}
    </div>
  );
}

function BenefitsPanel({
  benefits,
}: {
  benefits: ProductShowcase["benefits"];
}) {
  const t = useTranslations("dashboard_admin");
  return (
    <Card>
      <CardHeader>
        <PanelTitle icon={TrendingUp}>{t("business_benefits")}</PanelTitle>
      </CardHeader>
      <CardContent>
        {/* A divided list, not three tinted boxes. `divide-y` is the whole
            separator budget — three nested bordered surfaces inside a bordered
            card is the "picture framed twice" the hero note warns about, one
            level down. */}
        <div className="divide-y divide-border">
          {benefits.map((benefit, index) => (
            <div key={index} className={cn("py-3", index === 0 && "pt-0")}>
              <h3 className="text-sm font-semibold">{benefit.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function HighlightsPanel({
  highlights,
}: {
  highlights: ProductShowcase["highlights"];
}) {
  return (
    <Card>
      <CardHeader>
        <PanelTitle icon={Star}>Highlights</PanelTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2.5">
          {highlights.map((highlight, index) => (
            <li key={index} className="flex items-start gap-2.5">
              <Check
                className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                aria-hidden
              />
              <span className="text-sm">{highlight}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

/** Features + benefits + highlights, in the one order both views want them. */
function CapabilitiesSections({ showcase }: { showcase: ProductShowcase }) {
  const tCommon = useTranslations("common");
  return (
    <div className="space-y-8">
      <section>
        <SectionHeading icon={Zap} title={tCommon("key_features")} />
        <FeatureGrid features={showcase.features} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <BenefitsPanel benefits={showcase.benefits} />
        <HighlightsPanel highlights={showcase.highlights} />
      </section>
    </div>
  );
}

// ===== SHOWCASE VIEW FOR UNLICENSED PRODUCTS =====
/**
 * The page frame every state of this route shares.
 * ============================================================================
 *
 * Extracted because there were FOUR copies of it: the licensed view, the two
 * showcase views, and — the reason this matters — a fourth in the loading
 * branch that had already drifted. The pending copy read
 * `min-h-screen bg-background` where the three real ones read
 * `min-h-screen bg-linear-to-b from-background via-background to-muted/20`,
 * and its header was a bare `border-b` with a 32x128px grey box where the
 * three real ones carried a STICKY, `bg-card/50 backdrop-blur-sm` bar with a
 * working Back button. So the page went from one ground to a different ground,
 * and from a non-sticky header to a sticky one, on every open. (Both of those
 * are gone now — see the two sections below — but the reason for extracting
 * one frame is unchanged.)
 *
 * That is the failure mode the skeleton doc names: a duplicate layout has no
 * mechanism keeping it in sync with the layout it imitates. One component,
 * used by all four, cannot drift.
 *
 * HEADER CLEARANCE IS NOT OPTIONAL HERE
 * ------------------------------------
 * This route is CHROMED — `admin/layout.tsx` renders `Header`, which is
 * `fixed top-0 left-0 right-0 z-50` (site-header.tsx:212). A fixed bar is out
 * of flow, so it reserves nothing; every chromed page has to book the space
 * itself. This frame did not: the root was a bare `min-h-screen`, so the page
 * started at y=0 and its own bar — the one carrying "Back to products" — was
 * `sticky top-0`, pinning to the exact band the admin nav occupies. At z-10
 * against the nav's z-50 it lost, so the Back button rendered BEHIND the main
 * nav and was neither readable nor clickable.
 *
 * This is the same defect `/admin/system/license` hit; that page's answer was
 * to opt out of chrome entirely (see the CHROMELESS note in the admin layout),
 * which is right for a screen that must render while the licence check is
 * failing every admin API call. It is wrong here — this is an ordinary reading
 * page and the admin nav is how you leave it.
 *
 * The fix WAS `pt-header` on the root plus `sticky top-header` on the bar, which
 * put the bar in the clear. It is now the paragraph below instead — the bar is
 * gone, and the clearance moved onto the container as `pt-header-clear`. Both
 * tokens resolve through `--spacing-header` -> `--header-height`, so a navbar
 * variant that is not the default 4rem (`lib/chrome/variants.ts` overrides the
 * height at runtime) still clears without an edit here.
 *
 * AND THERE IS NO SECOND NAVBAR ANY MORE
 * -------------------------------------
 * Clearing the admin nav fixed the overlap but left the shape: a full-bleed
 * `border-b bg-card/50 backdrop-blur-sm` strip immediately under a full-bleed
 * bordered admin nav. Two stacked bars read as two navbars, and the lower one
 * navigates nothing — its content is a Back link and this page's own actions.
 *
 * It is a plain row in the content column now, on `WorkspaceGround`, above the
 * title. That is the treatment `hero-section.tsx` records for the 90-odd pages
 * it replaced: over one continuous ground, a rule under the heading "is a line
 * across the middle of nothing", and the ground's own ramp fades out at about
 * that height and is the soft edge the border was drawing hard.
 */
/**
 * AND THE HEADING IS THE FRAME'S JOB TOO, NOT EACH VIEW'S.
 * ---------------------------------------------------------------------------
 * The back row above was the only shared part; every view then hand-built its
 * own heading under it, and the three drifted exactly the way the four frames
 * had. Measured across `ProductShowcaseView`, `LicensedProductView`,
 * `FallbackShowcaseView` and the pending branch:
 *
 *   - the ART is a `h-32 sm:h-40 aspect-[5/3]` tile beside the title in two
 *     views and a full-width `max-h-[420px]` banner in the third — and the
 *     third one carries the note explaining WHY ("these illustrations are
 *     1200x720 and carry real labels; squeezed into a 267px-wide box their
 *     15px type rendered at about five pixels"). Two views shipped the defect
 *     their sibling documented.
 *   - the TAGLINE is `text-xl text-primary` in one and `text-lg text-primary`
 *     in another. R2 reserves the accent for what is interactive or the one
 *     figure that matters; a marketing line is neither, in either size.
 *   - the TITLE is the same string in all three, which is the tell that none
 *     of them needed to own it.
 *
 * So the heading moves here and is `HeroSection` — the same component the
 * products list, the gateway console and 77 other pages use. `ground={false}`
 * because this frame already mounts `WorkspaceGround` one level up; the dedupe
 * rule in `globals.css` would hide a second copy anyway, but a `fixed inset-0`
 * layer that exists only to be hidden still costs the compositor.
 *
 * `breadcrumb` absorbs the ghost Back button: it renders `@/i18n/routing`'s
 * `Link`, so it keeps the locale and supports middle-click and prefetch, none
 * of which `router.push` in an `onClick` did.
 */
function ProductPageFrame({
  title,
  description,
  art,
  chips,
  actions,
  pending = false,
  contentClassName = "container pb-16",
  children,
}: {
  /* `string`, not `ReactNode`: `HeroSection`'s `title` is
     `string | TitlePart[]`, and the multi-part form exists so a PENDING title
     can be a `<Loadable/>` — see the note on `TitlePart.text`. Widening this to
     `ReactNode` would let a caller pass an element that satisfies the type here
     and then falls into the array branch there, read for a `.text` it does not
     have. */
  title?: string;
  description?: React.ReactNode;
  /** The product illustration — the heading's right-hand column. */
  art?: string | null;
  /** Status row under the description — licence, enabled, version. */
  chips?: React.ReactNode;
  /** The page's controls, under the chips in the heading's left column. */
  actions?: React.ReactNode;
  /**
   * Draw the heading as skeletons.
   *
   * The pending branch used to hand-build a copy of the licensed hero's
   * geometry, which is the drift this component exists to stop — the moment
   * the real heading moved in here, that copy became a fifth layout imitating
   * a layout it no longer shared an element with. Now it is the SAME
   * `HeroSection`, with `SkeletonText` inside the real `<h1>` and `<p>`, so the
   * type metrics come from the type.
   *
   * `TitlePart[]` rather than a placeholder string, because that is the form
   * `hero-section.tsx` documents for a title that is still being fetched — a
   * bare `<Loadable>` in `title` would satisfy `ReactNode` and then fall into
   * the array branch and be read for a `.text` it does not have.
   */
  pending?: boolean;
  contentClassName?: string;
  children: React.ReactNode;
}) {
  const t = useTranslations("dashboard_admin");

  return (
    /* The ground is `WorkspaceGround` now, not a wash.
       `bg-linear-to-b from-background via-background to-muted/20` was a grey
       that faded in and back out over the page height — `page-shell.tsx` calls
       that "not structure, the absence of a decision", and it was one of the
       two grounds it replaced across 96 call sites. It also had to go rather
       than sit on top: it is OPAQUE, and an opaque root paints over a
       `fixed inset-0 -z-10` ground, so keeping it would have made this a
       no-op. */
    <div className="min-h-screen">
      <WorkspaceGround />

      <HeroSection
        ground={false}
        breadcrumb={{
          text: t("back_to_products"),
          href: "/admin/system/extension",
        }}
        title={
          pending
            ? [{ text: <SkeletonText placeholder={t("extension_name")} /> }]
            : (title ?? "")
        }
        description={
          pending ? (
            <SkeletonText placeholder={t("a_one_line_description_of_what_1")} />
          ) : (
            description
          )
        }
        layout="split"
        /*
         * TOP-ALIGNED, and this is not a preference — `center` puts the LEFT
         * column in the middle of the row too. The art is the taller item, so
         * with `center` the row is the art's height and the whole text block
         * was pushed down to sit against its middle: the breadcrumb started
         * ~90px below the top of the band, with empty ground above it, while
         * the art rose to the padding edge and read as floating free of the
         * heading it belongs to. `start` puts the breadcrumb where a page
         * heading starts and lets the two columns share one top edge.
         */
        rightContentAlign="start"
        /*
         * THE ART IS THE RIGHT-HAND COLUMN, NOT A BAND UNDER THE HEADING.
         * =====================================================================
         * Three shapes have now been tried here, and the first two each failed
         * in a way you can measure:
         *
         *   full-bleed banner   `aspect-[5/3] max-h-[380px] w-full` with
         *                       `object-cover`. Those three rules cannot all
         *                       hold: at the container's ~1360px the ratio asks
         *                       for an 816px-tall box, `max-h` clamps the BOX
         *                       to 380, and `cover` then scales a 1200x720
         *                       illustration to fill a 1360x380 window —
         *                       CROPPING 53% of its height. The headline figure
         *                       was sliced through the middle and the right
         *                       panel cut off.
         *
         *   left-aligned plate  `max-w-3xl` + `object-contain`. Nothing
         *                       cropped, but a 768px plate in a 1360px band
         *                       leaves 590px of dead ground to its right, under
         *                       an already-short actions cluster — roughly
         *                       530px tall of nothing, which is the largest
         *                       single void on the page.
         *
         * So the art moves into `rightContent` and the heading becomes a real
         * two-column split: words left, picture right, both columns ending at
         * about the same height. That also takes ~290px off the top of the
         * page, so the tab bar and the first control are visible without
         * scrolling.
         *
         * SIZING IS A LEGIBILITY CALCULATION, NOT A GUESS. The store art is a
         * 1200x720 SVG (`public/img/store/*.svg`) whose smallest type is 13px,
         * so at a rendered width W the smallest labels land at 13*W/1200: 6.2px
         * at 576, 5.2px at 480. The 48-64px elements — the product name and the
         * headline figure — stay legible either way, and those are the ones
         * carrying meaning; "Daily payouts" is texture. 36rem is the largest
         * width whose 5:3 height (346px) still lands near the text column's
         * own, which is what keeps the two columns reading as a pair rather
         * than as a picture with a caption beside it.
         */
        rightContent={
          pending ? (
            /* The SAME box the real plate draws, so the heading does not change
               height when the art lands. */
            <SkeletonBlock className="aspect-[5/3] w-full rounded-xl lg:w-[30rem] xl:w-[36rem]" />
          ) : art ? (
            <div className="aspect-[5/3] w-full overflow-hidden rounded-xl border border-border bg-surface-2 lg:w-[30rem] xl:w-[36rem]">
              <ThemedArt
                src={art}
                alt=""
                loading="eager"
                /* `object-contain` on the art's own 5:3 box, so it neither
                   crops nor letterboxes — the two are the same fit here, and
                   `contain` is the one that stays correct if a product ever
                   ships art at a different ratio. */
                className="h-full w-full object-contain"
              />
            </div>
          ) : null
        }
        paddingBottom="pb-6"
      >
        {/* Status chips, then the page's controls — both in the LEFT column
            now that the right one is the picture. Reading order is title →
            what state it is in → what you can do about it, which is the order
            an operator asks those questions in. */}
        <div className="flex flex-col gap-4">
          {chips}
          {actions}
        </div>
      </HeroSection>

      <div className={contentClassName}>{children}</div>
    </div>
  );
}

function ProductShowcaseView({
  extension,
  showcase,
}: {
  extension: any;
  showcase: ProductShowcase;
}) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const router = useRouter();

  return (
    <ProductPageFrame
      title={extension.title}
      description={showcase.tagline}
      art={productArt(extension)}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {/*
            The one filled control on the page, and the only thing an operator
            can actually do from here. `shadow-lg` came off it — Ledger has no
            elevation ramp, and the shadow rendered in light mode and vanished
            in dark, so it was feedback for half the audience. `size="default"`
            rather than `lg`: the `lg` step plus `text-base` made this button
            taller than every other control in the product, which reads as a
            marketing CTA rather than as the admin action it is.
          */}
          <Button
            onClick={() =>
              router.push(
                `/admin/system/license?productId=${extension.productId}`
              )
            }
          >
            <Key className="h-4 w-4" />
            {tCommon("activate_license")}
            <ArrowRight className="h-4 w-4" />
          </Button>
          {extension.link && (
            <Button variant="ghost" size="sm" asChild>
              <a href={extension.link} target="_blank" rel="noopener noreferrer">
                {t("view_on_envato")}
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          )}
        </div>
      }
      chips={
        <div className="flex flex-wrap items-center gap-2">
          {/* Was a lone `Badge` in the frame's back row, i.e. a verdict about
              the product sitting up in the navigation strip rather than beside
              the product. */}
          <Badge tone="warning" appearance="soft">
            <Key className="h-3 w-3" />
            {tCommon("license_required")}
          </Badge>
          <Badge tone="neutral" appearance="outline" className="font-mono">
            v{extension.version}
          </Badge>
        </div>
      }
    >
      <div className="space-y-8">
        {/* The long-form description, which the heading does not carry — the
            heading took the tagline, which is the shorter of the two. */}
        {extension.description ? (
          <p className="max-w-3xl text-muted-foreground">
            {extension.description}
          </p>
        ) : null}

        {/* THE SAME THREE BLOCKS THE LICENSED VIEW RENDERS, from the same
            components. Before, this view and the Features tab drew identical
            data in two unrelated designs — see the note on `FeatureGrid`. */}
        <CapabilitiesSections showcase={showcase} />

        <RouteMapPanel showcase={showcase} interactive={false} />

        {/*
          THE CLOSING CTA, RESTRAINED.
          --------------------------------------------------------------------
          It was a centred block with a 64px `bg-primary/10` rounded square
          holding a 32px key glyph, a `text-2xl` heading, a centred paragraph
          and two `size="lg"` buttons — a landing-page closer inside an admin
          console. This page IS the place an operator decides to buy, so a
          closing call to action earns its place; the marketing costume does
          not.

          What is left says the same thing in the page's own voice: a bordered
          panel, the heading at the section step, one line of consequence, and
          the two controls at the size every other control on the page uses.
        */}
        <Card padding="lg">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold leading-tight tracking-tight">
                {t("ready_to_unlock")} {extension.title}?
              </h2>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                {t("activate_your_license_to_start_using")}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Button
                onClick={() =>
                  router.push(
                    `/admin/system/license?productId=${extension.productId}`
                  )
                }
              >
                <Key className="h-4 w-4" />
                {t("activate_license_now")}
              </Button>
              {extension.link && (
                <Button variant="outline" asChild>
                  <a
                    href={extension.link}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t("purchase_on_envato")}
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>
    </ProductPageFrame>
  );
}

// ===== FALLBACK SHOWCASE FOR PRODUCTS WITHOUT DETAILED DATA =====
function FallbackShowcaseView({ extension }: { extension: any }) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const router = useRouter();

  return (
    <ProductPageFrame
      title={extension.title}
      description={extension.description || undefined}
      /* Same banner as the other two views. This branch renders when a product
         has no showcase entry in `lib/product-features.ts`, and it was the
         third distinct treatment of the same art — a `bg-primary/15` plate
         inside a `Card` inside the content column, i.e. the picture framed
         twice, and an accent tint used as a mount. */
      art={productArt(extension)}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() =>
              router.push(
                `/admin/system/license?productId=${extension.productId}`
              )
            }
          >
            <Key className="h-4 w-4" />
            {tCommon("activate_license")}
            <ArrowRight className="h-4 w-4" />
          </Button>
          {extension.link && (
            <Button variant="ghost" size="sm" asChild>
              <a href={extension.link} target="_blank" rel="noopener noreferrer">
                {t("view_on_envato")}
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          )}
        </div>
      }
      chips={
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="warning" appearance="soft">
            <Key className="h-3 w-3" />
            {tCommon("license_required")}
          </Badge>
          <Badge tone="neutral" appearance="outline" className="font-mono">
            v{extension.version}
          </Badge>
        </div>
      }
    >
      {/*
        NO CARD, AND ALMOST NOTHING LEFT TO SAY.

        This whole view was one `Card` wrapping a hand-built copy of the
        heading — art tile, `<h1>`, description, version badge and the two
        buttons — which is exactly why it drifted from its two siblings. The
        frame carries every one of those now, so what remains for the body is
        what this branch genuinely has and the showcase branch does not:
        nothing. A product with no showcase entry has no features, benefits or
        route list to render, and an empty `Card` announcing that is worse than
        a heading standing on its own.

        One line stays, because the heading states the CONDITION ("License
        required") without stating the CONSEQUENCE, and this is the page an
        operator reaches when they cannot work out why a product they installed
        does nothing. A literal rather than a key: the nearest existing strings
        are the two the chips already use, and inventing a key here would print
        the raw key on every non-English install.
      */}
      <p className="max-w-2xl text-sm text-muted-foreground">
        {t("this_product_is_installed_but_has")}
      </p>
    </ProductPageFrame>
  );
}

// ============================================================================
// RELEASES — the rail and the notes
// ============================================================================
/**
 * ONE TAB, WHERE THERE WERE TWO.
 *
 * "Updates" and "Changelog" read the same `patchNotesData.versions` from the
 * same store and rendered it through the same `MarkdownRenderer`. The only
 * difference was which version each one picked: Updates pinned the pending one,
 * Changelog let you choose. That is a selector, not a second tab — and keeping
 * them apart cost the page an entire duplicated layout, plus a "Version
 * Information" card whose three tiles restated the two versions the header
 * chips already carried and then filled the third slot with the product ID,
 * which is not a version at all.
 *
 * AND THE NESTED SCROLLERS ARE GONE. There were three: `h-80` in Updates,
 * `h-64 lg:h-125` and `h-80 lg:h-125` in Changelog. A fixed-height window on a
 * page that already scrolls means the document you came to read is clipped
 * mid-sentence — the screenshots catch it cutting "Upgrade Notes" in half and
 * severing a bash block — and it puts a second scrollbar inside a third. The
 * notes render in page flow; the rail is the only thing that may scroll, and
 * only when there are more releases than fit.
 */
/* `ReleaseRail` MOVED to `components/admin/system/release-rail.tsx` — the core
   update console renders the identical rail against the identical catalogue. */

// ===== LICENSED PRODUCT MANAGEMENT VIEW =====
function LicensedProductView({
  extension,
  showcase,
  updateData,
  isUpdating,
  isUpdateChecking,
  checkForUpdates,
  updateExtension,
  toggleExtension,
  patchNotesData,
  isPatchNotesLoading,
}: {
  extension: any;
  showcase: ProductShowcase | null;
  updateData: any;
  isUpdating: boolean;
  isUpdateChecking: boolean;
  checkForUpdates: () => Promise<void>;
  updateExtension: () => Promise<void>;
  toggleExtension: (id: string) => void;
  patchNotesData: ProductPatchNotesData | null;
  isPatchNotesLoading: boolean;
}) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [isToggling, setIsToggling] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);

  const hasUpdate = updateData?.status && updateData?.update_id;
  const isUpToDate =
    !updateData?.status && updateData?.message?.includes("latest version");

  /** Newest first. The endpoint already sorts, but a rail that silently trusts
      an upstream order is one catalogue edit away from listing v6.0.0 first. */
  const allVersions = useMemo(() => {
    const versions = patchNotesData?.versions || [];
    return [...versions].sort((a, b) => compareVersions(b.version, a.version));
  }, [patchNotesData]);

  /**
   * The version the updater is offering, or null. Hoisted out of the memo
   * below rather than read inside it, because the React Compiler infers a
   * closure over the whole `updateData` object and then refuses to preserve a
   * memo whose declared dependency is only `updateData?.version`
   * (`react-hooks/preserve-manual-memoization`). A plain string in, a plain
   * string in the dependency list, and the inference matches.
   */
  const offeredUpdateVersion: string | null =
    hasUpdate && updateData?.version ? updateData.version : null;

  /** What the rail opens on: the version you are being offered, when the
      catalogue has notes for it — that is the document you need before pressing
      Install — and otherwise the newest published release. */
  const defaultVersion = useMemo(() => {
    if (!allVersions.length) return null;
    if (offeredUpdateVersion) {
      const match = allVersions.find((v) => v.version === offeredUpdateVersion);
      if (match) return match.version;
    }
    return allVersions[0].version;
  }, [allVersions, offeredUpdateVersion]);

  const activeVersion = selectedVersion ?? defaultVersion;

  const activeVersionData = useMemo(
    () => allVersions.find((v) => v.version === activeVersion) || null,
    [allVersions, activeVersion]
  );

  /**
   * THE CATALOGUE AND THE UPDATER CAN DISAGREE, AND ON THIS INSTALL THEY DO.
   *
   * The update check answers "6.0.2 is available" while the published notes run
   * to 6.1.1 — two different services, two different caches. Neither number is
   * wrong; they answer different questions ("what can I install right now" vs
   * "what has been released"). Said nothing, the page looks broken: the
   * Changelog tab advertised a version the Updates tab had never heard of.
   *
   * One quiet sentence, only when the gap is real, and it states the fact
   * rather than guessing the cause.
   */
  const catalogueLatest = allVersions[0]?.version || null;
  const offeredVersion = hasUpdate ? updateData.version : extension.version;
  const catalogueIsAhead =
    catalogueLatest !== null &&
    compareVersions(catalogueLatest, offeredVersion) > 0;

  const getChangelogContent = (version?: string): string | null => {
    if (!patchNotesData?.versions) return updateData?.changelog || null;
    const targetVersion = version || updateData?.version || extension.version;
    const versionData = patchNotesData.versions.find(
      (v) => v.version === targetVersion
    );
    return versionData?.content || updateData?.changelog || null;
  };

  const handleToggle = async () => {
    setIsToggling(true);
    await toggleExtension(extension.id);
    setIsToggling(false);
  };

  const openRelease = (version: string) => {
    setSelectedVersion(version);
    setActiveTab("releases");
  };

  return (
    <ProductPageFrame
      title={extension.title}
      /*
       * The tagline was `text-lg text-primary font-medium` on its own line
       * above the description — the accent spent on a marketing sentence, which
       * is R2's exact prohibition, and a second paragraph of prose in a heading
       * besides. It is the DESCRIPTION now when there is one, because that is
       * what it is: the shorter, better-written of the two strings this product
       * ships. The DB `description` follows it in the Overview tab, where a
       * long paragraph belongs.
       */
      description={showcase?.tagline || extension.description}
      art={productArt(extension)}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {/*
            THE SWITCH IS THE PAGE'S PRIMARY CONTROL, so it gets the only
            raised surface in the heading. `bg-card` and not the `bg-card
            border` box this replaces — same thing, but written through the
            `Card` ramp rung rather than as two utilities, and the label is
            `text-sm` on the same line rather than stacked, so the cluster
            matches the height of the button beside it.
          */}
          <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2">
            <span className="text-sm font-medium">
              {extension.status ? tCommon("enabled") : tCommon("disabled")}
            </span>
            <Switch
              checked={extension.status}
              onCheckedChange={handleToggle}
              disabled={isToggling}
              aria-label={
                extension.status
                  ? t("disable", { title: String(extension.title) })
                  : t("enable", { title: String(extension.title) })
              }
            />
          </div>
          {extension.link && (
            <Button variant="ghost" size="sm" asChild>
              <a href={extension.link} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                MashDiv.com
              </a>
            </Button>
          )}
        </div>
      }
      /*
       * THE STATUS ROW REPLACES FOUR `StatsCard` TILES.
       *
       * The Overview tab opened with a `grid-cols-4` of KPI tiles reading
       * Version / Status / License / Updates — and every one of the four
       * restated something already on screen roughly 200px above it: the
       * version badge, the Active/Inactive badge, the "Licensed" badge in the
       * header row, and the "Update available" badge beside it. Four bordered
       * ~96px surfaces, three of them tinted, to say nothing new.
       *
       * `components/layout/heading-stats.tsx` is the file that argues this
       * out — "in a heading they are four large boxes competing with the `<h1>`
       * directly above them" — but its `stats` rail is for FIGURES, and these
       * are STATES. A state is a chip. So the four tiles and the two scattered
       * badge clusters collapse into one row of chips under the description,
       * which is both the shortest and the only place they are not duplicated.
       *
       * Tones are load-bearing here rather than decorative: licence and update
       * are the two things that stop this product working, and each says its
       * verdict IN WORDS as well as in colour (R8).
       */
      chips={
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="success" appearance="soft">
            <CheckCircle2 className="h-3 w-3" />
            Licensed
          </Badge>
          <Badge
            tone={extension.status ? "success" : "neutral"}
            appearance="soft"
          >
            <Activity className="h-3 w-3" />
            {extension.status ? tCommon("active") : tCommon("inactive")}
          </Badge>
          <Badge tone="neutral" appearance="outline" className="font-mono">
            v{extension.version}
          </Badge>
          {/* Only when there is one. The badge this replaces carried
              `animate-pulse` — a two-second infinite loop on a heading chip
              that is not expressing a state CHANGE, which is what R12's budget
              is about; and it is the same pulse the Updates tab dot was
              running, so two elements throbbed out of phase for one fact. */}
          {hasUpdate && (
            <Badge tone="warning" appearance="soft">
              <Download className="h-3 w-3" />
              {t("update_available")}
            </Badge>
          )}
        </div>
      }
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        {/*
          THREE TABS, NOT FOUR — see the note on `ReleaseRail` for why Updates
          and Changelog were one thing wearing two names.

          `w-auto`, not `grid w-full max-w-2xl grid-cols-4`: a forced 672px
          strip made every trigger the same width regardless of its label, so
          "Overview" sat in a 168px cell with 60px of dead space either side,
          and the strip stopped dead two-fifths of the way across a 1360px page
          with nothing to explain the edge.
        */}
        <TabsList>
          <TabsTrigger value="overview" className="gap-2">
            <LayoutDashboard className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="releases" className="gap-2 relative">
            <History className="h-4 w-4" />
            Releases
            {hasUpdate && (
              <span
                className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-warning"
                aria-label={t("update_available")}
              />
            )}
          </TabsTrigger>
          <TabsTrigger value="capabilities" className="gap-2">
            <Zap className="h-4 w-4" />
            Capabilities
          </TabsTrigger>
        </TabsList>

        {/* ================================================================ */}
        {/* OVERVIEW                                                          */}
        {/* ================================================================ */}
        {/*
          WHAT THIS TAB IS FOR, WHICH IT PREVIOUSLY WAS NOT.

          It shipped two cards: a "Quick Actions" panel holding three 72px-tall
          `h-auto py-4 flex-col` buttons, and an "Admin Pages" panel holding
          three more buttons — six controls, one of which (Go to Dashboard) was
          the first of the three the panel below it also listed. Under them,
          roughly 300px of empty page.

          An operator opening a licensed add-on wants four answers: is it on and
          licensed (the chips, above), what version am I on and is that current,
          where do I go to use it, and what is it. The layout now answers them
          in that order, with the two that need width on the left and the two
          that are figures on the right rail.
        */}
        <TabsContent value="overview" className="space-y-0">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              {showcase?.tagline && extension.description ? (
                /* Only when the heading took the TAGLINE. If there is no
                   showcase the description is already the heading's subtitle,
                   and repeating it here would be the defect the four KPI tiles
                   committed, in a different costume. */
                <Card padding="lg">
                  <p className="text-muted-foreground">
                    {extension.description}
                  </p>
                </Card>
              ) : null}

              <RouteMapPanel
                showcase={showcase}
                interactive
                onOpen={(path) => router.push(path)}
              />

              {/* ---- IDENTITY ---- */}
              {/*
                THE WIDE COLUMN, NOT THE RAIL, AND THE REASON IS COLUMN HEIGHT.
                ------------------------------------------------------------
                Stacked in the right rail under the release panel, the two
                columns finished 320px apart — rail long, main column short —
                which is the same "one side is empty" the full-bleed banner
                produced, rotated. These are short key/value pairs, so this is
                the one block on the tab that can be laid out ACROSS rather than
                DOWN, and a wide shallow card is the right shape for a metadata
                footer anyway.

                NO LICENCE PATH HERE. An earlier draft printed
                `lic/<productId>.lic` as a third field, on the reasoning that it
                turns "licence not verified" into something checkable over SSH.
                That is a real convenience and it is still the wrong trade: this
                page states, to anyone who reaches it, exactly where on disk the
                licence for a paid product lives. The operator who needs that
                path has the install in front of them and the support docs;
                nobody else should be handed it by the UI. The two fields left
                are identifiers the product already publishes.
              */}
              <Card>
                <CardHeader>
                  <PanelTitle icon={Hash}>Identity</PanelTitle>
                </CardHeader>
                <CardContent>
                  <dl className="grid gap-4 sm:grid-cols-3">
                    <div className="min-w-0">
                      <dt className="text-xs font-medium text-muted-foreground">
                        {tCommon("product_id")}
                      </dt>
                      <dd className="mt-1 truncate font-mono text-sm tabular-nums">
                        {extension.productId}
                      </dd>
                    </div>
                    {extension.name ? (
                      <div className="min-w-0">
                        <dt className="text-xs font-medium text-muted-foreground">
                          {t("extension_key")}
                        </dt>
                        <dd className="mt-1 truncate font-mono text-sm">
                          {extension.name}
                        </dd>
                      </div>
                    ) : null}
                    <div className="min-w-0">
                      <dt className="text-xs font-medium text-muted-foreground">
                        Category
                      </dt>
                      <dd className="mt-1 truncate text-sm capitalize">
                        {extension.category || "extension"}
                      </dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              {/* ---- RELEASE STATE ---- */}
              <Card>
                <CardHeader>
                  <PanelTitle
                    icon={hasUpdate ? Download : CheckCircle2}
                    tone={hasUpdate ? "warning" : "success"}
                  >
                    {hasUpdate ? t("update_available") : t("up_to_date")}
                  </PanelTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <DataRow label={tCommon("current_version")}>
                      <span className="font-mono tabular-nums">
                        {extension.version}
                      </span>
                    </DataRow>
                    {hasUpdate ? (
                      <DataRow label={t("latest_version")}>
                        <span className="font-mono tabular-nums text-warning">
                          {updateData.version}
                        </span>
                      </DataRow>
                    ) : null}
                    {allVersions[0]?.metadata.releaseDate ? (
                      <DataRow label={t("latest_published")}>
                        <span className="font-mono tabular-nums text-muted-foreground">
                          {allVersions[0].metadata.releaseDate}
                        </span>
                      </DataRow>
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-2">
                    {hasUpdate ? (
                      <Button
                        tone="warning"
                        className="w-full"
                        onClick={updateExtension}
                        loading={isUpdating}
                      >
                        {isUpdating ? (
                          `${tCommon("updating")}…`
                        ) : (
                          <>
                            <Download className="h-4 w-4" />
                            {t("install_v")}{updateData.version}
                          </>
                        )}
                      </Button>
                    ) : null}
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={checkForUpdates}
                      loading={isUpdateChecking}
                    >
                      {isUpdateChecking ? (
                        `${tCommon("checking")}…`
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4" />
                          {tCommon("check_for_updates")}
                        </>
                      )}
                    </Button>
                  </div>

                  {allVersions.length > 0 ? (
                    <div className="border-t border-border pt-3">
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t("recent_releases")}
                      </p>
                      <div className="-mx-2 space-y-0.5">
                        {allVersions.slice(0, 3).map((v) => (
                          <button
                            key={v.version}
                            type="button"
                            onClick={() => openRelease(v.version)}
                            className="group flex w-full items-baseline justify-between gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent focus-visible:outline-hidden focus-visible:ring-[3px] focus-visible:ring-ring/50"
                          >
                            <span className="font-mono text-sm tabular-nums">
                              v{v.version}
                            </span>
                            <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                              {v.metadata.releaseDate}
                            </span>
                          </button>
                        ))}
                      </div>
                      {allVersions.length > 3 ? (
                        <Button
                          variant="link"
                          size="xs"
                          className="mt-1"
                          onClick={() => setActiveTab("releases")}
                        >
                          All {allVersions.length} releases
                          <ArrowUpRight className="h-3 w-3" />
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </CardContent>
              </Card>

            </div>
          </div>
        </TabsContent>

        {/* ================================================================ */}
        {/* RELEASES                                                          */}
        {/* ================================================================ */}
        <TabsContent value="releases" className="space-y-6">
          {hasUpdate && (
            <Alert tone="warning" appearance="soft">
              <Download className="h-4 w-4" />
              <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
                <span>
                  <strong>Version {updateData.version}</strong>{" "}
                  {t("is_available_for_download")}
                </span>
                <Button
                  size="sm"
                  tone="warning"
                  onClick={updateExtension}
                  loading={isUpdating}
                >
                  {isUpdating ? (
                    `${t("installing_update")}…`
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      {t("update_now")}
                    </>
                  )}
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {isUpToDate && !hasUpdate && (
            <Alert tone="success" appearance="soft">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                {t("you_have_the_latest_version_of")} {extension.title}.
              </AlertDescription>
            </Alert>
          )}

          {isPatchNotesLoading ? (
            <Card padding="lg">
              <div className="flex items-center justify-center gap-2 py-12">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-muted-foreground">
                  {t("loading_release_notes")}…
                </span>
              </div>
            </Card>
          ) : allVersions.length === 0 ? (
            <Card padding="lg">
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText
                  className="mb-3 h-8 w-8 text-muted-foreground"
                  aria-hidden
                />
                <h3 className="font-semibold">{t("no_changelog_available")}</h3>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  {t("check_for_updates_to_see_the_latest_changes")}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={checkForUpdates}
                  loading={isUpdateChecking}
                >
                  {!isUpdateChecking && <RefreshCw className="h-4 w-4" />}
                  {tCommon("check_for_updates")}
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
              {/* ---- THE RAIL ---- */}
              <Card padding="none" className="lg:sticky lg:top-header-clear lg:self-start">
                {/* The installed build sits ABOVE the list rather than in it,
                    because on this product it is not in the list: v6.0.1 is
                    running and the catalogue publishes 6.1.1 / 6.1.0 / 6.0.5 /
                    6.0.2 / 6.0.0. See `compareVersions`. */}
                <div className="border-b border-border px-3 py-2.5">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {tCommon("current_version")}
                  </p>
                  <p className="mt-0.5 font-mono text-sm tabular-nums">
                    v{extension.version}
                  </p>
                </div>
                <div className="py-1.5">
                  <ReleaseRail
                    versions={allVersions}
                    installedVersion={extension.version}
                    availableVersion={hasUpdate ? updateData.version : null}
                    selected={activeVersion}
                    onSelect={setSelectedVersion}
                  />
                </div>
              </Card>

              {/* ---- THE NOTES ---- */}
              <Card>
                {/*
                  A THIN HEADER, BECAUSE THE DOCUMENT HAS ITS OWN.
                  ------------------------------------------------------------
                  The obvious build for this panel is version + release date +
                  metadata title + a row of tag badges. Rendered against a real
                  release it prints:

                      v6.0.2 · 2026-01-04 · AI Investments v6.0.2
                      [WALLET SERVICE] [NOTIFICATION SERVICE] [ARCHITECTURE] …
                      # AI Investments v6.0.2
                      Release Date: January 4, 2026  Tags: WALLET SERVICE, …

                  — because the published notes ALREADY open with their own
                  title, date and tag line, and `metadata` is parsed out of that
                  same front matter. Every field a header could show is a second
                  copy of the first two lines of the document under it.

                  So the header carries only what the document does not: which
                  entry of the rail you are looking at, and the one control that
                  acts on it.
                */}
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <CardTitle className="font-mono text-base tabular-nums">
                      v{activeVersion}
                    </CardTitle>
                    {/* The install control follows the SELECTION, so it is here
                        only while you are reading the notes for the version you
                        are being offered — pressing Install under a v6.0.0 page
                        would have installed v6.0.2. */}
                    {hasUpdate && activeVersion === updateData.version ? (
                      <Button
                        size="sm"
                        tone="warning"
                        onClick={updateExtension}
                        loading={isUpdating}
                      >
                        {isUpdating ? (
                          `${t("installing_update")}…`
                        ) : (
                          <>
                            <Download className="h-4 w-4" />
                            {t("install_update")}
                          </>
                        )}
                      </Button>
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const changelog = getChangelogContent(
                      activeVersion || undefined
                    );
                    if (!changelog) {
                      return (
                        <p className="py-6 text-sm text-muted-foreground">
                          {t("no_release_notes_were_published_for_this_version")}
                        </p>
                      );
                    }
                    /* IN PAGE FLOW. See the note on `ReleaseRail` — this used
                       to be an `h-80` / `h-125` `ScrollArea`, so the document
                       the tab exists to show was clipped mid-heading. */
                    return isMarkdownContent(changelog) ? (
                      <MarkdownRenderer content={changelog} />
                    ) : (
                      <div className="prose max-w-none dark:prose-invert">
                        {changelog}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>
          )}

          {/* The reconciliation line, last, because it explains a discrepancy
              between two things the operator has now read. */}
          {catalogueIsAhead ? (
            <p className="text-sm text-muted-foreground">
              Release notes are published up to{" "}
              <span className="font-mono tabular-nums">v{catalogueLatest}</span>,
              while the updater currently offers{" "}
              <span className="font-mono tabular-nums">v{offeredVersion}</span>.
              The two are served by different caches — re-check for updates if
              the newer build should already be available to you.
            </p>
          ) : null}

          <Alert variant="default">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              {t("always_backup_your_database_before_updating")}
            </AlertDescription>
          </Alert>
        </TabsContent>

        {/* ================================================================ */}
        {/* CAPABILITIES                                                      */}
        {/* ================================================================ */}
        <TabsContent value="capabilities" className="space-y-6">
          {showcase ? (
            <CapabilitiesSections showcase={showcase} />
          ) : (
            <Card variant="dashed" padding="lg">
              <div className="flex flex-col items-center py-10 text-center">
                <Package
                  className="mb-3 h-8 w-8 text-muted-foreground"
                  aria-hidden
                />
                <h3 className="font-semibold">
                  {t("feature_details_coming_soon")}
                </h3>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  {t("detailed_feature_information_for_this_extension")}
                </p>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </ProductPageFrame>
  );
}

// ===== MAIN PAGE COMPONENT =====
export default function ExtensionDetailsPage() {
  const t = useTranslations("dashboard_admin");
  const { id } = useParams();
  const updateCheckedRef = useRef<string | null>(null);
  const patchNotesFetchedRef = useRef<string | null>(null);
  const [patchNotesData, setPatchNotesData] = useState<ProductPatchNotesData | null>(null);
  const [isPatchNotesLoading, setIsPatchNotesLoading] = useState(false);

  const {
    extensions,
    currentExtension,
    setCurrentExtension,
    licenseVerified,
    isLoading,
    fetchExtensions,
    updateData,
    isUpdating,
    isUpdateChecking,
    checkForUpdates,
    updateExtension,
    toggleExtension,
  } = useExtensionStore();

  const { fetchProductPatchNotes } = usePatchNotesStore();

  useEffect(() => {
    if (id && extensions.length === 0) {
      fetchExtensions();
    }
  }, [id, extensions.length, fetchExtensions]);

  useEffect(() => {
    if (id && extensions.length > 0) {
      const extension = extensions.find((ext) => ext.productId === id);
      if (extension) {
        setCurrentExtension(extension);
        updateCheckedRef.current = null;
      }
    }
  }, [id, extensions, setCurrentExtension]);

  // Check for updates when licensed
  useEffect(() => {
    if (
      currentExtension &&
      licenseVerified &&
      !isUpdateChecking &&
      updateCheckedRef.current !== currentExtension.productId
    ) {
      updateCheckedRef.current = currentExtension.productId;
      checkForUpdates();
    }
  }, [currentExtension, licenseVerified, checkForUpdates, isUpdateChecking]);

  // Fetch patch notes for the current extension
  useEffect(() => {
    const fetchPatchNotes = async () => {
      if (
        currentExtension &&
        licenseVerified &&
        patchNotesFetchedRef.current !== currentExtension.productId
      ) {
        patchNotesFetchedRef.current = currentExtension.productId;
        setIsPatchNotesLoading(true);

        // Try fetching by product ID first, then by type
        let data = await fetchProductPatchNotes(currentExtension.productId);
        if (!data) {
          const type = getTypeFromProductId(currentExtension.productId);
          if (type !== currentExtension.productId) {
            data = await fetchProductPatchNotes(type);
          }
        }

        setPatchNotesData(data);
        setIsPatchNotesLoading(false);
      }
    };

    fetchPatchNotes();
  }, [currentExtension, licenseVerified, fetchProductPatchNotes]);

  /**
   * PENDING AND NOT-FOUND WERE THE SAME BRANCH. They are not the same thing.
   *
   * `isLoading || !currentExtension` meant an id that does not exist rendered
   * a skeleton FOREVER: the fetch completes, `currentExtension` stays null,
   * and the page sits pulsing grey boxes with no way to tell the operator that
   * the extension is gone. Splitting the two costs one boolean and turns a
   * permanent fake-loading screen into an answer.
   */
  const notFound = !isLoading && !currentExtension;

  if (notFound) {
    return (
      /*
        THE NOT-FOUND STATE IS A HEADING, NOT A CARD IN AN EMPTY PAGE.
        ---------------------------------------------------------------------
        It rendered a centred `Card` with its own `<h1>` UNDER the frame — and
        now that the frame carries the heading, that would have been an EMPTY
        `<h1>` above a card holding the real one: two headings, one of them
        blank, which is what an assistive reader announces.

        So the answer goes where every other answer on this route goes. The
        breadcrumb above it is the only control this state needs, and it is
        already there.
      */
      <ProductPageFrame
        title={t("extension_not_found")}
        description={t("no_extension_matches_this_address_it")}
      >
        {null}
      </ProductPageFrame>
    );
  }

  if (!currentExtension) {
    /**
     * THE PENDING PAGE IS THE REAL PAGE.
     * ========================================================================
     *
     * What was here: a hand-built second layout — `min-h-screen bg-background`
     * with a non-sticky header holding an `h-8 w-32` grey box, a 20x20 art
     * square, three text bars at `h-8`/`h-5`/`h-4`, and four `h-24` cards.
     * Every one of those numbers was a guess about a page it did not share a
     * single element with, and the guesses were wrong in ways you can read off
     * the real views: the hero art is `h-40 aspect-[5/3]` (160px tall, 267px
     * wide), not `h-20 w-20`; the title is `text-2xl sm:text-3xl`, whose line
     * box is 32px at the small breakpoint and 36px at the large, not a fixed
     * `h-8`; and the four cards the grid promised do not exist in any of the
     * three real views.
     *
     * Now it is the same `ProductPageFrame` all three views render, and the
     * skeleton geometry lives INSIDE that frame under `pending` rather than
     * being restated here — because the moment the heading moved into the
     * frame, a hand-built copy out here became a fifth layout imitating a
     * layout it no longer shares an element with. That is the same drift the
     * note above describes, one level up.
     */
    return <ProductPageFrame pending>{null}</ProductPageFrame>;
  }

  /* The ROW, not just its id. The bundled providers (binanceus / kraken / okx
     and the MO chain) carry per-install placeholder ids, so their copy is keyed
     on `category` + `name`/`chain` instead — see `getProductShowcase`. */
  const showcase = getProductShowcase(currentExtension);

  // Show appropriate view based on license status
  if (!licenseVerified) {
    if (showcase) {
      return <ProductShowcaseView extension={currentExtension} showcase={showcase} />;
    }
    return <FallbackShowcaseView extension={currentExtension} />;
  }

  // Licensed product view
  return (
    <LicensedProductView
      extension={currentExtension}
      showcase={showcase}
      updateData={updateData}
      isUpdating={isUpdating}
      isUpdateChecking={isUpdateChecking}
      checkForUpdates={checkForUpdates}
      updateExtension={updateExtension}
      toggleExtension={toggleExtension}
      patchNotesData={patchNotesData}
      isPatchNotesLoading={isPatchNotesLoading}
    />
  );
}
