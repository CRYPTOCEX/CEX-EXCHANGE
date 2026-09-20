"use client";

/**
 * Forex landing page — Obsidian.
 *
 * Was ~600 lines of props against the generic page-builder sections: an
 * InteractivePattern, FloatingShapes, four hand-placed blur orbs, a HeroSection
 * carrying twenty particles and its own four-orb array, then TrustBar,
 * FeaturesSection, ProcessSection and CTASection each re-declaring a theme.
 * Phase 8a set all of those themes to `primary`, which made the page one hue
 * without changing its composition at all — the reason it still looked
 * untouched. The arrangement now comes from `@/components/landing`, and the
 * only thing this file decides is what the page says.
 */

import { useEffect, useState, useRef } from "react";
import { useTranslations } from "next-intl";
import {
  Award,
  BarChart3,
  CheckCircle,
  Clock,
  DollarSign,
  LineChart,
  Lock,
  Shield,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { useForexStore } from "@/store/forex/user";
import { $fetch } from "@/lib/api";
import {
  CapabilityGrid,
  ClosingCta,
  LandingHero,
  LandingShell,
  StepRail,
  TrustRow,
} from "@/components/landing";
import { ForexArt } from "@/components/landing/art";
import { FeaturedPlansSection } from "./components/featured-plans-section";
import RecentCompletionsSection from "./components/landing/recent-completions-section";
import TopPlanSpotlightSection from "./components/landing/top-plan-spotlight-section";
import PerformanceHistorySection from "./components/landing/performance-history-section";

interface PlatformStats {
  activeInvestors: number;
  totalInvested: number;
  averageReturn: number;
  totalProfit: number;
  winRate: number;
  completedInvestments: number;
  activeInvestments: number;
}

/**
 * The `/api/forex/landing` payload.
 *
 * Exported so `./page.tsx` — a server component — can name it when it fetches
 * this during SSR and hands it down as `initialData`. A type-only import
 * erases, so naming it there does not pull this "use client" module onto the
 * server.
 */
export interface LandingData {
  stats: PlatformStats & {
    /** Per-currency totals; `totalInvested` is their unqualified sum. */
    investedByCurrency?: {
      currency: string;
      totalInvested: number;
      totalProfit: number;
    }[];
    /** The largest single-currency pool — the only figure safe to headline. */
    primaryInvested?: {
      currency: string;
      totalInvested: number;
      totalProfit: number;
    } | null;
    mixedCurrencies?: boolean;
  };
  featuredPlans: any[];
  topPerformingPlan: any | null;
  performanceHistory: any[];
  signals: any[];
  recentCompletions: any[];
  durationOptions: {
    shortest: string;
    longest: string;
    mostPopular: string;
  };
}

const EMPTY_STATS: PlatformStats = {
  activeInvestors: 0,
  totalInvested: 0,
  averageReturn: 0,
  totalProfit: 0,
  winRate: 0,
  completedInvestments: 0,
  activeInvestments: 0,
};

/**
 * The payload's `stats` block, coerced to numbers.
 *
 * This coercion is not decorative — the backend hands several of these across
 * as DECIMAL, which arrives as a STRING, so `parseFloat` is what stops
 * `stats.totalInvested > 0` from comparing a string and `compact()` from being
 * handed one. It lives at module scope because it now runs in TWO places: the
 * lazy `useState` initialiser that seeds from the server's copy, and the
 * effect that runs when the server did not get one. Inlining it twice is how
 * the seeded path and the fetched path would eventually disagree about what a
 * missing field means.
 */
function toPlatformStats(data: any): PlatformStats {
  return {
    activeInvestors: Number(data?.stats?.activeInvestors) || 0,
    totalInvested: parseFloat(data?.stats?.totalInvested) || 0,
    averageReturn: parseFloat(data?.stats?.averageReturn) || 0,
    totalProfit: parseFloat(data?.stats?.totalProfit) || 0,
    winRate: parseFloat(data?.stats?.winRate) || 0,
    completedInvestments: Number(data?.stats?.completedInvestments) || 0,
    activeInvestments: Number(data?.stats?.activeInvestments) || 0,
  };
}

/**
 * Compact money, so a hero figure never wraps.
 *
 * The currency is named rather than assumed. This used to hard-code a dollar
 * sign onto a figure the backend had summed across every plan's currency, so an
 * install running a USD plan and a BTC plan headlined "$10K" for 10,000 USD
 * plus 1.5 BTC — counting the bitcoin as a dollar fifty.
 */
function compact(value: number, currency = "USD") {
  const symbol = currency === "USD" ? "$" : "";
  const suffix = currency === "USD" ? "" : ` ${currency}`;
  if (value >= 1_000_000_000)
    return `${symbol}${(value / 1_000_000_000).toFixed(1)}B${suffix}`;
  if (value >= 1_000_000)
    return `${symbol}${(value / 1_000_000).toFixed(1)}M${suffix}`;
  if (value >= 1_000) return `${symbol}${(value / 1_000).toFixed(0)}K${suffix}`;
  return `${symbol}${value.toFixed(0)}${suffix}`;
}

export default function ForexClient({
  initialData = null,
}: {
  /**
   * `/api/forex/landing` as the server saw it, or `null` when it could not be
   * reached. See `./page.tsx`.
   */
  initialData?: LandingData | null;
} = {}) {
  const t = useTranslations("ext_forex");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const { plans } = useForexStore();

  /* Lazy initialiser, not `toPlatformStats(initialData)` evaluated inline:
     the argument to `useState` is computed on EVERY render and thrown away on
     all but the first, and this one walks seven fields. */
  const [stats, setStats] = useState<PlatformStats>(() =>
    initialData ? toPlatformStats(initialData) : EMPTY_STATS
  );
  const [landingData, setLandingData] = useState<LandingData | null>(
    initialData
  );
  /* SEEDED FROM THE PROP, not left at `true`, and this half is load-bearing.
     `isLoadingLanding` decides whether the hero gets a `<dl>` at all (line
     below passes `null` while loading, and `LandingHero` drops the row) and
     puts four whole sections into their pending pass. Holding the real figures
     while still claiming to load would render the placeholder pass and swap it
     one commit later — the shift this conversion exists to remove.
     `initialData === null` keeps the pending pass for the only case that still
     needs it: the server fetch missed and the effect below is about to run. */
  const [isLoadingLanding, setIsLoadingLanding] = useState(
    initialData === null
  );
  const fetchInitiatedRef = useRef(false);

  useEffect(() => {
    // Guard against React Strict Mode's double mount.
    if (fetchInitiatedRef.current) return;
    // Nothing to ask for — the server already delivered it.
    if (initialData !== null) return;
    fetchInitiatedRef.current = true;
    let isMounted = true;

    $fetch({ url: "/api/forex/landing", silent: true }).then((res) => {
      if (!isMounted) return;
      if (res.data) {
        setLandingData(res.data);
        setStats(toPlatformStats(res.data));
      }
      setIsLoadingLanding(false);
    });

    return () => {
      isMounted = false;
      fetchInitiatedRef.current = false;
    };
  }, []);

  // From the landing payload, which this page already fetches and which is
  // public. The store's `plans` array is filled by /api/forex/plan — an
  // authenticated endpoint that nothing on this page calls — so on a marketing
  // page a visitor can reach, it was always empty and the entire "Premium
  // Investment Opportunities" section silently rendered nothing.
  const trendingPlans =
    landingData?.featuredPlans && landingData.featuredPlans.length > 0
      ? landingData.featuredPlans
      : plans.filter((plan) => plan.trending);

  const primaryInvested = landingData?.stats?.primaryInvested ?? null;

  // An unpopulated install should show nothing rather than a row of zeroes —
  // "0 investors" is worse than no claim at all on a page meant to sell.
  const heroStats = [
    stats.activeInvestors > 0 && {
      value: stats.activeInvestors.toLocaleString("en-US"),
      label: tCommon("active_investors"),
    },
    // The largest single-currency pool, named. `stats.totalInvested` is a sum
    // across currencies and cannot honestly carry a symbol.
    primaryInvested !== null &&
      primaryInvested.totalInvested > 0 && {
        value: compact(primaryInvested.totalInvested, primaryInvested.currency),
        label: tCommon("total_invested"),
      },
    stats.winRate > 0
      ? { value: `${stats.winRate.toFixed(0)}%`, label: tCommon("win_rate") }
      : stats.averageReturn > 0 && { value: `${stats.averageReturn.toFixed(1)}%`, label: t("avg_return") },
  ].filter(Boolean) as { value: string; label: string }[];

  return (
    <LandingShell>
      <LandingHero
        eyebrow={t("professional_forex_investment_platform")}
        eyebrowIcon={Sparkles}
        title={t("smart_forex")}
        highlight="Investments"
        subtitle={t("access_institutional_grade_forex_trading_with")}
        actions={[
          { label: t("start_investing"), href: "/forex/plan" },
          { label: tCommon("view_dashboard"), href: "/forex/dashboard", variant: "secondary" },
        ]}
        /*
          `null` means "the figures are coming"; `[]` means "this install has
          none". `heroStats` is `[]` for the whole fetch — `stats` starts at
          `EMPTY_STATS` and `primaryInvested` at null, so every arm of the array
          is falsy — and an empty array told the hero to reserve nothing. The
          `<dl>` then arrived 104px tall, and because the hero's two columns are
          `items-center` against a taller illustration, half of that read as the
          whole text column sliding up. See the note on `LandingHero.stats`.
        */
        stats={isLoadingLanding ? null : heroStats}
        visual={<ForexArt />}
      />

      <TrustRow
        items={[
          { icon: Shield, label: t("bank_level_security"), detail: "256-bit encryption" },
          {
            icon: CheckCircle,
            label: stats.winRate > 0 ? `${stats.winRate.toFixed(0)}% win rate` : t("verified_performance"),
            detail: "Published every cycle",
          },
        ]}
      />

      <TopPlanSpotlightSection plan={landingData?.topPerformingPlan || null} isLoading={isLoadingLanding} />

      {/* Was an "Institutional-grade Trading Technology" grid: proprietary
          machine-learning strategies, institutional MT5 signals executed
          against your chosen risk profile, and segregated client funds. None
          of the three exists. The return is `amount * plan.profitPercentage /
          100` and the outcome is `investment.result || plan.defaultResult`
          (`forex/utils/cron.ts:442-480`); a forex signal is `{id, title,
          image, status}` (`models/ext/forex/forexSignal.ts:11-14`) that
          nothing consumes; there is no risk-profile field anywhere in the
          addon; and `segregat` does not appear in `backend/` at all — forex
          money is a `balance` column on `forexAccount`. The cards below are
          the disclosures the plan page already carries, on the same keys, so
          they are already translated. */}
      <CapabilityGrid
        title={tCommon("faq_question")}
        items={[
          {
            icon: LineChart,
            title: t("faq_profits_q"),
            description: t("faq_profits_a"),
          },
          {
            icon: Lock,
            title: t("faq_security_q"),
            description: t("faq_security_a"),
          },
          {
            icon: Clock,
            title: t("faq_early_exit_q"),
            description: t("faq_early_exit_a"),
          },
        ]}
      />

      {/* `isLoading` is new and it is load-bearing: `trendingPlans` is `[]` for
          the whole fetch (the landing payload has not arrived and the store's
          `plans` is filled by an authenticated endpoint this page never calls),
          so the section's `if (!trendingPlans.length) return null` fired during
          load and the whole ~700px block appeared on arrival. */}
      <FeaturedPlansSection trendingPlans={trendingPlans} isLoading={isLoadingLanding} />

      <PerformanceHistorySection history={landingData?.performanceHistory || []} isLoading={isLoadingLanding} />

      <RecentCompletionsSection completions={landingData?.recentCompletions || []} isLoading={isLoadingLanding} />

      <StepRail
        eyebrow={tCommon("getting_started")}
        eyebrowIcon={Sparkles}
        title={tExt("simple_4_step")}
        highlight={t("investment_process")}
        subtitle={t("our_streamlined_onboarding_process_gets_you")}
        steps={[
          {
            icon: Users,
            title: tExt("create_your_account"),
            description: t("verify_once_and_you_are_through"),
          },
          {
            icon: Award,
            title: t("choose_a_plan"),
            description: t("pick_the_term_and_target_return"),
          },
          {
            icon: Wallet,
            title: t("fund_it"),
            description: t("deposit_by_bank_transfer_or_crypto"),
          },
          {
            icon: TrendingUp,
            title: t("track_and_withdraw"),
            description: t("watch_returns_accrue_in_real_time"),
          },
        ]}
        action={{ label: t("get_started_now"), href: "/forex/plan" }}
      />

      <ClosingCta
        eyebrow="Start your journey"
        eyebrowIcon={Sparkles}
        title={t("ready_to_maximize_your_returns")}
        highlight="Returns"
        subtitle={t("join_thousands_of_successful_investors_using")}
        actions={[
          { label: t("view_plans"), href: "/forex/plan" },
          { label: tCommon("go_to_dashboard"), href: "/forex/dashboard", variant: "secondary" },
        ]}
        note="24/7 expert support · instant withdrawals · real-time analytics"
      />
    </LandingShell>
  );
}
