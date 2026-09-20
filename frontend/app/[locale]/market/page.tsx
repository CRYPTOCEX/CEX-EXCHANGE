"use client";

import { useState, useEffect, useMemo } from "react";
import { m } from "framer-motion";
import Image from "next/image";
import {
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Star,
  BarChart3,
  Volume2,
  Clock,
  Sparkles,
  Target,
  Zap,
  ArrowRight,
  ArrowUpDown,
  DollarSign,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SkeletonBlock, SkeletonText } from "@/components/ui/skeleton";
import { useTheme } from "next-themes";
import { tickersWs } from "@/services/tickers-ws";
import { marketService } from "@/services/market-service";
import { Link, withCurrentLocale } from "@/i18n/routing";
import { getCryptoImageUrl } from "@/utils/image-fallback";
import { useUserStore } from "@/store/user";
import SiteHeader from "@/components/partials/header/site-header";
import { useTranslations } from "next-intl";
import { useSettings } from "@/hooks/use-settings";
import { buildMarketLink, getMarketLinkRoute } from "@/utils/market-links";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * What the SERVER has in `useConfigStore.settings`, and therefore what the
 * client's FIRST render must use too.
 *
 * The config store is `persist()`ed as `bicrypto-config-store` with `settings`
 * in its `partialize`, so a returning visitor's whole settings object is live
 * in the browser's very first render while the server rendered the store's
 * initial `{}`. Every read of `settings` during render has to go through
 * `effectiveSettings` below or the two disagree.
 *
 * Module-level so the identity is stable — it is fed to `useMemo`-free helpers
 * here, but a future memo dep would silently re-run on a fresh `{}`.
 */
const SERVER_SETTINGS: Record<string, any> = {};

/**
 * THE UNIT EVERY FIGURE IN A MARKET ROW IS QUOTED IN.
 *
 * `market.pair` IS the quote asset — this file builds `displaySymbol` as
 * `${m.currency}/${m.pair}` and links with (currency, pair) — so an ETH/BTC
 * row's price, its 24h range, its volume and its market cap are all in BTC, and
 * a NEO/ETH row's are all in ETH. Every one of them used to be printed with a
 * "$" in front: ETH/BTC was advertised on the public markets page as trading at
 * "$0.0312" (it is 0.0312 BTC, roughly $2,000 — five orders of magnitude out)
 * and a 12 BTC day of volume read as twelve dollars. The pair's own code is the
 * only unit these numbers have, so it is the one that goes beside them.
 *
 * Module scope so it is a stable identity — it is read from inside `useMemo`s
 * that must not re-run on every render.
 */
const quoteUnit = (market: any) => String(market?.pair ?? "").toUpperCase();

export default function MarketPage() {
  const t = useTranslations("common");
  const [markets, setMarkets] = useState<any[]>([]);
  // Two independent ticker feeds (separate WebSockets): spot + ecosystem.
  const [spotTickers, setSpotTickers] = useState<Record<string, any>>({});
  const [ecoTickers, setEcoTickers] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [sortBy, setSortBy] = useState("volume");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { user } = useUserStore();
  const { settings } = useSettings();

  // Handle mounting state
  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";

  /* Pre-mount, both sides agree on the store's initial value; post-mount, the
     persisted/fetched one. See SERVER_SETTINGS. */
  const effectiveSettings = mounted ? settings : SERVER_SETTINGS;

  useEffect(() => {
    tickersWs.initialize();

    // The shared market service fetches /api/exchange/market?eco=true, which
    // returns SPOT and ECOSYSTEM markets merged (ecosystem markets win on a
    // symbol collision) with each tagged `isEco`. This is the same source the
    // pro trading view uses, so the two stay consistent.
    const applyMarkets = (list: any[]) => {
      setMarkets(
        (Array.isArray(list) ? list : []).map((m) => ({
          ...m,
          displaySymbol: m.displaySymbol || `${m.currency}/${m.pair}`,
          // Key used to join with the ticker feeds below.
          tickerKey: `${m.currency}/${m.pair}`,
        }))
      );
      setIsLoading(false);
    };

    const marketsUnsubscribe = marketService.subscribeToSpotMarkets(applyMarkets);
    marketService
      .getSpotMarkets()
      .then(applyMarkets)
      .catch(() => setIsLoading(false));

    const mergeTickers = (
      prev: Record<string, any>,
      incoming: Record<string, any>
    ) => {
      const next = { ...prev };
      Object.entries(incoming).forEach(([symbol, data]: [string, any]) => {
        if (data && data.last !== undefined) next[symbol] = data;
      });
      return next;
    };

    // Spot ticker WebSocket (api/exchange/ticker) — always on.
    const spotUnsubscribe = tickersWs.subscribeToSpotData((newTickers) => {
      setSpotTickers((prev) => mergeTickers(prev, newTickers));
    });

    // Ecosystem ticker WebSocket (api/ecosystem/ticker) — a SECOND, separate
    // connection. subscribeToEcoData self-guards on the ecosystem extension and
    // returns a no-op when it isn't installed, so this is safe to always call.
    const ecoUnsubscribe = tickersWs.subscribeToEcoData((newTickers) => {
      setEcoTickers((prev) => mergeTickers(prev, newTickers));
    });

    return () => {
      marketsUnsubscribe();
      spotUnsubscribe();
      ecoUnsubscribe();
    };
  }, []);

  const processedMarkets = useMemo(() => {
    if (!markets.length) return [];
    return markets
      .map((market) => {
        const tickerKey = market.tickerKey || `${market.currency}/${market.pair}`;
        // Prefer the ecosystem feed (matches the market dedup priority), then
        // fall back to the spot feed.
        const ticker = ecoTickers[tickerKey] || spotTickers[tickerKey] || {};
        const price = Number(ticker.last) || 0;
        /*
          `percentage`, NOT `change`. The ecosystem and futures engines return
          BOTH — `change` is the absolute price delta (`close - open`) and
          `percentage` is the move as a percent
          (`ecosystem/utils/matchingEngine.ts:2888-2889`). Only the CEX ticker
          stream aliases `change: raw.percentage`
          (`exchange/ticker/index.ws.ts:247`), and this page PREFERS the eco
          feed — so it was rendering the delta with a `%` after it. A BTC/USDT
          market moving 60,000 -> 61,200 (+2%) published "+1200.00%".
        */
        const change24h =
          Number(ticker.percentage ?? ticker.change) || 0;
        const volume = Number(ticker.quoteVolume) || 0;
        const high24h = Number(ticker.high) || 0;
        const low24h = Number(ticker.low) || 0;
        /*
          NO MARKET CAP IS PUBLISHED, so none is shown.

          This was `price * (market.marketCap || 1_000_000)`. `marketCap` is not
          a column on `exchangeMarket` — the model has id, currency, pair,
          isTrending, isHot, metadata and status — and no backend route computes
          one, so the fallback was always taken and every market on the PUBLIC
          page advertised a market capitalisation of exactly one million times
          its price. BTC at 60,000 published "$60.00B" with no basis in any
          data anyone holds.

          The render below already reads `market.marketCap ? … : "--"`; it was
          unreachable because this line always produced a truthy number. Leaving
          it undefined makes the existing dash the answer, which is the honest
          one until a supply figure exists to multiply by.
        */
        const marketCap =
          Number(market.marketCap) > 0 ? price * Number(market.marketCap) : undefined;
        return {
          ...market,
          price,
          change24h,
          volume,
          high24h,
          low24h,
          marketCap,
          tickerKey,
        };
      })
      .filter((market) => {
        const matchesSearch =
          market.currency.toLowerCase().includes(searchTerm.toLowerCase()) ||
          market.displaySymbol.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter =
          selectedFilter === "all" ||
          (selectedFilter === "gainers" && market.change24h > 0) ||
          (selectedFilter === "losers" && market.change24h < 0) ||
          (selectedFilter === "volume" && market.volume > 1000000) ||
          (selectedFilter === "new" && market.trending) ||
          (selectedFilter === "spot" && !market.isEco) ||
          (selectedFilter === "eco" && market.isEco);
        return matchesSearch && matchesFilter;
      })
      .sort((a, b) => {
        let aValue, bValue;
        switch (sortBy) {
          case "price":
            aValue = a.price;
            bValue = b.price;
            break;
          case "change":
            aValue = a.change24h;
            bValue = b.change24h;
            break;
          case "volume":
            aValue = a.volume;
            bValue = b.volume;
            break;
          case "marketCap":
            aValue = a.marketCap;
            bValue = b.marketCap;
            break;
          default:
            aValue = a.volume;
            bValue = b.volume;
        }
        return sortOrder === "desc" ? bValue - aValue : aValue - bValue;
      });
  }, [markets, spotTickers, ecoTickers, searchTerm, selectedFilter, sortBy, sortOrder]);
  const formatPrice = (price: number) => {
    if (price >= 1000) {
      return price.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    } else if (price >= 1) {
      return price.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4,
      });
    } else {
      return price.toLocaleString("en-US", {
        minimumFractionDigits: 4,
        maximumFractionDigits: 8,
      });
    }
  };
  const formatQuoted = (value: number, market: any) => {
    const unit = quoteUnit(market);
    return unit ? `${formatPrice(value)} ${unit}` : formatPrice(value);
  };
  const formatVolume = (volume: number, unit?: string) => {
    const suffix = unit ? ` ${unit}` : "";
    if (volume >= 1e9) return `${(volume / 1e9).toFixed(2)}B${suffix}`;
    if (volume >= 1e6) return `${(volume / 1e6).toFixed(2)}M${suffix}`;
    if (volume >= 1e3) return `${(volume / 1e3).toFixed(2)}K${suffix}`;
    if (volume >= 1) return `${volume.toFixed(2)}${suffix}`;
    if (volume > 0) return `${volume.toFixed(8)}${suffix}`;
    return `0.00${suffix}`;
  };
  const getMarketIcon = (index: number) => {
    const gradients = [
      "bg-primary",
      "from-primary to-destructive",
      "bg-success",
      "from-warning to-destructive",
      "bg-primary",
      "bg-warning",
    ];
    return gradients[index % gradients.length];
  };
  /**
   * A market row whose MARKET has not arrived yet.
   * ==========================================================================
   *
   * The retired version was a separate tree that agreed with the real row on
   * nothing that mattered:
   *
   *   | thing            | pending was            | the real row is           |
   *   |------------------|------------------------|---------------------------|
   *   | columns          | `grid-cols-6`          | `grid-cols-2 md:grid-cols-6` |
   *   | padding          | `p-4`                  | `p-3 md:p-4`              |
   *   | gap              | `gap-4`                | `gap-2 md:gap-4`          |
   *   | coin mark        | `w-12 h-12` (48px)     | `w-8 h-8 md:w-10 md:h-10` |
   *   | asset text       | `h-4` + `h-3` + `space-y-2` (35px) | `text-sm md:text-base` + `text-xs` (40px) |
   *   | container        | none — straight into `divide-y` | wrapped in `space-y-1` |
   *
   * The 48px circle alone made every pending row 82px against a real row of
   * 72px, and ten of them against nine real markets. Measured on the harness
   * that was **-140px of page height** on `/en/market`: the bottom CTA came up
   * by 153px as the table settled.
   *
   * This is the same row with its unknown strings replaced. The container
   * classes are the row's own, so a padding change moves both; the figures are
   * `SkeletonText` INSIDE the elements that carry `font-mono`/`text-sm`, so a
   * type change moves both. The count is the one thing still fixed at ten —
   * a list has no knowable length, and SKELETONS.md says to reserve the
   * container and the row height and accept that the count settles.
   */
  const renderSkeletonRows = () => (
    <div className="space-y-1">
      {Array.from({ length: 10 }, (_, index) => (
        <m.div
          key={`loading-${index}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
          aria-busy="true"
          className="grid grid-cols-2 md:grid-cols-6 gap-2 md:gap-4 p-3 md:p-4"
        >
          {/* Asset — the logo is the one part with no text metrics of its own,
              so it takes a `SkeletonBlock` carrying the real mark's classes. */}
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center overflow-hidden border-2 border-border bg-card">
              <SkeletonBlock className="w-6 h-6 md:w-8 md:h-8 rounded-full" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm md:text-base">
                  <SkeletonText placeholder="BTC" />
                </span>
              </div>
              <div className="text-xs text-subtle-foreground">
                <SkeletonText placeholder="BTC/USDT" />
              </div>
            </div>
          </div>

          {/* Price + change, mobile only — the same cell the real row hides at
              `md`, so the two agree at every breakpoint rather than just one.
              The placeholders carry a quote code because the real figures do
              now (see `quoteUnit`); a "$00,000.00" ruler reserves four
              characters too few and the row re-flows as the tickers land. */}
          <div className="flex flex-col items-end md:hidden pr-6">
            <div className="font-mono font-semibold text-sm">
              <SkeletonText placeholder="00,000.00 USDT" />
            </div>
            <div className="text-xs font-semibold text-muted-foreground">
              <SkeletonText placeholder="+0.00%" />
            </div>
          </div>

          <div className="hidden md:flex items-center justify-end">
            <div className="text-right">
              <div className="font-mono font-semibold">
                <SkeletonText placeholder="00,000.00 USDT" />
              </div>
              <div className="text-xs text-subtle-foreground">
                <SkeletonText placeholder="0,000 - 0,000" />
              </div>
            </div>
          </div>

          {/* The change chip is chrome — its padding and 14px type set this
              cell's height either way. Only the percentage is unknown, and it
              waits at the neutral tint: painting `bg-up/10` on a market whose
              direction has not arrived would be a claim, not a placeholder. */}
          <div className="hidden md:flex items-center justify-end">
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg font-semibold text-sm text-muted-foreground bg-muted/50">
              <SkeletonText placeholder="+0.00%" />
            </div>
          </div>

          <div className="hidden md:flex items-center justify-end font-medium">
            <SkeletonText placeholder="00.00M USDT" />
          </div>

          <div className="hidden md:flex items-center justify-end font-medium">
            <SkeletonText placeholder="000.00M USDT" />
          </div>

          {/* The button's label is a literal and its box is what holds this
              cell open, so it renders for real and inert. */}
          <div className="hidden md:flex items-center justify-end">
            <button
              type="button"
              disabled
              className="relative px-4 py-2 bg-primary rounded-lg font-medium text-primary-foreground opacity-60 flex items-center gap-2"
            >
              <Zap className="w-4 h-4" />
              {t("trade")}
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </m.div>
      ))}
    </div>
  );
  /*
   * THE PAGE RENDERS ON THE SERVER NOW
   * ==================================
   * This used to be `if (!mounted) return <SiteHeader />`, commented "prevent
   * hydration mismatch". What it actually prevented was the PAGE: the server
   * emitted a bare 56px header and nothing else, so the hero, the search row,
   * the whole table and the bottom CTA all arrived at
   * hydration. Verified with `curl /en/market` before the change — the string
   * `min-h-screen bg-linear-to-b from-muted to-card pt-14` appeared ZERO times
   * in the server HTML; the words only existed inside the flight payload.
   *
   * The two things `mounted` was covering both turned out to be variants, not
   * content, and both keep their guard:
   *
   *   `isDark` — `useTheme().resolvedTheme` is `undefined` on the server, and
   *   `mounted && ...` already made the client's first render agree with it.
   *   It only ever picks between two background/border class pairs.
   *
   *   `effectiveSettings` — this is the one that was load-bearing, and it was
   *   NOT covered by `isDark`. `settings` comes from a persisted store, and
   *   `settings?.marketLinkRoute` decides the bottom CTA's `href` (`/binary`
   *   vs `/trade`). Rendering that from the persisted value on the first client
   *   render, against a server that only had `{}`, is a real attribute
   *   mismatch — so the read goes through `effectiveSettings`, which is `{}`
   *   until mount. Confirmed by seeding
   *   `localStorage["bicrypto-config-store"]` with `marketLinkRoute: "binary"`
   *   before load: zero hydration errors.
   *
   * `user` is safe unguarded, but no longer for the reason this comment used
   * to give. It used to say "`useUserStore` is a plain `create()` with no
   * `persist`, so it is `null` on the server and on the client's first render
   * alike" — true then, false now: boot-time auth resolution seeds the real
   * profile before the first render on BOTH sides (`store/auth-boot.ts` for the
   * server, `seedUserStoreFromServer` for the client). The two sides still
   * agree, which is all this gate ever needed; they now agree on the right
   * answer instead of on `null`.
   */

  return (
    <>
      <SiteHeader />
      {/* `<main>`, not a `<div>`. This page mounts `SiteHeader` and its content
          directly — there is no layout above it that draws a main landmark — so
          the document carried none at all. The classes are unchanged, so this is
          the same box it always was. */}
      <main className="min-h-screen bg-linear-to-b from-muted to-card pt-14 md:pt-18">
        <div className="container mx-auto px-4 py-8 md:py-12">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <m.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center mb-8 md:mb-12"
            >
              <m.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6 }}
                /* Was `from-primary to-primary` (a gradient from a colour to itself, i.e. a
   SOLID primary ground) carrying `text-primary` ink — an empty blue pill
   with invisible text in light mode. A tint is what this wanted. */
                className="inline-flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-full px-4 py-2 text-sm font-medium text-primary-ink mb-4 md:mb-6"
              >
                <BarChart3 className="w-4 h-4" />
                {t("cryptocurrency_markets")}
              </m.div>

              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 md:mb-6">
                {t("explore_all")}
                <span className="text-primary-ink">
                  {" "}
                  {t("crypto_markets")}
                </span>
              </h1>

              <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                {t("real_time_prices_24h_cryptocurrency_pairs")}
                {". "}
                {t("start_trading_with_deep_liquidity")}.
              </p>
            </m.div>

            {/* Search and Filters */}
            <m.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mb-6 md:mb-8"
            >
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                {/* Search Input */}
                <div className="relative flex-1 max-w-md">
                  <Input
                    placeholder={`${t("search_markets_e_g_btc_eth")}…`}
                    value={searchTerm}
                    icon="mdi:search"
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-card/80 dark:bg-muted/80 backdrop-blur-sm border-border-strong h-11"
                  />
                </div>

                {/* Filters and Sort Container */}
                <div className="flex gap-3 w-full sm:w-auto">
                  {/* Filter Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="h-11 bg-card/80 dark:bg-muted/80 border-border-strong min-w-[120px] justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <Filter className="w-4 h-4" />
                          <span>
                            {selectedFilter === "all" && t("all_markets")}
                            {selectedFilter === "spot" && t("spot")}
                            {selectedFilter === "eco" && t("ecosystem")}
                            {selectedFilter === "gainers" && t("gainers")}
                            {selectedFilter === "losers" && t("losers")}
                            {selectedFilter === "volume" && t("high_volume")}
                            {selectedFilter === "new" && t("trending")}
                          </span>
                        </div>
                        <ArrowDownRight className="w-4 h-4 ml-2" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48">
                      <DropdownMenuItem
                        onClick={() => setSelectedFilter("all")}
                        className={cn(
                          "cursor-pointer",
                          selectedFilter === "all" && "bg-primary/10"
                        )}
                      >
                        <Target className="w-4 h-4 mr-2" />
                        {t("all_markets")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setSelectedFilter("spot")}
                        className={cn(
                          "cursor-pointer",
                          selectedFilter === "spot" && "bg-primary/10"
                        )}
                      >
                        <BarChart3 className="w-4 h-4 mr-2" />
                        Spot
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setSelectedFilter("eco")}
                        className={cn(
                          "cursor-pointer",
                          selectedFilter === "eco" && "bg-success/10"
                        )}
                      >
                        <Zap className="w-4 h-4 mr-2 text-success-ink" />
                        Ecosystem
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setSelectedFilter("gainers")}
                        className={cn(
                          "cursor-pointer",
                          selectedFilter === "gainers" && "bg-up/10"
                        )}
                      >
                        <TrendingUp className="w-4 h-4 mr-2 text-up" />
                        Gainers
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setSelectedFilter("losers")}
                        className={cn(
                          "cursor-pointer",
                          selectedFilter === "losers" && "bg-down/10"
                        )}
                      >
                        <TrendingDown className="w-4 h-4 mr-2 text-down" />
                        Losers
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setSelectedFilter("volume")}
                        className={cn(
                          "cursor-pointer",
                          selectedFilter === "volume" && "bg-primary/10"
                        )}
                      >
                        <Volume2 className="w-4 h-4 mr-2 text-primary-ink" />
                        {t("high_volume")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setSelectedFilter("new")}
                        className={cn(
                          "cursor-pointer",
                          selectedFilter === "new" && "bg-warning/10"
                        )}
                      >
                        <Sparkles className="w-4 h-4 mr-2 text-warning-ink" />
                        Trending
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Sort Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="h-11 bg-card/80 dark:bg-muted/80 border-border-strong min-w-[140px] justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <ArrowUpDown className="w-4 h-4" />
                          <span>
                            {sortBy === "volume" && t("volume")}
                            {sortBy === "price" && t("price")}
                            {sortBy === "change" && `24h ${t('change')}`}
                            {sortBy === "marketCap" && t("market_cap")}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {sortOrder === "desc" ? "↓" : "↑"}
                        </div>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem
                        onClick={() => setSortBy("volume")}
                        className={cn(
                          "cursor-pointer",
                          sortBy === "volume" && "bg-primary/10"
                        )}
                      >
                        <Volume2 className="w-4 h-4 mr-2" />
                        {t("volume")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setSortBy("price")}
                        className={cn(
                          "cursor-pointer",
                          sortBy === "price" && "bg-primary/10"
                        )}
                      >
                        <DollarSign className="w-4 h-4 mr-2" />
                        {t("price")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setSortBy("change")}
                        className={cn(
                          "cursor-pointer",
                          sortBy === "change" && "bg-primary/10"
                        )}
                      >
                        <TrendingUp className="w-4 h-4 mr-2" />
                        {`24h ${t('change')}`}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setSortBy("marketCap")}
                        className={cn(
                          "cursor-pointer",
                          sortBy === "marketCap" && "bg-primary/10"
                        )}
                      >
                        <Target className="w-4 h-4 mr-2" />
                        {t("market_cap")}
                      </DropdownMenuItem>
                      <div className="border-t my-1" />
                      <DropdownMenuItem
                        onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
                        className="cursor-pointer"
                      >
                        <ArrowUpDown className="w-4 h-4 mr-2" />
                        {sortOrder === "desc" ? t("descending") : t("ascending")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </m.div>

            {/* Markets Table */}
            <m.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className={cn(
                "backdrop-blur-xl rounded-2xl border shadow-xl overflow-hidden",
                isDark
                  ? "bg-surface-2/50 border-border-strong/50"
                  : "bg-card/80 border-border"
              )}
            >
              {/* Table Header */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-2 md:gap-4 p-3 md:p-4 text-sm font-semibold text-muted-foreground border-b border-border/50 bg-muted/50">
                <div>{t("asset")}</div>
                <div className="text-right md:col-span-1">{t("price")}</div>
                <div className="hidden md:block text-right">
                  {`24h ${t('change')}`}
                </div>
                <div className="hidden md:block text-right">
                  {`24h ${t('volume')}`}
                </div>
                <div className="hidden md:block text-right">
                  {t("market_cap")}
                </div>
                <div className="hidden md:block text-right">{t("action")}</div>
              </div>

              {/* Table Body */}
              <div className="divide-y divide-border/50">
                {isLoading ? (
                  renderSkeletonRows()
                ) : processedMarkets.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 md:w-24 md:h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                      <Search className="w-6 h-6 md:w-8 md:h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg md:text-xl font-semibold text-foreground mb-2">
                      {t("no_markets_found")}
                    </h3>
                    <p className="text-sm md:text-base text-muted-foreground">
                      {t("try_adjusting_your_search_or_filter_criteria")}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {processedMarkets.map((market, index) => (
                      <m.div
                        key={market.symbol}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.02 }}
                        className={cn(
                          // Rows used to scale to 1.02 and lift 2px on hover.
                          // Scaling a row in a shared column grid re-rasterises
                          // its text and pushes its content out of line with
                          // every other row's columns, so the table appeared to
                          // wobble under the cursor. The background change is
                          // the affordance; the transform only added noise.
                          // `transition-colors` rather than `transition-all` now
                          // that there is no transform to carry.
                          "grid grid-cols-2 md:grid-cols-6 gap-2 md:gap-4 p-3 md:p-4 transition-colors duration-200 group relative",
                          "hover:bg-muted dark:hover:bg-muted/50",
                          "active:bg-muted dark:active:bg-muted/50",
                          isDark ? "hover:bg-muted/50" : "hover:bg-muted"
                        )}
                      >
                        <Link
                          href={buildMarketLink(effectiveSettings, market.currency, market.pair)}
                          className="absolute inset-0 z-10"
                          aria-label={t("trade_1", { currency: String(market.currency), pair: String(market.pair) })}
                        />

                        {/* Mobile hover/active indicator - right arrow */}
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 md:hidden opacity-0 group-hover:opacity-100 transition-opacity">
                          <ArrowRight className="w-4 h-4 text-primary" />
                        </div>

                        {/* Asset */}
                        <div className="flex items-center gap-2 md:gap-3">
                          <div
                            className={cn(
                              "w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center overflow-hidden border-2",
                              isDark 
                                ? "bg-muted border-border-strong" 
                                : "bg-card border-border"
                            )}
                          >
                            <Image
                              src={getCryptoImageUrl(market.currency || "generic")}
                              alt={market.currency || "generic"}
                              width={32}
                              height={32}
                              className="w-6 h-6 md:w-8 md:h-8 object-cover rounded-full"
                              onError={(e) => {
                                // Prevent infinite loops by checking if we already tried fallback
                                const target = e.currentTarget;
                                if (!target.dataset.fallbackAttempted) {
                                  target.dataset.fallbackAttempted = 'true';
                                  // Use a data URI as fallback to prevent further errors
                                  target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTYiIGZpbGw9IiNGM0Y0RjYiLz4KPHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4PSI2IiB5PSI2Ij4KPGNpcmNsZSBjeD0iMTAiIGN5PSIxMCIgcj0iOCIgc3Ryb2tlPSIjNjk3MDdCIiBzdHJva2Utd2lkdGg9IjEuNSIvPgo8cGF0aCBkPSJtMTIuNSA3LjUtNSA1IiBzdHJva2U9IiM2OTcwN0IiIHN0cm9rZS13aWR0aD0iMS41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPHBhdGggZD0ibTcuNSA3LjUgNSA1IiBzdHJva2U9IiM2OTcwN0IiIHN0cm9rZS13aWR0aD0iMS41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+Cjwvc3ZnPg==';
                                }
                              }}
                            />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-sm md:text-base group-hover:text-primary transition-colors">
                                {market.currency}
                              </span>
                              {market.isEco && (
                                <span className="text-[10px] leading-none font-semibold px-1.5 py-0.5 rounded bg-success/15 text-foreground">
                                  Eco
                                </span>
                              )}
                            </div>
                            <div
                              className={cn(
                                "text-xs",
                                isDark ? "text-muted-foreground" : "text-subtle-foreground"
                              )}
                            >
                              {market.displaySymbol}
                            </div>
                          </div>
                        </div>

                        {/* Price and Change (Mobile) */}
                        <div className="flex flex-col items-end md:hidden pr-6">
                          <div className="font-mono font-semibold text-sm">
                            {market.price
                              ? formatQuoted(market.price, market)
                              : "--"}
                          </div>
                          <div
                            className={cn(
                              "text-xs font-semibold",
                              market.change24h >= 0
                                ? "text-success"
                                : "text-destructive"
                            )}
                          >
                            {market.change24h >= 0 ? "+" : ""}
                            {typeof market.change24h === "number"
                              ? market.change24h.toFixed(2)
                              : market.change24h}
                            %
                          </div>
                        </div>

                        {/* Desktop columns */}
                        <div className="hidden md:flex items-center justify-end">
                          <div className="text-right">
                            <div className="font-mono font-semibold">
                              {market.price
                                ? formatQuoted(market.price, market)
                                : "--"}
                            </div>
                            {/* The range carries no unit of its own — it sits
                                directly under the price, which now names one,
                                and repeating it here would be the widest
                                string in a six-column grid. */}
                            {market.high24h > 0 && market.low24h > 0 && (
                              <div className="text-xs text-subtle-foreground">
                                {formatPrice(market.low24h)}
                                {" - "}
                                {formatPrice(market.high24h)}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="hidden md:flex items-center justify-end">
                          <div
                            className={cn(
                              "flex items-center gap-1 px-2 py-1 rounded-lg font-semibold text-sm",
                              market.change24h >= 0
                                ? "text-success-ink bg-success/10"
                                : "text-destructive-ink bg-destructive/10"
                            )}
                          >
                            {market.change24h >= 0 ? "+" : ""}
                            {typeof market.change24h === "number"
                              ? market.change24h.toFixed(2)
                              : market.change24h}
                            %
                            {market.change24h >= 0 ? (
                              <ArrowUpRight className="h-3 w-3" />
                            ) : (
                              <ArrowDownRight className="h-3 w-3" />
                            )}
                          </div>
                        </div>

                        <div className="hidden md:flex items-center justify-end font-medium">
                          {formatVolume(market.volume, quoteUnit(market))}
                        </div>

                        <div className="hidden md:flex items-center justify-end font-medium">
                          {market.marketCap
                            ? formatVolume(market.marketCap, quoteUnit(market))
                            : "--"}
                        </div>

                        {/* Action button for desktop */}
                        <div className="hidden md:flex items-center justify-end">
                          <button
                            onClick={() =>
                              (window.location.href = withCurrentLocale(buildMarketLink(effectiveSettings, market.currency, market.pair)))
                            }
                            className="group/btn relative px-4 py-2 bg-primary hover:bg-primary rounded-lg font-medium text-primary-foreground transition-all duration-300 shadow-md hover:shadow-lg flex items-center gap-2"
                          >
                            <Zap className="w-4 h-4" />
                            {t("trade")}
                            <ArrowUpRight className="w-3 h-3 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                          </button>
                        </div>
                      </m.div>
                    ))}
                  </div>
                )}
              </div>
            </m.div>

            {/* Bottom CTA */}
            <m.div
              initial={{
                opacity: 0,
                y: 20,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                duration: 0.6,
                delay: 0.6,
              }}
              className="text-center mt-12"
            >
              <div className="p-8 rounded-lg border border-border bg-card">
                <h3 className="text-2xl font-semibold tracking-tight text-foreground mb-4">
                  {user ? t("happy_trading") : t("ready_to_start_trading")}
                </h3>
                <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                  {user
                    ? t("youre_all_set_choose_any_cryptocurrency")
                    : t("join_our_platform_and_experience_secure")}
                </p>
                {user ? (
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link
                      href={getMarketLinkRoute(effectiveSettings)}
                      className="px-6 py-3 bg-primary hover:bg-primary rounded-lg font-medium text-primary-foreground transition-all duration-300 shadow-lg hover:shadow-xl"
                    >
                      {t("start_trading")}
                    </Link>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link
                      href="/register"
                      className="px-6 py-3 bg-primary hover:bg-primary rounded-lg font-medium text-primary-foreground transition-all duration-300 shadow-lg hover:shadow-xl"
                    >
                      {t("create_free_account")}
                    </Link>
                    <Link
                      href={getMarketLinkRoute(effectiveSettings)}
                      className={cn(
                        "px-6 py-3 rounded-lg font-medium transition-all duration-300 border",
                        isDark
                          ? "border-border-strong bg-muted/50 hover:bg-muted/50 text-overlay-foreground"
                          : "border-border bg-card hover:bg-muted text-foreground"
                      )}
                    >
                      {t("start_trading_demo")}
                    </Link>
                  </div>
                )}
              </div>
            </m.div>
          </div>
        </div>
      </main>
    </>
  );
}
