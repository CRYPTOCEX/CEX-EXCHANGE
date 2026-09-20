"use client";

/**
 * The investment overview.
 *
 * THREE THINGS IT STOPPED DOING
 * -----------------------------
 * 1. BLANKING FOR VISITORS. The whole page was behind `useKycGate("invest_
 *    general")`, and the gate returns `null` for its `anonymous` state — so a
 *    logged-out visitor got a completely EMPTY page. This is the marketing
 *    surface for the product; the visitor is exactly who it is for. Both
 *    endpoints it reads are `requiresAuth: false`, so nothing about the data
 *    needed the gate either. The KYC requirement is real and it is enforced
 *    where it bites: on the composer, and by the backend on the POST.
 *
 * 2. SPEAKING ENGLISH TO NINETY LOCALES. Thirty-nine strings were hardcoded —
 *    the entire TrustRow, both CapabilityGrids and every StepRail step — on an
 *    app that ships 90 locale bundles.
 *
 * 3. MAKING CLAIMS IT COULD NOT SUPPORT. "Bank-grade security", "Licensed and
 *    independently audited", "Award-winning platform", "Professional portfolio
 *    managers with decades of experience in global markets", "24/7 support",
 *    "Every plan publishes its real history" — twelve capability tiles and four
 *    trust items asserting licences, audits, awards and staff that no part of
 *    this codebase knows anything about. What replaces them describes the
 *    mechanism, which is both true and more useful: what a plan is, how a term
 *    settles, where the money comes from and where it goes back to.
 *
 * The closing note also annualised a per-term rate — `maxProfitPercentage`
 * labelled "target annual return" — when the rate applies to the whole term
 * whatever its length. A 5% 7-day plan was advertised as 5% a year.
 */

import { useTranslations } from "next-intl";
import {
  ArrowLeftRight,
  CalendarClock,
  Coins,
  Layers,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { useInvestmentStore } from "@/store/investment/user";
import { useSettledFetch } from "./components/use-settled-fetch";
import {
  CapabilityGrid,
  ClosingCta,
  LandingHero,
  LandingShell,
  StepRail,
} from "@/components/landing";
import { FeaturedPlansSection } from "./components/featured-plans-section";

/** Compact money, so a hero figure never wraps. */
function compact(amount: number) {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M+`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(1)}K+`;
  return amount.toLocaleString();
}

export default function InvestmentOverviewClient() {
  const t = useTranslations("investment");
  const tCommon = useTranslations("common");
  const {
    plans,
    plansLoading,
    plansAttempted,
    fetchPlans,
    stats,
    statsLoading,
    fetchStats,
  } = useInvestmentStore();

  useSettledFetch(plansAttempted, plansLoading, fetchPlans);
  useSettledFetch(Boolean(stats), statsLoading, fetchStats);

  /*
    An unpopulated install shows NO figures rather than a row of zeroes — "0
    investors" is worse than no claim at all on a page meant to sell.

    `totalInvested` is deliberately absent from this row. It is a SUM ACROSS
    CURRENCIES computed in SQL (`SUM(amount)` over every investment, whatever
    its plan's currency), and the old hero stamped a hardcoded "$" on it. There
    is no honest way to render it as one figure, and it is not worth a per-
    currency breakdown in a hero.
  */
  const figures = [
    Number(stats?.totalPlans) > 0 && {
      key: "plans",
      value: compact(Number(stats?.totalPlans)),
      label: t("plans_available"),
      srLabel: t("plans_available"),
    },
    Number(stats?.activeInvestors) > 0 && {
      key: "investors",
      value: compact(Number(stats?.activeInvestors)),
      label: t("people_invested"),
      srLabel: t("people_invested"),
    },
    Number(stats?.maxProfitPercentage) > 0 && {
      key: "rate",
      value: `${Number(stats?.maxProfitPercentage).toFixed(1)}%`,
      label: t("highest_rate_per_term"),
      srLabel: t("highest_rate_per_term"),
    },
  ].filter(Boolean) as {
    key: string;
    value: string;
    label: string;
    srLabel: string;
  }[];

  return (
    <LandingShell>
      <LandingHero
        eyebrow={t("hero_eyebrow")}
        title={t("hero_title")}
        highlight={t("hero_highlight")}
        subtitle={t("hero_subtitle")}
        actions={[
          { label: t("browse_plans"), href: "/investment/plan" },
          {
            label: t("my_investments"),
            href: "/investment/portfolio",
            variant: "secondary",
          },
        ]}
        /* `null` while the figures are still loading, so the row is RESERVED
           and text-measured rather than appearing and pushing the page down;
           `[]` once we know there are none to show. */
        stats={stats === null && statsLoading ? null : figures}
        /*
          NO HERO ILLUSTRATION, AND BOTH CANDIDATES WERE REJECTED FOR CAUSE.

          `AiInvestmentArt` — what this hero used to carry — renders a REALISED
          TRACK RECORD as text inside the SVG: "Realised performance",
          "Return +21.4%", "Benchmark +6.1%", "Max drawdown -4.2%",
          "Sharpe 1.84", "Trades 1,248", "Confidence 87%". Those are specific
          enough to read as claims about this platform, and they are the same
          class of invented figure this rebuild removed from the copy beside
          them. Keeping the art and fixing the words would have left the
          fabrication on the page in a font nobody thought to audit.

          `StakingArt` is the right SUBJECT — a rate card with lock periods —
          and wrong for a different reason: it draws 30d/90d/180d/365d against
          rising yields, i.e. it asserts visually that a longer term pays more.
          In this product the term sets the maturity DATE and nothing else, and
          the composer says so in as many words. Art that contradicts the
          disclosure two screens away is worse than no art.

          So the hero centres. `LandingHero` handles the no-visual case, and the
          page still carries the featured plans, the step rail and the
          capability grid below it.
        */
      />

      <FeaturedPlansSection plans={plans} loading={plansLoading} />

      <StepRail
        eyebrow={tCommon("how_eyebrow")}
        title={t("how_title")}
        highlight={t("how_highlight")}
        subtitle={t("how_subtitle")}
        steps={[
          {
            icon: Layers,
            title: t("step_choose_title"),
            description: t("step_choose_body"),
          },
          {
            icon: Wallet,
            title: t("step_fund_title"),
            description: t("step_fund_body"),
          },
          {
            icon: CalendarClock,
            title: t("step_wait_title"),
            description: t("step_wait_body"),
          },
          {
            icon: ArrowLeftRight,
            title: t("step_settle_title"),
            description: t("step_settle_body"),
          },
        ]}
        action={{ label: t("browse_plans"), href: "/investment/plan" }}
      />

      {/* Six statements about how the mechanism works — each one checkable
          against the code that implements it. */}
      <CapabilityGrid
        eyebrow={t("what_to_expect_eyebrow")}
        title={t("what_to_expect_title")}
        subtitle={t("what_to_expect_subtitle")}
        items={[
          {
            icon: Coins,
            title: t("cap_terms_stated_title"),
            description: t("cap_terms_stated_body"),
          },
          {
            icon: ShieldCheck,
            title: t("cap_outcome_title"),
            description: t("cap_outcome_body"),
          },
          {
            icon: Wallet,
            title: t("cap_wallet_title"),
            description: t("cap_wallet_body"),
          },
          {
            icon: CalendarClock,
            title: t("cap_maturity_title"),
            description: t("cap_maturity_body"),
          },
          {
            icon: ArrowLeftRight,
            title: t("cap_cancel_title"),
            description: t("cap_cancel_body"),
          },
          {
            icon: Layers,
            title: t("cap_one_per_plan_title"),
            description: t("cap_one_per_plan_body"),
          },
        ]}
      />

      <ClosingCta
        title={t("cta_title")}
        highlight={tCommon("cta_highlight")}
        subtitle={t("cta_subtitle")}
        actions={[
          { label: t("browse_plans"), href: "/investment/plan" },
          {
            label: t("my_investments"),
            href: "/investment/portfolio",
            variant: "secondary",
          },
        ]}
      />
    </LandingShell>
  );
}
