"use client";

/**
 * The navigation-time fallback. Frame and body both come from the page itself,
 * so the two cannot describe the catalogue differently while it loads.
 */

import { useTranslations } from "next-intl";
import { InvestmentFrame } from "../components/page-frame";
import { PlansSkeletonBody } from "./client";

export default function PlansLoading() {
  const t = useTranslations("investment");
  const tCommon = useTranslations("common");

  return (
    <InvestmentFrame
      title={tCommon("investment_plans")}
      subtitle={t("plans_subtitle")}
    >
      <PlansSkeletonBody />
    </InvestmentFrame>
  );
}
