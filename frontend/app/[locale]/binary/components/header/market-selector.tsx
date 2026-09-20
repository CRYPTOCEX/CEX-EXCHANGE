/**
 * MarketSelector (Unified)
 *
 * Premium responsive market selector modal with glassmorphism design.
 * Uses defined column widths for consistent layout.
 *
 * LOADING: there is no second tree and no spinner. The header, search box and
 * tab bar are knowable before the fetch and render immediately; the list paints
 * PENDING_ROW_COUNT rows of the real row markup with its four unknown values
 * (logo, pair, price, 24h change) skeletoned in place. The row this replaced
 * was a centred 40px spinner over `py-16` — 152px of column against the ~408px
 * the list actually occupies, so the modal grew by a quarter of a screen the
 * instant the markets landed, under the user's cursor.
 */
"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Search, X, Star, TrendingUp, TrendingDown, Flame, Sparkles, Zap } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { m, AnimatePresence } from "framer-motion";

import {
  useBinaryStore,
  type BinaryMarket,
  type Symbol,
} from "@/store/trade/use-binary-store";
import { wishlistService } from "../../../../../services/wishlist-service";
import { useTranslations } from "next-intl";
import { tickersWs } from "@/services/tickers-ws";
import type { TickerData } from "@/app/[locale]/trade/components/markets/types";
import { cn } from "@/lib/utils";
import { Loadable } from "@/components/ui/skeleton";
import { EmptyState } from "../binary-ui";

interface MarketSelectorModalProps {
  open: boolean;
  onClose: () => void;
  handleMarketSelect?: (marketSymbol: string) => void;
  onAddMarket?: (symbol: Symbol) => void;
  isMobile?: boolean; // When true, selecting a market replaces current instead of adding
}

type TabType = "all" | "trending" | "hot" | "favorites";

/**
 * How many pending rows to paint while `fetchBinaryMarkets()` is in flight.
 *
 * A list has no knowable length, so this reserves the CONTAINER and accepts
 * that the child count settles (SKELETONS.md, "Lists and grids"). Six is chosen
 * against the real geometry: a row is a 40px tile inside `p-3` = 64px, plus the
 * 4px `mb-1` gutter, so six rows is 408px against the scroller's own
 * `max-h-[50vh]` — i.e. the pending list already overflows on any viewport
 * taller than ~816px, exactly as the resolved list does. The scrollbar is
 * therefore present in BOTH states and its ~15px does not appear at resolve and
 * squeeze the row content sideways.
 */
const PENDING_ROW_COUNT = 6;

/**
 * The row body reads from this while the fetch is in flight.
 *
 * Dropping the `isLoadingMarkets` early branch also drops the narrowing that
 * guaranteed a row HAS a market, and the cure for that is one named constant
 * rather than a dozen `?.` sprinkled through the row (SKELETONS.md, "the
 * dangerous part"). Everything here is deliberately falsy-but-typed: `isHot`
 * and `isTrending` false send the badge slot down its third branch — the muted
 * "Binary Options" caption — which is the one of the three that is a plain
 * string, so it can be skeletoned in place instead of guessing which badge will
 * arrive.
 */
const PENDING_MARKET: BinaryMarket = {
  id: "",
  currency: "",
  pair: "",
  status: false,
  isHot: false,
  isTrending: false,
};

export default function MarketSelectorModal({
  open,
  onClose,
  handleMarketSelect,
  onAddMarket,
  isMobile = false,
}: MarketSelectorModalProps) {
  const t = useTranslations("common");
  const tBinary = useTranslations("binary_components");
  const {
    activeMarkets,
    currentSymbol,
    setCurrentSymbol,
    addMarket,
    binaryMarkets,
    isLoadingMarkets,
    fetchBinaryMarkets,
  } = useBinaryStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [mounted, setMounted] = useState(false);
  const [favoriteMarkets, setFavoriteMarkets] = useState<Symbol[]>([]);
  const [tickerData, setTickerData] = useState<Record<string, TickerData>>({});
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-focus search when modal opens
  useEffect(() => {
    if (open && mounted) {
      setTimeout(() => searchRef.current?.focus(), 100);
    }
  }, [open, mounted]);

  // Fetch markets if needed
  useEffect(() => {
    if (binaryMarkets.length === 0 && !isLoadingMarkets) {
      fetchBinaryMarkets();
    }
  }, [binaryMarkets.length, isLoadingMarkets, fetchBinaryMarkets]);

  // Subscribe to wishlist
  useEffect(() => {
    const unsubscribe = wishlistService.subscribe((wishlist) => {
      setFavoriteMarkets(wishlist.map((item) => item.symbol));
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to ticker data
  useEffect(() => {
    tickersWs.initialize();
    const unsubscribe = tickersWs.subscribeToSpotData((data) => {
      setTimeout(() => {
        setTickerData((prevData) => {
          const updatedData = { ...prevData };
          Object.entries(data).forEach(([symbol, tickerData]) => {
            if (tickerData && tickerData.last !== undefined) {
              updatedData[symbol] = tickerData;
            }
          });
          return updatedData;
        });
      }, 0);
    });
    return () => unsubscribe();
  }, []);

  const formatPrice = (price: number): string => {
    if (price === 0) return "—";
    if (price >= 1000) return `$${price.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
    if (price >= 1) return `$${price.toFixed(4)}`;
    return `$${price.toFixed(6)}`;
  };

  const filteredMarkets = binaryMarkets.filter((market) => {
    const searchString = `${market.currency}${market.pair}${market.label}`.toLowerCase();
    const matchesSearch = searchString.includes(searchQuery.toLowerCase());
    if (activeTab === "all") return matchesSearch;
    if (activeTab === "favorites") {
      const symbol = market.symbol || `${market.currency}${market.pair}`;
      return matchesSearch && favoriteMarkets.includes(symbol);
    }
    if (activeTab === "trending") return matchesSearch && market.isTrending;
    if (activeTab === "hot") return matchesSearch && market.isHot;
    return matchesSearch;
  });

  /**
   * Empty is a RESULT, never the shape of a request still in flight.
   *
   * This predicate used to be implicit: the spinner branch above it ran first,
   * so `filteredMarkets.length === 0` could only be reached with data in hand.
   * With the spinner gone the guard has to say `!isLoadingMarkets` out loud, or
   * every open of this modal flashes "No markets found — try a different search
   * term" at someone whose search is fine and whose markets are one tick away.
   */
  const showEmptyState = !isLoadingMarkets && filteredMarkets.length === 0;

  /**
   * ONE list renders both states — the pending pass is the same row markup with
   * its four unknown values (logo, pair name, price, 24h change) replaced.
   *
   * A `null` entry means "row whose market has not arrived". Making the pending
   * pass a second `<div>` of grey bars was the alternative and it is the one
   * SKELETONS.md calls out: a duplicate tree has no mechanism keeping it in
   * sync with the real one, so the next person to change the row geometry
   * changes it in one place out of two.
   */
  const rows: Array<BinaryMarket | null> = isLoadingMarkets
    ? Array.from({ length: PENDING_ROW_COUNT }, () => null)
    : filteredMarkets;

  const handleSelectMarket = (symbol: Symbol) => {
    // On mobile: just switch to the market (replace behavior)
    // On desktop: add the market to activeMarkets if not already present
    if (!isMobile && !activeMarkets.some((m) => m.symbol === symbol)) {
      if (onAddMarket) {
        onAddMarket(symbol);
      } else {
        addMarket(symbol);
      }
    }

    // Select the market (switch to it)
    if (handleMarketSelect) {
      handleMarketSelect(String(symbol));
    } else {
      setCurrentSymbol(symbol);
    }

    onClose();
  };

  const toggleFavorite = (e: React.MouseEvent, symbol: Symbol) => {
    e.stopPropagation();
    wishlistService.toggleWishlist(symbol);
  };

  /*
   * `if (!mounted) return null` USED TO BE HERE, AND IT WAS DOING NOTHING
   * ====================================================================
   * The whole component is a Radix `Dialog`, and `open` is `useState(false)` in
   * both call sites — `market-selector-desktop.tsx` (`showAddModal`) and
   * `mobile-header.tsx` (`showMarketSelector`). A closed `Dialog.Root` emits no
   * DOM at all, so the server, the client's first render and the gated version
   * produced the same thing: nothing. The gate cost no layout, but it also
   * bought no safety, and it read as if this subtree were unsafe to render on
   * the server when the truth is that it is never rendered until a click —
   * which is unambiguously after mount.
   *
   * Deleting it removes the false signal. The persisted-store reads inside
   * (`activeMarkets`, `currentSymbol` from `binary-trading-store`) are still
   * only ever committed post-mount, because `open` cannot be true before one.
   *
   * `mounted` itself stays: the auto-focus effect below waits on it.
   */

  /**
   * Tabs. Each used to own an accent (blue / emerald / rose / amber) purely as
   * decoration; the icon already names the tab, and "selected" is one state,
   * so the selected tab is `primary` and the icons ride the neutral ramp.
   */
  const tabs: Array<{ id: TabType; icon: React.ReactNode; label: string }> = [
    { id: "all", icon: <Sparkles size={12} />, label: t("all") },
    { id: "trending", icon: <TrendingUp size={12} />, label: t("trending") },
    { id: "hot", icon: <Flame size={12} />, label: t("hot") },
    { id: "favorites", icon: <Star size={12} />, label: t("favorites") },
  ];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="w-full max-w-[95vw] sm:max-w-[500px] lg:max-w-[700px] xl:max-w-[800px] max-h-[85vh] p-0 gap-0 overflow-hidden bg-popover backdrop-blur-xl border-border border rounded-2xl shadow-2xl [&>button]:hidden">
        <DialogTitle className="sr-only">Select Market</DialogTitle>
        <DialogDescription className="sr-only">Choose a trading pair</DialogDescription>

        {/* Premium Header */}
        <div className="relative overflow-hidden bg-card">
          {/* Gradient accent */}
          <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-primary/50 to-transparent" />

          {/* Header content */}
          <div className="p-4">
            {/* Title row */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10">
                  <Zap size={18} className="text-primary" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">
                    {t("select_market")}
                  </h2>
                  {/* `binaryMarkets.length` is 0 until the fetch lands, and a
                      confident "0 pairs available" over a modal that is about
                      to list forty of them is the exact class of lie
                      SKELETONS.md warns about. Only the FIGURE waits; the word
                      after it never moves. */}
                  <p className="text-[11px] text-muted-foreground">
                    <Loadable
                      loading={isLoadingMarkets}
                      placeholder="00"
                      chars={2}
                    >
                      {binaryMarkets.length}
                    </Loadable>{" "}
                    {t("pairs_available")}
                  </p>
                </div>
              </div>
              <m.button
                type="button"
                onClick={onClose}
                aria-label={t("close")}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors cursor-pointer bg-surface-3 text-muted-foreground hover:text-foreground hover:bg-surface-3/70"
              >
                <X size={16} />
              </m.button>
            </div>

            {/* Search bar */}
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                ref={searchRef}
                type="text"
                placeholder={`${tBinary("search_markets_symbols_or_pairs")}…`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-11 pl-11 pr-10 text-sm rounded-xl transition-all bg-surface-3 border border-border text-foreground placeholder-subtle-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
              />
              <AnimatePresence>
                {searchQuery && (
                  <m.button
                    type="button"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    onClick={() => setSearchQuery("")}
                    aria-label={t("cancel")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors cursor-pointer text-muted-foreground hover:text-foreground hover:bg-surface-2"
                  >
                    <X size={14} />
                  </m.button>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 px-4 pb-3">
            {tabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <m.button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  aria-pressed={active}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                    active
                      ? "bg-primary/15 text-foreground shadow-lg"
                      : "text-muted-foreground hover:text-foreground hover:bg-surface-3"
                  )}
                >
                  <span className={active ? "text-primary" : undefined}>{tab.icon}</span>
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.slice(0, 3)}</span>
                </m.button>
              );
            })}
          </div>
        </div>

        {/* Market List */}
        <div className="overflow-y-auto max-h-[50vh] bg-popover">
          {showEmptyState ? (
            <EmptyState
              icon={Search}
              message={t("no_markets_found")}
              hint={t("try_a_different_search_term")}
              className="py-16"
            />
          ) : (
            <div className="p-2">
              {rows.map((row, index) => {
                /* One name for "this row has no market yet", and one constant
                   standing in for the market — see PENDING_MARKET. */
                const pending = row === null;
                const market = row ?? PENDING_MARKET;

                const symbol = market.symbol || `${market.currency}${market.pair}`;
                const wsKey = market.label || `${market.currency}/${market.pair}`;
                const liveData = tickerData[wsKey] || tickerData[symbol] || tickerData[`${market.currency}/${market.pair}`];
                const marketData = activeMarkets.find((m) => m.symbol === symbol);
                const price = liveData?.last || marketData?.price || 0;
                const change = liveData?.change || marketData?.change || 0;
                const isPositive = change >= 0;
                /* Every one of these compares against PENDING_MARKET's empty
                   strings while pending, so each resolves false — a pending row
                   is never "selected", never "favourited", never "added". They
                   are all pure decoration ON TOP of a box that is already the
                   right size, so none of them moves anything when it flips. */
                const isFavorite = !pending && favoriteMarkets.includes(symbol);
                const isSelected = !pending && currentSymbol === symbol;
                const isAdded = !pending && activeMarkets.some((m) => m.symbol === symbol);

                return (
                  <m.div
                    /* Index-keyed ONLY while pending, where the rows are
                       interchangeable and there is no id to key by. Real rows
                       keep `market.id`. */
                    key={pending ? `pending-${index}` : market.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02, duration: 0.2 }}
                    onClick={pending ? undefined : () => handleSelectMarket(symbol)}
                    aria-busy={pending || undefined}
                    className={cn(
                      "group flex items-center p-3 mb-1 rounded-xl transition-all border",
                      /* `cursor-pointer` is a promise the row can be clicked;
                         a pending row cannot, so it does not make one. */
                      pending ? "border-transparent" : "cursor-pointer",
                      !pending &&
                        (isSelected
                          ? "bg-primary/10 border-primary/30"
                          : "border-transparent hover:bg-surface-3")
                    )}
                  >
                    {/* Icon with checkmark for added markets */}
                    <div className="relative shrink-0 w-10">
                      {/* ONE tile, one <Image>, in both states — the pulse
                          moves to the tile and the logo is hidden rather than
                          unmounted. Two reasons that beats a SkeletonBlock in
                          its place. First, it is the mechanism SkeletonText
                          already uses: the real element is laid out and hidden,
                          so the box is the box. Second, the src is safe —
                          PENDING_MARKET's empty currency falls through
                          `|| "generic"` to `/img/crypto/generic.webp`, a real
                          asset, so the pending row does not fire six 404s and
                          six `onError` re-assignments on the way to painting
                          nothing. */}
                      <div
                        className={cn(
                          "w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center",
                          pending ? "bg-muted animate-pulse" : "bg-surface-3"
                        )}
                      >
                        <Image
                          src={`/img/crypto/${(market.currency || "generic").toLowerCase()}.webp`}
                          alt={pending ? "" : market.currency || ""}
                          width={28}
                          height={28}
                          className={cn("object-cover", pending && "invisible")}
                          onError={(e) => { e.currentTarget.src = `/img/crypto/generic.webp`; }}
                        />
                      </div>
                      {isAdded && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center shadow-lg">
                          <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                            <path d="M1 3L3 5L7 1" stroke="currentColor" className="text-primary-foreground" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Name & Tags - fixed width */}
                    <div className="w-32 sm:w-40 min-w-0 ml-3 shrink-0">
                      <div className="flex items-center gap-2">
                        {/* Inside the real `font-bold text-sm` span, so the
                            placeholder is laid out by the typography that will
                            draw the pair name a moment later. */}
                        <span className="font-bold text-sm text-foreground">
                          <Loadable loading={pending} placeholder="BTC/USDT">
                            {market.currency}/{market.pair}
                          </Loadable>
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {/* Tinted badges with `foreground` ink — the word is the
                            signal, the tint is only emphasis. */}
                        {market.isHot && (
                          <span className="px-1.5 py-0.5 text-[9px] font-bold bg-warning/20 text-foreground rounded-md">
                            HOT
                          </span>
                        )}
                        {market.isTrending && (
                          <span className="px-1.5 py-0.5 text-[9px] font-bold bg-primary/20 text-foreground rounded-md">
                            TREND
                          </span>
                        )}
                        {/* PENDING_MARKET has both flags false, so a pending
                            row lands here — the one branch of the three that is
                            plain text and can therefore reserve its own box. */}
                        {!market.isHot && !market.isTrending && (
                          <span className="text-[11px] text-muted-foreground">
                            <Loadable
                              loading={pending}
                              placeholder={t("binary_options")}
                            >
                              {t("binary_options")}
                            </Loadable>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Spacer */}
                    <div className="flex-1" />

                    {/* Price - fixed width for alignment */}
                    <div className="w-28 text-right shrink-0">
                      <div className="font-bold text-sm tabular-nums text-foreground">
                        <Loadable loading={pending} placeholder="$12,345.67">
                          {formatPrice(price)}
                        </Loadable>
                      </div>
                      {/* Arrow direction + sign are the second channel. */}
                      <div className="text-xs font-semibold tabular-nums flex items-center justify-end gap-1 text-foreground">
                        {/* `change` is 0 while pending and `0 >= 0` is TRUE, so
                            an unguarded chip shows every row as a green
                            up-arrow before a single tick has arrived — the
                            "confident, wrong statement" failure, and one the
                            arrow states a second time for anyone who cannot
                            see the tint.

                            Same 16px chip in both states: only the TINT and the
                            arrow are withheld, by moving the pulse onto the
                            chip and hiding the glyph. Swapping in a separate
                            placeholder element would be a second root for the
                            same box, which is what makes a pending tree drift
                            from the real one. */}
                        <span
                          className={cn(
                            "w-4 h-4 rounded flex items-center justify-center",
                            pending
                              ? "bg-muted animate-pulse"
                              : isPositive
                                ? "bg-up/10 text-up-ink"
                                : "bg-down/10 text-down-ink"
                          )}
                        >
                          {isPositive ? (
                            <TrendingUp size={10} className={cn(pending && "invisible")} />
                          ) : (
                            <TrendingDown size={10} className={cn(pending && "invisible")} />
                          )}
                        </span>
                        <Loadable loading={pending} placeholder="+0.00%">
                          {isPositive ? "+" : ""}{change.toFixed(2)}%
                        </Loadable>
                      </div>
                    </div>

                    {/* Favorite. Rendered in BOTH states — it is a 32px box in
                        the row's flex line, so withholding it would shift the
                        price column right by 32px at resolve. Pending, it is
                        simply inert and unhoverable; it was already invisible
                        at rest on any unfavourited market. */}
                    <m.button
                      type="button"
                      onClick={pending ? undefined : (e) => toggleFavorite(e, symbol)}
                      disabled={pending}
                      aria-label={t("toggle_favourite")}
                      aria-pressed={isFavorite}
                      whileHover={pending ? undefined : { scale: 1.1 }}
                      whileTap={pending ? undefined : { scale: 0.9 }}
                      className={cn(
                        "p-2 rounded-lg transition-all shrink-0 ml-2",
                        pending
                          ? "opacity-0"
                          : "cursor-pointer hover:bg-surface-3",
                        !pending && !isFavorite && "opacity-0 group-hover:opacity-100"
                      )}
                    >
                      <Star
                        size={16}
                        className={isFavorite ? "text-primary fill-primary" : "text-muted-foreground"}
                      />
                    </m.button>
                  </m.div>
                );
              })}
            </div>
          )}
        </div>

      </DialogContent>
    </Dialog>
  );
}
