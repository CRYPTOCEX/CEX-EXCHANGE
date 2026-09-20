"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Flame, Star, TrendingDown, TrendingUp, Zap } from "lucide-react";
import { m } from "framer-motion";
import { useTranslations } from "next-intl";
import type { Market } from "./types";

/**
 * The cells a market row is built from.
 *
 * Every one of these was previously written twice inside `market-item.tsx` —
 * once for the 3-row futures layout and once for the 2-row spot layout — so a
 * change to the price cell had to be made in two places and the badge cluster
 * existed as two 37-line copies that had already drifted apart. The two layouts
 * are genuinely different (futures stacks, spot splits left/right); the cells
 * they stack are not.
 */

/**
 * One market attribute chip.
 *
 * These used to carry five different hues — emerald "Trending", red "Hot", blue
 * "ECO", blue/emerald "FUT"/"SPOT", purple leverage. That is colour used as a
 * category label, and it put five families into a panel whose whole job is to
 * make `up` and `down` catchable peripherally (R1). Every chip already ships an
 * icon or a word, so the hue was separating nothing. One neutral chip.
 */
export function MarketChip({
  children,
  icon,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <m.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex shrink-0 items-center gap-0.5 rounded border border-border bg-surface-3 px-1 py-0.5 text-[8px] text-muted-foreground"
    >
      {icon}
      {children}
    </m.div>
  );
}

export function MarketBadges({ market }: { market: Market }) {
  const t = useTranslations("common");

  return (
    <>
      {market.isTrending && (
        <MarketChip icon={<Zap className="h-2 w-2" />}>
          {t("trending")}
        </MarketChip>
      )}
      {market.isHot && !market.isTrending && (
        <MarketChip icon={<Flame className="h-2 w-2" />}>{t("hot")}</MarketChip>
      )}
      {market.isEco && <MarketChip>{t("eco")}</MarketChip>}
      {market.type && (
        <MarketChip>{market.type === "futures" ? t("fut") : t("spot")}</MarketChip>
      )}
      {/* Ternary, not `&&`: `leverage` is a number, and `0 && <x/>` renders a
          bare "0" into the badge row rather than nothing. */}
      {market.leverage && market.leverage > 1 ? (
        <MarketChip>{market.leverage}x</MarketChip>
      ) : null}
    </>
  );
}

/**
 * Favourite toggle.
 *
 * The star was gold. A favourite is not a warning, and `--warning` is a status
 * token (R2) — borrowing it for decoration is how two unrelated meanings end up
 * sharing one paint. Favouriting is an interaction, so it takes the accent; the
 * fill state and the star glyph carry the rest.
 */
export function WatchlistStar({
  isInWatchlist,
  onClick,
}: {
  isInWatchlist: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  const t = useTranslations("common");
  return (
    <m.button
      onClick={onClick}
      className="mr-2 shrink-0 focus:outline-none"
      whileHover={{ scale: 1.2 }}
      whileTap={{ scale: 0.8 }}
      aria-label={isInWatchlist ? t("remove_from_watchlist") : t("add_to_watchlist")}
    >
      <m.div
        animate={
          isInWatchlist
            ? {
                scale: [1, 1.3, 1],
                rotate: [0, 10, -10, 0],
              }
            : {}
        }
        transition={{ duration: 0.3 }}
      >
        <Star
          className={cn(
            "h-3 w-3 transition-colors duration-200",
            isInWatchlist
              ? "text-primary fill-primary"
              : "text-muted-foreground/40 hover:text-primary/70"
          )}
        />
      </m.div>
    </m.button>
  );
}

export function SymbolLabel({
  symbol,
  isSelected,
}: {
  symbol: string;
  isSelected: boolean;
}) {
  return (
    <div
      className={cn(
        "truncate text-xs text-foreground transition-colors duration-200",
        isSelected ? "font-semibold" : "font-medium"
      )}
    >
      {symbol}
    </div>
  );
}

export function VolumeLabel({ volume }: { volume: string | null }) {
  const t = useTranslations("common");

  return (
    <m.div
      className="truncate text-[10px] text-muted-foreground"
      animate={{ opacity: volume ? 1 : 0.5 }}
    >
      {t("vol")} {volume || "--"}
    </m.div>
  );
}

/**
 * Last price, with a directional flash on change.
 *
 * Two things changed here beyond the palette.
 *
 * The flash is now a **ground tint with foreground ink**, not coloured ink on a
 * coloured ground. `text-up` on `bg-up/15` measures 2.66:1 in light mode at
 * 12px; `text-foreground` on the same tint measures 14.7:1, and the tint is
 * still unmistakably green or red. This is the §4a "heading on a tint of its
 * own hue" case — the hue goes on the ground, the ink stays readable.
 *
 * It is also a CSS transition rather than a Motion `backgroundColor` animation.
 * Motion cannot animate *from* a Tailwind v4 alpha utility (they compile to
 * `color-mix(in oklab, …)`), which is why the previous version fell back to two
 * hardcoded translucent emerald and red values passed straight to Motion — raw
 * colour in a JS value, which no class scanner can see.
 */
export function PriceCell({
  price,
  hasData,
}: {
  price: string | null;
  hasData: boolean;
}) {
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const prevPriceRef = useRef<string | null>(price);

  useEffect(() => {
    // The ref is advanced BEFORE the early returns. Previously it was only
    // written on the no-flash path, so after any flash it held a two-ticks-old
    // price and the next direction was computed against the wrong baseline.
    const prev = prevPriceRef.current;
    prevPriceRef.current = price;

    if (!prev || !price || prev === price) return;

    const prevNum = Number.parseFloat(prev.replace(/,/g, ""));
    const currNum = Number.parseFloat(price.replace(/,/g, ""));
    if (Number.isNaN(prevNum) || Number.isNaN(currNum) || prevNum === currNum) {
      return;
    }

    setFlash(currNum > prevNum ? "up" : "down");
    const timer = setTimeout(() => setFlash(null), 500);
    return () => clearTimeout(timer);
  }, [price]);

  if (!hasData || !price) {
    return (
      <m.div
        className="font-medium text-xs text-muted-foreground"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        --
      </m.div>
    );
  }

  return (
    <div
      className={cn(
        "-mx-[3px] -my-px rounded-md px-[3px] py-px font-medium text-xs text-foreground transition-colors duration-300",
        flash === "up" && "bg-up/15",
        flash === "down" && "bg-down/15"
      )}
    >
      {price}
    </div>
  );
}

/**
 * 24h change. Stays coloured on the plain row ground — this is the terminal's
 * core peripheral reading (R1) and the one place the saturated tokens belong.
 */
export function ChangeCell({
  change,
  isPositive,
}: {
  change: string | null;
  isPositive: boolean;
}) {
  if (!change) {
    return <div className="text-[10px] text-muted-foreground">--</div>;
  }

  return (
    <m.div
      initial={{ opacity: 0, x: -5 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "flex items-center text-[10px] font-medium",
        isPositive ? "text-up" : "text-down"
      )}
    >
      <m.div
        animate={{ y: isPositive ? [-1, 0] : [1, 0] }}
        transition={{ duration: 0.2 }}
      >
        {isPositive ? (
          <TrendingUp className="mr-0.5 h-2.5 w-2.5" />
        ) : (
          <TrendingDown className="mr-0.5 h-2.5 w-2.5" />
        )}
      </m.div>
      {change}
    </m.div>
  );
}

/**
 * Funding rate. Directional, so `up`/`down` rather than status.
 *
 * The tint behind it is gone: this is 10px text, and a small label on a matching
 * tint is the exact light-mode failure the design system calls out. On the plain
 * row ground the same two tokens read as well as they do anywhere else in the
 * panel, and the panel loses one more competing surface.
 */
export function FundingRateCell({ fundingRate }: { fundingRate?: string }) {
  const tTradeComponents = useTranslations("trade_components");

  if (!fundingRate) return null;

  const isPositive = Number(fundingRate.replace("%", "")) >= 0;

  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        "shrink-0 text-[10px] font-medium",
        isPositive ? "text-up" : "text-down"
      )}
      // Funding settles: the 60s `settleFuturesFunding` job debits payers and
      // credits receivers at each window, so the figure IS a charge against an
      // open position and the tooltip says so. The trailing asterisk that used
      // to disclaim it is gone.
      title={tTradeComponents("funding_rate_reference_only")}
    >
      {fundingRate}
    </m.div>
  );
}
