"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useProductsStore, type Product } from "@/store/products";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { SkeletonText } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HeroSection } from "@/components/ui/hero-section";
import { WorkspaceGround } from "@/components/layout/workspace-ground";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import {
  AlertCircle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Search,
  Boxes,
  Cpu,
  Globe,
  Package,
  Download,
  ExternalLink,
  ShieldCheck,
  Power,
  LayoutGrid,
  List,
} from "lucide-react";
import { useRouter, usePathname } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { storeArtForProduct } from "@/lib/store-products";
import { getProductShowcase } from "@/lib/product-features";
import { ThemedArt } from "@/components/ui/themed-art";
import { m, AnimatePresence } from "framer-motion";
import { useBulkUpdateStore } from "@/store/bulk-update";
import { UpdateAllDialog } from "./update-all-dialog";

export default function ProductsPage() {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const {
    filteredProducts,
    allProducts,
    extensions,
    blockchains,
    exchangeProviders,
    isLoading,
    error,
    toggleError,
    filter,
    categoryFilter,
    fetchProducts,
    setFilter,
    setCategoryFilter,
    toggleProductStatus,
    refreshProducts,
    clearToggleError,
  } = useProductsStore();

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    phase: bulkPhase,
    items: bulkItems,
    start: startBulkUpdate,
    setOpen: setBulkUpdateOpen,
  } = useBulkUpdateStore();

  // Show toast when toggle error occurs
  useEffect(() => {
    if (toggleError) {
      toast({
        title: tCommon("error"),
        description: toggleError,
        variant: "destructive",
      });
      clearToggleError();
    }
  }, [toggleError, toast, clearToggleError]);

  // Initialize category from URL query param
  useEffect(() => {
    const typeParam = searchParams.get("type");
    if (typeParam && ["all", "extension", "blockchain", "exchange"].includes(typeParam)) {
      setCategoryFilter(typeParam as any);
    }
  }, [searchParams, setCategoryFilter]);

  // Update URL when category changes
  const handleCategoryChange = useCallback((value: string) => {
    setCategoryFilter(value as any);
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("type");
    } else {
      params.set("type", value);
    }
    const queryString = params.toString();
    router.replace(`${pathname}${queryString ? `?${queryString}` : ""}`);
  }, [searchParams, setCategoryFilter, router, pathname]);

  useEffect(() => {
    fetchProducts();
  }, []);

  // Calculate stats
  const stats = useMemo(() => {
    const all = [...extensions, ...blockchains, ...exchangeProviders];
    return {
      total: all.length,
      extensions: extensions.length,
      blockchains: blockchains.length,
      exchanges: exchangeProviders.length,
      licensed: all.filter((p) => p.licenseVerified).length,
      unlicensed: all.filter((p) => !p.licenseVerified).length,
      active: all.filter((p) => p.status).length,
      withUpdates: all.filter((p) => p.hasLicenseUpdate).length,
      /*
       * What "Update All" can actually act on, which is NOT `withUpdates`.
       * An unlicensed product still gets a `hasLicenseUpdate` flag — the list
       * endpoint reads it from the release catalogue without consulting the
       * licence — but it has no `lic/<productId>.lic`, so `checkUpdate` answers
       * "No purchase code found" and there is nothing to download. Counting
       * those would put a number on the button that the run can never reach.
       */
      updatable: all.filter((p) => p.licenseVerified && p.hasLicenseUpdate)
        .length,
      /*
       * SWITCHED ON WITH NO VERIFIED LICENCE — the one state on this page that
       * is live-facing AND unfixable where it appears.
       *
       * `licenseVerified` means "lic/<productId>.lic is readable"; the status
       * routes never consult it, so such a product keeps serving its features
       * to users while every licensed call inside it fails. And BOTH
       * `ProductCard` switches are `disabled={!product.licenseVerified}`, so
       * the operator cannot even switch it off from this list.
       *
       * It is reachable by ordinary accident rather than tampering: a restored
       * database, a copied install, or a backend started from a directory where
       * the `lic` path does not resolve flips the whole install to unlicensed
       * while every product stays switched on. Nothing on this page said a word
       * about it before.
       *
       * A LIST, not a count, because the head routes each one to its own
       * activation screen. A gateway-style "show me" button is not available:
       * `statusFilter` is a single union and cannot express "on AND
       * unlicensed", and nothing in the filter bar renders it, so seeding it
       * would leave an invisible filter with no control to clear.
       */
      stranded: all.filter((p) => p.status && !p.licenseVerified),
    };
  }, [extensions, blockchains, exchangeProviders]);

  /*
   * THE UPDATE CONTROL READS THE LAST SETTLED FIGURES, NOT THE LIVE ONES.
   *
   * `refreshProducts()` empties all five arrays before it re-fetches
   * (store/products.ts:250), so every count above is 0 for the length of a
   * Refresh. Read live, the button UNMOUNTS on each press and comes back — and
   * a control that vanishes reads worse than one whose label changes. It is
   * also how the only re-entry into a half-finished bulk run disappears.
   *
   * This is React's documented adjust-state-during-render pattern, NOT an
   * effect and NOT a ref. An effect would commit a frame carrying the blanked
   * value and then correct it, which is the flicker itself; a ref cannot be
   * read during render (`react-hooks/refs`, and it would not re-render when the
   * cached value changed). Setting state during render re-runs the component
   * before anything is committed, so no frame ever lands on screen with the
   * stale figures — and a licence that genuinely goes away still drops the
   * button on the next settled fetch.
   *
   * The whole `stats` object rather than two fields, because the CATEGORY TAB
   * COUNTS have the same problem: they sit in this band now, ~40px under the
   * rail, and blanking them to "All (0) Extensions (0)…" mid-refresh is the
   * defect `statsLoading` exists to prevent, restated one line lower. The
   * identity check is sound because `stats` is a `useMemo` — a stable reference
   * until its arrays change — so this converges after one extra pass.
   *
   * WHICH SIDE OF THE LINE EACH THING READS FROM:
   *   the RAIL reads `stats` and skeletons, because a figure is a claim and a
   *   claim with no data behind it must not be made;
   *   the CONTROLS (tab counts, update button) read `settled`, because a
   *   control that flickers its label or its width is a worse lie than a label
   *   that is one second stale.
   */
  const [settled, setSettled] = useState(stats);
  if (!isLoading && settled !== stats) setSettled(stats);

  /*
   * The button is offered whenever anything is licensed, not only when the
   * count above is non-zero: `hasLicenseUpdate` reaches this page through a
   * ten-minute server-side cache, while the run itself starts with a FORCED
   * check. "0 updates" here regularly means "nobody has asked in ten minutes",
   * which is why the zero state relabels the button rather than removing it.
   *
   * `|| bulkRunning` is a fix, not a flourish: pressing Refresh during a run
   * blanks the store, and without it the button reading "Updating 5/9" — the
   * only way back into that run — goes with it.
   */
  const canBulkUpdate = settled.licensed > 0;
  const bulkRunning = bulkPhase === "scanning" || bulkPhase === "running";
  const bulkSettled = bulkItems.filter((item) =>
    ["done", "failed", "stopped", "skipped"].includes(item.state)
  ).length;

  /*
   * Flagged for an update but not licensed, so `Update All` can never reach
   * them — see the note on `updatable`. These are the cards drawing an amber
   * "Update" badge in the grid below that the button will silently skip; left
   * unsaid, that reads as a bug in the button.
   */
  const unreachableUpdates = stats.withUpdates - stats.updatable;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshProducts();
    setIsRefreshing(false);
  };

  const handleProductClick = (product: Product) => {
    // For exchanges: if licensed and active, go to finance exchange page
    // Otherwise go to the extension page for activation/management
    if (product.category === "exchange") {
      if (product.licenseVerified && product.status) {
        // Active exchange - go to exchange management page
        router.push("/admin/finance/exchange");
        return;
      }
      // Not active or not licensed - go to activation page
      router.push(`/admin/system/extension/${product.productId}`);
      return;
    }

    // For extensions and blockchains - go to the product page
    // It will show showcase for unlicensed or management for licensed
    router.push(`/admin/system/extension/${product.productId}`);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "extension":
        return <Boxes className="h-4 w-4" />;
      case "blockchain":
        return <Cpu className="h-4 w-4" />;
      case "exchange":
        return <Globe className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "extension":
        return "bg-primary/10 text-primary-ink border-primary/20";
      case "blockchain":
        return "bg-success/10 text-success-ink border-success/20";
      case "exchange":
        return "bg-primary/10 text-primary-ink border-primary/20";
      default:
        return "bg-muted/10 text-muted-foreground border-border/20";
    }
  };

  // Get product image - prefer the animated MashDiv store art
  const getProductImage = (product: Product): string | null => {
    // Animated store thumbnails (same art as mashdiv.com/products)
    const storeArt = storeArtForProduct(product);
    if (storeArt) return storeArt;

    // For exchanges, use local images from /img/exchanges/
    if (product.category === "exchange") {
      const aliases: Record<string, string> = { gate: "gateio", htx: "huobi", huobi: "huobi" };
      const baseName = product.name?.toLowerCase();
      if (!baseName) return null;
      const fileBase = aliases[baseName] || baseName;
      const svgExchanges = ["binance", "binanceus", "kucoin", "kraken", "okx"];
      if (svgExchanges.includes(baseName) || svgExchanges.includes(fileBase)) {
        return `/img/exchanges/${fileBase}.svg`;
      }
      return `/img/exchanges/${fileBase}.png`;
    }

    // For other products, use the image from the product data
    return product.image || null;
  };

  if (error) {
    return (
      /*
       * The failure branch has to carry the same frame as the page below it.
       * It carried neither half of it:
       *
       *   `pt-header`  absent, so the card rendered UNDER the `fixed top-0`
       *                navbar — the state an admin lands on whenever the
       *                backend is down or restarting.
       *   `flex-1`     inert. AdminLayout renders `<main className="flex-1">`,
       *                which is not itself a flex container, so `items-center`
       *                had no height to centre within and the card sat at the
       *                very top of an otherwise blank page.
       *
       * The explicit min-height is what actually centres it.
       *
       * AND THE SAME GROUND. Now that the page below sits on `WorkspaceGround`
       * (`HeroSection` mounts it), this branch would be the one state of this
       * route that renders on a flat field — so an operator who hits it while
       * the backend restarts sees the product change shape, not just report a
       * failure. Mounted directly here rather than by wrapping the page,
       * because this is an early return: there is no shared frame to hang it
       * on. The root stays transparent, or it would paint over what it just
       * asked for.
       */
      <div className="pt-header-clear flex min-h-[60vh] items-center justify-center p-8">
        <WorkspaceGround />
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">{t("error_loading_products")}</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => fetchProducts()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }


  return (
    /*
     * =========================================================================
     * THE PAGE HEAD, REBUILT ON `HeroSection`
     * =========================================================================
     * WHAT WAS HERE
     *
     *   `bg-linear-to-br from-primary/5 via-primary/10 to-background border-b`
     *       A brand-tinted band over a flat page, closed with a hard seam.
     *       `components/ui/hero-section.tsx` exists to delete exactly this:
     *       "ninety-odd pages that each looked like a different product, over a
     *       hard `border-b` seam where the tinted band met the flat page."
     *
     *   `pt-header` on a bare root
     *       NO PAGE GROUND. Every other console in this admin sits on
     *       `WorkspaceGround`. `HeroSection` mounts it (`ground` defaults true),
     *       so it is fixed by NOT passing a prop, and `pt-header-clear`
     *       (= `--header-height` + 2rem) replaces the literal clearance.
     *
     *   TEN ANIMATED NODES
     *       A `rotate: -180` Sparkles tile, delays of 0.2 / 0.3 / 0.4 on the
     *       icon, the `<h1>` and the description, and four `StatsCard` each
     *       staggering again — so the tiles finished drawing BEFORE the title
     *       above them did, and the heading arrived after the content it was
     *       supposed to introduce. R12 caps motion at 300ms and a spring has no
     *       duration to cap. Nothing in a page heading MOVES between two
     *       states, so there was nothing for an entrance to express. The head
     *       is PAINTED AT REST; the only motion left is two `animate-spin`
     *       icons, each bound to a request that is genuinely open.
     *
     *   FOUR `StatsCard` TILES, TWO OF THEM AMBER
     *       `components/layout/heading-stats.tsx` is a file-length argument
     *       against this call site: KPI tiles in a heading are "four large
     *       boxes competing with the `<h1>` directly above them, and they push
     *       the page's first actual control below the fold", and "a rail of
     *       four figures where two are tinted is R2's accent spent on
     *       decoration, and a colour that carries the verdict on its own is R8
     *       besides."
     *
     * WHAT REPLACES IT, AND WHERE EACH FIGURE WENT
     *
     * The shape is `admin/finance/deposit/gateway/page.tsx`'s — the same defect
     * (four `StatsCard` in a heading), already solved once: a quiet rail plus
     * one decisive, actionable sentence.
     *
     *   RAIL      `licensed` and `active`. The only two figures here an
     *             operator cannot read off something else on the screen, and
     *             `active` is a strict subset of `licensed`, so the pair reads
     *             as one sentence in which the GAP is the finding — "12
     *             licensed, 9 enabled" is three things being paid for and not
     *             used.
     *   BUTTON    `updatable`. The one number that changes what the operator
     *             does, carried by the one control that can act on it.
     *   SENTENCE  `withUpdates - updatable`, only when non-zero — the
     *             reconciliation between this head and the amber Update badges
     *             on unlicensed cards below.
     *   BANNER    `stranded`. Live-facing, silent, and unfixable from the row
     *             it belongs to. See the note in the `stats` memo.
     *   DROPPED   `total`, `extensions`, `blockchains`, `exchanges` — the tab
     *             bar below carries all four WITH COUNTS, and a tab that
     *             filters strictly dominates a figure that only counts.
     *   DROPPED   `unlicensed`. It is `total - licensed`, and on this page it
     *             is not a fault: these rows are the bundled catalogue, not an
     *             installed set, so "Unlicensed 22" told the operator that not
     *             having bought 22 products was a warning condition. An alarm
     *             that fires on every install is how a warning becomes
     *             wallpaper. Every unlicensed card already says "Activate" on
     *             itself.
     */
    <div>
      <HeroSection
        /*
         * BREADCRUMB, NOT BADGE — the eyebrow is one or the other, and this one
         * absorbs a control. The outlined "Back" button that sat third in the
         * action row spent button weight on navigation; the breadcrumb renders
         * `@/i18n/routing`'s `Link`, so it keeps the locale and supports
         * middle-click and prefetch, none of which an `onClick` doing
         * `router.push` did. It also takes the action row from three buttons to
         * two, which is what lets the one that matters be the loudest.
         *
         * A badge would have been a third statement of what the `<h1>` and the
         * four category tabs already say.
         */
        breadcrumb={{ text: tCommon("back_to_dashboard"), href: "/admin" }}
        title={t("add_ons_integrations")}
        /*
         * NO DESCRIPTION, and this is the largest single cut.
         *
         * It read "Expand your platform with extensions, blockchain networks,
         * and exchange providers. Activate licenses to unlock additional
         * features and capabilities." — three wrapped lines on a page an
         * operator reaches by clicking Extensions in the admin nav. Its first
         * sentence names the three categories the tab bar below names WITH
         * COUNTS; its second states a purpose every unlicensed card already
         * states on itself. Compare the gateway console, which KEEPS its
         * description because that one carries something nothing else on the
         * screen does. This one carried nothing.
         *
         * Cutting it is also what keeps `descriptionClassName` at its default:
         * at `md:text-lg` the prose renders at the same size as the rail
         * figures, and the right fix for prose competing with the data beside
         * it is to delete the prose, not to shrink it. The rail is the sub-line
         * now — figures instead of adjectives.
         */
        layout="split"
        rightContentAlign="center"
        /*
         * TWO FIGURES, NO TONE — `HeadingStats` deliberately has no tone axis,
         * and the one accent it spends is the icon tile, which is chrome.
         *
         * "Licensed" is a literal because `common.licensed` is not in the
         * bundle and `tCommon("licensed")` would render the raw key; that is
         * what this file already did at the tile it replaces. "Enabled" is the
         * word the Switch tooltip uses on every card below, so the head and the
         * rows speak one vocabulary.
         */
        stats={[
          { icon: ShieldCheck, label: t("licensed"), value: stats.licensed },
          { icon: Power, label: tCommon("enabled"), value: stats.active },
        ]}
        /*
         * Without this the rail reads "0 / 0" for the whole fetch — an install
         * with thirty add-ons reporting it has none, which is what the four
         * tiles did on every Refresh. Labels and icons keep drawing, so nothing
         * shifts when the figures land.
         */
        statsLoading={isLoading && stats.total === 0}
        /*
         * `pb-4` is tuned for a page that follows with its own `container py-8`.
         * The toolbar is inside this heading now and the container below has no
         * top padding, so the rhythm between the toolbar and the first product
         * card is re-homed here.
         */
        paddingBottom="pb-6"
        rightContent={
          <div className="flex flex-wrap items-center gap-2">
            {/*
              THE ONE LOUD THING, AND ONLY WHEN IT IS TRUE.

              R2 says the accent marks what is interactive or the one figure
              that matters; here they are the same object, so the button IS the
              update alarm and that state needs no banner of its own. Three
              honest faces:

                updatable > 0   filled — "Update All (3)", the only filled
                                control anywhere in the head.
                updatable = 0   OUTLINE, and it says what pressing it does.
                                `start()` opens with a FORCED check because the
                                flags arrive through a ten-minute cache, so this
                                is a real affordance rather than a euphemism for
                                a dead button — and a filled primary offering to
                                do nothing is the accent asserting a non-event.
                running         stays filled and becomes the run's own progress.

              Prominence and label change together, so colour never carries it
              alone (R8).

              `size="sm"` replaces `size="default" className="h-9"`, which was
              the `sm` step written out by hand. It is also the height of every
              control in the toolbar below, so the head's actions and the page's
              controls read as one family.
            */}
            {(canBulkUpdate || bulkRunning) && (
              <Button
                size="sm"
                variant={
                  bulkRunning || settled.updatable > 0 ? "default" : "outline"
                }
                /*
                 * DISABLED WHILE THE STORE IS BLANK, and this is a correctness
                 * gate rather than a nicety.
                 *
                 * The label above reads `settled`, so the button survives a
                 * Refresh saying "Update All (3)" — but `startBulkUpdate` is
                 * handed the LIVE `allProducts`, which is `[]` for that same
                 * window (store/products.ts:250). `start([])` still runs its
                 * forced batch check, finds releases, filters them against an
                 * empty list, and lands on `phase: "finished"` with no items —
                 * i.e. the dialog opens and reports "Every licensed add-on is
                 * already on its latest release." An operator who pressed
                 * Refresh and then Update All would be told the install is
                 * current while three updates sat waiting.
                 *
                 * The window is not hypothetical: `start()` itself ends with
                 * `await refreshProducts()`, so it opens automatically after
                 * every run, with `bulkRunning` already false.
                 *
                 * Reading the settled figures is what made this reachable —
                 * before, the button unmounted here — so the gate belongs with
                 * the snapshot that introduced it. `bulkRunning` is exempt: in
                 * that state the click only re-opens the dialog, which is
                 * exactly the re-entry the mount condition exists to preserve.
                 */
                disabled={isLoading && !bulkRunning}
                onClick={() =>
                  bulkRunning
                    ? setBulkUpdateOpen(true)
                    : startBulkUpdate(allProducts)
                }
              >
                {bulkRunning ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    {/* The queue does not exist yet while scanning, so "0/0"
                        would be the label for the first second or two. */}
                    {bulkPhase === "scanning"
                      ? `${tCommon("checking")}…`
                      : t("updating", { bulkSettled: String(bulkSettled), length: bulkItems.length })}
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    {settled.updatable > 0
                      ? t("update_all", { updatable: String(settled.updatable) })
                      : tCommon("check_for_updates")}
                  </>
                )}
              </Button>
            )}

            {/* Ghost, so the row has a lead and a follower rather than the
                three equal-weight buttons that were here. Re-reading a list is
                not why anyone opened this page. It stays in `rightContent`
                rather than moving into the toolbar so the split layout keeps a
                right-hand anchor on a fresh install, where the update button
                does not mount. */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw
                className={cn("h-4 w-4", isRefreshing && "animate-spin")}
              />
              {isRefreshing ? `${tCommon("refreshing")}…` : tCommon("refresh")}
            </Button>
          </div>
        }
        /*
         * THE ALARM, THEN THE CONTROLS.
         *
         * `bottomSlot` is documented for "a progress bar, a filter strip, a
         * funding meter" — the toolbar is literally the named case. Merging it
         * deletes a band `pb-8`, a `border-b` and a container `pt-6` that
         * existed only to close a seam that no longer exists, and it moves the
         * four category counts to one line below where the tiles were, as
         * CONTROLS rather than trivia.
         *
         * The banner rides above the toolbar in the same slot so the reading
         * order is heading -> alarm -> controls -> grid. In the content
         * container it would sit BELOW the filters, since the filters are in
         * the band now.
         *
         * The filter row's own entrance (`y: 20`, spring, `delay: 0.4`) went
         * with the move. It was timed against a ladder that no longer exists,
         * so it would have slid in 400ms late under a head painted at rest —
         * and it already arrived after the cards beneath it had drawn.
         */
        bottomSlot={
          <div className="space-y-6">
            {!isLoading && stats.stranded.length > 0 ? (
              <Card tone="destructive" padding="md">
                <div className="flex items-start gap-3">
                  <AlertCircle
                    className="mt-0.5 h-4 w-4 shrink-0 text-destructive"
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="font-medium">
                      {stats.stranded.length === 1
                        ? `1 ${tCommon('addon_is_switched_on_without_a_verified_licence')}`
                        : t("add_ons_are_switched_on_without_a_verified_licence", { length: stats.stranded.length })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Users can still reach these features while every licensed
                      call inside them fails, and the switch on their rows below
                      stays disabled until a licence verifies — so they cannot
                      be turned off from this list either. Restore the
                      install&apos;s <code className="font-mono">lic</code>{" "}
                      folder and refresh, or open each one to re-enter its
                      purchase code.
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      {stats.stranded.slice(0, 3).map((product) => (
                        <Button
                          key={product.id}
                          size="xs"
                          variant="outline"
                          tone="destructive"
                          onClick={() => handleProductClick(product)}
                        >
                          {product.title}
                        </Button>
                      ))}
                      {stats.stranded.length > 3 ? (
                        <span className="text-xs text-muted-foreground">
                          +{stats.stranded.length - 3} more
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </Card>
            ) : null}

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <Tabs
                value={categoryFilter}
                onValueChange={handleCategoryChange}
                className="w-auto"
              >
                <TabsList className="h-9">
                  <TabsTrigger value="all" className="text-xs gap-1.5">
                    <Package className="h-3.5 w-3.5" />
                    All ({settled.total})
                  </TabsTrigger>
                  <TabsTrigger value="extension" className="text-xs gap-1.5">
                    <Boxes className="h-3.5 w-3.5" />
                    Extensions ({settled.extensions})
                  </TabsTrigger>
                  <TabsTrigger value="blockchain" className="text-xs gap-1.5">
                    <Cpu className="h-3.5 w-3.5" />
                    Blockchains ({settled.blockchains})
                  </TabsTrigger>
                  <TabsTrigger value="exchange" className="text-xs gap-1.5">
                    <Globe className="h-3.5 w-3.5" />
                    Exchanges ({settled.exchanges})
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="flex w-full items-center gap-2 lg:w-auto">
                <div className="relative flex-1 lg:w-[280px] lg:flex-none">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <Input
                    placeholder={tCommon("search_products")}
                    aria-label={tCommon("search_products")}
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {/* `aria-pressed` because this is a two-state toggle group and
                    nothing else announces which one is on — `variant="secondary"`
                    is a colour, and R8 does not let a colour carry it alone. */}
                <div className="flex shrink-0 items-center rounded-lg border p-1">
                  <Button
                    variant={viewMode === "grid" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => setViewMode("grid")}
                    aria-pressed={viewMode === "grid"}
                    aria-label={tCommon("grid_view")}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => setViewMode("list")}
                    aria-pressed={viewMode === "list"}
                    aria-label={tCommon("list_view")}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        }
      >
        {/*
          ONE SENTENCE, AND ONLY WHEN IT SAYS SOMETHING THE CONTROLS CANNOT.

          There is deliberately NO all-clear line. "Nothing to update" would be
          present on every healthy install — which is most of them — and a line
          that is always there is a permanent hole rather than information. The
          zero state is already carried by the button reading "Check for
          Updates".

          Three branches, each true only in the state it names:

            running       the run outlives this page and the dialog, and nothing
                          else on screen says how to get back into it.
            licensed = 0  the fresh install. `canBulkUpdate` is false here, so
                          the head has no update control at all — without this
                          a new operator gets two zeroes and a toolbar.
            gap > 0       products flagged for an update they cannot redeem.

          Gated on `!isLoading` because `refreshProducts()` empties the store,
          so an ungated line would assert a count against arrays it has just
          blanked. No tone and no icon: R8 is satisfied by the words, and the
          accent stays on the button.
        */}
        {bulkRunning ? (
          <p className="text-sm text-muted-foreground">
            {t("the_run_continues_if_you_leave")}
          </p>
        ) : isLoading ? null : stats.total > 0 && stats.licensed === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("no_product_is_licensed_on_this")}
          </p>
        ) : unreachableUpdates > 0 ? (
          <p className="text-sm text-muted-foreground">
            {unreachableUpdates === 1
              ? `1 ${tCommon('addon_below_carries_an_update_badge_without_a_licence_so_update_all_cannot_reach_it')}`
              : t("add_ons_below_carry_an_update", { unreachableUpdates: String(unreachableUpdates) })}
          </p>
        ) : null}
      </HeroSection>

      {/* No top padding — the heading's `pb-6` owns that gap now — and no
          `space-y-6`, because the toolbar that needed separating from the grid
          lives in the heading. `flex-1` goes with the flex column, which was
          inert: `<main>` in the admin layout is not a flex container, so
          `flex-1` on this root did nothing. */}
      <div className="container pb-16">
        {/* Products Grid/List */}
        {isLoading ? (
          <div className={cn(
            viewMode === "grid"
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
              : "space-y-3"
          )}>
            {/*
              The pending tile is `ProductCard`'s own list row with the strings
              withheld — same `Card`, same `p-4`, same `gap-4`, same art tile.

              What it replaced measured nothing it stood in for: the real art
              tile is `h-14 aspect-[5/3]` (56x93px), not a 64px square, and the
              two text bars were `h-5`/`h-4` against a `font-semibold` title
              line and a `text-sm` description line — a fixed pixel height
              beside type that is free to change. Eight of those, in a grid,
              on the page an admin lands on to install anything.
            */}
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="h-14 aspect-[5/3] rounded-lg bg-muted shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate">
                          <SkeletonText placeholder={t("product_name")} />
                        </h3>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        <SkeletonText placeholder={t("what_this_product_adds_to_the_platform")} />
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <Card className="py-16">
            <CardContent className="text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">{tCommon("no_products_found")}</h3>
              <p className="text-muted-foreground">
                {filter
                  ? tCommon("try_adjusting_your_search_or_filters")
                  : t("no_products_available_in_this_category")}
              </p>
            </CardContent>
          </Card>
        ) : (
          <AnimatePresence mode="popLayout">
            <m.div
              className={cn(
                viewMode === "grid"
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                  : "space-y-3"
              )}
            >
              {filteredProducts.map((product, index) => (
                <m.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2, delay: index * 0.02 }}
                >
                  <ProductCard
                    product={product}
                    viewMode={viewMode}
                    onToggle={() => toggleProductStatus(product)}
                    onClick={() => handleProductClick(product)}
                    getCategoryIcon={getCategoryIcon}
                    getCategoryColor={getCategoryColor}
                    getProductImage={getProductImage}
                  />
                </m.div>
              ))}
            </m.div>
          </AnimatePresence>
        )}
      </div>

      {/* Mounted unconditionally: the run outlives the dialog, so this has to be
          able to re-open onto a run that is already half-way through. */}
      <UpdateAllDialog />
    </div>
  );
}

interface ProductCardProps {
  product: Product;
  viewMode: "grid" | "list";
  onToggle: () => void;
  onClick: () => void;
  getCategoryIcon: (category: string) => React.ReactNode;
  getCategoryColor: (category: string) => string;
  getProductImage: (product: Product) => string | null;
}

function ProductCard({
  product,
  viewMode,
  onToggle,
  onClick,
  getCategoryIcon,
  getCategoryColor,
  getProductImage,
}: ProductCardProps) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const productImage = getProductImage(product);
  /*
   * THREE ROWS HAD NO DESCRIPTION AT ALL, and the card said so out loud.
   *
   * `binanceus`, `kraken` and `okx` are `NULL` in the `description` column —
   * they are not in `backend/seeders/20240402234748-exchanges.js`, so nothing
   * ever wrote one — and the card printed "No description available" beside
   * seven siblings that each had a sentence. The showcase copy added for those
   * products carries a tagline that is exactly this line, so read it rather
   * than shipping a placeholder. The DB value still wins where it exists.
   */
  const description =
    product.description ||
    getProductShowcase(product)?.tagline ||
    t("no_description_available");

  if (viewMode === "list") {
    return (
      <m.div
        whileHover={{ scale: 1.01, y: -2 }}
        whileTap={{ scale: 0.99 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        <Card
          className={cn(
            "group transition-all duration-200 cursor-pointer",
            !product.licenseVerified && "border-warning/30 bg-warning/5"
          )}
        >
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            {/* Image */}
            <div
              className="h-14 aspect-[5/3] rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden"
              onClick={onClick}
            >
              {productImage ? (
                <ThemedArt
                  src={productImage}
                  alt={product.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                getCategoryIcon(product.category)
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0" onClick={onClick}>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold truncate">{product.title}</h3>
                <Badge variant="outline" className={cn("text-xs shrink-0", getCategoryColor(product.category))}>
                  {getCategoryIcon(product.category)}
                  <span className="ml-1 capitalize">{product.category}</span>
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-1">
                {description}
              </p>
            </div>

            {/* Version & Updates */}
            <div className="flex items-center gap-4 shrink-0">
              <div className="text-right">
                <p className="text-sm font-medium">v{product.version}</p>
                {product.hasLicenseUpdate && (
                  <Badge className="bg-warning/10 text-warning-ink border-warning/20 text-xs">
                    <Download className="h-3 w-3 mr-1" />
                    Update
                  </Badge>
                )}
              </div>

              {/* License Status */}
                <Tooltip>
                  <TooltipTrigger>
                    {product.licenseVerified ? (
                      <div className="flex items-center gap-1 text-success">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-warning">
                        <XCircle className="h-5 w-5" />
                      </div>
                    )}
                  </TooltipTrigger>
                  <TooltipContent>
                    {product.licenseVerified ? tCommon("license_verified") : tCommon("license_required")}
                  </TooltipContent>
                </Tooltip>

              {/* Status Toggle */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div onClick={(e) => e.stopPropagation()}>
                      <Switch
                        checked={product.status}
                        onCheckedChange={onToggle}
                        disabled={!product.licenseVerified}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    {!product.licenseVerified
                      ? t("activate_license_first")
                      : product.status
                      ? tCommon("enabled")
                      : tCommon("disabled")}
                  </TooltipContent>
                </Tooltip>

              {/* External Link */}
              {product.link && (
                <a
                  href={product.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>
        </CardContent>
        </Card>
      </m.div>
    );
  }

  // Grid View
  return (
    <m.div
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="h-full"
    >
      <Card
        className={cn(
          "group transition-all duration-200 cursor-pointer overflow-hidden h-full",
          !product.licenseVerified && "border-warning/30 bg-warning/5"
        )}
      >
        {/* Image Header */}
        <div
          className="relative aspect-[5/3] bg-linear-to-br from-muted to-muted/50 overflow-hidden"
          onClick={onClick}
        >
        {productImage ? (
          <>
            <ThemedArt
              src={productImage}
              alt={product.title}
              className="h-full w-full object-cover transition-transform duration-300"
            />
            <div className="h-full w-full items-center justify-center" style={{ display: "none" }}>
              <div className={cn("h-16 w-16 rounded-2xl flex items-center justify-center", getCategoryColor(product.category))}>
                {getCategoryIcon(product.category)}
              </div>
            </div>
          </>
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <div className={cn("h-16 w-16 rounded-2xl flex items-center justify-center", getCategoryColor(product.category))}>
              {getCategoryIcon(product.category)}
            </div>
          </div>
        )}

        {/* Update Badge */}
        {product.hasLicenseUpdate && (
          <Badge className="absolute top-3 right-3 bg-warning text-warning-foreground text-xs">
            <Download className="h-3 w-3 mr-1" />
            Update
          </Badge>
        )}
      </div>

      <CardContent className="p-4 space-y-3">
        {/* Title & Description */}
        <div onClick={onClick}>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
              {product.title}
            </h3>
            <Badge variant="outline" className={cn("text-xs shrink-0", getCategoryColor(product.category))}>
              {getCategoryIcon(product.category)}
              <span className="ml-1 capitalize">{product.category}</span>
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
            {description}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            {/* License Status */}
              <Tooltip>
                <TooltipTrigger>
                  {product.licenseVerified ? (
                    <Badge tone="success" appearance="soft">
                      <CheckCircle2 className="h-3 w-3" />
                      {tCommon("verified")}
                    </Badge>
                  ) : (
                    <Badge tone="warning" appearance="soft">
                      <XCircle className="h-3 w-3" />
                      Activate
                    </Badge>
                  )}
                </TooltipTrigger>
                <TooltipContent>
                  {product.licenseVerified
                    ? t("license_is_verified_and_active")
                    : t("click_to_activate_license")}
                </TooltipContent>
              </Tooltip>

            <span className="text-xs text-muted-foreground">v{product.version}</span>
          </div>

          {/* Toggle */}
          <div onClick={(e) => e.stopPropagation()}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Switch
                      checked={product.status}
                      onCheckedChange={onToggle}
                      disabled={!product.licenseVerified}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {!product.licenseVerified
                    ? t("activate_license_first")
                    : product.status
                    ? tCommon("enabled")
                    : tCommon("disabled")}
                </TooltipContent>
              </Tooltip>
          </div>
        </div>
      </CardContent>
      </Card>
    </m.div>
  );
}
