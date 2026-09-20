"use client";

import { DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useTheme } from "next-themes";
import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Star,
  Maximize2,
  Minimize2,
  LayoutGrid,
  Save,
  Moon,
  Sun,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { Link, useRouter } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { MetaChip, directionText } from "../ui/terminal";
import { useLayout } from "../layout/layout-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { Symbol } from "@/store/trade/use-binary-store";
import { wishlistService } from "@/services/wishlist-service";
import { marketDataWs, type TickerData } from "@/services/market-data-ws";
import { toNum } from "@/lib/precision-utils";
import { useTranslations } from "next-intl";
import { m, AnimatePresence, useSpring, useTransform } from "framer-motion";

// Animated number component for smooth price transitions
function AnimatedPrice({
  value,
  precision = 2,
  className
}: {
  value: number;
  precision?: number;
  className?: string;
}) {
  const spring = useSpring(value, { stiffness: 100, damping: 30 });
  const display = useTransform(spring, (current) =>
    current.toLocaleString(undefined, {
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
    })
  );

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  return <m.span className={className}>{display}</m.span>;
}

// Price change indicator with animation
function PriceChangeIndicator({
  change,
  isPositive
}: {
  change: string;
  isPositive: boolean;
}) {
  return (
    <m.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      // Direction owns this figure (R1) so it keeps the token rather than the
      // §4a icon-only workaround. The alpha tint that used to sit under it is
      // gone: it cost ~0.6 of an already tight light-mode ratio and the arrow
      // plus the sign already carry the direction peripherally.
      className={cn(
        "flex items-center gap-0.5 text-sm sm:text-xs font-medium px-1.5 py-0.5 rounded-md",
        directionText(isPositive)
      )}
    >
      <m.div
        animate={{ y: isPositive ? [-2, 0] : [2, 0] }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        {isPositive ? (
          <TrendingUp className="h-3 w-3" />
        ) : (
          <TrendingDown className="h-3 w-3" />
        )}
      </m.div>
      <span>{change}</span>
    </m.div>
  );
}

// Animated star button
function AnimatedStarButton({
  isFavorite,
  onClick
}: {
  isFavorite: boolean;
  onClick: () => void;
}) {
  return (
    <m.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 mr-1 shrink-0"
        onClick={onClick}
      >
        <m.div
          animate={isFavorite ? {
            scale: [1, 1.3, 1],
            rotate: [0, 15, -15, 0],
          } : {}}
          transition={{ duration: 0.4 }}
        >
          <Star
            className={cn(
              "h-4 w-4 transition-colors duration-300",
              isFavorite && "text-warning fill-warning"
            )}
          />
        </m.div>
      </Button>
    </m.div>
  );
}

export default function TradingHeader({
  currentSymbol,
  onSymbolChange,
  marketType = "spot",
}: {
  currentSymbol?: Symbol;
  onSymbolChange?: (symbol: Symbol) => void;
  marketType?: "spot" | "futures" | "eco";
}) {
  const t = useTranslations("trade_components");
  const tCommon = useTranslations("common");
  const tTrade = useTranslations("trade");
  const router = useRouter();
  const [price, setPrice] = useState<number>(0);
  const [priceChange, setPriceChange] = useState("0.00%");
  const [isPositive, setIsPositive] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [precision, setPrecision] = useState(2);
  const [volume, setVolume] = useState("--");
  const [priceFlash, setPriceFlash] = useState<"up" | "down" | null>(null);

  const [isFavorite, setIsFavorite] = useState(false);
  const [displaySymbol, setDisplaySymbol] = useState("");
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const prevPriceRef = useRef<number>(0);

  const { theme, setTheme } = useTheme();

  // Add safe destructuring with default values
  const {
    layoutConfig = {
      leftPanel: 20,
      centerPanel: 60,
      rightPanel: 20,
      topPanel: 0,
      bottomPanel: 20,
      chartPanel: 70,
      dataPanel: 30,
      panels: {},
      panelGroups: {},
    },
    currentPreset = "",
    layoutPresets = {},
    applyPreset = () => {},
    addLayoutPreset = () => {},
  } = useLayout() || {};

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");

  // Format display symbol
  const getDisplaySymbol = (symbol: Symbol) => {
    if (symbol.includes("/")) return symbol;
    if (symbol.includes("-")) return symbol.replace("-", "/");
    if (symbol.includes("_")) return symbol.replace("_", "/");

    const midPoint = Math.floor(symbol.length / 2);
    for (let i = Math.max(2, midPoint - 2); i <= Math.min(symbol.length - 2, midPoint + 2); i++) {
      const base = symbol.substring(0, i);
      const quote = symbol.substring(i);
      if (quote.length >= 3 && quote.length <= 4) {
        return `${base}/${quote}`;
      }
    }
    const currency = symbol.substring(0, midPoint);
    const pair = symbol.substring(midPoint);
    return `${currency}/${pair}`;
  };

  // Format volume for display
  const formatVolume = (volume: number | string): string => {
    const numVolume = typeof volume === "string" ? Number.parseFloat(volume) : volume;
    if (isNaN(numVolume)) return "--";
    if (numVolume >= 1_000_000_000) return `${(numVolume / 1_000_000_000).toFixed(1)}B`;
    if (numVolume >= 1_000_000) return `${(numVolume / 1_000_000).toFixed(1)}M`;
    if (numVolume >= 1_000) return `${(numVolume / 1_000).toFixed(1)}K`;
    return `${numVolume.toFixed(0)}`;
  };

  // Update display symbol when current symbol changes
  useEffect(() => {
    if (currentSymbol) {
      setDisplaySymbol(getDisplaySymbol(currentSymbol));
    } else {
      setDisplaySymbol("BTC/USDT");
    }
  }, [currentSymbol]);

  // Handle ticker data updates
  const handleTickerUpdate = useCallback(
    (data: TickerData) => {
      if (!currentSymbol || !data) return;

      // Numeric ticker fields may arrive as strings; coerce before any math/format.
      if (data.last !== undefined) {
        const last = toNum(data.last);
        // Flash effect on price change
        if (prevPriceRef.current !== 0 && prevPriceRef.current !== last) {
          setPriceFlash(last > prevPriceRef.current ? "up" : "down");
          setTimeout(() => setPriceFlash(null), 500);
        }
        prevPriceRef.current = last;
        setPrice(last);
      }

      if (data.percentage !== undefined) {
        const percentage = toNum(data.percentage);
        const changePercent = `${percentage >= 0 ? "+" : ""}${percentage.toFixed(2)}%`;
        setPriceChange(changePercent);
        setIsPositive(percentage >= 0);
      } else if (data.change !== undefined && data.last !== undefined) {
        const change = toNum(data.change);
        const last = toNum(data.last);
        const percentage = (change / (last - change)) * 100;
        const changePercent = `${percentage >= 0 ? "+" : ""}${percentage.toFixed(2)}%`;
        setPriceChange(changePercent);
        setIsPositive(percentage >= 0);
      }

      if (data.quoteVolume !== undefined) {
        setVolume(formatVolume(data.quoteVolume));
      } else if (data.baseVolume !== undefined) {
        setVolume(formatVolume(data.baseVolume));
      }
    },
    [currentSymbol, precision]
  );

  // Subscribe to market data
  useEffect(() => {
    if (!mounted || !currentSymbol) return;

    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    setPrice(0);
    setPriceChange("+0.00%");
    setVolume("--");
    prevPriceRef.current = 0;

    const unsubscribe = marketDataWs.subscribe<TickerData>(
      {
        symbol: currentSymbol,
        type: "ticker",
        marketType: marketType,
      },
      handleTickerUpdate
    );

    unsubscribeRef.current = unsubscribe;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [currentSymbol, marketType, mounted]);

  // Check wishlist
  useEffect(() => {
    if (!currentSymbol) return;
    const unsubscribe = wishlistService.subscribe((wishlist) => {
      setIsFavorite(wishlist.some((item) => item.symbol === currentSymbol));
    });
    return () => unsubscribe();
  }, [currentSymbol]);

  // Mount effect
  useEffect(() => {
    setMounted(true);
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, []);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(console.error);
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handlePresetSelect = (preset: string) => {
    applyPreset(preset);
  };

  const handleSaveLayout = () => {
    if (newPresetName.trim() === "") return;
    addLayoutPreset(newPresetName, layoutConfig);
    setSaveDialogOpen(false);
    setNewPresetName("");
  };

  const toggleFavorite = () => {
    if (currentSymbol) {
      wishlistService.toggleWishlist(currentSymbol);
    }
  };

  const handleBackToHome = () => {
    router.push("/");
  };

  /*
   * THE HEADER BAR RENDERS ON THE SERVER NOW
   * ========================================
   * This was `if (!mounted) return null`, so the trading terminal's top bar —
   * back button, symbol, price block, 24h volume, layout preset menu, theme and
   * fullscreen buttons, and the `border-b` the whole workspace hangs off — was
   * absent from the server HTML and inserted at hydration. Everything below it
   * therefore started ~36px too high and dropped once it appeared; `/en/trade`
   * was the worst route in this set at CLS 0.0117, with "Orders", "Open",
   * "History", "Buy BTC" and the order-form labels all moving together.
   *
   * ONE thing here genuinely could not survive being rendered unguarded, and it
   * is not what the gate looked like it was protecting:
   *
   *   `theme` (next-themes). `ThemeProvider` seeds its state with
   *   `useState(() => getTheme(storageKey, defaultTheme))`, and `getTheme`
   *   reads `localStorage` — on the server it returns `undefined`, in the
   *   browser's FIRST render it returns the persisted choice. So a dark-mode
   *   user's very first client render wanted `<Sun/>` where the server wrote
   *   `<Moon/>`, and `key={theme}` differed with it. That is a real mismatch,
   *   which is why this could not simply be deleted.
   *
   * `effectiveTheme` fixes it the way `components/partials/footer/index.tsx`
   * does: `mounted` no longer decides WHETHER to render, only WHICH ICON. Both
   * sides compute `undefined` before mount — the server's value — so the markup
   * agrees; after mount the real theme takes over. Both glyphs are `h-3.5 w-3.5`
   * inside a fixed `h-7 w-7` button, so nothing moves when it settles.
   *
   * Everything else was already safe and is left unguarded:
   *   - `currentPreset` / `layoutPresets` come from `layout-context.tsx`, which
   *     seeds `useState("Trading Pro")` / `defaultPresets` and only reads
   *     `localStorage` in a mount EFFECT — so the first client render matches
   *     the server by construction.
   *   - `displaySymbol`, `price`, `volume`, `isFavorite`, `isFullscreen` are
   *     all plain state with literal initial values, set from effects.
   *   - `document.fullscreenElement` is read in a click handler, never a render.
   */
  const effectiveTheme = mounted ? theme : undefined;

  const presetKeys = layoutPresets ? Object.keys(layoutPresets) : [];

  return (
    <m.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex items-center justify-between px-2 py-1 border-b border-border bg-card"
    >
      {/* Left section */}
      <div className="flex items-center space-x-1 md:space-x-2 flex-1 min-w-0">
        <m.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={handleBackToHome}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </m.div>

        <div className="flex items-center min-w-0">
          <AnimatedStarButton isFavorite={isFavorite} onClick={toggleFavorite} />

          <m.div
            className="font-semibold text-sm mr-2 truncate"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            key={displaySymbol}
          >
            {displaySymbol}
          </m.div>

          {/* Market type is categorical, and the chip says which one it is.
              It used to be amber vs blue — two more hues in the terminal for a
              distinction the label already makes. */}
          <m.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="shrink-0 hidden sm:block"
          >
            <MetaChip className="text-xs py-0.5">
              {marketType === "futures" ? tCommon("futures") : tCommon("spot")}
            </MetaChip>
          </m.div>
        </div>
      </div>

      {/* Middle section - Price */}
      <div className="flex items-center space-x-2 md:space-x-3 shrink-0">
        {/* The flash used to be a Motion `backgroundColor` animation between two
            hardcoded rgba emerald/red values. A token cannot be interpolated by
            Motion (a `var()` is opaque to it, and v4 alpha utilities compile to
            oklab `color-mix`, which Motion refuses outright), so the flash is a
            CSS colour transition on a class. */}
        <div
          className={cn(
            "flex flex-col items-end sm:items-center px-2 py-1 rounded-md transition-colors duration-300",
            priceFlash === "up" && "bg-up/10",
            priceFlash === "down" && "bg-down/10"
          )}
        >
          <m.div
            className={cn(
              "font-bold text-base sm:text-sm transition-colors duration-300",
              priceFlash === "up" && "text-up",
              priceFlash === "down" && "text-down",
              !priceFlash && "text-foreground"
            )}
          >
            {price > 0 ? (
              <AnimatedPrice value={price} precision={precision} />
            ) : (
              <m.span
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                {tCommon('loading')}
              </m.span>
            )}
          </m.div>

          <AnimatePresence mode="wait">
            <PriceChangeIndicator
              key={priceChange}
              change={priceChange}
              isPositive={isPositive}
            />
          </AnimatePresence>
        </div>

        {/* Desktop volume */}
        <m.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="hidden lg:flex items-center text-xs text-muted-foreground"
        >
          <div>
            <div className="text-muted-foreground">{`24h ${tCommon('vol')}`}</div>
            <m.div
              className="font-medium text-foreground"
              key={volume}
              initial={{ opacity: 0.5 }}
              animate={{ opacity: 1 }}
            >
              {volume}
            </m.div>
          </div>
        </m.div>

        {/* Mobile volume */}
        <div className="flex lg:hidden flex-col items-end text-xs text-muted-foreground">
          <div className="text-[10px] opacity-75">{`24h ${tCommon('vol')}`}</div>
          <div className="font-medium text-xs">{volume}</div>
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center space-x-1 md:space-x-2 shrink-0 pl-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <m.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs hidden md:flex"
              >
                <LayoutGrid className="h-3.5 w-3.5 mr-1" />
                <span className="hidden lg:inline">
                  {currentPreset || tCommon("default")}
                </span>
                <span className="lg:hidden">{tCommon("trading_pro")}</span>
              </Button>
            </m.div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" asChild>
            <m.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
            >
              {presetKeys.map((preset, index) => (
                <m.div
                  key={preset}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <DropdownMenuItem
                    onClick={() => handlePresetSelect(preset)}
                    className={cn(
                      "text-xs cursor-pointer",
                      currentPreset === preset && "bg-accent text-accent-foreground"
                    )}
                  >
                    {preset}
                  </DropdownMenuItem>
                </m.div>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setSaveDialogOpen(true)}
                className="text-xs cursor-pointer"
              >
                <Save className="h-3.5 w-3.5 mr-1" />
                {tTrade("save_current_layout")}
              </DropdownMenuItem>
            </m.div>
          </DropdownMenuContent>
        </DropdownMenu>

        <m.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={tCommon("toggle_theme")}
          >
            <AnimatePresence mode="wait">
              <m.div
                key={effectiveTheme}
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {effectiveTheme === "dark" ? (
                  <Sun className="h-3.5 w-3.5" />
                ) : (
                  <Moon className="h-3.5 w-3.5" />
                )}
              </m.div>
            </AnimatePresence>
          </Button>
        </m.div>

        <m.div
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="hidden sm:flex"
        >
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={toggleFullscreen}
          >
            <AnimatePresence mode="wait">
              <m.div
                key={isFullscreen ? "minimize" : "maximize"}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {isFullscreen ? (
                  <Minimize2 className="h-3.5 w-3.5" />
                ) : (
                  <Maximize2 className="h-3.5 w-3.5" />
                )}
              </m.div>
            </AnimatePresence>
          </Button>
        </m.div>
      </div>

      {/* Save Layout Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t("save_layout_preset")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="name" className="text-right">
                {tCommon("name")}
              </label>
              <Input
                id="name"
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                className="col-span-3"
                placeholder={t("my_custom_layout")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handleSaveLayout}>
              {tCommon("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </m.div>
  );
}
