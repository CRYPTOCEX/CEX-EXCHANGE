"use client";

/**
 * Fetch once, and stop — even when the fetch fails.
 *
 * THE LOOP THIS ENDS
 * ------------------
 * Both plan surfaces ran this effect:
 *
 *     useEffect(() => {
 *       if (!hasFetchedPlans && !plansLoading) fetchPlans();
 *     }, [hasFetchedPlans, plansLoading]);
 *
 * `hasFetchedPlans` was set only on SUCCESS. So on a failure the store flipped
 * `plansLoading` false → true → false, which re-ran the effect, which saw
 * `!hasFetchedPlans && !plansLoading` still true, and issued the next request
 * immediately — forever, as fast as the server could reject it, with a toast
 * per attempt. A backend that was merely slow to come up got hammered by every
 * open tab, and the visitor got a stack of error toasts.
 *
 * The fix is that the guard has to be "a request has SETTLED", not "a request
 * has succeeded". The store sets `plansAttempted` in the failure path too.
 *
 * `ranRef` is belt and braces on top of that: React 18's StrictMode double-
 * invokes effects in development, and without it the first paint fires two
 * identical requests before either can set the flag.
 */

import { useEffect, useRef } from "react";

export function useSettledFetch(
  attempted: boolean,
  loading: boolean,
  fetcher: () => void | Promise<void>
) {
  const ranRef = useRef(false);

  useEffect(() => {
    if (attempted || loading || ranRef.current) return;
    ranRef.current = true;
    void fetcher();
    // `fetcher` is a zustand action and therefore a stable reference for the
    // life of the store; listing it would be honest but changes nothing, and
    // listing it while it was NOT stable is the other half of how the original
    // loop stayed alive.
  }, [attempted, loading, fetcher]);
}
