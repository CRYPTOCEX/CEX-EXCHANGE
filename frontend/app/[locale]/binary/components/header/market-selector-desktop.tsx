/**
 * MarketSelector (Desktop Header Tabs)
 *
 * This component handles:
 * - Active market tabs in the header (scrollable)
 * - A "+" button that opens the unified MarketSelectorModal
 */
"use client";

import { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";
import Image from "next/image";
import { ChevronDown, Plus, X } from "lucide-react";

import {
  useBinaryStore,
  type Symbol,
  type Order,
  extractBaseCurrency,
  extractQuoteCurrency,
} from "@/store/trade/use-binary-store";
import { tickersWs } from "@/services/tickers-ws";
import { getCryptoImageUrl, handleImageError } from "@/utils/image-fallback";
import type { TickerData } from "@/app/[locale]/trade/components/markets/types";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import MarketSelectorModal from "./market-selector";
import { ToneMark } from "../binary-ui";

// Maximum number of active market tabs allowed
const MAX_ACTIVE_MARKETS = 8;

/**
 * What the SERVER renders for the tab list, and therefore what the browser's
 * FIRST render must render too.
 *
 * `useBinaryStore` is `persist()`ed as `binary-trading-store` and its
 * `partialize` includes `activeMarkets` and `currentSymbol`, so a returning
 * trader's tabs are live in the very first client render while the server had
 * the store's initial `[]`. Module scope so the identity is stable.
 */
const SERVER_ACTIVE_MARKETS: never[] = [];

// Memoized small crypto icon for active markets tabs
const SmallCryptoIcon = memo(({ currency }: { currency: string }) => {
  const imageUrl = useMemo(() => getCryptoImageUrl(currency || "generic"), [currency]);

  return (
    <Image
      src={imageUrl}
      alt={currency || "generic"}
      width={20}
      height={20}
      className="object-cover"
      onError={(e) => {
        handleImageError(e, '/img/crypto/generic.webp');
      }}
      loading="lazy"
      unoptimized={false}
    />
  );
});

SmallCryptoIcon.displayName = 'SmallCryptoIcon';

// Memoized active market tab component
const ActiveMarketTab = memo(({
  market,
  currentSymbol,
  wsData,
  onSelect,
  onRemove,
  canRemove,
}: {
  market: { symbol: Symbol; price: number; change: number };
  currentSymbol: string;
  wsData: TickerData | undefined;
  onSelect: (symbol: string) => void;
  onRemove: (symbol: string) => void;
  canRemove: boolean;
}) => {
  const t = useTranslations("common");
  const [isHovered, setIsHovered] = useState(false);
  const symbol = market.symbol;
  const baseCurrency = extractBaseCurrency(symbol);
  const quoteCurrency = extractQuoteCurrency(symbol);
  const isPositive = (wsData?.change || 0) >= 0;

  // Use WebSocket data if available, otherwise fall back to market price from store
  const displayPrice = wsData?.last || market.price || 0;

  const formatPrice = (price: number) => {
    if (price === 0) return "Loading...";
    return price.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8,
    });
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove(symbol);
  };

  return (
    <div
      className={cn(
        "group relative flex items-center h-10 px-3 cursor-pointer transition-all border-r border-border",
        currentSymbol === symbol
          ? "bg-surface-3 text-foreground"
          : "text-muted-foreground hover:bg-surface-3 hover:text-foreground"
      )}
      onClick={() => onSelect(symbol)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center">
        <div className="w-5 h-5 rounded-full flex items-center justify-center mr-2 overflow-hidden">
          <SmallCryptoIcon currency={baseCurrency} />
        </div>
        <div>
          <div className="text-xs font-medium flex items-center">
            {baseCurrency}/{quoteCurrency}
            {/* Sign + disc-vs-diamond mark; the figure stays on the tab's own
                ink because `text-up` at 10px is 3.0:1 in light mode. */}
            <span className="ml-1.5 text-[10px] inline-flex items-center gap-1">
              <ToneMark tone={isPositive ? "up" : "down"} size={5} />
              {isPositive ? "+" : ""}
              {Math.abs(wsData?.change || 0).toFixed(2)}%
            </span>
          </div>
          <div className="text-[10px] text-muted-foreground">
            {formatPrice(displayPrice)}
          </div>
        </div>
      </div>
      {/* Remove button - only show on hover when more than 1 market */}
      {canRemove && isHovered && (
        <button
          type="button"
          onClick={handleRemove}
          aria-label={t("remove_1", { baseCurrency: String(baseCurrency), quoteCurrency: String(quoteCurrency) })}
          className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center transition-all z-10 cursor-pointer bg-surface-3 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
        >
          <X size={10} />
        </button>
      )}
    </div>
  );
});

ActiveMarketTab.displayName = 'ActiveMarketTab';

export interface MarketSelectorProps {
  onAddMarket?: (symbol: Symbol) => void;
  activeMarkets?: { symbol: Symbol; price: number; change: number }[];
  currentSymbol?: Symbol;
  onSelectSymbol?: (symbol: Symbol) => void;
  onRemoveMarket?: (symbol: Symbol) => void;
  orders?: Order[];
  currentPrice?: number;
  handleMarketSelect?: (marketSymbol: string) => void;
}

export default function MarketSelector({
  onAddMarket,
  activeMarkets: propActiveMarkets,
  currentSymbol: propCurrentSymbol,
  onSelectSymbol,
  onRemoveMarket,
  orders,
  currentPrice,
  handleMarketSelect,
}: MarketSelectorProps) {
  const t = useTranslations("common");

  const {
    activeMarkets: storeActiveMarkets,
    currentSymbol: storeCurrentSymbol,
    setCurrentSymbol,
    addMarket,
    removeMarket,
    binaryMarkets,
  } = useBinaryStore();

  const activeMarkets = propActiveMarkets || storeActiveMarkets;
  const currentSymbol = propCurrentSymbol || storeCurrentSymbol;

  const [tickerData, setTickerData] = useState<Record<string, TickerData>>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollButtons, setShowScrollButtons] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  /*
   * Everything the tab list is DERIVED from goes through this, never through
   * `activeMarkets` directly — see SERVER_ACTIVE_MARKETS and the note on the
   * removed `if (!mounted) return null` below. The effects keep reading the
   * real `activeMarkets`; only the render is pinned.
   */
  const effectiveActiveMarkets: typeof activeMarkets = mounted
    ? activeMarkets
    : SERVER_ACTIVE_MARKETS;

  // Initialize WebSocket connection
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

  // Check if container is scrollable
  useEffect(() => {
    const checkScrollable = () => {
      if (scrollContainerRef.current) {
        const { scrollWidth, clientWidth } = scrollContainerRef.current;
        setShowScrollButtons(scrollWidth > clientWidth);
      }
    };
    const timeoutId = setTimeout(checkScrollable, 0);
    window.addEventListener("resize", checkScrollable);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("resize", checkScrollable);
    };
  }, [activeMarkets]);

  const scroll = (direction: "left" | "right") => {
    const container = scrollContainerRef.current;
    if (container) {
      const scrollAmount = 120;
      const newScrollPosition =
        direction === "left"
          ? Math.max(0, scrollPosition - scrollAmount)
          : Math.min(
              container.scrollWidth - container.clientWidth,
              scrollPosition + scrollAmount
            );
      container.scrollTo({ left: newScrollPosition, behavior: "smooth" });
      setScrollPosition(newScrollPosition);
    }
  };

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      setScrollPosition(scrollContainerRef.current.scrollLeft);
    }
  };

  const handleAddMarket = useCallback(
    (marketSymbol: Symbol) => {
      if (onAddMarket) {
        onAddMarket(marketSymbol);
      } else {
        addMarket(marketSymbol);
      }
      setShowAddModal(false);
    },
    [onAddMarket, addMarket]
  );

  const handleSelectMarket = useCallback(
    (marketSymbol: Symbol) => {
      setTimeout(() => {
        if (handleMarketSelect) {
          handleMarketSelect(String(marketSymbol));
        } else if (onSelectSymbol) {
          onSelectSymbol(marketSymbol);
        } else {
          setCurrentSymbol(marketSymbol);
        }
        setShowAddModal(false);
      }, 0);
    },
    [handleMarketSelect, onSelectSymbol, setCurrentSymbol]
  );

  const handleRemoveMarket = useCallback(
    (marketSymbol: Symbol) => {
      if (onRemoveMarket) {
        onRemoveMarket(marketSymbol);
      } else {
        removeMarket(marketSymbol);
      }
    },
    [onRemoveMarket, removeMarket]
  );

  /*
   * THE TAB RAIL RENDERS ON THE SERVER NOW
   * ======================================
   * This was `if (!mounted) return null`, which took the whole market tab rail
   * out of the binary header's server HTML — the header's own first paint had a
   * hole in it, and the rail was then inserted at hydration. `/en/binary`'s two
   * largest CLS frames both named `div.flex.items-center.h-full`, which is this
   * component's root.
   *
   * The gate was NOT paranoia, so it has not simply been deleted. `activeMarkets`
   * and `currentSymbol` come from `binary-trading-store`, which is `persist()`ed
   * with both in its `partialize`; zustand's `persist` hydrates synchronously
   * from `localStorage` at module evaluation, so a returning trader really does
   * have three or four tabs in the FIRST client render while the server had
   * none. Rendering them unguarded would trade this shift for a genuine
   * mismatch — a different number of children under the same parent, which is
   * the one thing React cannot repair quietly.
   *
   * So `mounted` now gates the smallest thing that actually depends on the
   * browser: the tab LIST. The rail's chrome — both wrappers, at `h-full`, plus
   * the modal root — renders on the server and never moves. Post-mount the
   * persisted tabs fill it.
   *
   * The `+` button and the scroll arrows need no extra guard and get none:
   * `binaryMarkets` is deliberately absent from `partialize`, so it is `[]` on
   * the server and in the first client render alike (the button's condition is
   * `activeMarkets.length < binaryMarkets.length`), and `showScrollButtons`
   * starts `false` and is only ever set from a post-mount measurement effect.
   */

  return (
    <div className="flex items-center h-full">
      <div className="relative flex items-center h-full">
        {/* Left scroll button */}
        {showScrollButtons && scrollPosition > 0 && (
          <button
            type="button"
            aria-label={t("scroll_markets_left")}
            className="absolute left-0 z-10 h-10 w-6 flex items-center justify-center cursor-pointer bg-background/90 border-r border-border text-muted-foreground"
            onClick={() => scroll("left")}
          >
            <ChevronDown className="rotate-90" size={14} />
          </button>
        )}

        {effectiveActiveMarkets.length > 0 && (
          <div
            ref={scrollContainerRef}
            className="flex overflow-x-auto scrollbar-hide max-w-[500px] h-full"
            onScroll={handleScroll}
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            <style jsx>{"div::-webkit-scrollbar { display: none; }"}</style>

            {effectiveActiveMarkets.map((market) => {
              if (!market?.symbol) return null;

              const symbol = market.symbol;
              const baseCurrency = extractBaseCurrency(symbol);
              const quoteCurrency = extractQuoteCurrency(symbol);

              if (!baseCurrency || !quoteCurrency) return null;

              const formattedSymbol = `${baseCurrency}/${quoteCurrency}`;
              const wsData = tickerData[formattedSymbol];

              return (
                <ActiveMarketTab
                  key={symbol}
                  market={market}
                  currentSymbol={currentSymbol}
                  wsData={wsData}
                  onSelect={handleSelectMarket}
                  onRemove={handleRemoveMarket}
                  canRemove={effectiveActiveMarkets.length > 1}
                />
              );
            })}
          </div>
        )}

        {/* Right scroll button */}
        {showScrollButtons &&
          scrollContainerRef.current &&
          scrollPosition <
            scrollContainerRef.current.scrollWidth -
              scrollContainerRef.current.clientWidth -
              10 && (
            <button
              type="button"
              aria-label={t("scroll_markets_right")}
              className="absolute right-0 z-10 h-10 w-6 flex items-center justify-center cursor-pointer bg-background/90 border-l border-border text-muted-foreground"
              onClick={() => scroll("right")}
            >
              <ChevronDown className="-rotate-90" size={14} />
            </button>
          )}

        {/* Add Market Button - hide when all pairs added or max reached */}
        {effectiveActiveMarkets.length < MAX_ACTIVE_MARKETS && effectiveActiveMarkets.length < binaryMarkets.length && (
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            aria-label={t("select_market")}
            className="h-10 w-10 flex items-center justify-center transition-colors border-r border-border cursor-pointer text-muted-foreground hover:bg-surface-3 hover:text-foreground"
          >
            <Plus size={18} />
          </button>
        )}

        {/* Unified Market Selector Modal */}
        <MarketSelectorModal
          open={showAddModal}
          onClose={() => setShowAddModal(false)}
          handleMarketSelect={handleMarketSelect}
          onAddMarket={handleAddMarket}
        />
      </div>
    </div>
  );
}
