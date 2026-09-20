"use client";

/**
 * Copy-trading landing page — Obsidian.
 *
 * See `components/landing/kit.tsx` for why the generic page-builder
 * composition had to go rather than simply be recoloured.
 */

import { useEffect, useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { Activity, Award, BarChart3, Flame, Gauge, Shield, Sparkles, Target, Users, Zap } from "lucide-react";
import { $fetch } from "@/lib/api";
import { Link } from "@/i18n/routing";
import {
  CapabilityGrid,
  ClosingCta,
  LandingHero,
  LandingShell,
  MetricStrip,
  Panel,
  Section,
  SectionHeading,
  StepRail,
  TrustRow,
  type LandingStat,
} from "@/components/landing";
import { Loadable } from "@/components/ui/skeleton";
import { CopyTradingArt } from "@/components/landing/art";
import LeaderCard from "./components/leader-card";
import FeaturedLeaderSection from "./components/FeaturedLeaderSection";
import TradingStylesSection from "./components/TradingStylesSection";
import LiveActivityFeed from "./components/LiveActivityFeed";

/**
 * The `/api/copy-trading/landing` payload.
 *
 * Exported so `./page.tsx` — a server component — can name it when it fetches
 * this during SSR and hands it down as `initialData`. A type-only import
 * erases, so naming it there does not pull this "use client" module onto the
 * server.
 */
export interface LandingData {
  stats: {
    totalLeaders: number;
    totalFollowers: number;
    totalVolume: number;
    avgRoi: number;
    avgWinRate: number;
    totalTrades: number;
    topLeaderRoi: number;
    totalProfitGenerated: number;
  };
  featuredLeader: any | null;
  topLeaders: any[];
  byTradingStyle: Record<string, { count: number; avgRoi: number; topRoi: number }>;
  byRiskLevel: Record<string, { count: number; avgRoi: number }>;
  recentTrades: any[];
  copyModes: any[];
}

function compact(value: number) {
  /*
    NO `$`. `copy-trading/landing/index.get.ts:62-64` is `sum("cost")` across
    every quote asset, so the figure adds USDT notionals to BTC ones. The
    CORRECT twin already exists at `stats.get.ts:146-193`, and its consumer
    refuses to print a `$` unless the unit really is USD — this landing page
    never got that treatment.
  */
  if (!Number.isFinite(value)) return "—";
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B+`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M+`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K+`;
  return `${Math.round(value)}`;
}

export default function CopyTradingLanding({
  initialData = null,
}: {
  /**
   * `/api/copy-trading/landing` as the server saw it, or `null` when it could
   * not be reached. See `./page.tsx`.
   */
  initialData?: LandingData | null;
} = {}) {
  const t = useTranslations("ext_copy-trading");
  const tExt = useTranslations("ext");
  const tCommon = useTranslations("common");
  const [landingData, setLandingData] = useState<LandingData | null>(
    initialData
  );
  /* SEEDED FROM THE PROP, not left at `true`, and this half is load-bearing.
     `isLoading` is what puts the hero figures and every section flag behind
     `<Loadable>`. Keep it `true` while holding the real numbers and the server
     would render the placeholder pass it already has the answers for, then swap
     it one commit later — which is the exact class of shift these landing
     pages were reworked to remove, paid twice over on a page that no longer
     has to wait for anything. `initialData === null` keeps the pending pass for
     the only case that still needs it: the server fetch missed and the effect
     below is about to run. */
  const [isLoading, setIsLoading] = useState(initialData === null);
  const fetchInitiatedRef = useRef(false);

  useEffect(() => {
    if (fetchInitiatedRef.current) return;
    // Nothing to ask for — the server already delivered it.
    if (initialData !== null) return;
    fetchInitiatedRef.current = true;
    let isMounted = true;

    (async () => {
      const { data } = await $fetch<LandingData>({
        url: "/api/copy-trading/landing",
        method: "GET",
        silent: true,
      });
      if (!isMounted) return;
      if (data) setLandingData(data);
      setIsLoading(false);
    })();

    return () => {
      isMounted = false;
      fetchInitiatedRef.current = false;
    };
  }, []);

  const stats = landingData?.stats;
  const showStats = Boolean(
    stats && (stats.totalLeaders > 0 || stats.totalFollowers > 0 || stats.totalVolume > 0 || stats.avgRoi > 0)
  );
  const topLeaders = landingData?.topLeaders || [];

  /**
   * The hero's figure row, in BOTH states.
   * ==========================================================================
   *
   * This used to be `[]` for the whole fetch, and `LandingHero` gates its `<dl>`
   * on `stats.length > 0` — so the row was ABSENT, then three figures appeared
   * and pushed the hero's footnote, the trust row and every section below it
   * down by an `mt-12` plus a two-line stat block. On the page a first-time
   * visitor lands on, that is the first thing they see move.
   *
   * The three labels are LITERAL and identical in both states, and `LandingHero`
   * keys each cell on `stat.label` — so React reuses the same DOM nodes across
   * the swap and only the figure inside changes. Nothing remounts.
   *
   * Reserving exactly THREE is what keeps the grid stable: `LandingHero` picks
   * `grid-cols-2 sm:grid-cols-4` at four or more and `grid-cols-3` below, so any
   * resolved subset of these three lands in the same one-row `grid-cols-3` box.
   * A fourth pending cell would have flipped the layout on arrival.
   *
   * The resolved branch keeps its per-metric `> 0` filter untouched: a figure
   * that is genuinely zero is not worth a column, and an installation with
   * nothing at all still drops the row entirely — that is the EMPTY answer, and
   * it is only reachable once the request has come back.
   */
  const heroStats: LandingStat[] = isLoading
    ? [
        { value: <Loadable loading placeholder="1,234+" />, label: t("lead_traders") },
        { value: <Loadable loading placeholder="12,345+" />, label: t("copiers") },
        { value: <Loadable loading placeholder="12.3%" />, label: tExt("average_roi") },
      ]
    : showStats && stats
      ? ([
          stats.totalLeaders > 0 && { value: `${stats.totalLeaders.toLocaleString("en-US")}+`, label: t("lead_traders") },
          stats.totalFollowers > 0 && { value: `${stats.totalFollowers.toLocaleString("en-US")}+`, label: t("copiers") },
          stats.avgRoi > 0 && { value: `${Number(stats.avgRoi).toFixed(1)}%`, label: tExt("average_roi") },
        ].filter(Boolean) as LandingStat[])
      : [];

  return (
    <LandingShell>
      <LandingHero
        eyebrow={t("automated_copy_trading_platform")}
        eyebrowIcon={Sparkles}
        title={t("copy_the_best")}
        highlight={t("trade_like_a_pro")}
        subtitle={t("pick_a_trader_whose_record_you")}
        actions={[
          { label: t("start_copying_now"), href: "/copy-trading/leader" },
          { label: t("become_a_leader"), href: "/copy-trading/dashboard", variant: "secondary" },
        ]}
        stats={heroStats}
        visual={<CopyTradingArt />}
      />

      <TrustRow
        items={[
          { icon: Gauge, label: tCommon("proportional_sizing"), detail: "Your risk, not theirs" },
          { icon: Shield, label: t("stop_loss_per_copy"), detail: "Caps set by you" },
          { icon: Zap, label: t("executed_in_milliseconds"), detail: "Same fill window" },
          { icon: Activity, label: t("unfollow_instantly"), detail: "Positions close with you" },
        ]}
      />

      <FeaturedLeaderSection leader={landingData?.featuredLeader || null} isLoading={isLoading} />

      {/*
        The numbers strip renders in BOTH states.

        It was gated on resolved data alone, so a `Panel` of four `px-6 py-6`
        cells — a little over 100px, plus its own `py-4` — appeared between the
        featured leader and the trading styles the moment the fetch landed, and
        everything from there to the footer moved with it.

        All four cells are declared here in both states: same icons, same
        labels, same divider grid, and `MetricStrip` keys on `stat.label`, so
        the cells are reused rather than remounted. Only the figures wait.

        `showStats` stays as the EMPTY test for the resolved pass — an
        installation with no leaders, no copiers, no volume and no ROI has
        nothing to put in this strip and correctly drops it.
      */}
      {(isLoading || (showStats && stats)) && (
        <MetricStrip
          className="py-4"
          stats={[
            {
              icon: Users,
              value: (
                <Loadable loading={isLoading} placeholder="1,234+">
                  {stats ? `${stats.totalLeaders.toLocaleString("en-US")}+` : null}
                </Loadable>
              ),
              label: t("lead_traders"),
            },
            {
              icon: Target,
              value: (
                <Loadable loading={isLoading} placeholder="12,345+">
                  {stats ? `${stats.totalFollowers.toLocaleString("en-US")}+` : null}
                </Loadable>
              ),
              label: t("active_copiers"),
            },
            {
              icon: BarChart3,
              value: (
                <Loadable loading={isLoading} placeholder="$12.3M+">
                  {stats ? compact(stats.totalVolume) : null}
                </Loadable>
              ),
              label: t("copied_volume"),
            },
            {
              icon: Award,
              value: (
                <Loadable loading={isLoading} placeholder="67%">
                  {stats ? `${Number(stats.avgWinRate).toFixed(0)}%` : null}
                </Loadable>
              ),
              label: tExt("average_win_rate"),
            },
          ]}
        />
      )}

      <TradingStylesSection byTradingStyle={landingData?.byTradingStyle || {}} isLoading={isLoading} />

      {/* Top leaders */}
      <Section bordered>
        <div className="mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <SectionHeading
            className="mb-0"
            align="left"
            eyebrow={tExt("top_performers")}
            eyebrowIcon={Flame}
            title={t("best_performing_leaders")}
            subtitle={t("discover_our_top_rated_traders_with")}
          />
          <Link
            href="/copy-trading/leader"
            className="group inline-flex h-11 shrink-0 items-center gap-2 rounded-lg border border-border bg-surface-2 px-5 text-sm font-semibold text-foreground transition-colors hover:border-border-strong hover:bg-surface-3"
          >
            {tCommon("view_all_leaders")}
          </Link>
        </div>

        {/* ONE grid definition, one card component. The pending pass used to be
            six `h-80 rounded-xl bg-surface-2` slabs — wrong radius, wrong fill,
            and a height that has nothing to do with the card's, so the whole
            block resized under the heading when the fetch landed. */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <LeaderCard key={`pending-${i}`} index={i} loading />
            ))}
          </div>
        ) : topLeaders.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {topLeaders.slice(0, 6).map((leader, index) => (
              <LeaderCard key={leader.id || `leader-${index}`} leader={leader} index={index} />
            ))}
          </div>
        ) : (
          <Panel className="p-16 text-center">
            <Users className="mx-auto mb-4 h-12 w-12 text-subtle-foreground" />
            <h3 className="mb-2 text-xl font-semibold text-foreground">{t("no_leaders_available")}</h3>
            <p className="text-sm text-muted-foreground">
              {t("leaders_appear_here_as_soon_as")}
            </p>
          </Panel>
        )}
      </Section>

      <LiveActivityFeed recentTrades={landingData?.recentTrades || []} isLoading={isLoading} />

      <CapabilityGrid
        eyebrow={tCommon("why_choose_us")}
        eyebrowIcon={Award}
        title={t("follow_the_trader_keep")}
        highlight="your own risk"
        subtitle={t("copying_someone_should_never_mean_inheriting")}
        items={[
          {
            icon: Shield,
            title: t("advanced_risk_management"),
            description:
              t("set_a_maximum_allocation_a_per"),
          },
          {
            icon: BarChart3,
            title: t("transparent_performance"),
            description:
              t("every_leaders_record_is_computed_from"),
          },
          {
            icon: Zap,
            title: t("fast_execution"),
            description:
              t("copies_are_placed_in_the_same"),
          },
          {
            icon: Gauge,
            title: t("full_control"),
            description:
              t("pause_resize_or_unfollow_at_any"),
          },
        ]}
        columns={4}
      />

      <StepRail
        eyebrow={t("simple_powerful")}
        eyebrowIcon={Sparkles}
        title={t("copying_starts_in")}
        highlight="three steps"
        subtitle={t("start_copy_trading_in_minutes_with")}
        steps={[
          {
            icon: Users,
            title: t("choose_a_leader"),
            description: t("filter_by_style_risk_and_drawdown"),
          },
          {
            icon: Gauge,
            title: t("configure_and_subscribe"),
            description: t("decide_what_share_of_your_balance"),
          },
          {
            icon: Activity,
            title: t("earn_automatically"),
            description: t("their_entries_and_exits_mirror_into"),
          },
        ]}
        action={{ label: t("start_copying_now"), href: "/copy-trading/leader" }}
      />

      <ClosingCta
        eyebrow="Start copy trading"
        eyebrowIcon={Users}
        title={t("trade_like_someone_who_has")}
        highlight="done it before"
        subtitle={t("browse_verified_leaders_and_start_copying")}
        actions={[
          { label: t("start_copying_now"), href: "/copy-trading/leader" },
          { label: t("become_a_leader"), href: "/copy-trading/dashboard", variant: "secondary" },
        ]}
        note="Proportional sizing · your own stop-loss · unfollow anytime"
      />
    </LandingShell>
  );
}
