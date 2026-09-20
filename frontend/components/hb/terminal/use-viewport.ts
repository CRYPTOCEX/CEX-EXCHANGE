"use client";

/**
 * Viewport class for the terminal.
 *
 * BOTH HOOKS ANSWER "DESKTOP" ON THE SERVER AND THROUGH HYDRATION, then flip on
 * the first post-hydration effect. Reading `window.matchMedia` in a `useState`
 * initializer would make the server and client markup disagree and React would
 * throw away the whole tree — and a terminal is the largest tree on the page.
 *
 * These drive RENDER-TIME decisions only. Nothing here may write to the
 * persisted layout: trade/pro force-collapses a panel once at tablet width and
 * that write survives, so a later desktop session finds it collapsed with no
 * clue why.
 */

import { useEffect, useState } from "react";

function useMediaQuery(query: string, fallback: boolean): boolean {
  const [matches, setMatches] = useState(fallback);

  useEffect(() => {
    const mq = window.matchMedia(query);
    const apply = () => setMatches(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [query]);

  return matches;
}

/**
 * True below `sm`.
 *
 * The desktop frame budgets 224px + 288px of side rails before the centre
 * column gets a pixel — 512px, on a 390px screen. It is not squeezable, so
 * below this width the layout is abandoned rather than compressed.
 */
export function useIsPhone(): boolean {
  return useMediaQuery("(max-width: 639px)", false);
}

/**
 * True at `lg` and above — wide enough for BOTH rails plus a usable ladder.
 * Below it the health rail unmounts and its content becomes a dock tab.
 */
export function useIsWide(): boolean {
  return useMediaQuery("(min-width: 1024px)", true);
}
