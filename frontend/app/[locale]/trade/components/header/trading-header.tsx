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
} from "lucide-react";
import { Link, useRouter } from "@/i18n/routing";
import { cn } from "@/lib/utils";
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
import { useTranslations } from "next-intl";

export default function TradingHeader({
  currentSymbol,
  onSymbolChange,
  marketType = "spot",
}: {
  currentSymbol?: Symbol;
  onSymbolChange?: (symbol: Symbol) => void;
  marketType?: "spot" | "futures" | "eco";
}) {
  const t = useTranslations("trade/components/header/trading-header");
  const router = useRouter();
  const [price, setPrice] = useState("Loading...");
  const [priceChange, setPriceChange] = useState("0.00%");
  const [isPositive, setIsPositive] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [precision, setPrecision] = useState(2);
  const [volume, setVolume] = useState("--");

  const [isFavorite, setIsFavorite] = useState(false);
  const [displaySymbol, setDisplaySymbol] = useState("");
  const unsubscribeRef = useRef<(() => void) | null>(null);

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



  // Format price with appropriate precision
  const formatPrice = (price: number, precision = 2): string => {
    if (typeof price !== "number") return "Loading...";

    return price.toLocaleString(undefined, {
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
    });
  };

  // Format display symbol
  const getDisplaySymbol = (symbol: Symbol) => {
    // Handle delimiter-based formats first: BTC/USDT, BTC-USDT, BTC_USDT
    if (symbol.includes("/")) {
      return symbol; // Already in display format
    }
    if (symbol.includes("-")) {
      return symbol.replace("-", "/");
    }
    if (symbol.includes("_")) {
      return symbol.replace("_", "/");
    }

    // For symbols without delimiters (like BTCUSDT), split intelligently
    const midPoint = Math.floor(symbol.length / 2);
    
    // Try different split points around the middle to find a reasonable split
    for (let i = Math.max(2, midPoint - 2); i <= Math.min(symbol.length - 2, midPoint + 2); i++) {
      const base = symbol.substring(0, i);
      const quote = symbol.substring(i);
      
      // Prefer splits where quote is 3-4 characters (common for crypto quotes)
      if (quote.length >= 3 && quote.length <= 4) {
        return `${base}/${quote}`;
      }
    }

    // Fallback: split at midpoint
    const currency = symbol.substring(0, midPoint);
    const pair = symbol.substring(midPoint);
    return `${currency}/${pair}`;
  };

  // Format volume for display (K, M, B)
  const formatVolume = (volume: number | string): string => {
    // Convert string to number if needed
    const numVolume =
      typeof volume === "string" ? Number.parseFloat(volume) : volume;

    if (isNaN(numVolume)) return "--";

    if (numVolume >= 1_000_000_000) {
      return `${(numVolume / 1_000_000_000).toFixed(1)}B`;
    } else if (numVolume >= 1_000_000) {
      return `${(numVolume / 1_000_000).toFixed(1)}M`;
    } else if (numVolume >= 1_000) {
      return `${(numVolume / 1_000).toFixed(1)}K`;
    }
    return `${numVolume.toFixed(0)}`;
  };

  // Update display symbol when current symbol changes
  useEffect(() => {
    if (currentSymbol) {
      setDisplaySymbol(getDisplaySymbol(currentSymbol));
    } else {
      setDisplaySymbol("BTC/USDT"); // Default display if no symbol is provided
    }
  }, [currentSymbol]);

  // Handle ticker data updates from the market data WebSocket service
  const handleTickerUpdate = useCallback(
    (data: TickerData) => {
      if (!currentSymbol || !data) return;
      
      // Get price and apply precision
      if (data.last !== undefined) {
        const formattedPrice = formatPrice(data.last, precision);
        setPrice(formattedPrice);
      }

      // Handle price change percentage - use percentage field if available, otherwise calculate
      if (data.percentage !== undefined) {
        const changePercent = `${data.percentage >= 0 ? "+" : ""}${data.percentage.toFixed(2)}%`;
        setPriceChange(changePercent);
        setIsPositive(data.percentage >= 0);
      } else if (data.change !== undefined && data.last !== undefined) {
        // Calculate percentage from absolute change and current price
        const percentage = (data.change / (data.last - data.change)) * 100;
        const changePercent = `${percentage >= 0 ? "+" : ""}${percentage.toFixed(2)}%`;
        setPriceChange(changePercent);
        setIsPositive(percentage >= 0);
      }

      // Handle volume (use quoteVolume if available)
      if (data.quoteVolume !== undefined) {
        const formattedVolume = data.quoteVolume > 1000000 
          ? `${(data.quoteVolume / 1000000).toFixed(1)}M`
          : data.quoteVolume > 1000 
          ? `${(data.quoteVolume / 1000).toFixed(1)}K`
          : data.quoteVolume.toFixed(0);
        setVolume(formattedVolume);
      }

      // Note: 'high' property doesn't exist in TickerData type
      // Would need to be added to the type definition if needed
    },
    [currentSymbol, precision]
  );

  // Subscribe to market data based on market type
  useEffect(() => {
    if (!mounted || !currentSymbol) return;

    // Clean up previous subscription
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    // Reset price display while loading new data
    setPrice("Loading...");
    setPriceChange("0.00%");
    setVolume("--");

    // Subscribe to ticker data using marketType directly
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

  // Check if the current symbol is in the wishlist
  useEffect(() => {
    if (!currentSymbol) return;

    const unsubscribe = wishlistService.subscribe((wishlist) => {
      setIsFavorite(wishlist.some((item) => item.symbol === currentSymbol));
    });

    return () => unsubscribe();
  }, [currentSymbol]);

  // Set mounted state
  useEffect(() => {
    setMounted(true);
    return () => {
      // Cleanup
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, []);

  // Handle fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  // Handle layout preset selection
  const handlePresetSelect = (preset: string) => {
    console.log(`Selected preset: ${preset}`);
    applyPreset(preset);
  };

  // Handle save layout
  const handleSaveLayout = () => {
    if (newPresetName.trim() === "") return;

    addLayoutPreset(newPresetName, layoutConfig);
    setSaveDialogOpen(false);
    setNewPresetName("");
  };

  // Toggle favorite status
  const toggleFavorite = () => {
    if (currentSymbol) {
      wishlistService.toggleWishlist(currentSymbol);
    }
  };

  // Handle back to home navigation
  const handleBackToHome = () => {
    router.push("/");
  };

  if (!mounted) return null;

  // Ensure layoutPresets is an object before using Object.keys
  const presetKeys = layoutPresets ? Object.keys(layoutPresets) : [];

  return (
    <div className="flex items-center justify-between px-2 py-1 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
      {/* Left section - Back button and Symbol with Star */}
      <div className="flex items-center space-x-1 md:space-x-2 flex-1 min-w-0">
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-7 w-7 shrink-0" 
          onClick={handleBackToHome}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="flex items-center min-w-0">
          {/* Star icon before symbol */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 mr-1 shrink-0"
            onClick={toggleFavorite}
          >
            <Star
              className={cn(
                "h-4 w-4",
                isFavorite && "text-yellow-400 fill-yellow-400"
              )}
            />
          </Button>

          <div className="font-semibold text-sm mr-2 truncate">
            {displaySymbol}
          </div>
          <div className="bg-zinc-100 dark:bg-zinc-800 text-xs px-1.5 py-0.5 rounded shrink-0 hidden sm:block">
            {marketType === "futures" ? "Futures" : "Spot"}
          </div>
        </div>
      </div>

      {/* Middle section - Price information - Enhanced for mobile */}
      <div className="flex items-center space-x-2 md:space-x-3 shrink-0">
        {/* Mobile-first ticker display */}
        <div className="flex flex-col items-end sm:items-center">
          <div className="font-bold text-base sm:text-sm text-zinc-900 dark:text-white">
            {price}
          </div>
          <div
            className={cn(
              "text-sm sm:text-xs font-medium",
              isPositive ? "text-green-500" : "text-red-500"
            )}
          >
            {priceChange}
          </div>
        </div>

        {/* Desktop additional info */}
        <div className="hidden lg:flex items-center text-xs text-zinc-500">
          <div>
            <div>{t("24h_vol")}</div>
            <div className="font-medium">{volume}</div>
          </div>
        </div>

        {/* Mobile compact volume display */}
        <div className="flex lg:hidden flex-col items-end text-xs text-zinc-500 dark:text-zinc-400">
          <div className="text-[10px] opacity-75">{t("24h_vol")}</div>
          <div className="font-medium text-xs">{volume}</div>
        </div>
      </div>

      {/* Right section - Layout controls, theme toggle, fullscreen */}
      <div className="flex items-center space-x-1 md:space-x-2 shrink-0 pl-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs hidden md:flex"
            >
              <LayoutGrid className="h-3.5 w-3.5 mr-1" />
              <span className="hidden lg:inline">
                {currentPreset || "Default"}
              </span>
              <span className="lg:hidden">{t("trading_pro")}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {presetKeys.map((preset) => (
              <DropdownMenuItem
                key={preset}
                onClick={() => handlePresetSelect(preset)}
                className={cn(
                  "text-xs cursor-pointer",
                  currentPreset === preset && "bg-zinc-100 dark:bg-zinc-800"
                )}
              >
                {preset}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setSaveDialogOpen(true)}
              className="text-xs cursor-pointer"
            >
              <Save className="h-3.5 w-3.5 mr-1" />
              {t("save_current_layout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? (
            <Sun className="h-3.5 w-3.5" />
          ) : (
            <Moon className="h-3.5 w-3.5" />
          )}
        </Button>

        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7 hidden sm:flex"
          onClick={toggleFullscreen}
        >
          {isFullscreen ? (
            <Minimize2 className="h-3.5 w-3.5" />
          ) : (
            <Maximize2 className="h-3.5 w-3.5" />
          )}
        </Button>
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
                {t("Name")}
              </label>
              <Input
                id="name"
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                className="col-span-3"
                placeholder="My Custom Layout"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handleSaveLayout}>
              {t("Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
