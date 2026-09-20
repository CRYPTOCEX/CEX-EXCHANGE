import { useEffect, useState } from "react";
import { $fetch } from "@/lib/api";
import { useUserStore } from "@/store/user";
import type { AdvancedOptionsState } from "../advanced/AdvancedOptions";

type TimeInForce = AdvancedOptionsState["timeInForce"];

/**
 * Which time-in-force values the CONNECTED exchange provider can honour.
 *
 * The three seeded providers do not agree — binance and kucoin can express all
 * four on a limit order, xt cannot express post-only on spot at all — and
 * `POST /api/exchange/order` REFUSES a value its venue cannot honour rather
 * than dropping it. So the form has to ask; guessing would put a button in
 * front of a trader that returns a 422 they cannot see the cause of.
 *
 * The answer is a property of the install, not of the market: one provider is
 * active at a time (`ExchangeManager.getProvider`), and switching it is an
 * admin action that reloads the world. So it is fetched once per page session
 * and held at module scope, which also keeps StrictMode's double mount to a
 * single request.
 *
 * GTC ONLY IS THE ANSWER FOR EVERY FAILURE. No provider configured, request
 * failed, signed out: all of them mean "offer no choice", which is exactly the
 * behaviour this control had before it existed and is the only direction that
 * cannot produce a rejected order.
 */
const GTC_ONLY: readonly TimeInForce[] = ["GTC"];

let cached: readonly TimeInForce[] | null = null;
let inFlight: Promise<readonly TimeInForce[]> | null = null;

function normalise(values: unknown): readonly TimeInForce[] {
  if (!Array.isArray(values)) return GTC_ONLY;
  const allowed: TimeInForce[] = ["GTC", "IOC", "FOK", "PO"];
  const kept = allowed.filter((v) => values.includes(v));
  // GTC is not optional: it is what an order with no time in force already is,
  // so an answer without it would hide the default rather than the extras.
  return kept.includes("GTC") ? kept : GTC_ONLY;
}

async function load(): Promise<readonly TimeInForce[]> {
  const { data, error } = await $fetch<any>({
    url: "/api/exchange/order/capabilities",
    silent: true,
  });
  if (error || !data) return GTC_ONLY;
  return normalise(data?.timeInForce?.limit);
}

export function useVenueTimeInForce(enabled: boolean) {
  const user = useUserStore((state) => state.user);
  const [values, setValues] = useState<readonly TimeInForce[]>(
    () => cached ?? GTC_ONLY
  );

  useEffect(() => {
    // The route requires a session. Asking while signed out spends a request to
    // be told so, and the panel is not placing orders in that state either.
    if (!enabled || !user) return;
    if (cached) {
      setValues(cached);
      return;
    }

    let alive = true;
    inFlight =
      inFlight ??
      load()
        .then((result) => {
          cached = result;
          return result;
        })
        // `$fetch` reports failure through its envelope rather than throwing,
        // so this only catches the unexpected — but leaving `inFlight` set on a
        // rejection would wedge the answer at GTC for the rest of the session.
        .catch(() => GTC_ONLY)
        .finally(() => {
          inFlight = null;
        });
    inFlight.then((result) => {
      if (alive) setValues(result);
    });

    return () => {
      alive = false;
    };
  }, [enabled, user]);

  return values;
}
