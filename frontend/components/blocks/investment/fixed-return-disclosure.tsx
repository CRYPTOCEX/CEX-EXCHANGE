"use client";

/**
 * WHERE THE RETURN ACTUALLY COMES FROM.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS EXISTS
 * ---------------------------------------------------------------------------
 * `investmentPlan.profitPercentage` is a number the operator typed into an
 * admin form. `finance/investment/cron.ts` pays it on a schedule out of the
 * operator's own funds. Nothing trades, lends or stakes the investor's money —
 * there is no strategy under the return at all.
 *
 * The product did not say so anywhere, and in places said the opposite: the
 * forex plan page carried a hardcoded FAQ claiming profits were "calculated
 * based on the plan's performance in the forex market" and that the investment
 * was secured by "segregated accounts... and insurance coverage". None of that
 * is in the codebase.
 *
 * This is the one place the truth is written, so it cannot be true on one
 * surface and absent on another. It renders at the point of commitment on
 * every product that sells a fixed return — core Investment, Forex Investment
 * and AI Investments are the same settlement rule wearing three names.
 *
 * ---------------------------------------------------------------------------
 * IT IS NOT A WARNING BANNER
 * ---------------------------------------------------------------------------
 * Deliberately quiet: bordered and toned, not an alert. A disclosure styled as
 * an error reads as a transient problem and gets dismissed as noise; the point
 * is that this is a permanent, ordinary fact about the product, stated where
 * somebody is about to act on it.
 *
 * The territory gate that goes with it lives in
 * `backend/src/utils/investment-compliance.ts`. This is the half the investor
 * sees; that is the half that decides whether they may see it at all.
 */

import { Info } from "lucide-react";
import { useTranslations } from "next-intl";

export function FixedReturnDisclosure({
  className = "",
}: {
  className?: string;
}) {
  const t = useTranslations("investment");

  return (
    <p
      className={[
        "flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10",
        "px-3 py-2 text-[11px] leading-relaxed text-warning-ink",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
      <span>{t("fixed_return_disclosure")}</span>
    </p>
  );
}

export default FixedReturnDisclosure;
