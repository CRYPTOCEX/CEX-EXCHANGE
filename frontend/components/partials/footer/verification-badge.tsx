"use client";

import { useEffect, useState } from "react";

/**
 * Registry verification badge — optional, off by default.
 *
 * IT RENDERS ONLY WHEN THE DOMAIN IS REGISTERED. A negative state is deliberately
 * silent: this mark sits in an operator's own public footer, and painting "not
 * registered" there would alarm their customers over something the operator cannot
 * fix from their own site — a domain that moved, a sync that has not run yet, a
 * registry that is briefly unreachable. Absence IS the signal, and the negative
 * answer belongs on the registry, where a visitor goes to look it up.
 *
 * The status comes from the registry's JSON API, fetched by the VISITOR'S BROWSER
 * after mount and cached for five minutes. This site's server never calls out, so
 * the badge cannot add latency to a render or fail a page when the registry is down.
 *
 * It is not a security control and must never be presented as one. Anyone can draw
 * a green tick. The badge is a shortcut to the registry entry; the entry — looked up
 * by the visitor, on the registry's own domain — is the proof.
 *
 * The registry is vendor-neutral: it names neither this software nor the company
 * that publishes it, so displaying this does not disclose what a white-label
 * operator is running.
 */

const REGISTRY_URL = (
  process.env.NEXT_PUBLIC_VERIFICATION_REGISTRY_URL || "https://verify.mashdiv.com"
).replace(/\/$/, "");

export function VerificationBadge() {
  const [entry, setEntry] = useState<{ url: string } | null>(null);

  useEffect(() => {
    /**
     * The domain checked is the one the visitor is actually on, not a configured
     * value. A stale NEXT_PUBLIC_SITE_URL, or a site answering on more than one
     * hostname, would otherwise show a confident mark for an address the visitor
     * is not looking at — the exact confusion the registry exists to remove.
     */
    const host = window.location.hostname;
    const entryUrl = `${REGISTRY_URL}/site/${encodeURIComponent(host)}`;
    const controller = new AbortController();

    /**
     * Development short-circuits the LOOKUP, not the state, so the component still
     * learns its answer asynchronously exactly as it does in production.
     *
     * It needs the override at all because a dev machine is on `localhost`, which
     * is never registered — so the honest production behaviour of rendering nothing
     * leaves whoever is building the footer unable to see or position the thing
     * they have just switched on.
     */
    const lookup: Promise<string | null> =
      process.env.NODE_ENV !== "production"
        ? Promise.resolve(entryUrl)
        : fetch(`${REGISTRY_URL}/api/v1/status?d=${encodeURIComponent(host)}`, {
            signal: controller.signal,
          })
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => (data?.registered ? (data.entry_url ?? entryUrl) : null));

    lookup
      .then((url) => {
        if (url) setEntry({ url });
      })
      // Unreachable registry, blocked by an extension, offline — all mean "say
      // nothing". Never surface a network condition in a customer-facing footer.
      .catch(() => {});

    return () => controller.abort();
  }, []);

  if (!entry) return null;

  return (
    <a
      href={entry.url}
      target="_blank"
      rel="noopener noreferrer"
      /*
       * No text size here on purpose — the legal bar sets it, because the three
       * footer layouts do not agree on one (compact runs `text-xs`, the other two
       * `text-sm`) and a mark that hardcoded either would be the wrong size in at
       * least one of them.
       */
      className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 transition-colors py-2.5 sm:py-0"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        /*
         * `text-success` and not an emerald from the palette: the token is declared
         * in both themes, so it needs no `dark:` fork — and the design ratchet
         * counts a raw palette utility and a dark fork as two separate debts.
         */
        className="size-3.5 shrink-0 text-success"
        aria-hidden="true"
      >
        <path d="M12 3 4.5 5.8v6.1c0 4.6 3.2 8.3 7.5 9.3 4.3-1 7.5-4.7 7.5-9.3V5.8Z" />
        <path d="m8.8 12 2.4 2.4 4.3-4.6" />
      </svg>
      Registered
    </a>
  );
}
