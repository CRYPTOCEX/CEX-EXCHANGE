"use client";

/**
 * The two sentences a term needs, built by ICU rather than by string addition.
 *
 * The old code did `${n} ${timeframe.toLowerCase()}${n > 1 ? "s" : ""}` — which
 * is English-only pluralisation applied to all 90 locales, and gets English
 * itself wrong for a count of 0 ("0 day"). The plural category is a property of
 * the language: Polish has three forms, Arabic six, Japanese one. Only the
 * message bundle can pick correctly, so the count and the unit go to ICU and
 * ICU decides.
 *
 * Shared by the plan card, the composer, the position card and the position
 * page, so a term reads identically wherever it appears.
 */

import { useTranslations } from "next-intl";
import { formatDistanceStrict } from "date-fns";
import type { MaturityClock, TermParts } from "./kit/term";

/** "30 days" / "3 months" — the length of a term, in the reader's language. */
export function useTermLabel() {
  const t = useTranslations("investment");

  return (term: TermParts | null): string | null => {
    if (!term) return null;
    switch (term.unit) {
      case "HOUR":
        return t("term_hours", { count: term.count });
      case "DAY":
        return t("term_days", { count: term.count });
      case "WEEK":
        return t("term_weeks", { count: term.count });
      case "MONTH":
        return t("term_months", { count: term.count });
      default:
        return null;
    }
  };
}

/**
 * "in about 2 months" / "matured" — how far a running position is from paying.
 *
 * `formatDistanceStrict` rather than `formatDistanceToNow`: "about 1 month" is
 * the wrong register for a maturity date somebody is counting down to, and the
 * strict form ("29 days") is the number they are actually waiting on.
 *
 * `baseDate` is passed explicitly so every row on a screen measures from the
 * same instant — see `usePageClock`.
 */
export function useRemainingLabel() {
  const t = useTranslations("investment");

  return (clock: MaturityClock, now: number): string => {
    if (!clock.endDate) return t("maturity_not_recorded");
    if (clock.matured) return t("matured");
    return formatDistanceStrict(clock.endDate, new Date(now));
  };
}
