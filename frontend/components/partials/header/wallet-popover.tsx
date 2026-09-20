"use client";

import React, { useState, useEffect, useRef } from "react";
import { m, AnimatePresence } from "framer-motion";
import { cn, formatCurrency } from "@/lib/utils";
import { Link } from "@/i18n/routing";
import { useWalletStore } from "@/store/finance/wallet-store";
import { Icon } from "@/components/ui/icon";
import { Loadable } from "@/components/ui/skeleton";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowRight,
} from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * THE MIRROR COMPONENT THAT USED TO LIVE HERE, AND WHY IT IS GONE.
 * ============================================================================
 *
 * This file carried a private `Skeleton` box plus a `WalletPopoverSkeleton`
 * that redrew the entire panel — header, stats row, four wallet rows, footer —
 * in fourteen hand-sized grey rectangles. A duplicate tree has no mechanism
 * keeping it in step with the tree it imitates, and this one had already
 * drifted in the ways duplicates always do:
 *
 *  - IT ALWAYS DREW FOUR WALLET ROWS. The real list renders only the types with
 *    `count > 0`. An account holding Spot and Fiat gets two rows, so the panel
 *    shrank by two rows the instant the fetch landed — 88px, measured as
 *    2 x 40px (`py-1.5` + a 28px icon tile) plus one 4px `space-y-1` gap — and
 *    it did it under the user's cursor, which is sitting on the panel.
 *  - IT DROPPED `max-h-[200px] overflow-y-auto` from that list, so an account
 *    with four funded types went from an unscrolled 172px to a capped 200px
 *    scroller.
 *  - ITS TEXT BOXES WERE GUESSES. `h-3 w-10` stood in for a `text-xs
 *    leading-tight` label (15px) and `h-2 w-14` for a `text-[10px]
 *    leading-tight` caption (12.5px): 24px of stack against 27.5px of real
 *    text, on every row.
 *  - IT WITHHELD THINGS IT ALREADY KNEW. The four type labels, their icons and
 *    their tints are CONSTANTS declared thirty lines below; "Total"/"Active",
 *    the "24h:" caption and the whole footer button are literals. None of them
 *    depended on the fetch and all of them were replaced by grey.
 *
 * The panel now renders once. `isLoadingStats` reaches the four values that are
 * genuinely unknown — balance, change, counts, per-type totals — and nothing
 * else moves.
 */

interface WalletPopoverProps {
  children: React.ReactNode;
}

export function WalletPopover({ children }: WalletPopoverProps) {
  const t = useTranslations("components");
  const tCommon = useTranslations("common");
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const {
    totalBalance,
    totalChange,
    totalChangePercent,
    totalWallets,
    activeWallets,
    walletsByType,
    isLoadingStats,
    fetchStats,
  } = useWalletStore();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchStats();
    }
  }, [isOpen]);

  const isPositiveChange = totalChange >= 0;

  /**
   * Wallet type is **categorical identity** — four peers, no ordering, no state.
   * That is precisely the job the chart ramp is validated for (CVD separation and
   * contrast in both themes), so the four types take the first four ramp slots in
   * a fixed order rather than four ad-hoc two-hue gradients.
   *
   * Flat tint + matching icon colour rather than a gradient tile with a white
   * glyph: white on the old mid-tone fills failed contrast at this size.
   */
  const walletTypes = [
    {
      key: "SPOT",
      label: tCommon("spot"),
      icon: "solar:wallet-bold-duotone",
      color: "bg-chart-1/15 text-chart-1",
      balance: walletsByType?.SPOT?.balanceUSD || 0,
      count: walletsByType?.SPOT?.count || 0,
    },
    {
      key: "FIAT",
      label: tCommon("fiat"),
      icon: "solar:dollar-minimalistic-bold-duotone",
      color: "bg-chart-2/15 text-chart-2",
      balance: walletsByType?.FIAT?.balanceUSD || 0,
      count: walletsByType?.FIAT?.count || 0,
    },
    {
      key: "ECO",
      label: tCommon("eco"),
      icon: "solar:planet-2-bold-duotone",
      color: "bg-chart-3/15 text-chart-3",
      balance: walletsByType?.ECO?.balanceUSD || 0,
      count: walletsByType?.ECO?.count || 0,
    },
    {
      key: "FUTURES",
      label: tCommon("futures"),
      icon: "solar:chart-2-bold-duotone",
      color: "bg-chart-4/15 text-chart-4",
      balance: walletsByType?.FUTURES?.balanceUSD || 0,
      count: walletsByType?.FUTURES?.count || 0,
    },
  ];

  // Filter wallet types with balance > 0
  const activeWalletTypes = walletTypes.filter((type) => type.count > 0);

  /* Which rows to draw. `count` is 0 for every type until the fetch lands, so
     filtering on it while loading would collapse the list to nothing and then
     grow it back. The four types are a constant, so while pending we draw all
     four and let the count settle — the same "reserve the container, not the
     exact number of children" compromise lists make everywhere. */
  const rows = isLoadingStats ? walletTypes : activeWalletTypes;

  return (
    <div className="relative" ref={popoverRef}>
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
        {children}
      </div>

      <AnimatePresence>
        {isOpen && (
          <m.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "fixed sm:absolute top-auto sm:top-full right-2 sm:right-0 mt-2",
              "w-[calc(100vw-16px)] sm:w-[320px] max-w-[320px]",
              "rounded-xl overflow-hidden z-50",
              "border shadow-2xl backdrop-blur-xl",
              "bg-popover/98 border-border"
            )}
            style={{
              maxHeight: "calc(100vh - 80px)",
            }}
          >
            {/* Header with Total Balance - Compact */}
            <div
              className={cn(
                "relative px-4 py-3 overflow-hidden",
                "bg-surface-2"
              )}
            >
              <div className="relative">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Wallet
                      className={cn(
                        "w-3.5 h-3.5",
                        "text-subtle-foreground"
                      )}
                    />
                    <span
                      className={cn(
                        "text-[10px] font-medium uppercase tracking-wider",
                        "text-subtle-foreground"
                      )}
                    >
                      {tCommon("total_balance")}
                    </span>
                  </div>
                  {/* Reserved while pending: the chip is a 16px `text-xs`
                      line beside a 10px label, so it is the tallest thing
                      in this row and its arrival used to grow the header. */}
                  {isLoadingStats || totalChangePercent !== 0 ? (
                    <div className="flex items-center gap-0.5">
                      {/* R1: balance change is price direction, so it wears
                          the up/down tokens rather than generic green/red.
                          While pending there IS no direction — `totalChange`
                          is 0, which would render the up arrow in the token
                          that means "gain" — so the glyph's 12px box is held
                          by a pulse instead of guessing green. */}
                      {isLoadingStats ? (
                        <span
                          aria-hidden="true"
                          className="w-3 h-3 rounded-xs animate-pulse bg-muted"
                        />
                      ) : isPositiveChange ? (
                        <TrendingUp className="w-3 h-3 text-up" />
                      ) : (
                        <TrendingDown className="w-3 h-3 text-down" />
                      )}
                      <span
                        className={cn(
                          "text-xs font-semibold tabular-nums",
                          isLoadingStats
                            ? "text-muted-foreground"
                            : isPositiveChange
                              ? "text-up"
                              : "text-down"
                        )}
                      >
                        <Loadable loading={isLoadingStats} placeholder="+0.00%">
                          {`${isPositiveChange ? "+" : ""}${totalChangePercent?.toFixed(2)}%`}
                        </Loadable>
                      </span>
                    </div>
                  ) : null}
                </div>
                <h3
                  className={cn(
                    "text-xl font-bold mt-0.5",
                    "text-foreground"
                  )}
                >
                  <Loadable loading={isLoadingStats} placeholder="$12,345.67">
                    {formatCurrency(totalBalance || 0, "USD")}
                  </Loadable>
                </h3>
              </div>
            </div>

            {/* Wallet Stats - Compact inline */}
            <div
              className={cn(
                "px-4 py-2 border-b flex items-center justify-between",
                "border-border"
              )}
            >
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "text-[10px]",
                      "text-subtle-foreground"
                    )}
                  >
                    Total
                  </span>
                  <span
                    className={cn(
                      "text-sm font-bold",
                      "text-foreground"
                    )}
                  >
                    <Loadable loading={isLoadingStats} chars={2}>
                      {totalWallets || 0}
                    </Loadable>
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "text-[10px]",
                      "text-subtle-foreground"
                    )}
                  >
                    Active
                  </span>
                  <span
                    className={cn(
                      "text-sm font-bold",
                      "text-foreground"
                    )}
                  >
                    <Loadable loading={isLoadingStats} chars={2}>
                      {activeWallets || 0}
                    </Loadable>
                  </span>
                </div>
              </div>
              <span
                className={cn(
                  "text-[10px]",
                  "text-subtle-foreground"
                )}
              >
                {/* "24h:" is a literal — it renders in both states. */}
                24h:{" "}
                <Loadable loading={isLoadingStats} placeholder="$1,234.56">
                  {formatCurrency(totalChange || 0, "USD")}
                </Loadable>
              </span>
            </div>

            {/* Wallet Types - Compact grid */}
            <div className="px-3 py-2 space-y-1 max-h-[200px] overflow-y-auto">
              {/* No per-row entrance animation: the rows used to slide in
                  from x:-10 on a stagger, so the list visibly assembled
                  itself sideways every time the popover opened — on top of
                  the panel's own entrance. The panel animates; its contents
                  arrive with it. */}
              {rows.map((type) => (
                <div
                  key={type.key}
                  className={cn(
                    "flex items-center justify-between px-2 py-1.5 rounded-lg transition-all duration-200",
                    "hover:bg-muted"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center",
                        type.color
                      )}
                    >
                      <Icon icon={type.icon} className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p
                        className={cn(
                          "text-xs font-medium leading-tight",
                          "text-foreground"
                        )}
                      >
                        {type.label}
                      </p>
                      <p
                        className={cn(
                          "text-[10px] leading-tight",
                          "text-subtle-foreground"
                        )}
                      >
                        {/* The label and the icon tile above are CONSTANTS
                            declared in `walletTypes` — they are knowable
                            before the fetch and render immediately. Only
                            the count waits; the noun is plural while
                            pending because "1 wallet" is a claim. */}
                        <Loadable loading={isLoadingStats} chars={1}>
                          {type.count}
                        </Loadable>{" "}
                        {isLoadingStats || type.count !== 1 ? "wallets" : "wallet"}
                      </p>
                    </div>
                  </div>
                  <p
                    className={cn(
                      "text-xs font-semibold",
                      "text-foreground"
                    )}
                  >
                    <Loadable loading={isLoadingStats} placeholder="$1,234.56">
                      {formatCurrency(type.balance, "USD")}
                    </Loadable>
                  </p>
                </div>
              ))}
            </div>

            {/* Footer Action - Compact */}
            <div
              className={cn(
                "px-3 py-2 border-t",
                "border-border"
              )}
            >
              <Link
                href="/finance/wallet"
                onClick={() => setIsOpen(false)}
                className={cn(
                  // Both arms were a dark ground with white text, i.e. the
                  // light branch was styled to look like the dark one. It is
                  // the popover's primary action, so it takes the accent.
                  "flex items-center justify-between w-full px-3 py-2 rounded-lg transition-all duration-200 group",
                  "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
              >
                <span className="text-xs font-medium">{t("view_all_wallets")}</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
