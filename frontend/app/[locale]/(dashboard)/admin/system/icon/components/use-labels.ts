"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";

/**
 * The asset-class label, translated.
 *
 * These four strings were hardcoded English in a module-level map, which put
 * them outside the message bundle entirely — the page was translated except for
 * the words in every row of its table. The lookup is a hook now because that is
 * the only way a message reaches a module-scope constant.
 *
 * An unknown bucket falls back to its own key rather than to an empty cell: a
 * new asset class in the scanner should show up as an odd label, not vanish.
 */
export function useBucketLabel() {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  return useCallback(
    (bucket: string) => {
      switch (bucket) {
        case "cex":
          return t("asset_class_cex");
        case "eco":
          return t("asset_class_eco");
        case "fiat":
          return tCommon("fiat");
        case "fx":
          return t("asset_class_fx");
        default:
          return bucket;
      }
    },
    [t]
  );
}

/**
 * The outcome label. The raw values are the scanner's own vocabulary
 * (`would-write`, `convert-failed`) and read as internals when printed as-is.
 */
export function useOutcomeLabel() {
  const t = useTranslations("dashboard_admin");
  return useCallback(
    (outcome: string) => {
      switch (outcome) {
        case "written":
          return t("outcome_written");
        case "would-write":
          return t("outcome_ready_to_fetch");
        case "ambiguous":
          return t("outcome_ambiguous");
        case "unresolved":
          return t("outcome_unresolved");
        case "convert-failed":
          return t("outcome_convert_failed");
        default:
          return outcome;
      }
    },
    [t]
  );
}
