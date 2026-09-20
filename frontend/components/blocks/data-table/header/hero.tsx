"use client";

import React, { memo } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, BarChart3, Table2, Save, X, Loader2 } from "lucide-react";
import { m, AnimatePresence } from "framer-motion";
import { HeaderClient } from "./header.client";
import { HeaderCreateButton } from "./header-create-button";
import { DesignConfig, DataTableView, FormConfig } from "../types/table";
import { useTranslations } from "next-intl";
import { useTableStore } from "../store";
import { useMediaQuery } from "@/hooks/use-media-query";
import { HeadingStats } from "@/components/layout/heading-stats";

// Separate component for form action buttons to isolate formState re-renders
const FormActionButtons = memo(function FormActionButtons({
  isEditView,
  hasEditPermission,
  hasCreatePermission
}: {
  isEditView: boolean;
  hasEditPermission: boolean;
  hasCreatePermission: boolean;
}) {
  const t = useTranslations("common");
  const formState = useTableStore((state) => state.formState);

  return (
    <>
      {/* Unsaved indicator */}
      {formState.isDirty && (
        <span className="hidden sm:flex items-center gap-1.5 text-xs text-warning-ink px-2 py-1 rounded-md bg-warning/10 border border-warning/20">
          <span className="h-2 w-2 rounded-full bg-warning animate-pulse" />
          {t("unsaved_changes")}
        </span>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={formState.onCancel || undefined}
      >
        <X className="h-4 w-4 mr-1.5" />
        {t("cancel")}
      </Button>
      <Button
        type="button"
        size="sm"
        onClick={formState.onSubmit || undefined}
        disabled={
          formState.isSubmitting ||
          (isEditView ? !hasEditPermission : !hasCreatePermission)
        }
      >
        {formState.isSubmitting ? (
          <>
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            {t("saving")}...
          </>
        ) : (
          <>
            <Save className="mr-1.5 h-4 w-4" />
            {isEditView ? t("save_changes") : t("create")}
          </>
        )}
      </Button>
    </>
  );
});

/**
 * THE HEADING BAND HAS NO PALETTE OF ITS OWN. THIS IS THE WHOLE POINT.
 *
 * What used to be here: a `getColorClasses(color)` helper over a 17-key hue map,
 * a second and DISAGREEING 23-key map in `design-animations.tsx`, and a
 * `DesignAnimationRenderer` painting ten different animated backgrounds —
 * orbs, aurora, mesh, ripples, a literal prism — in whatever pair of hues the
 * page happened to pass as `primaryColor` / `secondaryColor`. Half those names
 * resolved to STATUS tokens, so `/admin/system/news` shipped a page permanently
 * coloured "success" and the ecommerce order history shipped one coloured
 * "warning" — pages that report no status at all. None of it was visible to the
 * class-based design-system ratchet, because a hue passed as DATA is not a
 * class name.
 *
 * The band is now transparent and the page draws `WorkspaceGround` behind it
 * (mounted by `data-table/index.tsx`, one per document — see the dedupe note in
 * `globals.css`): a masked hairline grid, one surface-ramp step and a single
 * 4%-opacity stop of the brand accent, all of it gone before the first row of
 * the table. It is the same ground every working page in the product uses, so a
 * table page and the p2p board and the support console now read as one product
 * instead of ~120 pages each announcing a hue nobody chose.
 *
 * The badge and the stat tiles keep ONE accent, and it is the brand token. They
 * are chrome, so R2 lets them take it; there is nothing left to configure.
 */
const BRAND = {
  text: "text-primary",
  bgLight: "bg-primary/10",
};

interface HeroProps {
  title: string;
  itemTitle: string;
  description?: string;
  createDialog?: React.ReactNode;
  dialogSize?:
    | "sm"
    | "md"
    | "lg"
    | "xl"
    | "2xl"
    | "3xl"
    | "4xl"
    | "5xl"
    | "6xl"
    | "7xl"
    | undefined;
  extraTopButtons?: (refresh?: () => void) => React.ReactNode;
  refresh: () => void;
  /** Only whether the create slot will draw; the button reads its own permission. */
  canCreate?: boolean;
  config?: DesignConfig;
  // Form configuration for custom create/edit titles and descriptions
  formConfig?: FormConfig;
  // Analytics integration
  hasAnalytics?: boolean;
  analyticsTab?: "overview" | "analytics";
  onAnalyticsTabChange?: (tab: "overview" | "analytics") => void;
  // View state for animated transitions
  currentView?: DataTableView;
  /** Heading level for `title`. See `DataTableProps.titleAs`. */
  titleAs?: "h1" | "h2";
}

export function Hero({
  title,
  itemTitle,
  description,
  createDialog,
  dialogSize,
  extraTopButtons,
  refresh,
  canCreate,
  config = {},
  formConfig,
  hasAnalytics = false,
  analyticsTab = "overview",
  onAnalyticsTabChange,
  currentView = "overview",
  titleAs = "h1",
}: HeroProps) {
  const t = useTranslations("common");
  /* The animated element the title is drawn as — `m.h1` unless the host
     page already owns the document's `<h1>`. See `DataTableProps.titleAs`.
     Read through `motion[...]` rather than branching on two near-identical
     JSX blocks, so the animation and the classes cannot drift apart. */
  const MotionTitle = titleAs === "h2" ? m.h2 : m.h1;
  // Only subscribe to permissions, not formState (FormActionButtons handles that separately)
  const hasEditPermission = useTableStore((state) => state.hasEditPermission);
  const hasCreatePermission = useTableStore((state) => state.hasCreatePermission);

  // Determine if we're in a form view (create/edit)
  const isFormView = currentView === "create" || currentView === "edit";
  const isCreateView = currentView === "create";

  /* THE ACTION RAIL IS OPTIONAL, AND ON SOME PAGES IT IS EMPTY.
     A read-only table — `/admin/dex/provider` is the clearest case, seeded from
     a code registry so it creates and deletes nothing — passes `canCreate:
     false`, no `extraTopButtons` and no `analytics`. Every slot on the right
     then renders null, and the heading beside it was still being measured as
     though something were about to land there: `max-w-2xl` cut the description
     off at 42rem with the other half of the band empty.
     The cap is a MEASURE cap, not a clearance cap, so it stays wherever the
     rail actually draws — a description running under a row of buttons still
     needs a readable line length. It is only lifted when there is provably
     nothing to clear. Each term below mirrors the mount condition of the slot
     it stands for, so this cannot drift out of agreement with what renders —
     which is also why `canCreate` arrives as a prop and is handed DOWN to the
     button rather than each side reading the store separately. See the call
     site in `data-table/index.tsx` for what the store holds on frame one. */
  const hasOverviewActions = Boolean(
    extraTopButtons || canCreate || (hasAnalytics && onAnalyticsTabChange)
  );
  /* Form views always carry Cancel/Save, so they are never full width. */
  const isFullWidthHeading = !isFormView && !hasOverviewActions;

  // Responsive breakpoints for all device sizes
  // Mobile: < 640px, Tablet: 640-1023px, Desktop: >= 1024px
  const isMobile = useMediaQuery("(max-width: 639px)");
  const isTablet = useMediaQuery("(min-width: 640px) and (max-width: 1023px)");

  // Calculate responsive values based on device
  const getResponsivePadding = () => {
    if (isFormView) {
      // Form view: clean padding for fixed header across all devices
      if (isMobile) return "1rem";
      if (isTablet) return "1.25rem";
      return "1.5rem"; // Desktop
    } else {
      // Overview: more padding above title, reduced on smaller screens
      if (isMobile) return "4rem";
      if (isTablet) return "4.8rem";
      return "5.8rem"; // Desktop
    }
  };

  const getResponsiveBottomPadding = () => {
    if (isFormView) {
      // Form view: balanced bottom padding
      if (isMobile) return "0.75rem";
      if (isTablet) return "1rem";
      return "1.25rem"; // Desktop
    } else {
      // Overview: standard bottom padding
      if (isMobile) return "1rem";
      return "1.5rem"; // Tablet & Desktop
    }
  };

  const getResponsiveSpacerHeight = () => {
    // Spacer height for form views to push content below fixed hero
    // Must account for hero height + some breathing room
    if (isMobile) return "90px";
    if (isTablet) return "130px";
    return "75px"; // Desktop
  };
  const isEditView = currentView === "edit";

  const { icon: Icon = Sparkles, badge, stats } = config;

  // Title, description, and itemTitle are passed as already-translated strings from page.tsx
  // formConfig titles/descriptions are also already human-readable from useFormConfig() hooks
  // Use them directly without additional translation

  // Dynamic title and description for form views
  // Use custom titles/descriptions from formConfig if provided (already human-readable), otherwise build from itemTitle
  const displayTitle = isCreateView
    ? (formConfig?.create?.title || `${t("create")} ${itemTitle}`)
    : isEditView
      ? (formConfig?.edit?.title || `${t("edit")} ${itemTitle}`)
      : title;

  const displayDescription = isCreateView
    ? (formConfig?.create?.description || `${"Add"} ${t("new").toLowerCase()} ${itemTitle.toLowerCase()}`)
    : isEditView
      ? (formConfig?.edit?.description || `${t("edit")} ${itemTitle.toLowerCase()}`)
      : description;

  // Only show badge in overview mode (not in create/edit)
  const displayBadge = isFormView ? null : badge;

  // Dynamic icon for form views (only used in overview badge)
  const DisplayIcon = Icon;

  // Always show description
  const shouldShowDescription = Boolean(displayDescription);

  /* THE OVERVIEW HERO MOUNTS AT REST. There used to be a delay ladder here —
     0.2s base, 0.15s per element — driving `x: -20` slides on the badge, title,
     description and stats and an `x: 20` slide on the action row. Nothing in
     the hero MOVES between those two states, so the ladder only meant the page
     heading arrived up to half a second after the table under it had drawn, in
     the wrong place, and slid over. Every overview element below therefore
     passes `initial={false}`, which paints it at its animate target.

     The FORM-view transitions are untouched: those fire on a real state change
     (overview -> create/edit), where the hero genuinely does collapse and the
     title genuinely does swap, and `AnimatePresence` needs an entrance to pair
     with its exit. */

  if (!title) return null;

  return (
    <>
      {/* Spacer to push content below fixed hero in form views */}
      {/* Height varies by device: mobile needs more, tablet moderate, desktop least */}
      {isFormView && (
        <div style={{ height: getResponsiveSpacerHeight() }} />
      )}
      <m.div
        initial={false}
        animate={{
          // Responsive padding: mobile < tablet < desktop
          paddingTop: getResponsivePadding(),
          paddingBottom: getResponsiveBottomPadding(),
        }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          /* TRANSPARENT IN OVERVIEW, AND WITH NO EDGE OF ITS OWN. The band used
             to BE the background — ten animated variants clipped to this box —
             and it is now a window onto `WorkspaceGround`, which the hero layout
             mounts behind the whole page.

             The `border-b` went with them. A rule under the title was doing real
             work while the band above it was a different colour from the page
             below: it was the seam between two surfaces. Over one continuous
             ground it is a line across the middle of nothing, cutting the page
             in half at exactly the point the grid is meant to carry the eye
             through. The ground's own surface ramp fades out around here on its
             own, which is the soft edge this had been drawing hard.

             `overflow-hidden` stays, and no longer costs anything: the ground is
             mounted OUTSIDE this element, so the only thing left to clip is the
             `whitespace-nowrap` title, which without it would put a horizontal
             scrollbar on the document at narrow widths.

             The FORM view keeps both its surface and its edge, and must. It goes
             `fixed top-0` over the site header carrying Cancel/Save, so it has
             to be opaque enough to hide whatever scrolls under it — and there
             the border IS a seam between two surfaces. */
          "relative overflow-hidden",
          isFormView &&
            "fixed top-0 left-0 right-0 z-60 border-b border-border/50 bg-background/95 backdrop-blur-md shadow-sm"
        )}
      >
      <div className="container mx-auto relative z-10">
        <div className={cn(
          "flex flex-col lg:flex-row lg:justify-between gap-3 sm:gap-4 lg:gap-6",
          isFormView ? "lg:items-center" : "lg:items-start"
        )}>
          {/* Left side - Title and description */}
          <div className={cn(
            "flex flex-col gap-1.5 sm:gap-2",
            /* Below `lg` the parent is `flex-col`, so this column is already
               full width and the grow is a no-op; it only has to claim the
               free space once the two sit side by side. */
            isFullWidthHeading && "lg:flex-1",
            // Fixed height in form view to prevent layout shifts during animation
            isFormView && "min-h-10 sm:min-h-12 justify-center"
          )}>
            <AnimatePresence mode="popLayout">
              {/* Badge - only in overview, slides from left */}
              {displayBadge && (
                <m.div
                  key={`badge-${currentView}`}
                  initial={false}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, transition: { duration: 0.3, ease: "easeOut" } }}
                >
                  <Badge
                    variant="outline"
                    className={cn(
                      "w-fit px-2 py-1 sm:px-3 sm:py-1.5 border-0 backdrop-blur-sm",
                      BRAND.bgLight
                    )}
                  >
                    <DisplayIcon
                      className={cn(
                        "h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1 sm:mr-1.5",
                        BRAND.text
                      )}
                    />
                    <span
                      className={cn("text-[10px] sm:text-xs font-medium", BRAND.text)}
                    >
                      {displayBadge}
                    </span>
                  </Badge>
                </m.div>
              )}
            </AnimatePresence>

            <div className="flex items-center gap-2 sm:gap-3">
              <AnimatePresence mode="popLayout">
                <MotionTitle
                  key={`title-${currentView}`}
                  initial={isFormView
                    ? { opacity: 0, y: 30, scale: 0.95 }
                    : false
                  }
                  animate={{
                    opacity: 1, x: 0, y: 0, scale: 1,
                    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.15 }
                  }}
                  exit={{
                    opacity: 0,
                    ...(isFormView ? { y: 15, scale: 0.98 } : {}),
                    transition: { duration: 0.3, ease: "easeOut" }
                  }}
                  className={cn(
                    "font-bold tracking-tight whitespace-nowrap text-foreground",
                    // Responsive title sizes: mobile < tablet < desktop
                    isFormView
                      ? "text-xl sm:text-2xl md:text-3xl"
                      : "text-2xl sm:text-3xl md:text-4xl"
                  )}
                >
                  {/* A page title is INK, not decoration (ADMIN-SYSTEM R1).
                      This was a `bg-clip-text text-transparent` span over a
                      `from-foreground to-foreground/70` gradient. Even at its
                      best that fades the right-hand end of every table title to
                      70% opacity for no informational reason, and the pattern is
                      one token edit away from the failure DESIGN-SYSTEM Phase 14
                      recorded — a clipped title measuring 1.03:1 because the
                      stops were background tokens. Plain `text-foreground`
                      cannot fail that way. */}
                  {displayTitle}
                </MotionTitle>
              </AnimatePresence>
              {!isFormView && <HeaderClient />}
            </div>

            <AnimatePresence mode="popLayout">
              {shouldShowDescription && (
                <m.p
                  key={`desc-${currentView}`}
                  initial={isFormView
                    ? { opacity: 0, y: 30, scale: 0.95 }
                    : false
                  }
                  animate={{
                    opacity: 1, x: 0, y: 0, scale: 1,
                    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.2 }
                  }}
                  exit={{
                    opacity: 0,
                    ...(isFormView ? { y: 15, scale: 0.98 } : {}),
                    transition: { duration: 0.3, ease: "easeOut" }
                  }}
                  className={cn(
                    // Deliberately allowed to wrap: a nowrap description
                    // overflows the container on anything narrower than the
                    // sentence itself, which pushed the whole hero sideways.
                    "text-muted-foreground",
                    // See `isFullWidthHeading`: the cap clears the action rail,
                    // so with no rail there is nothing to clear.
                    isFullWidthHeading ? "max-w-none" : "max-w-2xl",
                    // Responsive description sizes
                    isFormView
                      ? "text-xs sm:text-sm"
                      : "text-sm sm:text-base md:text-lg"
                  )}
                >
                  {displayDescription}
                </m.p>
              )}
            </AnimatePresence>

            {/* The figure rail, and it is the SAME COMPONENT the non-table
                heading draws — see `layout/heading-stats.tsx`. This block used
                to be a hand-rolled copy of it that had drifted in three ways:
                an `md:w-11` tile step nothing else has, a `group-hover:scale-110`
                on a non-interactive element, and the figure itself in
                `text-primary`, which is R2's accent spent on every number in
                the row rather than on the one that matters. */}
            <AnimatePresence>
              {!isFormView && stats && stats.length > 0 && (
                <m.div
                  initial={false}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, transition: { duration: 0.3, ease: "easeOut" } }}
                >
                  <HeadingStats stats={stats} className="mt-1" />
                </m.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right side - Actions and tabs in single row.

              STAYS MOUNTED EVEN WHEN EVERY SLOT IS NULL — see
              `isFullWidthHeading`, which is how the heading reclaims the space.
              Unmounting the rail as well would take its `AnimatePresence` with
              it, and on a rail-less page that is the only thing pairing an exit
              with the Cancel/Save buttons when an edit view closes: they would
              pop out instantly instead of fading. An empty flex item is zero
              wide, so all it actually costs is the parent's one `gap`. */}
          <div className={cn(
            "flex items-center gap-2 sm:gap-3",
            // Fixed height in form view to prevent layout shifts during animation
            isFormView && "min-h-9 justify-center"
          )}>
            <AnimatePresence mode="popLayout">
              {isFormView ? (
                /* Form view actions - Cancel and Save buttons, fade in with y movement only (no scale to prevent jitter) */
                <m.div
                  key="form-actions"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    transition: {
                      duration: 0.6,
                      ease: [0.22, 1, 0.36, 1],
                      delay: 0.25,
                    }
                  }}
                  exit={{
                    opacity: 0,
                    y: 10,
                    transition: { duration: 0.3, ease: "easeOut" }
                  }}
                  className="flex items-center gap-1.5 sm:gap-2 h-8 sm:h-9"
                >
                  {/* FormActionButtons handles its own formState subscription to prevent parent re-renders */}
                  <FormActionButtons
                    isEditView={isEditView}
                    hasEditPermission={hasEditPermission}
                    hasCreatePermission={hasCreatePermission}
                  />
                </m.div>
              ) : (
                /* Overview actions - buttons and tabs in a single row, painted
                   in place. Only the exit (into a form view) animates. */
                <m.div
                  key="overview-actions"
                  initial={false}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, transition: { duration: 0.3, ease: "easeOut" } }}
                  className="flex items-center gap-2 sm:gap-3"
                >
                  {extraTopButtons && (
                    <div className="flex items-center gap-2">
                      {extraTopButtons(refresh)}
                    </div>
                  )}
                  <HeaderCreateButton
                    itemTitle={itemTitle}
                    canCreate={canCreate}
                    createDialog={createDialog}
                    dialogSize={dialogSize}
                  />
                  {/* Analytics tabs - inline with buttons, responsive */}
                  {hasAnalytics && onAnalyticsTabChange && (
                    <Tabs
                      value={analyticsTab}
                      onValueChange={(value) =>
                        onAnalyticsTabChange(value as "overview" | "analytics")
                      }
                      className="w-auto"
                    >
                      <TabsList
                        className={cn(
                          "grid grid-cols-2 h-9.5 p-0.5 rounded-lg",
                          "bg-muted/80 backdrop-blur-sm",
                          "border border-border/50"
                        )}
                      >
                        {/* The active tint is a CLASS keyed on Radix's own
                            `data-state`, not an inline style keyed on the React
                            prop. Inline `color` outranks every utility, so it
                            was also the one thing on this bar the design-system
                            ratchet could never see or override — and the value
                            it wrote was `primaryColor`, i.e. per-page. The icon
                            inherits `currentColor`, so one declaration on the
                            trigger covers both halves. */}
                        <TabsTrigger
                          value="overview"
                          className={cn(
                            "rounded-md gap-1 sm:gap-2 text-sm font-medium transition-all px-2 sm:px-3 h-full",
                            "data-[state=active]:bg-card dark:data-[state=active]:bg-surface-2",
                            "data-[state=active]:shadow-sm data-[state=active]:text-primary",
                            "flex items-center justify-center"
                          )}
                        >
                          <Table2 className="h-4 w-4" />
                          <span className="hidden sm:inline">{t("overview")}</span>
                        </TabsTrigger>
                        <TabsTrigger
                          value="analytics"
                          className={cn(
                            "rounded-md gap-1 sm:gap-2 text-sm font-medium transition-all px-2 sm:px-3 h-full",
                            "data-[state=active]:bg-card dark:data-[state=active]:bg-surface-2",
                            "data-[state=active]:shadow-sm data-[state=active]:text-primary",
                            "flex items-center justify-center"
                          )}
                        >
                          <BarChart3 className="h-4 w-4" />
                          <span className="hidden sm:inline">{t("analytics")}</span>
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  )}
                </m.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </m.div>
    </>
  );
}
