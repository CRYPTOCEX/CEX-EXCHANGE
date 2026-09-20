"use client";

import { useCallback } from "react";
import { useConfigStore } from "@/store/config";
import { settingIsTrue } from "@/lib/settings-bool";
import { getCryptoImageUrl } from "@/utils/image-fallback";

/**
 * Should wallet surfaces show a coin icon beside the currency code, and what is
 * the URL for a given code?
 *
 * The switch is the `walletCurrencyIcons` system setting (Admin -> System ->
 * Settings -> Wallet -> Display). Settings rows are TEXT, so an OFF switch
 * arrives as the STRING "false" and `Boolean("false")` is `true` — read it
 * through `settingIsTrue`, never by coercion. The `true` fallback applies only
 * when the key is absent, so a fresh install shows icons and matches the
 * DEFAULT_SETTINGS entry the admin screen renders the toggle from.
 *
 * `resolve` returns `null` — not a URL — when icons are off, so a call site can
 * hand the result straight to a component whose icon prop is optional and get
 * the no-icon treatment without a second conditional.
 *
 * There is deliberately no existence check here. `/img/crypto` carries ~11.5k
 * symbols but the listed set moves faster than the icon set does, so whether a
 * file is there can only be answered by requesting it. The fallback belongs at
 * the point of render (see `CurrencyMark`), which is the only place a 404
 * becomes observable.
 */
export function useCurrencyIcon() {
  const raw = useConfigStore((state) => state.settings?.walletCurrencyIcons);
  const enabled = settingIsTrue(raw, true);

  const resolve = useCallback(
    (currency?: string | null): string | null =>
      enabled && currency ? getCryptoImageUrl(currency) : null,
    [enabled]
  );

  return { enabled, resolve };
}
