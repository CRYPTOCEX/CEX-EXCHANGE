import type { WalletData } from "../spot/types";

/**
 * How the venue reserves QUOTE currency for a BUY, on the venues that do.
 *
 * An ecosystem market pre-holds `cost + fee` in the pair currency and refuses
 * the order when the free balance is under it (placeEcosystemOrder). Sizing a
 * 100% BUY off the raw balance therefore leaves nothing for the fee and the
 * server rejects every time — on the platform's own 1% default the ticket asks
 * for ~1.01x the balance it can actually spend.
 *
 * A CEX market must pass nothing here: its BUY fee comes out of the currency
 * RECEIVED (exchange order/index.post.ts nets it off the base), so reserving
 * quote for it would silently under-spend the max button.
 */
export interface BuyQuoteReserve {
  /** Fee fraction (0.01 = 1%), charged in quote ON TOP of the cost. */
  feeRate: number;
  /**
   * Per-unit price the reserve is computed from, when the backend does not size
   * it off the price on the ticket. A stop-market BUY reserves off the STOP
   * price plus a slippage buffer, not off the last traded price.
   */
  reservePrice?: number | null;
}

export interface PercentAmountArgs {
  /** 25 | 50 | 75 | 100 */
  percent: number;
  buyMode: boolean;
  /** Raw price string as typed/formatted, e.g. "48,235.75". */
  price: string;
  walletData: WalletData | null;
  amountPrecision: number;
  pricePrecision: number;
  minAmount: number;
  maxAmount: number;
  /** Kept per-form so the console output is unchanged. */
  invalidPriceWarning: string;
  /**
   * Quote-denominated BUY reserve, for markets that charge the fee in quote.
   * Omitted or null = the CEX model, where the fee comes out of the currency
   * received and the whole quote balance is spendable on cost. Ignored on SELL.
   */
  buyQuoteReserve?: BuyQuoteReserve | null;
}

export interface PercentAmountResult {
  amount: string;
  total: string;
}

/**
 * The 25/50/75/100 sizing maths shared by every spot order form.
 *
 * This was three byte-identical copies (limit, market, stop) differing only in
 * which price they read and whether they also wrote a `total`. Sizing decides
 * how much of a balance a click spends, so three copies of it is three places
 * a rounding rule can drift apart. The stop form ignores `total`.
 */
export function computePercentAmount({
  percent,
  buyMode,
  price,
  walletData,
  amountPrecision,
  pricePrecision,
  minAmount,
  maxAmount,
  invalidPriceWarning,
  buyQuoteReserve,
}: PercentAmountArgs): PercentAmountResult {
  try {
    // Validate price first
    const numericPrice = Number(price.replace(/,/g, ""));
    if (!numericPrice || isNaN(numericPrice) || numericPrice <= 0) {
      console.warn(invalidPriceWarning);
      return { amount: "", total: "" };
    }

    // Get available balance based on trading mode.
    // For buy orders (buyMode = true), use pair balance (USDT) to calculate how much currency (BTC) can be bought.
    // For sell orders (buyMode = false), use currency balance (BTC) to calculate how much to sell.
    const rawBalance = buyMode
      ? walletData?.pairBalance
      : walletData?.currencyBalance;

    // HOLD model: wallet.balance is the available/free amount; inOrder is held
    // (in a trade or a P2P offer). Spendable === balance directly.
    const availableBalance =
      typeof rawBalance === "object" && rawBalance !== null
        ? rawBalance.balance
        : rawBalance || 0;

    // Check if balance is available
    if (!availableBalance || availableBalance <= 0) {
      return { amount: "0", total: "0" };
    }

    let calculatedAmount: string;

    if (buyMode) {
      // What ONE unit of the base actually takes out of the quote balance.
      //
      // Without `buyQuoteReserve` this is just the price: on a CEX market the
      // BUY fee is netted off the currency received, so the whole quote balance
      // buys cost. On an ecosystem market the fee is pre-held in quote next to
      // the cost, and sizing off the bare price is what made the 100% button
      // ask for more than the balance and get refused by the server.
      const reserveFeeRate =
        buyQuoteReserve && buyQuoteReserve.feeRate > 0
          ? buyQuoteReserve.feeRate
          : 0;
      const reservePrice =
        buyQuoteReserve?.reservePrice != null && buyQuoteReserve.reservePrice > 0
          ? buyQuoteReserve.reservePrice
          : numericPrice;
      const quotePerUnit = reservePrice * (1 + reserveFeeRate);

      let availableForPurchase = availableBalance * (percent / 100);

      // For 100% buy orders, reduce slightly to avoid floating-point precision issues
      if (percent === 100) {
        availableForPurchase = availableForPurchase * 0.9999;
      }

      // amount = availableForPurchase / cost-per-unit
      const amountValue = availableForPurchase / quotePerUnit;

      // Check for NaN
      if (isNaN(amountValue) || amountValue <= 0) {
        return { amount: "0", total: "0" };
      }

      // Round DOWN to ensure we never exceed available balance
      let flooredAmount =
        Math.floor(amountValue * Math.pow(10, amountPrecision)) /
        Math.pow(10, amountPrecision);

      // Verify what the order RESERVES doesn't exceed the available balance.
      // This loop used to re-test against the bare cost, so on an eco market it
      // pushed the amount back up to the fee-free ceiling the check above had
      // just come down from.
      const tick = 1 / Math.pow(10, amountPrecision);
      while (
        flooredAmount > 0 &&
        flooredAmount * quotePerUnit > availableBalance
      ) {
        flooredAmount =
          Math.round((flooredAmount - tick) * Math.pow(10, amountPrecision)) /
          Math.pow(10, amountPrecision);
      }

      calculatedAmount = flooredAmount.toString();
    } else {
      // For sell orders: calculate percentage of currency balance to sell.
      // Fee is deducted from the proceeds, not from the amount being sold,
      // so we can use the full percentage of the balance.
      let amountValue = availableBalance * (percent / 100);

      // For 100% sell orders, reduce by a tiny amount (0.0001%) to avoid
      // floating-point precision issues in backend validation
      if (percent === 100) {
        amountValue = amountValue * 0.999999;
      }

      // Check for NaN
      if (isNaN(amountValue) || amountValue <= 0) {
        return { amount: "0", total: "0" };
      }

      calculatedAmount = amountValue.toFixed(amountPrecision);
    }

    // Ensure amount is within limits
    const numAmount = Number(calculatedAmount);
    if (isNaN(numAmount)) {
      return { amount: "0", total: "0" };
    }

    // Determine the final amount to use (respecting min/max limits)
    let finalAmount: number;
    let amount: string;
    if (numAmount < minAmount) {
      finalAmount = minAmount;
      amount = minAmount.toFixed(amountPrecision);
    } else if (numAmount > maxAmount) {
      finalAmount = maxAmount;
      amount = maxAmount.toFixed(amountPrecision);
    } else {
      finalAmount = numAmount;
      amount = calculatedAmount;
    }

    // Calculate total using the FINAL amount that was actually set
    const calculatedTotal = numericPrice * finalAmount;
    return {
      amount,
      total: isNaN(calculatedTotal)
        ? "0"
        : calculatedTotal.toFixed(pricePrecision),
    };
  } catch (error) {
    console.error("Error calculating amount:", error);
    return { amount: "0", total: "0" };
  }
}

/** Currency-aware decimal formatting, shared by the AI investment fields. */
export function formatCurrencyValue(value: number, currency: string): string {
  if (currency.includes("BTC")) {
    return value.toFixed(8);
  } else if (currency.includes("ETH")) {
    return value.toFixed(6);
  } else {
    return value.toFixed(2);
  }
}
