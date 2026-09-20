import { create } from "zustand";

/**
 * The assistant's guidance, which has to outlive the page it started on.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS A STORE AND NOT COMPONENT STATE
 * ---------------------------------------------------------------------------
 * Every existing tour on this platform is a `useState` inside one route's
 * client component — four of them, one per terminal, each private to its own
 * page. That works because those tours never leave: the binary tour explains
 * the binary screen and the binary screen is where it lives.
 *
 * Assistant-driven guidance is the opposite shape. The whole point is that it
 * moves. "Show me how to withdraw" opens `/finance/withdraw` — a NAVIGATION,
 * which unmounts the conversation and everything in it. Any tour held in the
 * chat's component tree dies at exactly the moment it becomes useful.
 *
 * So the intent to run a walkthrough is stored ABOVE the router. A component
 * mounted in the persistent layout watches the path and starts the walkthrough
 * once the destination has actually rendered.
 *
 * ---------------------------------------------------------------------------
 * `pending` VERSUS `active`, AND WHY BOTH EXIST
 * ---------------------------------------------------------------------------
 * They are not the same state and collapsing them into one produced a real bug
 * in the obvious first version: a walkthrough that starts the instant it is
 * requested, before `router.push` has resolved, runs its first stop against the
 * OLD page — finds no anchors, falls back to a centred card, and by the time
 * the new page paints the customer has already been shown the opening card for
 * a screen they were not on.
 *
 * `pending` is "we intend to run this once we are on its route". `active` is
 * "the route matched and it is running". The host promotes one to the other,
 * and only when `usePathname()` agrees.
 *
 * ---------------------------------------------------------------------------
 * NOTHING HERE IS PERSISTED
 * ---------------------------------------------------------------------------
 * Deliberately, and it is the one thing this store does differently from every
 * tour it sits beside — those all write `localStorage` so they never re-run.
 *
 * A guide is not an onboarding tour. It was asked for, seconds ago, by somebody
 * who is being helped right now, and "you have already seen this one" is
 * exactly the wrong answer to somebody asking again. It also means a reload
 * mid-walkthrough drops it rather than resurrecting a walkthrough for a page
 * the customer has since left — the workflow rail re-reads its own state from
 * the server, which is the thing that genuinely needs to survive.
 */

/** One stop. Mirrors `GuideStop` in the backend catalogue. */
export interface GuidanceStop {
  /**
   * The `data-tour` value to point at. Empty means a centred card.
   *
   * A NAME, not a selector — see the resolver in `guided-tour.tsx` for why the
   * indirection is worth it and what it buys on a responsive page.
   */
  anchor: string;
  title: string;
  body: string;
  side?: "top" | "bottom" | "left" | "right" | "center";
  /**
   * What to do to make this control appear, on a page that reveals itself one
   * rung at a time. The overlay shows it ONLY while the anchor is unresolved,
   * so it vanishes the moment the rung opens.
   */
  reveal?: string;
}

export interface Guidance {
  key: string;
  title: string;
  /** Where it runs. The host waits for this path before starting. */
  route: string;
  stops: GuidanceStop[];
  /**
   * The id of a tour the destination page already ships.
   *
   * When set, `stops` is empty and the host hands off to that page's own
   * overlay rather than drawing its own. See `NATIVE_TOURS`.
   */
  native?: string | null;
}

interface GuidanceState {
  /** Requested, waiting for the route to match. */
  pending: Guidance | null;
  /** Running now, on the page it belongs to. */
  active: Guidance | null;
  /** Index into `active.stops`. */
  stopIndex: number;

  /** Ask for a walkthrough. The host starts it once the route matches. */
  request: (guidance: Guidance) => void;
  /** Promote `pending` to `active`. Called by the host, not by a page. */
  begin: () => void;
  next: () => void;
  previous: () => void;
  /** End whatever is running, and drop anything waiting. */
  dismiss: () => void;
}

export const useGuidanceStore = create<GuidanceState>((set, get) => ({
  pending: null,
  active: null,
  stopIndex: 0,

  request: (guidance) =>
    set({
      pending: guidance,
      /*
       * Clearing `active` here is what stops two walkthroughs overlapping.
       *
       * A customer can perfectly reasonably ask for a second thing while the
       * first is still on screen, and two spotlights fighting over the same
       * viewport is not a state anybody can read. The newest request wins,
       * because it is the one they just made.
       */
      active: null,
      stopIndex: 0,
    }),

  begin: () => {
    const { pending } = get();
    if (!pending) return;
    set({ active: pending, pending: null, stopIndex: 0 });
  },

  next: () => {
    const { active, stopIndex } = get();
    if (!active) return;
    if (stopIndex >= active.stops.length - 1) {
      set({ active: null, stopIndex: 0 });
      return;
    }
    set({ stopIndex: stopIndex + 1 });
  },

  previous: () =>
    set((state) => ({ stopIndex: Math.max(0, state.stopIndex - 1) })),

  dismiss: () => set({ active: null, pending: null, stopIndex: 0 }),
}));
