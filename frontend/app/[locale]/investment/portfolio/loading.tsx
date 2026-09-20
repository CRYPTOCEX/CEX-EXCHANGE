"use client";

/**
 * The navigation-time fallback.
 *
 * It owns NO layout classes of its own: the frame, the heading, the sentence
 * and the header action all come from `InvestmentFrame`, and the body from the
 * same `PortfolioSkeletonBody` the client renders while its own fetch is in
 * flight. That is the whole point — every hand-written `loading.tsx` in this
 * app that duplicated its page's layout has since drifted from it, and this
 * route previously had no loading file at all, so navigating here left the
 * PREVIOUS page on screen until the data arrived.
 *
 * The strings are duplicated from `client.tsx` rather than shared, because a
 * `loading.tsx` renders before the client boundary and cannot call the client
 * `useTranslations`. They are the same two keys.
 */

import { useTranslations } from "next-intl";
import { InvestmentFrame } from "../components/page-frame";
import { PortfolioSkeletonBody } from "./components/portfolio-skeleton";

export default function PortfolioLoading() {
  const t = useTranslations("investment");

  return (
    <InvestmentFrame
      title={t("my_investments")}
      subtitle={t("my_investments_subtitle")}
    >
      <PortfolioSkeletonBody />
    </InvestmentFrame>
  );
}
