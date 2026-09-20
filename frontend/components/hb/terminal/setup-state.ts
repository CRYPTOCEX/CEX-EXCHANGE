"use client";

/**
 * `GET /api/hb/setup` — the customer's real account state, shared by the setup
 * page and the bot console.
 *
 * WHY IT IS ITS OWN MODULE
 * Both surfaces need the same three answers (do you have a usable key, is a bot
 * reaching us, does this deployment even have the connector kit) and both need
 * the same re-read rule. It also used to be the console route that exported the
 * `HbSetupState` type, with the setup page importing a type out of a sibling
 * page's client component — the shape belongs to the endpoint, not to whichever
 * page happened to read it first.
 *
 * WHY IT IS NOT ON THE WEBSOCKET
 * The live feed already reads orders per subscribed user per tick. Folding the
 * API-key row into it would add a query per user per second for a value that
 * changes when someone starts a bot — which is roughly never. Market data goes
 * on the socket; account configuration does not.
 */

import { useCallback, useEffect, useState } from "react";
import $fetch from "@/lib/api";
import type { BotLink } from "./metrics";
import type { AgentInstance } from "./agent-types";

export interface HbSetupState {
  baseUrl: string;
  connectors: { spot: string; perpetual: string };
  /** False when the operator's deployment is missing the connector kit. */
  connectorKitAvailable: boolean;
  /**
   * Whether a bot is actually reaching the exchange — see `deriveLink`.
   *
   * OPTIONAL ON PURPOSE. `backend/dist` is committed and is what runs in
   * production, so a deployment can serve a compiled route that predates this
   * field. Absent means "we cannot tell", which every consumer must treat as
   * unknown rather than as "nothing has connected" — claiming a working bot has
   * never connected is worse than saying nothing.
   */
  link?: BotLink;
  /**
   * The local agent — our remote-control channel into the customer's machine.
   *
   * Optional for the same deployment-skew reason as `link`. `canControl` is the
   * field only this snapshot can supply: presence frames on the socket cannot
   * know whether any key carries `hb:control:bot`, and without it an agent that
   * is being refused at AUTH looks exactly like an agent that was never started.
   */
  agent?: {
    connected: boolean;
    lastSeenAt: number | null;
    version: string | null;
    host: string | null;
    instances: AgentInstance[];
    canControl: boolean;
  };
  keys: {
    state: "usable" | "disabled" | "secretless" | "none";
    total: number;
    usable: number;
    disabled: number;
    secretless: number;
    items: Array<{
      id: string;
      name: string;
      key: string;
      hasSecret: boolean;
      disabled: boolean;
      disabledBy: string | null;
      disabledReason: string | null;
      lastUsedAt: string | null;
    }>;
  };
}

/** Slow enough to be free, fast enough that nobody reaches for the reload key. */
const WAITING_POLL_MS = 20_000;

export function useHbSetupState(): {
  setup: HbSetupState | null;
  loading: boolean;
  failed: boolean;
  reload: () => Promise<void>;
} {
  const [setup, setSetup] = useState<HbSetupState | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const reload = useCallback(async () => {
    const res = await $fetch({ url: "/api/hb/setup", method: "GET", silent: true });
    setLoading(false);
    // $fetch resolves {data, error} and never throws, so the failure branch has
    // to be explicit. Without it a failed request left the panel reading
    // "Checking your account…" indefinitely, which looks like a hung page
    // rather than a request that did not come back.
    if (res.error) {
      setFailed(true);
      return;
    }
    setFailed(false);
    setSetup(res.data as HbSetupState);
  }, []);

  useEffect(() => {
    // A network read, not derived state — the lint rule cannot see that every
    // setState in `reload` happens after an await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
  }, [reload]);

  /*
   * WHILE THEY ARE WAITING FOR A BOT, re-read on a slow timer.
   *
   * These pages are what a customer looks at immediately after starting their
   * bot for the first time, and "connected" is the single moment they are
   * waiting for. A one-shot read means the answer only changes if they think to
   * reload — on the one screen whose whole job is to tell them without asking.
   *
   * Bounded on every axis that matters: it stops the moment the link is
   * connected, it does not run while the tab is hidden, and at 20s a customer
   * parked here for an hour costs 180 indexed reads.
   */
  // `reload` is a `useCallback` with no dependencies, so it is stable for the
  // lifetime of the component and can be depended on directly — a ref here
  // would only be a way to hide that from the linter.
  /*
   * WHAT COUNTS AS STILL WAITING, and why it is three conditions rather than one.
   *
   * It used to be the bot link alone, which broke the page it was written for:
   * the prescribed order is get the bot connected (step 4), THEN optionally start
   * the agent (step 5) — so by the time anyone reaches step 5 the link is already
   * `connected`, the timer is torn down, and the agent badge is frozen at a read
   * taken before the agent existed. It said "not running" forever, on a page that
   * promises "this line updates by itself".
   *
   * Presence-of-field stays the skew guard in both halves: on a deployment whose
   * committed backend/dist predates these fields they are undefined, and polling
   * a route that can never answer would run forever. `canControl` is the second
   * gate — an account with no control-scoped key is not waiting for an agent,
   * because it cannot have one.
   *
   * A failed read also keeps trying: `setup` stays null on failure, so without
   * this a single blip would freeze the page until a manual reload.
   */
  const linkWaiting = !!setup?.link && setup.link.state !== "connected";
  const agentWaiting = !!setup?.agent && setup.agent.canControl && !setup.agent.connected;
  const waiting = failed || linkWaiting || agentWaiting;

  useEffect(() => {
    if (!waiting) return;
    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (timer) return;
      timer = setInterval(() => void reload(), WAITING_POLL_MS);
    };
    const stop = () => {
      if (!timer) return;
      clearInterval(timer);
      timer = null;
    };
    const onVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        // Returning to the tab is exactly when the answer is most likely to have
        // changed, so read once immediately instead of waiting out a cycle.
        void reload();
        start();
      }
    };
    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [waiting, reload]);

  return { setup, loading, failed, reload };
}
