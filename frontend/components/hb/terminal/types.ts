/**
 * Wire shapes for the live bot console.
 *
 * Mirrors `backend/src/api/(ext)/hb/utils/tradingSnapshot.ts`. Both the admin
 * panel (watching a bot we host) and the customer console (watching a bot they
 * host) render from exactly this payload — the subject differs, the picture
 * does not.
 */

export type MarketKind = "spot" | "perp";
export type OrderSide = "BUY" | "SELL";

export interface ConsoleQuote {
  id: string;
  market: MarketKind;
  symbol: string;
  side: OrderSide;
  price: number;
  amount: number;
  filled: number;
  /** Resting time at the moment the snapshot was built. */
  ageMs: number;
}

export interface ConsoleFill {
  id: string;
  market: MarketKind;
  symbol: string;
  side: OrderSide;
  price: number;
  amount: number;
  at: number;
}

export interface ConsolePosition {
  id: string;
  symbol: string;
  side: string;
  entryPrice: number;
  amount: number;
  leverage: number | null;
  unrealizedPnl: number;
}

export interface ConsoleSymbolView {
  symbol: string;
  market: MarketKind;
  bestBid: number | null;
  bestAsk: number | null;
  mid: number | null;
  ourBid: number | null;
  ourAsk: number | null;
  spreadPct: number | null;
  ourSpreadPct: number | null;
  bids: ConsoleQuote[];
  asks: ConsoleQuote[];
  book: { bids: [number, number][]; asks: [number, number][] };
  /**
   * False when the backend could not READ the book (engine absent, storage
   * unreachable) — so an empty ladder proves nothing about the market.
   *
   * Optional because a snapshot from an older backend does not carry it, and
   * "absent" must read as "no reason to doubt the book" rather than as false.
   * See `readVerdict`, which judges this before any liquidity verdict.
   */
  bookKnown?: boolean;
}

export interface TradingSnapshot {
  at: number;
  engines: { spot: boolean; perp: boolean };
  symbols: ConsoleSymbolView[];
  positions: ConsolePosition[];
  fills: ConsoleFill[];
  stats: {
    openOrders: number;
    quotedSymbols: number;
    notionalAtRisk: number;
    fills5m: number;
    volume5m: number;
    lastFillAt: number | null;
    twoSided: boolean;
  };
}

/** Admin-side envelope: an instance may have nothing to show, and should say why. */
export interface TradingFrame {
  instanceId: string;
  symbol: string | null;
  unavailable: string | null;
  snapshot: TradingSnapshot | null;
}

/* ------------------------------------------------------------- formatting */

/**
 * Price precision from magnitude. A ladder that prints `0.00` for a
 * sub-cent altcoin, or eight decimals on BTC, is unreadable in opposite ways.
 */
export function priceDecimals(p: number): number {
  const v = Math.abs(p);
  if (!v) return 2;
  if (v >= 1000) return 2;
  if (v >= 1) return 4;
  if (v >= 0.01) return 6;
  return 8;
}

export function fmtPrice(p: number | null | undefined): string {
  if (p == null || !Number.isFinite(p)) return "—";
  return p.toLocaleString(undefined, {
    minimumFractionDigits: priceDecimals(p),
    maximumFractionDigits: priceDecimals(p),
  });
}

export function fmtAmount(a: number | null | undefined): string {
  if (a == null || !Number.isFinite(a)) return "—";
  if (a === 0) return "0";
  if (a >= 1000) return a.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (a >= 1) return a.toFixed(4).replace(/\.?0+$/, "");
  return a.toFixed(6).replace(/\.?0+$/, "");
}

export function fmtNotional(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(1)}k`;
  return v.toFixed(2);
}

/** Compact age: "4s", "3m", "2h". Used for quote age and time-since-fill. */
export function fmtAge(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return "—";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}
