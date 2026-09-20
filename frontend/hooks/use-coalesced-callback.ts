"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Run at most once per interval, and ALWAYS once more after the last request.
 *
 * ---------------------------------------------------------------------------
 * WHY THE TRAILING EDGE IS NOT OPTIONAL
 * ---------------------------------------------------------------------------
 *
 * The Pro terminal refreshes itself from DOM events that a live market fires in
 * bursts: one per order the exchange touches. A trading bot re-quoting a ladder
 * produces dozens in a second, and each one used to become two HTTP requests.
 *
 * A plain cooldown ("ignore anything within 2s of the last run") is the obvious
 * fix and it is wrong in a way that only shows up under exactly this load: the
 * LAST event of a burst is the one that lands inside the cooldown, so it is the
 * one that gets dropped — and it is also the only one whose state matters. The
 * panel then sits on the second-to-last picture until something unrelated
 * happens to shake it. That is how a cancelled order stays on screen.
 *
 * So: the first call in a quiet period runs IMMEDIATELY (a user cancelling an
 * order sees it reflected at once), everything inside the window is absorbed,
 * and one more run is guaranteed at the end of the window if anything was
 * absorbed. Bounded rate, no lost tail.
 *
 * The callback is held in a ref so a caller may pass a fresh closure on every
 * render — which every `useCallback` with dependencies eventually is — without
 * resetting the window and letting the burst through.
 *
 * ---------------------------------------------------------------------------
 * NOT `useDebouncedCallback`, WHICH IS THE OTHER HOOK IN THIS FOLDER
 * ---------------------------------------------------------------------------
 *
 * That one restarts its timer on every call, so under a stream that never
 * pauses for longer than the delay it NEVER FIRES. A market maker quoting once
 * a second against a two-second delay is exactly that stream: the panel would
 * go quiet for as long as the bot ran, which is a worse bug than the one being
 * fixed and a much harder one to see. Use it for a search box; use this for a
 * feed.
 */
export function useCoalescedCallback(
  callback: () => void,
  intervalMs: number
): () => void {
  const callbackRef = useRef(callback);
  // Assigned in an effect, not during render — the same shape `useDebouncedCallback`
  // uses in ./use-debounce.ts, and the one the React lint rules require: a ref
  // written during render is not a render output and the compiler is entitled to
  // reorder around it.
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef(false);

  // Cleared on unmount: a trailing run that fires into an unmounted component
  // is a setState on a dead tree at best, and on a panel that has since been
  // pointed at another market it is a fetch for the wrong pair.
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      pendingRef.current = false;
    };
  }, []);

  return useCallback(() => {
    if (timerRef.current) {
      // Inside the window: remember that something happened and let the trailing
      // run pick it up. This is the branch that absorbs a bot's burst.
      pendingRef.current = true;
      return;
    }

    callbackRef.current();

    const openWindow = () => {
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        if (!pendingRef.current) return;
        pendingRef.current = false;
        callbackRef.current();
        // Re-arm rather than stop. A stream that never pauses would otherwise
        // fall back to running on every event the moment the window closed.
        openWindow();
      }, intervalMs);
    };
    openWindow();
  }, [intervalMs]);
}
