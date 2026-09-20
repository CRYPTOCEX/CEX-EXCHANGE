/**
 * The contract between the order book and an order ticket.
 *
 * Its own module, deliberately: the ticket needs the event NAME and the shape of
 * its detail, and nothing else. Importing them from `orderbook-panel.tsx` would
 * pull the whole panel — its stylesheet, the feed hook, the book maths — into
 * every chunk that renders a form, for the sake of one string.
 *
 * The Pro terminal has its own equivalent (`tp-set-order-price`); this is the
 * retail one, and it carries the size as well as the price.
 */

export const ORDERBOOK_SELECT_EVENT = "trade:orderbook-select";

export interface OrderbookSelectDetail {
  price: number;
  /** Size resting at the clicked level. */
  amount: number;
  /** Running size from the touch of the book to the clicked level. */
  cumulative: number;
  side: "bid" | "ask";
  /** True when the click carried a modifier — fill the size too. */
  withSize: boolean;
}
