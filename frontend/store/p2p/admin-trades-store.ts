"use client";

import { create } from "zustand";
import { $fetch } from "@/lib/api";

/**
 * The admin trade case store.
 *
 * SCOPE NOTE — THIS NO LONGER HOLDS A TRADE LIST.
 * -----------------------------------------------
 * It used to carry `trades`, `totalTrades`, `isLoadingTrades`, `tradesError`,
 * pagination and a `getTrades()` action. Nothing read any of it: the admin trade
 * LIST is a `DataTable` (see `admin/p2p/trade/client.tsx`), which owns its own
 * fetching, filters and pagination. The only cost of the dead slice was that
 * `resolveTrade` and `cancelTrade` each ended with
 * `await get().getTrades({}, currentPage, pageSize)` — a third HTTP round trip
 * per action, awaited before the caller was told whether the action succeeded,
 * whose result was written into state no component subscribes to. The detail
 * page's actions now cost exactly two requests: the action, and the re-read.
 */

/** What the settlement authority reports back after an escrow movement. */
export interface P2PSettlementReceipt {
  settled: boolean;
  alreadySettled: boolean;
  escrowConsumed: number;
  buyerCredited: number;
  sellerRefunded: number;
  returnedToOffer: number;
  platformFee: number;
  /** Set by the cancel route; derived for resolve. */
  fundsReleased: boolean;
}

export interface AdminTradesState {
  tradeDetails: Record<string, P2PAdminTradeCase>;
  isLoadingTradeDetails: boolean;
  tradeDetailsError: string | null;
  /** Set when a refresh fails but a previously loaded trade is still on screen. */
  staleSince: string | null;

  isResolvingTrade: boolean;
  resolvingTradeError: string | null;
  isCancellingTrade: boolean;
  cancellingTradeError: string | null;
  isAddingNote: boolean;
  addingNoteError: string | null;
  isSendingMessage: boolean;
  sendingMessageError: string | null;

  /**
   * What the last escrow movement actually did.
   *
   * Both action routes return a `settlement` envelope — `buyerCredited`,
   * `sellerRefunded`, `platformFee`, `alreadySettled` — and it was being
   * discarded, so an operator who resolved a dispute was told "action completed
   * successfully" whether the escrow moved or the authority found nothing left
   * to move. Those are very different outcomes for the person waiting to be
   * paid.
   */
  lastSettlement: P2PSettlementReceipt | null;

  getTradeById: (id: string) => Promise<P2PAdminTradeCase | null>;

  /* Each resolves `true` only when the API confirmed the change. Callers must
     not announce success on a `false`. */
  resolveTrade: (
    id: string,
    resolution: "BUYER_WINS" | "SELLER_WINS" | "SPLIT" | "CANCELLED",
    notes: string,
    /** SPLIT only: the buyer's share of the escrow, 0-100. */
    buyerPercentage?: number
  ) => Promise<boolean>;
  cancelTrade: (id: string, reason: string) => Promise<boolean>;
  addAdminNote: (id: string, note: string) => Promise<boolean>;
  sendAdminMessage: (id: string, message: string) => Promise<boolean>;
  clearActionErrors: () => void;
}

function toReceipt(raw: any): P2PSettlementReceipt | null {
  if (!raw || typeof raw !== "object") return null;
  const buyerCredited = Number(raw.buyerCredited) || 0;
  const sellerRefunded = Number(raw.sellerRefunded) || 0;
  const returnedToOffer = Number(raw.returnedToOffer) || 0;
  const platformFee = Number(raw.platformFee) || 0;
  return {
    settled: !!raw.settled,
    alreadySettled: !!raw.alreadySettled,
    escrowConsumed: Number(raw.escrowConsumed) || 0,
    buyerCredited,
    sellerRefunded,
    returnedToOffer,
    platformFee,
    /* The cancel route sends this; the resolve route does not, so derive it the
       same way that route does — money actually moved, rather than a branch
       having run. */
    fundsReleased:
      raw.fundsReleased ??
      buyerCredited + sellerRefunded + returnedToOffer + platformFee > 0,
  };
}

export const useAdminTradesStore = create<AdminTradesState>((set, get) => ({
  tradeDetails: {},
  isLoadingTradeDetails: false,
  tradeDetailsError: null,
  staleSince: null,

  isResolvingTrade: false,
  resolvingTradeError: null,
  isCancellingTrade: false,
  cancellingTradeError: null,
  isAddingNote: false,
  addingNoteError: null,
  isSendingMessage: false,
  sendingMessageError: null,

  lastSettlement: null,

  clearActionErrors: () =>
    set({
      resolvingTradeError: null,
      cancellingTradeError: null,
      addingNoteError: null,
      sendingMessageError: null,
    }),

  getTradeById: async (id: string) => {
    set({ isLoadingTradeDetails: true });

    const { data, error } = await $fetch({
      url: `/api/admin/p2p/trade/${id}`,
      silentSuccess: true,
      /* The page renders the failure itself, next to a working way out. */
      silent: true,
    });

    if (error || !data) {
      const message = error || "The server returned no trade.";
      /*
        A FAILED REFRESH MUST NOT ERASE A TRADE THAT IS ALREADY ON SCREEN.

        Every action on this page ends with a re-read, so the state that used to
        set `tradeDetailsError` and blank the page was usually "your resolution
        succeeded and the reload after it blipped" — replacing a settled trade
        with a red error box at the exact moment the operator needed to see what
        had happened. A hard error is only a hard error when there is nothing to
        fall back to.
      */
      const hadTrade = !!get().tradeDetails[id];
      set({
        isLoadingTradeDetails: false,
        tradeDetailsError: hadTrade ? null : message,
        staleSince: hadTrade ? message : null,
      });
      return null;
    }

    set((state) => ({
      tradeDetails: { ...state.tradeDetails, [id]: data },
      isLoadingTradeDetails: false,
      tradeDetailsError: null,
      staleSince: null,
    }));
    return data as P2PAdminTradeCase;
  },

  resolveTrade: async (id, resolution, notes, buyerPercentage) => {
    set({ isResolvingTrade: true, resolvingTradeError: null });

    const { data, error } = await $fetch({
      url: `/api/admin/p2p/trade/${id}/resolve`,
      method: "POST",
      body: {
        resolution,
        notes,
        /* A percentage, not an absolute share: the server measures it against
           the escrow it actually holds. Sending an amount this page computed
           from a cached figure would be a race with any concurrent settlement. */
        ...(resolution === "SPLIT" && buyerPercentage !== undefined
          ? { buyerPercentage }
          : {}),
      },
    });

    if (error) {
      set({ resolvingTradeError: error, isResolvingTrade: false });
      return false;
    }

    /* The action routes answer with an acknowledgement envelope
       ({ message, trade: { id, status }, settlement }), NOT a trade detail
       object — writing it into `tradeDetails` would replace the trade with a
       stub. Keep the receipt, re-read the trade. */
    set({
      isResolvingTrade: false,
      lastSettlement: toReceipt((data as any)?.settlement),
    });
    await get().getTradeById(id);
    return !!data;
  },

  cancelTrade: async (id: string, reason: string) => {
    set({ isCancellingTrade: true, cancellingTradeError: null });

    const { data, error } = await $fetch({
      url: `/api/admin/p2p/trade/${id}/cancel`,
      method: "POST",
      body: { reason },
    });

    if (error) {
      set({ cancellingTradeError: error, isCancellingTrade: false });
      return false;
    }

    set({
      isCancellingTrade: false,
      lastSettlement: toReceipt((data as any)?.settlement),
    });
    await get().getTradeById(id);
    return !!data;
  },

  /*
    NOTES AND MESSAGES ARE TWO ACTIONS, NOT ONE WITH A FLAG.

    They shared `addAdminNote(id, note, isMessage)` and therefore shared one
    `isAddingNote` spinner and one `addingNoteError` slot — so a failed broadcast
    printed its error under the internal-note box, and typing in either one
    disabled the other. They go to the same route; they are not the same act.
  */
  addAdminNote: async (id: string, note: string) => {
    set({ isAddingNote: true, addingNoteError: null });

    const { data, error } = await $fetch({
      url: `/api/admin/p2p/trade/${id}/note`,
      method: "POST",
      body: { note, isMessage: false },
    });

    if (error) {
      set({ addingNoteError: error, isAddingNote: false });
      return false;
    }

    set({ isAddingNote: false });
    await get().getTradeById(id);
    return !!data;
  },

  sendAdminMessage: async (id: string, message: string) => {
    set({ isSendingMessage: true, sendingMessageError: null });

    const { data, error } = await $fetch({
      url: `/api/admin/p2p/trade/${id}/note`,
      method: "POST",
      body: { note: message, isMessage: true },
    });

    if (error) {
      set({ sendingMessageError: error, isSendingMessage: false });
      return false;
    }

    /* The route broadcasts the message over the trade socket, and this page is
       subscribed — so the transcript updates without a re-read. It is still
       re-read because the message is also appended to `timeline`, which is what
       a later reload will serve. */
    set({ isSendingMessage: false });
    await get().getTradeById(id);
    return !!data;
  },
}));
