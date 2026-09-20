/**
 * Every derived figure in the bot terminal, in one place.
 *
 * WHY THIS FILE EXISTS AT ALL — a bug that shipped without it
 * The verdict, the wedge and the ladder's spread band each did their own
 * arithmetic, and two of them independently decided that "our spread is wider
 * than the book's spread" means the bot is quoting behind the market. It does
 * not. It is a MATHEMATICAL IDENTITY:
 *
 *   `bestBid` comes from the public book — the same book our own resting
 *   orders are sitting in. So `bestBid` is the maximum over ALL bids including
 *   ours, which makes `bestBid >= ourBid` unconditionally true. Symmetrically
 *   `bestAsk <= ourAsk`. Therefore `ourSpread >= bookSpread`, always, for every
 *   bot, forever.
 *
 * The warning built on that comparison could only ever be silent when the bot
 * was at the touch on BOTH sides simultaneously — so a perfectly healthy market
 * maker was told it was quoting behind the market essentially all the time.
 * That is the one sentence a non-expert customer actually reads.
 *
 * The honest question is per-side: how far behind the touch is each side, in
 * basis points. That is `edgeBps` below, and everything else derives from it.
 */

import type { ConsoleFill, ConsoleQuote, ConsoleSymbolView, TradingSnapshot } from "./types";

/* ------------------------------------------------------------------- edges */

/**
 * Distance from the touch on one side, in basis points of the mid.
 *
 * NOT clamped at zero, deliberately. The book is cached for a fraction of a
 * tick while our orders are read fresh, so an order placed inside the current
 * touch genuinely produces a small negative edge for one frame. Clamping would
 * silently hide the one moment the bot did something good; showing the overhang
 * is honest and self-correcting on the next frame.
 */
export function edgeBps(view: ConsoleSymbolView, side: "bid" | "ask"): number | null {
  if (!view.mid) return null;
  if (side === "bid") {
    if (view.ourBid == null || view.bestBid == null) return null;
    return ((view.bestBid - view.ourBid) / view.mid) * 10_000;
  }
  if (view.ourAsk == null || view.bestAsk == null) return null;
  return ((view.ourAsk - view.bestAsk) / view.mid) * 10_000;
}

/** The book's own spread in basis points — the reference the edge is judged against. */
export function bookSpreadBps(view: ConsoleSymbolView): number | null {
  if (!view.mid || view.bestBid == null || view.bestAsk == null) return null;
  return ((view.bestAsk - view.bestBid) / view.mid) * 10_000;
}

/** At the front of the queue. The small tolerance absorbs float noise. */
export function atTouch(bps: number | null): boolean {
  return bps != null && bps <= 0.05;
}

/**
 * How far behind the touch a side has to sit before it is worth a warning.
 *
 * Scaled to the book, because "5 bps behind" is nothing on a wide altcoin book
 * and enormous on a tight major. The floor stops a near-zero book spread from
 * making every rounding error look like a problem.
 */
export function behindThresholdBps(view: ConsoleSymbolView): number {
  const book = bookSpreadBps(view);
  return Math.max(5, (book ?? 0) * 0.25);
}

export function isBehind(view: ConsoleSymbolView, side: "bid" | "ask"): boolean {
  const bps = edgeBps(view, side);
  if (bps == null) return false;
  return bps > behindThresholdBps(view);
}

/* -------------------------------------------------------------- book depth */

/**
 * The backend returns only the top 12 levels per side.
 *
 * A quote resting outside that window has no book row to merge with, so it is
 * synthesised as a level whose entire size is ours — which is correct as far as
 * it goes, but it also means the price axis can be dragged arbitrarily far from
 * the mid by a single stale order. Callers use this to decide when to stop
 * scaling and show an off-scale marker instead of a squashed picture.
 */
export const BOOK_DEPTH = 12;

/**
 * Widest distance from the mid the wedge will scale to.
 *
 * Beyond this the axis stops growing and the offending side is flagged as
 * off-scale, because a wedge auto-scaled to a quote 40% away from the mid
 * renders the actual spread — the entire point of the instrument — as a
 * sub-pixel smear.
 */
export function wedgeHalfRange(view: ConsoleSymbolView): number | null {
  if (!view.mid) return null;
  const bookOffsets = [view.bestBid, view.bestAsk]
    .filter((p): p is number => p != null)
    .map((p) => Math.abs(p - view.mid!));
  const bookHalf = bookOffsets.length ? Math.max(...bookOffsets) : view.mid * 1e-5;
  // Eight times the book's own half-spread is generous enough to show a quote
  // that is genuinely a bit wide, and tight enough that one runaway order
  // cannot flatten the picture.
  const ceiling = Math.max(bookHalf * 8, view.mid * 1e-5);
  const ourOffsets = [view.ourBid, view.ourAsk]
    .filter((p): p is number => p != null)
    .map((p) => Math.abs(p - view.mid!));
  const wanted = Math.max(bookHalf, ...ourOffsets, view.mid * 1e-6);
  return Math.min(wanted * 1.25, ceiling);
}

/** True when a side's quote falls outside the wedge's clamped axis. */
export function offScale(view: ConsoleSymbolView, side: "bid" | "ask"): boolean {
  const half = wedgeHalfRange(view);
  if (half == null || !view.mid) return false;
  const p = side === "bid" ? view.ourBid : view.ourAsk;
  if (p == null) return false;
  return Math.abs(p - view.mid) > half;
}

/* ------------------------------------------------------------------- fills */

/** Default activity window, matching the server's own `fills5m` counter. */
export const FILL_WINDOW_MS = 5 * 60_000;

/**
 * Fills inside the activity window.
 *
 * `snapshot.fills` is the tail of a ring buffer, NOT a time window — on a busy
 * bot it can span seconds, on a quiet one hours. Every ratio computed from it
 * must be windowed first, or "60% of fills were buys" silently describes
 * yesterday.
 */
export function windowFills(
  fills: ConsoleFill[],
  now: number,
  windowMs = FILL_WINDOW_MS
): ConsoleFill[] {
  const cutoff = now - windowMs;
  return fills.filter((f) => f.at >= cutoff);
}

/**
 * Below this many events, a buy/sell ratio is noise dressed as a finding.
 * Two fills that happened to both be buys is not a 100% skew.
 */
export const MIN_SAMPLE = 6;

export function sideBalance(fills: ConsoleFill[]): {
  buy: number;
  sell: number;
  buyValue: number;
  sellValue: number;
  sample: number;
  confident: boolean;
} {
  let buy = 0;
  let sell = 0;
  let buyValue = 0;
  let sellValue = 0;
  for (const f of fills) {
    const v = f.price * f.amount;
    if (f.side === "BUY") {
      buy++;
      buyValue += v;
    } else {
      sell++;
      sellValue += v;
    }
  }
  return {
    buy,
    sell,
    buyValue,
    sellValue,
    sample: fills.length,
    confident: fills.length >= MIN_SAMPLE,
  };
}

/** Signed quote-currency flow over the window: bought minus sold. */
export function netFlow(fills: ConsoleFill[]): number {
  return fills.reduce(
    (sum, f) => sum + (f.side === "BUY" ? -1 : 1) * f.price * f.amount,
    0
  );
}

/* ------------------------------------------------------------------- ages */

/** Age at which a resting quote stops looking like a live one. */
export const STALE_REFERENCE_MS = 60_000;

export function quoteAges(quotes: ConsoleQuote[], driftMs: number): number[] {
  return quotes.map((q) => q.ageMs + driftMs);
}

export function oldestAge(quotes: ConsoleQuote[], driftMs: number): number | null {
  if (!quotes.length) return null;
  return Math.max(...quotes.map((q) => q.ageMs)) + driftMs;
}

/* ----------------------------------------------------------------- verdict */

export type VerdictTone = "success" | "warning" | "destructive" | "neutral";

/** One word for the header lamp — answers "is it working" in a saccade. */
export type LampState =
  | "QUOTING"
  | "BEHIND"
  | "ONE-SIDED"
  | "IDLE"
  | "NO BOOK"
  /**
   * We could not READ the book — distinct from "NO BOOK", which asserts the
   * market is empty. One is our fault and the other is the market's, and the
   * lamp is the first thing the operator reads, so it must not conflate them.
   */
  | "NO FEED"
  | "STALE"
  | "NO BOT"
  | "REFUSED";

export interface Verdict {
  tone: VerdictTone;
  lamp: LampState;
  label: string;
  detail: string;
  /** Machine-readable so a route can offer the matching remedy. */
  remedy:
    | "none"
    | "seed-liquidity"
    | "check-funds"
    | "check-bot"
    | "tighten-spread"
    | "connect-bot";
}

/* -------------------------------------------------------------- the bot link */

/**
 * Whether a bot is reaching the exchange at all, from `GET /api/hb/setup`.
 *
 * WHY THE TERMINAL NEEDS THIS
 * "No resting orders on any market" restates the empty screen; it does not
 * explain it. Three completely different situations produce that same screen —
 * nothing has ever connected, something is connecting and being refused, or the
 * bot is connected and simply not placing orders — and they have nothing in
 * common except the symptom. Without the link state the page has to guess, and
 * the guess it used to make was "check your API keys", which is the wrong
 * instruction for a customer who has never installed the connector.
 */
export type BotLinkState = "no-key" | "never" | "rejected" | "connected" | "silent";

export interface BotLink {
  state: BotLinkState;
  lastSeenAt: number | null;
  lastRejection: { action: string; at: number } | null;
}

/**
 * A refusal, in the customer's terms, with the fix.
 *
 * Every one of these is invisible from our side of the wire until it is said out
 * loud: the bot logs its 401 on a machine we do not have, and the customer is
 * looking at this page instead.
 */
export function describeRejection(action: string): { what: string; fix: string } {
  switch (action) {
    case "auth.skew_blocked":
      return {
        what: "its signature is valid but the clock on that machine is too far out",
        fix: "Sync the clock where the bot runs. The credentials are correct — only the time is wrong.",
      };
    case "auth.failed":
      return {
        what: "the signature does not match",
        fix: "The API secret configured in the bot is not the one this key was created with. Rotate the key to mint a fresh secret and re-run `connect`.",
      };
    case "auth.scope_blocked":
      return {
        what: "the key it is signing with lacks the “Control my bot” permission",
        fix: "That permission is deliberately not part of the trading presets, so a key made for trading cannot drive the bot. Add it to the key, or create a bot-control key, then restart the agent.",
      };
    case "auth.disabled_blocked":
      return {
        what: "the key it is signing with is disabled",
        fix: "Re-enable it on the API Keys page. This is also what the emergency stop does.",
      };
    case "auth.ip_blocked":
      return {
        what: "its IP address is not on the key's allowlist",
        fix: "Add the bot machine's public IP to the key, or turn the IP restriction off.",
      };
    case "auth.expired":
      return {
        what: "the key has expired",
        fix: "Create a new key and re-run `connect` in the bot.",
      };
    case "auth.replay_blocked":
      return {
        what: "it reused a request nonce",
        fix: "Two copies of the bot are almost certainly running with the same key. Stop one.",
      };
    default:
      return {
        what: "the exchange refused its request",
        fix: "Check the key it is signing with on the API Keys page.",
      };
  }
}

/**
 * The state of the bot, in a sentence.
 *
 * Ordered by severity, and every branch names a real, distinguishable failure.
 * The first one is the genuinely silent case: a market maker quotes AROUND a
 * mid price, so with no book there is nothing to anchor to and the bot runs
 * happily, logs happily, and never places an order.
 */
export function readVerdict(
  snap: TradingSnapshot,
  view: ConsoleSymbolView | null,
  driftMs = 0,
  link?: BotLink | null
): Verdict {
  /*
   * A REFUSED LINK OUTRANKS EVERYTHING, including a healthy-looking book.
   *
   * It has to. If requests are being turned away then whatever is on screen is
   * frozen history — the orders resting on the book are the last ones the bot
   * managed to place and nothing is managing them now, which is strictly worse
   * than having none. Reporting "quoting both sides" over a dead link is the
   * single most misleading thing this page could say.
   */
  if (link?.state === "rejected" && link.lastRejection) {
    const { what, fix } = describeRejection(link.lastRejection.action);
    return {
      tone: "destructive",
      lamp: "REFUSED",
      label: "Your bot is being refused",
      detail: `Something is signing requests as you, but ${what}. ${fix}`,
      remedy: link.lastRejection.action === "auth.disabled_blocked" ? "check-bot" : "connect-bot",
    };
  }

  if (!view) {
    /*
     * The link state is what makes this branch useful. Without it every one of
     * the cases below produced the same sentence, and the same "check your API
     * keys" button — advice that is wrong for someone who has no key, wrong for
     * someone whose key is fine and whose bot is not running, and wrong again
     * for someone whose bot is connected and just is not quoting.
     */
    if (link?.state === "no-key") {
      return {
        tone: "neutral",
        lamp: "NO BOT",
        label: "No bot connected yet",
        detail:
          "You have no Hummingbot API key, so nothing can reach the exchange as you. Create one, install the connector into your own Hummingbot, and this page fills in on its own.",
        remedy: "connect-bot",
      };
    }
    if (link?.state === "never") {
      return {
        tone: "neutral",
        lamp: "NO BOT",
        label: "Nothing has connected yet",
        detail:
          "Your key exists but has never been used — no signed request has ever arrived from a bot. Either it is not running, the connector is not installed, or it is pointed at a different exchange.",
        remedy: "connect-bot",
      };
    }
    if (link?.state === "silent") {
      return {
        tone: "warning",
        lamp: "IDLE",
        label: "Your bot has stopped talking to us",
        detail:
          "It authenticated before, but nothing has arrived recently and it has no orders on the book. The process has most likely exited on the machine it runs on.",
        remedy: "connect-bot",
      };
    }
    if (link?.state === "connected") {
      return {
        tone: "warning",
        lamp: "IDLE",
        label: "Connected, but not quoting",
        detail:
          "Your bot is authenticating normally, so the connector and the key are both fine. It is not placing orders — check that its strategy is running and that the pair it quotes has funds and a two-sided book.",
        remedy: "check-funds",
      };
    }
    return {
      tone: "neutral",
      lamp: "IDLE",
      label: "Nothing quoted",
      detail:
        "No resting orders on any market. If the bot is running, it has not placed anything yet.",
      remedy: "check-bot",
    };
  }

  const bids = view.bids.length;
  const asks = view.asks.length;

  /*
   * THE BOOK IS JUDGED BEFORE OUR QUOTES ARE, and the order matters.
   *
   * A maker prices its quotes at an offset from the MID, and a mid needs a best
   * bid AND a best ask — `view.mid` is null exactly when either side is
   * missing. With no mid the controller raises decimal.InvalidOperation on
   * every tick and never places an order, no matter how healthy everything
   * else is.
   *
   * Checking our own quotes first got this exactly wrong: a market with bids
   * and no asks produced "Not quoting — either it has not started, or it is out
   * of funds", sending the operator to look at balances for a condition that
   * has nothing to do with them. A HALF-empty book is the same failure as an
   * empty one, and it is far more common, because one side of a thin market
   * getting cleared out is an ordinary event.
   */
  /*
   * AN UNREADABLE BOOK IS NOT AN EMPTY ONE, AND WE MUST NOT BLAME THE MARKET.
   *
   * `bookKnown` is false when the snapshot's book read FAILED — the engine addon
   * is not installed on this server, or its storage is unreachable. The ladder
   * is empty in that case too, and every verdict below would read it as "this
   * market has no liquidity" and send the operator off to seed a market that may
   * be perfectly healthy, for a fault that is ours.
   *
   * `bookKnown === false` is the only condition here that is about US rather than
   * about the market, so it is judged first and phrased that way.
   *
   * `!== false` rather than a truthiness test: a snapshot from an older backend
   * carries no such field, and "absent" must keep the previous behaviour rather
   * than declaring every book unreadable.
   */
  if (view.bookKnown === false) {
    return {
      tone: "destructive",
      lamp: "NO FEED",
      label: "Cannot read this market's book",
      detail:
        "The order book could not be read, so nothing here can be said about liquidity — this is a problem on our side, not with your bot or with the market. The trading engine may not be installed on this server, or its storage may be unreachable. Your resting orders are unaffected; contact support if it persists.",
      // Deliberately "none": every other remedy sends the operator to change
      // something of theirs, and there is nothing of theirs to change here.
      remedy: "none",
    };
  }

  const emptyBook = !view.book.bids.length && !view.book.asks.length;
  if (emptyBook) {
    return {
      tone: "destructive",
      lamp: "NO BOOK",
      label: "No liquidity on this market",
      detail:
        "The book is empty on both sides, so there is no mid price. A maker quotes around a mid — with nothing to anchor to it cannot place its first order. Seed the market, or point the bot at a pair that already trades.",
      remedy: "seed-liquidity",
    };
  }
  if (view.mid == null) {
    const missing = !view.book.asks.length ? "asks" : "bids";
    const has = missing === "asks" ? "buy" : "sell";
    return {
      tone: "destructive",
      lamp: "NO BOOK",
      label: `The book has no ${missing}`,
      detail: `Only ${has} orders exist on this market, so there is no mid price for a maker to quote around — it will raise a decimal error on every tick and never place an order. This is not a funding or configuration problem: the market needs liquidity on both sides first.`,
      remedy: "seed-liquidity",
    };
  }
  if (!bids && !asks) {
    return {
      tone: "warning",
      lamp: "IDLE",
      label: "Not quoting",
      detail:
        "There is a two-sided book, but nothing of ours is resting on it. Either it has not started quoting yet, or it is out of funds on this pair.",
      remedy: "check-funds",
    };
  }
  if (!bids || !asks) {
    return {
      tone: "warning",
      lamp: "ONE-SIDED",
      label: "One-sided",
      detail: `Only the ${bids ? "bid" : "ask"} side is quoted. A one-sided maker takes on inventory in one direction instead of earning the spread — usually it has run out of ${bids ? "base asset to sell" : "quote currency to buy with"}.`,
      remedy: "check-funds",
    };
  }

  // Staleness before spread: orders that stopped refreshing look identical to
  // working ones on every other signal on the page, including the ladder.
  const oldest = Math.max(
    oldestAge(view.bids, driftMs) ?? 0,
    oldestAge(view.asks, driftMs) ?? 0
  );
  if (oldest >= STALE_REFERENCE_MS * 3) {
    return {
      tone: "warning",
      lamp: "STALE",
      label: "Quotes are not refreshing",
      detail: `Both sides are on the book, but the oldest has been resting for ${Math.round(oldest / 60_000)} minutes without being replaced. A strategy loop that has stopped looks exactly like a working one — same orders, same prices — except for this clock.`,
      remedy: "check-bot",
    };
  }

  // Per-side edge, NOT a spread comparison. Our orders are IN the book being
  // read, so `ourSpread >= bookSpread` is an identity and testing it warns at
  // every healthy bot that is not simultaneously at the touch on both sides.
  const behindBid = isBehind(view, "bid");
  const behindAsk = isBehind(view, "ask");
  if (behindBid && behindAsk) {
    return {
      tone: "warning",
      lamp: "BEHIND",
      label: "Behind the touch on both sides",
      detail:
        "Both quotes sit well back from the best bid and ask, so they will not fill until the market widens to meet them. Usually the strategy's spread is set wider than this market actually trades.",
      remedy: "tighten-spread",
    };
  }
  if (behindBid || behindAsk) {
    return {
      tone: "warning",
      lamp: "BEHIND",
      label: `Behind the touch on the ${behindBid ? "bid" : "ask"}`,
      detail: `The ${behindBid ? "bid" : "ask"} sits back from the touch while the other side is competitive. Fills will come in one direction only, which accumulates inventory.`,
      remedy: "tighten-spread",
    };
  }

  if (snap.stats.lastFillAt && Date.now() - snap.stats.lastFillAt < FILL_WINDOW_MS) {
    return {
      tone: "success",
      lamp: "QUOTING",
      label: "Quoting and trading",
      detail: "Both sides are on the book near the touch, and it has been filled recently.",
      remedy: "none",
    };
  }
  return {
    tone: "success",
    lamp: "QUOTING",
    label: "Quoting both sides",
    detail:
      "Bid and ask are both resting near the touch. No recent fills — normal if this market is quiet.",
    remedy: "none",
  };
}

/* ------------------------------------------------------- scope disclosure */

/**
 * Whether the account-wide header figures describe more than the visible panel.
 *
 * `openOrders`, `notionalAtRisk`, `volume5m`, `fills5m` and `twoSided` are
 * computed over the WHOLE account, while the wedge, ladder, tape and skew are
 * filtered to the active symbol. On a bot running two pairs an unlabelled
 * header reads as describing the ladder underneath it, which is wrong.
 */
export function isMultiMarket(snap: TradingSnapshot | null): boolean {
  return !!snap && snap.symbols.length > 1;
}
