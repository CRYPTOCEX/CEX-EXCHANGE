"use client";

import React, { memo, useState, useEffect, useCallback, useMemo } from "react";
import { MoneyFigure } from "@/components/ui/money-figure";
/* `Loadable`/`SkeletonText` rather than the workspace's own `Skeleton`: these
   are VALUES becoming text, and the app-wide primitive measures itself from
   the element it sits in — which is what makes it survive the Pro workspace's
   font-scale setting, where the local fixed-size boxes could not. */
import { Loadable } from "@/components/ui/skeleton";
import { cn } from "../../utils/cn";
import { PositionCard, type Position } from "./PositionCard";
/* The row -> card mapping lives next door because it is where the API's BUY/SELL
   meets this panel's LONG/SHORT, and that boundary is worth naming and testing
   on its own rather than hiding in a component file. */
import { toPosition, type ApiFuturesPosition } from "./wire";
import { ClosePositionModal } from "./ClosePositionModal";
import { EmptyState } from "../orders/EmptyState";
import { $fetch } from "@/lib/api";
import { useTranslations } from "next-intl";

interface PositionsPanelProps {
  symbol: string;
  className?: string;
}

export const PositionsPanel = memo(function PositionsPanel({
  symbol,
  className,
}: PositionsPanelProps) {
  const t = useTranslations("trade_pro");
  const [positions, setPositions] = useState<Position[]>([]);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "current">("all");

  const fetchPositions = useCallback(async (opts?: { quiet?: boolean }) => {
    if (!opts?.quiet) setIsLoading(true);

    const { data, error } = await $fetch<ApiFuturesPosition[]>({
      url: "/api/futures/position?type=OPEN_POSITIONS",
      silentSuccess: true,
      silent: true,
    });

    if (error || !Array.isArray(data)) {
      // No positions, or the futures addon is not installed. Either way there is
      // nothing to show — the empty state below is the correct rendering.
      setPositions([]);
      setIsLoading(false);
      return;
    }

    setPositions(data.map(toPosition));
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchPositions();
    /*
      Poll for updated marks/PnL.

      This comment used to assert that "the endpoint recomputes unrealisedPnl
      server-side" and it was not true: the route returned the STORED column,
      which is refreshed only when a fill touches the position and is 0 from the
      moment it opens. So the poll re-fetched an unchanging zero every five
      seconds and the panel sat still while the market moved.

      It is true now — `futures/position/index.get.ts` marks every OPEN position
      against the live ticker on each read and reports the `markPrice` it used.
      A comment claiming a property is the cheapest way to stop anyone checking
      for it, so: this one is load-bearing, and it names the route that has to
      keep holding it up.
    */
    const interval = setInterval(() => fetchPositions({ quiet: true }), 5000);
    return () => clearInterval(interval);
  }, [fetchPositions]);

  // Filter positions
  const filteredPositions = useMemo(() => {
    if (filter === "current") {
      return positions.filter((p) => p.symbol === symbol);
    }
    return positions;
  }, [positions, filter, symbol]);

  // Calculate totals
  const totalUnrealizedPnl = positions.reduce((sum, p) => sum + p.unrealizedPnl, 0);
  const totalMargin = positions.reduce((sum, p) => sum + p.margin, 0);

  // Handle close position
  const handleClosePosition = useCallback((position: Position) => {
    setSelectedPosition(position);
    setShowCloseModal(true);
  }, []);

  // Handle confirm close
  const handleConfirmClose = useCallback(
    async (closeType: "market" | "limit", price?: number, amount?: number) => {
      if (!selectedPosition) return;

      // The live route (futures/position/[id] DELETE) is a FULL MARKET CLOSE — its
      // body is {currency, pair, side} with no size or limit price. Partial and
      // limit closes are therefore not submitted; the modal restricts itself to
      // market/full close (see `allowPartial={false}` below) so nothing can be
      // requested here that the backend would silently ignore.
      const [currency, pair] = selectedPosition.symbol.split("/");

      // `wireSide`, not `side`: the route looks the row up with a CQL equality on
      // the stored BUY/SELL value, so the display token sent here previously
      // matched nothing and every close returned 404 — swallowed below.
      const { error } = await $fetch({
        url: `/api/futures/position/${selectedPosition.id}`,
        method: "DELETE",
        body: { currency, pair, side: selectedPosition.wireSide },
      });

      if (error) return;

      // Re-read rather than mutating locally, so the panel always reflects what the
      // server actually did.
      await fetchPositions({ quiet: true });
    },
    [selectedPosition, fetchPositions]
  );

  /*
   * Set TP/SL.
   *
   * This used to mutate local state and make no request. A trader set a stop,
   * watched it appear, refreshed, and had none — on a leveraged product, with
   * nothing logged and no error shown. There was no route to call either; the
   * PUT it now uses was added alongside this fix.
   *
   * `wireSide`, not the display token, for the same reason the close above
   * spells it out: the route looks the row up with a CQL equality on the stored
   * BUY/SELL value, so sending the display side matches nothing and returns 404.
   *
   * `null` clears a stop and `undefined` leaves it alone, which is the contract
   * the route reads — so an explicit clear must survive this call rather than
   * being collapsed into "unchanged".
   */
  const handleSetTpSl = useCallback(
    async (positionId: string, tp?: number, sl?: number) => {
      const position = positions.find((p) => p.id === positionId);
      if (!position) return;

      const [currency, pair] = position.symbol.split("/");

      const { error } = await $fetch({
        url: `/api/futures/position/${positionId}`,
        method: "PUT",
        body: {
          currency,
          pair,
          side: position.wireSide,
          takeProfitPrice: tp ?? null,
          stopLossPrice: sl ?? null,
        },
      });

      if (error) return;

      // Re-read rather than mutating locally, so the panel always reflects what
      // the server actually stored.
      await fetchPositions({ quiet: true });
    },
    [positions, fetchPositions]
  );

  /**
   * The panel keeps its header while the positions load.
   * ==========================================================================
   *
   * `if (isLoading) return <two h-24 grey plates>` used to be here. This is a
   * docked panel in a persistent grid, so the swap did not move the panel — it
   * moved everything INSIDE it: the 33px header (position count, the
   * All/Symbol filter, the total-PnL readout) simply did not exist, and the
   * plates started at `p-4` where the real list starts at `p-2`.
   *
   * THREE THINGS BELOW WOULD HAVE LIED IF THEY WERE LEFT ALONE, and this is
   * the part that matters more than the pixels:
   *
   *  1. `filteredPositions.length === 0 ? <EmptyState/>` — `positions` is `[]`
   *     for the whole fetch, so a futures trader with open risk would have
   *     been told "no open positions" on every single load.
   *  2. `{filteredPositions.length} Position{...}` — reads "0 Positions".
   *  3. `totalUnrealizedPnl` and `totalMargin` are `reduce(..., 0)` over an
   *     empty array, so they render "+0.00 USDT" IN GREEN. A confident,
   *     wrong, colour-coded P&L figure is the worst thing this panel can
   *     display; a placeholder is strictly better than a zero.
   *
   * All three are now gated on `isLoading`.
   */

  return (
    <div className={cn("tp-positions-panel flex flex-col h-full bg-[var(--tp-bg-secondary)]", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--tp-border)]">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--tp-text-muted)]">
            <Loadable loading={isLoading} placeholder="0 Positions">
              {filteredPositions.length} Position
              {filteredPositions.length !== 1 ? "s" : ""}
            </Loadable>
          </span>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as "all" | "current")}
            className={cn(
              "px-2 py-1 text-[10px]",
              "bg-[var(--tp-bg-tertiary)]",
              "border border-[var(--tp-border)]",
              "rounded",
              "text-[var(--tp-text-secondary)]",
              "outline-none cursor-pointer"
            )}
          >
            <option value="all">{t("all_positions")}</option>
            <option value="current">{symbol} Only</option>
          </select>
        </div>
        <div className="text-right">
          {/* The ticker is a word, so it steps out of the mono run; the signed
              figure keeps it. Same characters as before. */}
          {/* `text-[var(--tp-text-muted)]` while pending, NOT the directional
              green/red. `totalUnrealizedPnl` is `reduce(..., 0)` over an empty
              array during the fetch, so the sign test says "up" and the figure
              would have been painted green — the panel would have announced a
              flat-to-positive book before knowing anything about it. Colour is
              a claim here; it waits with the number. */}
          <div
            className={cn(
              "text-sm font-semibold",
              isLoading
                ? "text-[var(--tp-text-muted)]"
                : totalUnrealizedPnl >= 0
                  ? "text-[var(--tp-green)]"
                  : "text-[var(--tp-red)]"
            )}
          >
            {/* `Loadable` rather than a ternary between `SkeletonText` and
                `MoneyFigure`: the primitive is exactly that ternary, and
                writing it out by hand is what lets the placeholder and the
                value drift apart. Same box, one element, same
                `placeholder="+0.00 USDT"` the branch was already passing. */}
            <Loadable loading={isLoading} placeholder="+0.00 USDT">
              <MoneyFigure
                value={`${totalUnrealizedPnl >= 0 ? "+" : ""}${totalUnrealizedPnl.toFixed(2)} USDT`}
              />
            </Loadable>
          </div>
          <div className="text-[10px] text-[var(--tp-text-muted)]">
            {t("total_margin")}:{" "}
            <Loadable loading={isLoading} placeholder="0.00">
              {totalMargin.toFixed(2)}
            </Loadable>{" "}
            USDT
          </div>
        </div>
      </div>

      {/* Positions list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {/* Two pending cards in the REAL list container with the REAL `p-2
            space-y-2` — not the `p-4 space-y-3` the removed branch used, which
            was 8px of extra inset and 4px of extra gutter that vanished on
            arrival. `PositionCard` is a fixed-height card, so `h-24` is the
            right reservation; it is the one place here with no text to
            measure. */}
        {isLoading ? (
          [0, 1].map((i) => (
            <div
              key={`pending-position-${i}`}
              className="h-24 rounded-lg bg-[var(--tp-bg-tertiary)] animate-pulse"
            />
          ))
        ) : filteredPositions.length === 0 ? (
          <EmptyState type="positions" />
        ) : (
          filteredPositions.map((position) => (
            <PositionCard
              key={position.id}
              position={position}
              onClose={() => handleClosePosition(position)}
              onSetTpSl={(tp, sl) => handleSetTpSl(position.id, tp, sl)}
            />
          ))
        )}
      </div>

      {/* Close modal */}
      {selectedPosition && (
        <ClosePositionModal
          isOpen={showCloseModal}
          onClose={() => setShowCloseModal(false)}
          position={selectedPosition}
          onConfirm={handleConfirmClose}
          allowPartial={false}
        />
      )}
    </div>
  );
});

export default PositionsPanel;
