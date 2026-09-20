"use client";

import type React from "react";

import { useState } from "react";
import { $fetch } from "@/lib/api";
import type { OrderFormProps } from "./types";
import {
  DirectionalPrice,
  FieldLabel,
  NoteBox,
  OrderErrorBox,
  PercentButtons,
  SideToggle,
  SubmitOrderButton,
  UnitField,
} from "../shared/order-form-ui";
import { computePercentAmount } from "../shared/percent-amount";
import { useTranslations } from "next-intl";
import { useOrderbookSelection } from "../use-orderbook-selection";

/**
 * One-cancels-other: two exits from one position.
 *
 * A trader holding a coin wants a target above the market and a protection
 * level below it, and wants whichever happens first to cancel the other.
 * Placing both by hand means being awake to cancel the loser, and forgetting to
 * is how one exit becomes two and a flat position becomes a short.
 *
 * WHY THIS IS ITS OWN TICKET AND NOT A CHECKBOX ON THE STOP TAB.
 * ===========================================================================
 * An OCO is placed as ONE request to `/api/ecosystem/order/oco`, because the
 * two legs are one instruction: the target leg takes the reservation and the
 * protective leg is funded by it. Two separate submits would hold the coins
 * twice, which is precisely what stops a trader placing an OCO on a position
 * they hold exactly.
 *
 * Both legs take the SAME SIDE, and the side toggle says so. That reads oddly
 * next to a buy/sell ticket until you see what an OCO is: not a trade, but two
 * ways out of one you already made.
 *
 * ECOSYSTEM MARKETS ONLY. The route places a real limit order plus a resting
 * stop, and the provider path can hold neither — `exchangeOrder.type` is
 * ENUM("MARKET","LIMIT"), so there is nowhere to put the protective leg. The
 * tab is gated in ../index.tsx for the same reason the Stop tab is.
 */
export default function OcoOrderForm({
  currency,
  pair,
  buyMode,
  setBuyMode,
  marketPrice,
  pricePrecision,
  amountPrecision,
  minAmount,
  maxAmount,
  walletData,
  priceDirection,
  fetchWalletData,
}: OrderFormProps) {
  const t = useTranslations("trade_components");
  const tCommon = useTranslations("common");

  const [amount, setAmount] = useState("");
  const [limitPrice, setLimitPrice] = useState("");
  const [stopPrice, setStopPrice] = useState("");
  const [percentSelected, setPercentSelected] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  /* A clicked book level fills the TARGET leg — the one that rests in the book,
     and therefore the only one of the two a price on screen refers to. The
     protection leg is below the market by construction and is never what a
     trader means by clicking an ask. */
  useOrderbookSelection({
    pricePrecision,
    amountPrecision,
    onPrice: setLimitPrice,
    onAmount: setAmount,
  });

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(e.target.value);
    setPercentSelected(null);
  };

  const handlePercentClick = (percent: number) => {
    setPercentSelected(percent);
    const result = computePercentAmount({
      percent,
      buyMode,
      // Sized off the TARGET leg, because that is the leg that takes the
      // reservation for the pair — the protective leg is funded by it and
      // holds nothing of its own.
      price: limitPrice || marketPrice,
      walletData,
      amountPrecision,
      pricePrecision,
      minAmount,
      maxAmount,
      invalidPriceWarning:
        "Invalid target price for OCO percentage calculation",
      // No fee reserve: the OCO route sizes and holds the target leg through
      // the ordinary placement path, which computes the fee itself.
      buyQuoteReserve: null,
    });
    setAmount(result.amount);
  };

  const handleSubmit = async () => {
    setOrderError(null);

    const numericAmount = Number(amount);
    const numericLimit = Number(limitPrice);
    const numericStop = Number(stopPrice);

    /*
     * Checked here so the trader is told before the round trip. The server
     * checks all of it again and its answer is the one that counts — these
     * mirror `assertOcoCompatible`, which refuses the same shapes for the same
     * reason: one hold has to cover whichever leg survives.
     */
    if (!(numericAmount > 0)) {
      setOrderError(tCommon("error_not_positive"));
      return;
    }
    if (!(numericLimit > 0) || !(numericStop > 0)) {
      setOrderError(t("oco_needs_both_prices"));
      return;
    }
    if (numericLimit === numericStop) {
      setOrderError(t("oco_prices_must_differ"));
      return;
    }
    if (numericAmount < minAmount) {
      setOrderError(`${tCommon("amount")} < ${minAmount} ${currency}`);
      return;
    }
    if (maxAmount > 0 && numericAmount > maxAmount) {
      setOrderError(`${tCommon("amount")} > ${maxAmount} ${currency}`);
      return;
    }

    setIsSubmitting(true);
    const { error } = await $fetch({
      // Its own endpoint, not the ordinary order route: the two legs are placed
      // and compensated together, and a half-placed OCO is a resting order the
      // trader did not ask for.
      url: "/api/ecosystem/order/oco",
      method: "POST",
      body: {
        currency,
        pair,
        side: buyMode ? "BUY" : "SELL",
        amount: numericAmount,
        limitPrice: numericLimit,
        stopPrice: numericStop,
      },
    });
    setIsSubmitting(false);

    if (error) {
      setOrderError(error);
      return;
    }

    setAmount("");
    setPercentSelected(null);
    fetchWalletData();
    window.dispatchEvent(new CustomEvent("order-placed"));
  };

  return (
    <div className="space-y-2">
      <SideToggle
        buyMode={buyMode}
        onBuy={() => setBuyMode(true)}
        onSell={() => setBuyMode(false)}
        buyLabel={tCommon("buy")}
        sellLabel={tCommon("sell")}
      />

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <FieldLabel>{tCommon("market_price")}</FieldLabel>
          <DirectionalPrice
            price={marketPrice}
            direction={priceDirection}
            iconSide="right"
          />
        </div>
      </div>

      <UnitField
        label={tCommon("target_price")}
        unit={pair}
        value={limitPrice}
        onChange={(e) => setLimitPrice(e.target.value)}
      />

      <UnitField
        label={t("oco_protection_price")}
        unit={pair}
        value={stopPrice}
        onChange={(e) => setStopPrice(e.target.value)}
      />

      <UnitField
        label={tCommon("amount")}
        unit={currency}
        value={amount}
        onChange={handleAmountChange}
      />

      <PercentButtons
        percentSelected={percentSelected}
        onPercentClick={handlePercentClick}
      />

      <NoteBox>{t("oco_explainer")}</NoteBox>

      {orderError && <OrderErrorBox message={orderError} />}

      <SubmitOrderButton
        buyMode={buyMode}
        isSubmitting={isSubmitting}
        onClick={handleSubmit}
        processingLabel={tCommon("processing")}
      >
        {t("place_oco")}
      </SubmitOrderButton>
    </div>
  );
}
