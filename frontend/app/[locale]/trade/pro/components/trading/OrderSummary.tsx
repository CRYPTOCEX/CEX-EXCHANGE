"use client";

import React, { memo, useMemo } from "react";
import { formatNumber } from "../../utils/format";
import { SummaryCard, SummaryDivider, SummaryRow } from "./SummaryCard";
import type { OrderSide } from "./SideToggle";
import type { OrderType } from "./OrderTypeSelector";
import type { MarketMetadata, MarketType } from "../../types/common";
import { useTranslations } from "next-intl";

/**
 * Render a fee rate as a percentage without trailing-zero noise: 0.001 -> "0.1",
 * 0.01 -> "1", 0.0005 -> "0.05". Never returns an empty string for a 0% market.
 */
function formatFeePercent(rate: number): string {
  const s = (rate * 100).toFixed(4);
  if (!s.includes(".")) return s;
  const trimmed = s.replace(/0+$/, "").replace(/\.$/, "");
  return trimmed === "" || trimmed === "-" ? "0" : trimmed;
}

interface OrderSummaryProps {
  side: OrderSide;
  /** price × amount, in the quote currency. */
  orderValue: number;
  orderType: OrderType;
  marketType: MarketType;
  quoteCurrency?: string;
  /**
   * The base asset. Needed because a CEX BUY is charged its fee in the BASE,
   * not the quote — `exchange/order/index.post.ts:256`.
   */
  baseCurrency?: string;
  precision?: number;
  showFee?: boolean;
  /** The market's own fee rates + precision. `maker`/`taker` are PERCENT. */
  metadata?: MarketMetadata;
  /** The limit price this order would rest at, for the maker/taker test. */
  limitPrice?: number | null;
  /** Last traded price, for the maker/taker test. */
  currentPrice?: number | null;
}

/**
 * What the order costs, in one block, always on screen.
 *
 * Both halves of this used to be conditional — the fee row unmounted at zero
 * value and the total was a lone strip — so the panel's bottom half was empty
 * until an amount was typed, and then jumped by two rows. It renders zeroes
 * instead: the layout is stable and the panel has a visible floor.
 */
export const OrderSummary = memo(function OrderSummary({
  side,
  orderValue,
  orderType,
  // `marketType` no longer decides the fee RATE — spot, futures and eco all
  // publish their own maker/taker on the market itself, so that is read from
  // `metadata` for all three. It does decide the fee's CURRENCY: only a CEX
  // spot BUY is charged in the base asset.
  marketType,
  quoteCurrency = "USDT",
  baseCurrency = "",
  precision = 2,
  showFee = true,
  metadata,
  limitPrice,
  currentPrice,
}: OrderSummaryProps) {
  const t = useTranslations("trade_pro");
  const tCommon = useTranslations("common");
  const isBuy = side === "buy";

  /**
   * The rate comes from the MARKET, never from a constant.
   *
   * This used to read a hardcoded FEE_RATES table (0.1% for spot and eco), so a
   * market left on the platform's 1% default was quoted at a tenth of what the
   * engine actually charged. The backend reads `metadata.maker`/`metadata.taker`
   * as percentages and charges `amount * price * rate / 100`; this is the same
   * number, expressed as a fraction.
   *
   * When the market has not published its rates we say so — a blank rate is
   * honest, a plausible-looking wrong one is not.
   */
  const { feeRate, isRateKnown } = useMemo(() => {
    const maker = Number(metadata?.maker);
    const taker = Number(metadata?.taker);
    const known =
      Number.isFinite(maker) && maker >= 0 && Number.isFinite(taker) && taker >= 0;
    if (!known) return { feeRate: 0, isRateKnown: false };

    // Only limit-style orders can rest on the book; market/stop-market/trailing
    // always take liquidity when they fire. A limit that crosses the spread is
    // filled immediately and pays taker, which mirrors the backend's own test in
    // placeOrder (it compares against the top of book; the ticket only has the
    // last price, so the two can disagree strictly inside the spread — the
    // charge is always the market's own published rate either way).
    const canRest = orderType === "limit" || orderType === "stop_limit";
    const crosses =
      limitPrice != null &&
      limitPrice > 0 &&
      currentPrice != null &&
      currentPrice > 0 &&
      (isBuy ? limitPrice >= currentPrice : limitPrice <= currentPrice);
    const isTaker = !canRest || crosses;

    return { feeRate: (isTaker ? taker : maker) / 100, isRateKnown: true };
  }, [metadata?.maker, metadata?.taker, orderType, limitPrice, currentPrice, isBuy]);

  /*
    ─────────────────────────────────────────────────────────────────────────
    ON A CEX BUY THE FEE IS TAKEN IN THE BASE ASSET, NOT THE QUOTE.

    `exchange/order/index.post.ts:256` is
    `const feeCurrency = side === "BUY" ? currency : pair;` and `:372` credits
    `netAmount = orderData.amount − orderData.fee`. So a BUY debits exactly the
    order value in quote and delivers LESS BASE; it does not debit more quote.

    This card computed `orderValue + fee` in the quote and labelled it "Total
    Cost". Buying 1 BTC at 60,000 on a 1% market it read *Fee 600.00 USDT /
    Total Cost 60,600.00 USDT*, while the actual debit is 60,000 USDT and 0.99
    BTC arrives. The figure was wrong, and so was its unit.

    (Ecosystem markets DO pre-hold `cost + fee` in the quote —
    `ecosystem/utils/placeOrder.ts:465` — which is why the same arithmetic is
    correct there and why this card cannot use one rule for both.)
    ─────────────────────────────────────────────────────────────────────────
  */
  const fee = showFee && isRateKnown ? orderValue * feeRate : 0;
  /*
    Ecosystem markets DO pre-hold `cost + fee` in the quote
    (`ecosystem/utils/placeOrder.ts:465`), and futures charge on the notional in
    quote, so the base-asset fee is the CEX SPOT buy alone. Without a base
    symbol there is nothing to label it with, so the old behaviour stands rather
    than a blank unit.
  */
  const feeInBase = isBuy && marketType === "spot" && !!baseCurrency;
  /* The fee is a quote-denominated amount; expressing it in the base needs the
     price. Without one there is nothing to divide by, so it stays in the quote
     rather than becoming an Infinity — and the UNIT follows the conversion that
     actually happened, because a quote figure labelled with the base symbol is
     the same defect one step over. */
  const feeConverted = feeInBase && currentPrice != null && currentPrice > 0;
  const feeAmount = feeConverted ? fee / currentPrice! : fee;
  const feeUnit = feeConverted ? baseCurrency : quoteCurrency;
  // What the quote wallet actually moves. On a CEX BUY the fee is not part of
  // it; on everything else it is.
  const net = isBuy ? (feeInBase ? orderValue : orderValue + fee) : orderValue - fee;

  return (
    <SummaryCard>
      {/*
        NO `order_value` ROW HERE.

        The form directly above carries an EDITABLE "Order Value" field, and
        when the trader is not mid-keystroke in it that field renders
        `total.toFixed(pricePrecision)` — the very number this row was printing
        from `orderValue={total}`. The same quantity under the same label, twice
        on one panel, one of them typeable and one of them not.

        What survives is what the field cannot say: the fee, and the net the
        quote wallet actually moves (which differs from the order value on every
        path except a zero-fee one). `orderValue` is still the input this card
        computes from — it is just no longer restated.
      */}
      {showFee && (
        <SummaryRow
          label={
            isRateKnown ? `Est. Fee (${formatFeePercent(feeRate)}%)` : "Est. Fee"
          }
          value={isRateKnown ? formatNumber(feeAmount, precision) : "—"}
          currency={isRateKnown ? feeUnit : undefined}
        />
      )}
      {/* The divider separates the fee from the net. With `showEstimatedFees`
          off there is nothing above it, and an unguarded rule at the top of the
          card reads as a stray border. */}
      {showFee && <SummaryDivider />}
      <SummaryRow
        label={isBuy ? tCommon("total_cost") : tCommon("you_receive")}
        value={formatNumber(net, precision)}
        currency={quoteCurrency}
        emphasis
      />
    </SummaryCard>
  );
});

export default OrderSummary;
