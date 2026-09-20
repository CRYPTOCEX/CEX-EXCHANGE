"use client";

import React, { memo, useState } from "react";
import { cn } from "../../../utils/cn";
import type { OrderType } from "../OrderTypeSelector";
import type { MarketType } from "../../../types/common";
import { useTranslations } from "next-intl";

/**
 * The controls that change what happens to the part of an order that does not
 * fill immediately.
 *
 * THIS PANEL IS GATED BY WHERE THE FIELD IS ACTUALLY ENFORCED, NOT BY WHERE IT
 * WOULD LOOK PLAUSIBLE.
 * ===========================================================================
 * It sat commented out in `TradingFormPanel` under "not yet implemented", then
 * shipped for ECOSYSTEM markets only. The SPOT (provider) half is enforced now
 * too, and the gate has widened by exactly that much:
 *
 *   - `api/exchange/order` (SPOT) passes a ccxt params object and refuses a
 *     value the connected venue cannot express. WHICH VALUES THOSE ARE DEPENDS
 *     ON THE VENUE — binance and kucoin can express all four on a limit order,
 *     xt cannot express post-only on spot at all — so the list comes from the
 *     backend (`useVenueTimeInForce`) and is never assumed here.
 *   - `api/(ext)/ecosystem/order` enforces all four in its own matching engine.
 *   - `api/(ext)/futures/order` reads currency/pair/amount/price/type/side/
 *     leverage/stopLossPrice/takeProfitPrice, and `reduceOnly` separately. It
 *     still does not read `timeInForce`, so futures still offers none.
 *   - The ecosystem route also returns into `createStopOrder` for `stop_limit`
 *     / `stop_market` BEFORE `parseTimeInForce` runs, so conditional orders
 *     carry no time in force either — hence LIMIT only, on both venues.
 *
 * Rendering a value that is not enforced would take a trader's instruction and
 * drop it silently — an order that claims to be fill-or-kill and rests as
 * good-till-cancelled. That is the exact failure the backend enforcement was
 * built to prevent, and shipping it in the UI would reintroduce it one layer up.
 *
 * An option that DEGRADES is worse than one that is absent, which is why the
 * per-venue list filters the buttons rather than disabling them.
 */

export interface AdvancedOptionsState {
  /**
   * POST-ONLY IS A TIME IN FORCE, NOT A SEPARATE SWITCH.
   *
   * There used to be both: a GTC/IOC/FOK row and a Post Only toggle, each
   * writing its own field. Nothing de-selected the other, so the panel could
   * show FOK selected AND Post Only on at the same time while only one value
   * was ever sent — and the field the toggle wrote (`postOnly`) is not read by
   * any route on the platform. One field, one control, and the mutual
   * exclusion is now structural.
   */
  timeInForce: "GTC" | "IOC" | "FOK" | "PO";
  reduceOnly: boolean;
}

interface AdvancedOptionsProps {
  options: AdvancedOptionsState;
  onChange: (options: AdvancedOptionsState) => void;
  orderType: OrderType;
  marketType: MarketType;
  /**
   * The values the SPOT provider can honour, from
   * `GET /api/exchange/order/capabilities`. Ignored on eco and futures, which
   * do not route through a venue.
   */
  spotTimeInForce?: readonly AdvancedOptionsState["timeInForce"][];
}

const TIME_IN_FORCE_VALUES = ["GTC", "IOC", "FOK", "PO"] as const;

/**
 * Every value this market and order type can honour, best answer first.
 *
 * ONE RULE, TWO READERS — the panel renders these and the submit path clamps
 * to them. Two copies of it would drift, and the direction they drift in is a
 * button that produces a 422.
 *
 * A list of one means "no choice", which is what an order with no control gets
 * and what every caller sent before this existed.
 *
 * NON-LIMIT ORDER TYPES GET NO CHOICE ON ANY MARKET. A market order never
 * rests: GTC describes nothing, post-only is a contradiction, and both the
 * ecosystem route (`timeInForceConflict`) and the spot route refuse FOK on one.
 * The control was already limit-only, but the SELECTION was not — so a FOK
 * picked on the limit tab used to ride along when the trader switched to
 * market, and came back refused.
 */
export function timeInForceChoices(
  marketType: MarketType,
  orderType: OrderType,
  spotTimeInForce?: readonly AdvancedOptionsState["timeInForce"][]
): readonly AdvancedOptionsState["timeInForce"][] {
  if (orderType !== "limit") return ["GTC"];
  // The ecosystem matching engine enforces all four itself. A spot market is
  // only worth as much as the venue behind it, and that answer comes from the
  // backend rather than being assumed here. Futures reads no time in force at
  // all, so offering one would be the silent drop this control exists to avoid.
  if (marketType === "eco") return TIME_IN_FORCE_VALUES;
  if (marketType === "spot") return spotTimeInForce ?? ["GTC"];
  return ["GTC"];
}

/**
 * The value that will actually be sent on a market offering `available`.
 *
 * The selection SURVIVES a market change — `useOrderForm.reset()` keeps the
 * advanced options on purpose, so a trader who picked FOK does not have to pick
 * it again after every fill. That means a value chosen on an ecosystem market
 * can still be held when the form moves to a spot market whose venue has no
 * FOK, with the control not rendered to show it.
 *
 * Falling back to GTC is what an order with no control gets, and it is the one
 * the backend would have refused otherwise. Both the panel and the submit path
 * read this, so what is described is what is sent.
 */
export function effectiveTimeInForce(
  selected: AdvancedOptionsState["timeInForce"],
  available: readonly AdvancedOptionsState["timeInForce"][]
): AdvancedOptionsState["timeInForce"] {
  return available.includes(selected) ? selected : "GTC";
}

export const AdvancedOptions = memo(function AdvancedOptions({
  options,
  onChange,
  orderType,
  marketType,
  spotTimeInForce,
}: AdvancedOptionsProps) {
  const t = useTranslations("trade_pro");
  const tCommon = useTranslations("common");
  const [isExpanded, setIsExpanded] = useState(false);

  /*
   * A list of one is not a choice — an install whose provider can only honour
   * GTC (or has none configured) gets the row hidden rather than a single
   * button that cannot be turned off.
   */
  const available = timeInForceChoices(marketType, orderType, spotTimeInForce);
  const showTimeInForce = available.length > 1;
  const selectedTimeInForce = effectiveTimeInForce(
    options.timeInForce,
    available
  );

  /*
   * REDUCE-ONLY, ON FUTURES, AND NOW ACTUALLY ENFORCED.
   *
   * This was hidden while `api/(ext)/futures/order` did not read `reduceOnly`
   * off the body — the switch was a silent no-op, and unlike a fee preference
   * it is a POSITION SAFETY control: a trader turning it on to avoid opening a
   * reverse position got no protection and no error.
   *
   * The route reads it now, refuses an order with no position to close, and
   * refuses one larger than the position rather than clamping it. Both order
   * types are offered because a market exit is the common one.
   */
  const showReduceOnly = marketType === "futures";

  // Nothing to show is nothing to render — an empty disclosure that opens onto
  // a blank panel reads as a broken control.
  if (!showTimeInForce && !showReduceOnly) return null;

  const handleToggle = (key: keyof AdvancedOptionsState, value: any) => {
    onChange({ ...options, [key]: value });
  };

  const describe = (tif: AdvancedOptionsState["timeInForce"]) => {
    switch (tif) {
      case "GTC":
        return t("tif_gtc_desc");
      case "IOC":
        return t("tif_ioc_desc");
      case "FOK":
        return t("tif_fok_desc");
      case "PO":
        return t("tif_po_desc");
    }
  };

  return (
    <div className="border-t border-[var(--tp-border)] pt-2 mt-2">
      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        className="flex items-center justify-between w-full py-1 text-xs text-[var(--tp-text-muted)] hover:text-[var(--tp-text-secondary)]"
      >
        <span>{tCommon("advanced_options")}</span>
        <svg
          className={cn("w-4 h-4 transition-transform", isExpanded && "rotate-180")}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* Options panel */}
      {isExpanded && (
        <div className="mt-2 space-y-3 animate-in slide-in-from-top-2 duration-200">
          {showTimeInForce && (
            <div className="space-y-1">
              <label className="text-[10px] text-[var(--tp-text-muted)] uppercase tracking-wide">
                {tCommon("time_in_force")}
              </label>
              <div
                className={cn(
                  "grid gap-1",
                  // Only the values this market can honour are rendered, so the
                  // track has to size to however many that is. Static class
                  // names, because Tailwind cannot see an interpolated one.
                  available.length >= 4
                    ? "grid-cols-4"
                    : available.length === 3
                    ? "grid-cols-3"
                    : "grid-cols-2"
                )}
                role="radiogroup"
              >
                {available.map((tif) => (
                  <button
                    key={tif}
                    type="button"
                    role="radio"
                    aria-checked={selectedTimeInForce === tif}
                    onClick={() => handleToggle("timeInForce", tif)}
                    className={cn(
                      "py-1.5 text-[10px] font-medium rounded transition-colors",
                      selectedTimeInForce === tif
                        ? "bg-[var(--tp-blue)]/20 text-[var(--tp-blue)]"
                        : "bg-[var(--tp-bg-tertiary)] text-[var(--tp-text-muted)] hover:text-[var(--tp-text-secondary)]"
                    )}
                    title={describe(tif)}
                  >
                    {tif}
                  </button>
                ))}
              </div>
              {/*
                Translated, because this is BODY COPY and not a tooltip. It was
                a hardcoded English switch statement, which would have put
                untranslated prose in front of all 90 locales the moment the
                panel was un-hidden.
              */}
              <p className="text-[10px] text-[var(--tp-text-muted)]">
                {describe(selectedTimeInForce)}
              </p>
            </div>
          )}

          {showReduceOnly && (
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <label className="text-xs text-[var(--tp-text-secondary)]">
                  {tCommon("reduce_only")}
                </label>
                <p className="text-[10px] text-[var(--tp-text-muted)]">
                  {t("only_reduce_existing_position")}
                </p>
              </div>
              <ToggleSwitch
                checked={options.reduceOnly}
                onChange={(checked) => handleToggle("reduceOnly", checked)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
});

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function ToggleSwitch({ checked, onChange }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative w-10 h-5 rounded-full transition-colors",
        checked ? "bg-[var(--tp-blue)]" : "bg-[var(--tp-bg-tertiary)]"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-transform",
          // The knob was `bg-white`, frozen to one theme. `components/ui/switch`
          // paints its thumb `bg-background`, which is the surface the track
          // sits on in both schemes — same treatment here.
          //
          // NO `shadow-sm`. The design ratchet's own remedy for an off-Ledger
          // shadow is "R3 puts depth in the surface ramp" — and the ramp is
          // already doing it: `bg-background` is the lightest surface in the
          // system sitting on `--tp-bg-tertiary`, so the knob reads as raised
          // from the step alone. The shadow was adding a second, untokenised
          // depth cue on top of one that already worked.
          "bg-background",
          checked && "translate-x-5"
        )}
      />
    </button>
  );
}

export default AdvancedOptions;
