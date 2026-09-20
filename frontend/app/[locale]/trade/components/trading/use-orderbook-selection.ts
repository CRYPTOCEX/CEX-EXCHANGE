"use client";

import { useEffect, useRef } from "react";

import {
  ORDERBOOK_SELECT_EVENT,
  type OrderbookSelectDetail,
} from "../orderbook/selection-event";

export interface OrderbookSelectionHandlers {
  /** Fill the price field. Always called for a valid level. */
  onPrice?: (price: string) => void;
  /**
   * Fill the size field. Called ONLY when the click carried a modifier, so a
   * plain click never overwrites a size the trader has already typed.
   */
  onAmount?: (amount: string) => void;
  /** Decimal places for the values handed to the callbacks. */
  pricePrecision?: number;
  amountPrecision?: number;
}

/**
 * Click a level in the order book, fill this ticket.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS EXISTS AT ALL
 * ---------------------------------------------------------------------------
 *
 * Every row of the retail order book carried `cursor-pointer` and a hover tint
 * and had no click handler anywhere in the file. The affordance was a lie: the
 * panel said "this is a control" to every trader who moved a mouse over it, for
 * as long as it has shipped. The Pro terminal had the interaction (via
 * `tp-set-order-price`) and the retail terminal had the pointer.
 *
 * A window event rather than a shared store, matching what Pro already does:
 * the book and the ticket are siblings under a layout that owns neither, and
 * the alternative is threading a callback through the panel registry and both
 * layouts to reach a form that may not be mounted.
 *
 * ---------------------------------------------------------------------------
 * WHAT THE MODIFIER MEANS
 * ---------------------------------------------------------------------------
 *
 * A plain click fills the price only. A shift- or alt-click also fills the
 * size — the CUMULATIVE size to that level, not the level's own, because
 * "click the level I want to reach" is the question the running total answers.
 * Overwriting a typed size on an unmodified click would make the book
 * dangerous to browse.
 */
export function useOrderbookSelection({
  onPrice,
  onAmount,
  pricePrecision = 8,
  amountPrecision = 8,
}: OrderbookSelectionHandlers): void {
  /* The handlers are held in a ref so a caller may pass fresh closures every
     render — which any handler that reads state is — without the listener
     being torn down and re-attached on every keystroke in the ticket. */
  const handlersRef = useRef({ onPrice, onAmount, pricePrecision, amountPrecision });

  useEffect(() => {
    handlersRef.current = { onPrice, onAmount, pricePrecision, amountPrecision };
  }, [onPrice, onAmount, pricePrecision, amountPrecision]);

  useEffect(() => {
    const handle = (event: Event) => {
      const detail = (event as CustomEvent<OrderbookSelectDetail>).detail;
      if (!detail) return;

      const current = handlersRef.current;

      const price = Number(detail.price);
      if (Number.isFinite(price) && price > 0) {
        current.onPrice?.(price.toFixed(current.pricePrecision));
      }

      if (!detail.withSize) return;

      const size = Number(detail.cumulative ?? detail.amount);
      if (Number.isFinite(size) && size > 0) {
        current.onAmount?.(size.toFixed(current.amountPrecision));
      }
    };

    window.addEventListener(ORDERBOOK_SELECT_EVENT, handle);
    return () => window.removeEventListener(ORDERBOOK_SELECT_EVENT, handle);
  }, []);
}
