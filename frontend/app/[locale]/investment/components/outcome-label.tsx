"use client";

/**
 * EVERY TRANSLATION LOOKUP IN THIS PRODUCT THAT DEPENDS ON A VALUE, IN ONE
 * PLACE — AND EVERY ONE OF THEM SPELLED OUT AS A LITERAL.
 *
 * WHY THIS FILE EXISTS AND WHY IT LOOKS REPETITIVE
 * ------------------------------------------------
 * The obvious way to render an outcome or a status is to interpolate the key —
 * a template literal joining a "status_" prefix to a lowercased status, or an
 * "outcome_" prefix to a label key.
 *
 * That works perfectly in development and SHIPS BROKEN. `pnpm build:i18n`
 * generates a per-route translation chunk containing only the keys its
 * extractor found in the source, and the extractor is a REGEX over the text:
 * `i18n/key-extractor.js` matches a translate call opening with a quote or a
 * backtick and takes everything up to the next one. For an interpolated key
 * that captures the interpolation SYNTAX as the key — a string that exists in
 * no bundle — while the four real keys (`status_active`, `status_completed`,
 * `status_cancelled`, `status_rejected`) are never added to the chunk at all.
 * Development loads the whole namespace and looks right; production loads the
 * chunk and renders the raw key path to users.
 *
 * The same trap already cost this codebase every `pay_with_<gateway>` button in
 * the deposit flow, which is why the extractor now follows re-export barrels —
 * see the comment in `key-extractor.js`. Those buttons are no longer built from
 * an interpolated key at all: they are one `pay_with_provider` message with the
 * brand as an argument, which is the other way out of this trap whenever the
 * variable part is a proper noun.
 *
 * So the mapping is a switch of literal `t("…")` calls. It reads as boilerplate
 * and it is the only form the build can see.
 */

import { useTranslations } from "next-intl";
import type { Outcome } from "./kit/outcome";
import type { InvestmentStatus } from "./kit/position";

/** "Pays the rate" / "Returns principal" / "Deducts the rate" — the chip. */
export function useOutcomeChip() {
  const t = useTranslations("investment");

  return (outcome: Outcome | null): string => {
    if (!outcome) return t("outcome_unstated");
    switch (outcome.labelKey) {
      case "pays":
        return t("outcome_pays");
      case "returns":
        return t("outcome_returns");
      case "deducts":
        return t("outcome_deducts");
      default:
        return t("outcome_unstated");
    }
  };
}

/**
 * The settlement rule as a sentence, in the tense the position is in: a future
 * one for something still running, a past one for something that has settled.
 */
export function useOutcomeRule() {
  const t = useTranslations("investment");

  return (outcome: Outcome | null, settled: boolean): string => {
    if (!outcome) return t("outcome_not_stated");
    if (settled) {
      switch (outcome.labelKey) {
        case "pays":
          return t("settled_pays");
        case "returns":
          return t("settled_returns");
        case "deducts":
          return t("settled_deducts");
      }
    }
    switch (outcome.labelKey) {
      case "pays":
        return t("will_pays");
      case "returns":
        return t("will_returns");
      case "deducts":
        return t("will_deducts");
    }
    return t("outcome_not_stated");
  };
}

/** The full disclosure shown above the invest button, with the rate in it. */
export function useOutcomeNotice() {
  const t = useTranslations("investment");

  return (outcome: Outcome | null, rate: string): string => {
    if (!outcome) return t("outcome_not_stated_composer");
    switch (outcome.noticeKey) {
      case "notice_win":
        return t("notice_win", { rate });
      case "notice_draw":
        return t("notice_draw", { rate });
      case "notice_loss":
        return t("notice_loss", { rate });
      default:
        return t("outcome_not_stated_composer");
    }
  };
}

/** "Running" / "Completed" / "Cancelled" / "Rejected". */
export function useStatusLabel() {
  const t = useTranslations("investment");
  const tCommon = useTranslations("common");

  return (status: InvestmentStatus): string => {
    switch (status) {
      case "ACTIVE":
        return tCommon("running");
      case "COMPLETED":
        return tCommon("completed");
      case "CANCELLED":
        return tCommon("cancelled");
      case "REJECTED":
        return tCommon("rejected");
      default:
        return tCommon("running");
    }
  };
}
