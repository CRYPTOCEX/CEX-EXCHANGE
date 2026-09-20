"use client";

import React, { memo } from "react";
import { cn } from "../../utils/cn";
import { useTranslations } from "next-intl";
import { formatTickSize } from "@/lib/orderbook";

type DisplayMode = "both" | "bids" | "asks";

interface OrderBookHeaderProps {
  displayMode: DisplayMode;
  onDisplayModeChange: (mode: DisplayMode) => void;
  showCumulative: boolean;
  onShowCumulativeChange: (show: boolean) => void;
  /** Grouping increments offered for THIS market, coarsest last. */
  tickSizes: number[];
  /** 0 means "the market's own tick" — no grouping. */
  tickSize: number;
  onTickSizeChange: (tick: number) => void;
  compact?: boolean;
}

export const OrderBookHeader = memo(function OrderBookHeader({
  displayMode,
  onDisplayModeChange,
  showCumulative,
  onShowCumulativeChange,
  tickSizes,
  tickSize,
  onTickSizeChange,
  compact = false,
}: OrderBookHeaderProps) {
  const t = useTranslations("trade_pro");
  const tCommon = useTranslations("common");
  const tTrade = useTranslations("trade");
  // In compact/horizontal mode, hide the display mode toggle since we always show both
  return (
    <div
      className={cn(
        "tp-orderbook-header",
        "flex items-center justify-between gap-2",
        "px-2 py-1.5",
        "border-b border-[var(--tp-border)]",
        "bg-[var(--tp-bg-secondary)]"
      )}
    >
      {/* Display Mode Toggle - hide in compact mode */}
      {!compact && (
        <div
          role="group"
          aria-label={tTrade("book_display_mode")}
          className="flex items-center gap-0.5 p-0.5 rounded-md bg-[var(--tp-bg-tertiary)]"
        >
          <DisplayModeButton
            mode="both"
            active={displayMode === "both"}
            onClick={() => onDisplayModeChange("both")}
            label={tTrade("bids_and_asks")}
          />
          <DisplayModeButton
            mode="bids"
            active={displayMode === "bids"}
            onClick={() => onDisplayModeChange("bids")}
            label={tTrade("bids_only")}
          />
          <DisplayModeButton
            mode="asks"
            active={displayMode === "asks"}
            onClick={() => onDisplayModeChange("asks")}
            label={tTrade("asks_only")}
          />
        </div>
      )}

      {/* Compact mode label */}
      {compact && (
        <span className="text-[10px] text-[var(--tp-text-muted)]">
          {t("side_by_side")}
        </span>
      )}

      <div className="flex items-center gap-1">
        {/*
          Price grouping. The Pro book had none at all — every level rendered at
          the market's own tick, which on a venue quoting to eight decimals is a
          ladder of near-identical prices carrying a hundredth of a coin each.
          `.tp-orderbook-select` was already styled in trading-pro.css for a
          control in exactly this spot; nothing had ever applied it.
        */}
        <select
          aria-label={tCommon("group")}
          className={cn(
            "tp-orderbook-select",
            "rounded border border-[var(--tp-border)] bg-[var(--tp-bg-tertiary)]",
            "px-1 py-0 text-[10px] leading-none text-[var(--tp-text-secondary)]",
            "focus:outline-none focus:ring-1 focus:ring-[var(--tp-blue)]"
          )}
          value={String(tickSize)}
          onChange={(event) => onTickSizeChange(Number(event.target.value))}
        >
          <option value="0">{tCommon("no_grouping")}</option>
          {tickSizes.map((tick) => (
            <option key={tick} value={String(tick)}>
              {formatTickSize(tick)}
            </option>
          ))}
        </select>

      {/* Cumulative Toggle */}
      <button
        onClick={() => onShowCumulativeChange(!showCumulative)}
        aria-pressed={showCumulative}
        aria-label={t("cumulative_depth")}
        className={cn(
          "flex items-center justify-center",
          "h-[22px] w-[26px]",
          "rounded-md",
          "transition-colors",
          showCumulative
            ? "bg-[var(--tp-blue-bg)] text-[var(--tp-blue)]"
            : "bg-[var(--tp-bg-tertiary)] text-[var(--tp-text-muted)] hover:bg-[var(--tp-bg-elevated)] hover:text-[var(--tp-text-secondary)]"
        )}
        title={showCumulative ? t("showing_cumulative_depth") : t("showing_row_totals")}
      >
        <CumulativeIcon />
      </button>
      </div>
    </div>
  );
});

interface DisplayModeButtonProps {
  mode: DisplayMode;
  active: boolean;
  onClick: () => void;
  label: string;
}

function DisplayModeButton({ mode, active, onClick, label }: DisplayModeButtonProps) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      className={cn(
        "group flex items-center justify-center",
        "h-[22px] w-[26px]",
        "rounded",
        "transition-colors",
        active
          ? "bg-[var(--tp-bg-elevated)]"
          : "hover:bg-[var(--tp-bg-elevated)]/60"
      )}
      title={label}
    >
      <DisplayModeIcon mode={mode} active={active} />
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Icons                                                                       */
/*                                                                             */
/* These were three flat <div> blocks — a red/green split square and two solid  */
/* squares — which is a colour swatch, not an icon: nothing about them said     */
/* "order book", and at 12px the split one read as a flag.                      */
/*                                                                             */
/* Each glyph is now the depth ladder the button actually selects, drawn to     */
/* match how the panel renders it: asks descend from the top so their widest    */
/* row (deepest liquidity) sits furthest from the spread, bids widen downward   */
/* from the best bid. So the three silhouettes are genuinely different shapes   */
/* — pinched in the middle, ramp up, ramp down — and stay distinguishable at    */
/* 14px even before colour is read, which matters for anyone who can't rely on  */
/* the red/green pair.                                                          */
/* -------------------------------------------------------------------------- */

/** Row geometry: four 3-unit bars on a 1-unit rhythm inside a 16-unit box. */
const ROW_Y = [0.5, 4.5, 8.5, 12.5];
const ROW_H = 3;
const ROW_R = 1.5;

function Bar({ y, width, fill }: { y: number; width: number; fill: string }) {
  // The colour goes through `style`, not the `fill` attribute: var() inside a
  // presentation attribute is not reliably resolved (Safari shipped it late),
  // and a dropped fill here would paint the whole glyph black.
  return (
    <rect
      x="0"
      y={y}
      width={width}
      height={ROW_H}
      rx={ROW_R}
      style={{ fill }}
    />
  );
}

const ASK = "var(--tp-red)";
const BID = "var(--tp-green)";

function DisplayModeIcon({ mode, active }: { mode: DisplayMode; active: boolean }) {
  // Direction colour is kept in every state — it is what makes the button
  // readable at a glance — and the resting state is dimmed rather than
  // greyed, so three saturated glyphs in a row don't compete with the book
  // itself for attention.
  const rows =
    mode === "both"
      ? [
          { width: 16, fill: ASK },
          { width: 11, fill: ASK },
          { width: 11, fill: BID },
          { width: 16, fill: BID },
        ]
      : mode === "asks"
        ? [
            { width: 16, fill: ASK },
            { width: 13.5, fill: ASK },
            { width: 11, fill: ASK },
            { width: 8.5, fill: ASK },
          ]
        : [
            { width: 8.5, fill: BID },
            { width: 11, fill: BID },
            { width: 13.5, fill: BID },
            { width: 16, fill: BID },
          ];

  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      aria-hidden="true"
      className={cn(
        "transition-opacity",
        active ? "opacity-100" : "opacity-50 group-hover:opacity-80"
      )}
    >
      {rows.map((row, i) => (
        <Bar key={ROW_Y[i]} y={ROW_Y[i]} width={row.width} fill={row.fill} />
      ))}
    </svg>
  );
}

/**
 * Cumulative depth — a running-total staircase filled to the baseline.
 *
 * Replaces a literal "Σ" character, which inherited the UI sans face and sat in
 * the header as the one piece of typography pretending to be an icon.
 */
function CumulativeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M1 14.5V11h3.5V8h3.5V5.25h3.5V2.5H15v12z"
        fill="currentColor"
        fillOpacity="0.28"
      />
      <path
        d="M1 11h3.5V8h3.5V5.25h3.5V2.5H15"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default OrderBookHeader;
