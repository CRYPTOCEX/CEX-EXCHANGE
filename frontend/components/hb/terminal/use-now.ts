"use client";

/**
 * The terminal's 1Hz clock.
 *
 * WHY IT IS A HOOK AND NOT SHELL STATE
 * Frames are pushed only on change, so every age on this page has to advance
 * locally between them. Holding `now` at the top of the shell meant the entire
 * workspace — the ladder is the largest subtree on the page — re-rendered once
 * a second on top of the websocket pushes, purely so a couple of "4s" labels
 * could tick. Consumed from the leaves that actually print an age, the same
 * clock costs a handful of tiny re-renders.
 *
 * It is also NOT a context. A context re-renders every consumer under the
 * provider on every tick, which is the problem it was supposed to solve.
 *
 * The interval is suspended while the tab is hidden — an operator leaving this
 * open all day is the expected case, not the exception — and resuming snaps
 * straight to the correct time rather than waiting out a tick.
 */

import { useEffect, useState } from "react";

export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (timer) return;
      setNow(Date.now());
      timer = setInterval(() => setNow(Date.now()), intervalMs);
    };
    const stop = () => {
      if (!timer) return;
      clearInterval(timer);
      timer = null;
    };
    const onVisibility = () => (document.hidden ? stop() : start());

    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [intervalMs]);

  return now;
}

/**
 * Snapshot age — how long ago the last frame arrived.
 *
 * Distinct from quote age on purpose. `tradingKeyOf` deliberately excludes the
 * snapshot timestamp, so "nothing has moved for 90 seconds" is ambiguous
 * between a bot that has stopped and a socket that has died — and those demand
 * opposite responses. This is the number that tells them apart.
 */
export function useDrift(snapshotAt: number | null | undefined, intervalMs = 1000): number {
  const now = useNow(intervalMs);
  if (!snapshotAt) return 0;
  return Math.max(0, now - snapshotAt);
}
