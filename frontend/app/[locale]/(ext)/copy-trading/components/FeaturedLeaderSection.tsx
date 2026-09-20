"use client";

import { m } from "framer-motion";
import {
  Trophy,
  TrendingUp,
  Users,
  Target,
  BarChart3,
  ArrowRight,
  Zap,
  Shield,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { statusTone } from "@/lib/status-tone";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loadable } from "@/components/ui/skeleton";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

interface FeaturedLeader {
  id: string;
  displayName: string;
  avatar?: string;
  bio?: string;
  tradingStyle: string;
  riskLevel: string;
  roi?: number;
  winRate?: number;
  totalFollowers?: number;
  totalProfit?: number;
  totalTrades?: number;
  profitSharePercent?: number;
  sparkline?: number[];
  rank?: number;
}

interface FeaturedLeaderSectionProps {
  leader: FeaturedLeader | null;
  isLoading?: boolean;
}

const tradingStyleConfig: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; label: string; color: string }
> = {
  SCALPING: { icon: Zap, label: "Scalping", color: "text-primary" },
  DAY_TRADING: { icon: BarChart3, label: "Day Trading", color: "text-primary" },
  SWING: { icon: TrendingUp, label: "Swing", color: "text-primary" },
  POSITION: { icon: Shield, label: "Position", color: "text-primary" },
};

/**
 * The 14-day trend.
 *
 * It USED to `return null` on empty data, which meant the whole 40px plot
 * vanished whenever the series had not arrived — and this column sits beside
 * the leader's name in a flex row, so the header block was 40px shorter for the
 * length of the fetch and then grew. The `<svg>` is the shape-preserver: its
 * width and height are declared here, so it always occupies the same box and
 * only the SERIES inside it is conditional. That is the same division the
 * chart-kit makes — keep the axes and the frame, skeleton the plot.
 */
function MiniSparkline({ data }: { data: number[] }) {
  const hasSeries = Boolean(data && data.length > 0);

  const max = Math.max(...(hasSeries ? data.map(Math.abs) : []), 1);
  const height = 40;
  const width = 120;
  const padding = 2;

  const points = hasSeries
    ? data.map((value, index) => {
        const x = padding + (index / (data.length - 1)) * (width - padding * 2);
        const y = height / 2 - (value / max) * ((height - padding * 2) / 2);
        return `${x},${y}`;
      })
    : [];

  const isPositive = hasSeries ? data[data.length - 1] >= 0 : true;

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id="sparkline-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop
            offset="0%"
            stopColor={isPositive ? "hsl(var(--up))" : "hsl(var(--down))"}
            stopOpacity="0.3"
          />
          <stop
            offset="100%"
            stopColor={isPositive ? "hsl(var(--up))" : "hsl(var(--down))"}
            stopOpacity="0"
          />
        </linearGradient>
      </defs>
      {/* Zero line */}
      <line
        x1={padding}
        y1={height / 2}
        x2={width - padding}
        y2={height / 2}
        stroke="currentColor"
        strokeOpacity="0.1"
        strokeDasharray="2,2"
      />
      {/* Area fill */}
      <polygon
        points={`${padding},${height / 2} ${points.join(" ")} ${width - padding},${height / 2}`}
        fill="url(#sparkline-gradient)"
      />
      {/* Line */}
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={isPositive ? "hsl(var(--up))" : "hsl(var(--down))"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* End dot */}
      {hasSeries && (
        <circle
          cx={width - padding}
          cy={
            height / 2 -
            (data[data.length - 1] / max) * ((height - padding * 2) / 2)
          }
          r="3"
          fill={isPositive ? "hsl(var(--up))" : "hsl(var(--down))"}
        />
      )}
    </svg>
  );
}

export default function FeaturedLeaderSection({
  leader,
  isLoading,
}: FeaturedLeaderSectionProps) {
  const t = useTranslations("ext_copy-trading");
  const tExt = useTranslations("ext");
  const tCommon = useTranslations("common");

  /*
    THIS SECTION USED TO VANISH AND COME BACK.

    `if (isLoading) return <LoadingState/>` handed back a THIRD tree — a
    `h-8 w-48` pill, a `h-10 w-72` bar and one `h-80 rounded-3xl` slab — in
    place of a section whose heading, badge, stat labels, icons, "Profit Share"
    row and "View Profile" button are all static strings this component already
    had in hand. None of the three boxes matched what they stood in for either:
    the real card is `rounded-lg`, and its height is set by its content, which
    at this width is nowhere near 320px. So the landing page reflowed twice per
    visit, and the section heading — the one thing a user could have started
    reading — was the part being withheld.

    `!leader` is the EMPTY answer (no public leaders yet) and only applies once
    the fetch has resolved.
  */
  if (!isLoading && !leader) {
    return null;
  }

  const styleConfig =
    (leader && tradingStyleConfig[leader.tradingStyle]) ||
    tradingStyleConfig.DAY_TRADING;
  const StyleIcon = styleConfig.icon;
  const isPositiveRoi = (leader?.roi ?? 0) >= 0;
  const initials = (leader?.displayName ?? "")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <section className="py-24 relative overflow-hidden">
      <div className="container mx-auto relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* Section Header */}
          <m.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <Badge
              variant="outline"
              className="px-4 py-2 rounded-full mb-6 bg-primary/10 border-primary/20"
            >
              <Trophy className="w-4 h-4 text-primary mr-2" />
              <span className="text-sm font-medium text-primary">
                {tExt("top_performer") || tExt("top_performer")}
              </span>
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {t("featured_leader") || t("featured_leader")}
            </h2>
          </m.div>

          {/* Featured Leader Card */}
          <m.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="group"
          >
            <div className="relative p-8 pt-20 sm:pt-8 rounded-lg bg-card border border-primary/40 overflow-hidden">
              {/* Trophy badge */}
              <div className="absolute top-6 right-6">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                  <Trophy className="w-4 h-4" />
                  #
                  <Loadable loading={isLoading ?? false} chars={1}>
                    {leader?.rank}
                  </Loadable>{" "}
                  Ranked
                </div>
              </div>

              <div className="flex flex-col lg:flex-row gap-8">
                {/* Leader Info */}
                <div className="flex min-w-0 items-start gap-5">
                  <div className="relative shrink-0">
                    {/* The Avatar element carries the 20x20 box and the ring, so
                        it stays mounted in both states; only the image and the
                        initials wait. Radix falls back whenever there is no
                        `src`, which is exactly the pending case. */}
                    <Avatar className="h-20 w-20 ring-4 ring-primary/20">
                      <AvatarImage
                        src={isLoading ? undefined : leader?.avatar}
                        alt={leader?.displayName}
                      />
                      <AvatarFallback
                        className={
                          isLoading
                            ? "animate-pulse bg-muted"
                            : "bg-primary text-primary-foreground text-xl font-bold"
                        }
                      >
                        {isLoading ? null : initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute bottom-1 right-1 w-5 h-5 bg-success border-2 border-border rounded-full" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2 mb-2">
                      <h3 className="truncate font-bold text-2xl text-foreground">
                        <Loadable loading={isLoading ?? false} placeholder={tExt("leader_name")}>
                          {leader?.displayName}
                        </Loadable>
                      </h3>
                      <Star className="w-5 h-5 shrink-0 text-foreground fill-foreground" />
                    </div>

                    <div className="flex items-center gap-2 flex-wrap mb-3">
                      {/*
                        `bg-opacity-10` is a Tailwind v3 utility that does not
                        exist in v4, so it compiled to nothing and the Badge kept
                        its default `bg-primary` underneath this `text-primary`
                        ink — the label was painted in exactly its own background
                        colour (measured 1.00:1, i.e. invisible). The tint has to
                        be expressed as `bg-primary/10`.
                      */}
                      <Badge
                        variant="outline"
                        className={`border-primary/30 bg-primary/10 ${styleConfig.color}`}
                      >
                        <StyleIcon className="w-3 h-3 mr-1" />
                        <Loadable loading={isLoading ?? false} placeholder={tExt("day_trading")}>
                          {leader ? styleConfig.label : null}
                        </Loadable>
                      </Badge>
                      <Badge tone={statusTone(leader?.riskLevel ?? "")}>
                        <Loadable loading={isLoading ?? false} placeholder="MEDIUM">
                          {leader?.riskLevel}
                        </Loadable>{" "}
                        Risk
                      </Badge>
                    </div>

                    {/* The bio reserves ONE clamped line while pending. It is a
                        `line-clamp-2` paragraph, so the honest range is one to
                        two lines and zero is the only value that is certainly
                        wrong — an absent paragraph pushed the stats grid, the
                        profit-share row and the CTA up by a full line height. */}
                    {isLoading ? (
                      <p className="text-sm text-muted-foreground max-w-md line-clamp-2">
                        <Loadable loading placeholder={t("a_short_description_of_this_leaders_strategy")} />
                      </p>
                    ) : leader?.bio ? (
                      <p className="text-sm text-muted-foreground max-w-md line-clamp-2">
                        {leader.bio}
                      </p>
                    ) : null}
                  </div>
                </div>

                {/* Sparkline Chart */}
                <div className="lg:ml-auto flex flex-col items-center justify-center">
                  <span className="text-xs text-subtle-foreground mb-2">14-Day Performance</span>
                  {/* One component in both states — see `MiniSparkline`: the
                      `<svg>` and its zero line are chrome and always render, so
                      an absent series no longer collapses this column. */}
                  <MiniSparkline data={leader?.sparkline ?? []} />
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                <div className="p-4 rounded-lg bg-surface-2 border border-border">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-medium text-muted-foreground">
                      ROI
                    </span>
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-surface-3 text-muted-foreground">
                      <TrendingUp className="h-3.5 w-3.5" />
                    </span>
                  </div>
                  <div
                    className={`text-2xl font-semibold leading-tight tracking-tight font-mono tabular-nums ${
                      isPositiveRoi
                        ? "text-up"
                        : "text-down"
                    }`}
                  >
                    <Loadable loading={isLoading ?? false} placeholder="+12.3%">
                      {leader
                        ? `${isPositiveRoi ? "+" : ""}${(leader.roi ?? 0).toFixed(1)}%`
                        : null}
                    </Loadable>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-surface-2 border border-border">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-medium text-muted-foreground">
                      {tCommon("win_rate")}
                    </span>
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-surface-3 text-muted-foreground">
                      <Target className="h-3.5 w-3.5" />
                    </span>
                  </div>
                  <div className="text-2xl font-semibold leading-tight tracking-tight font-mono tabular-nums text-foreground">
                    <Loadable loading={isLoading ?? false} placeholder="67.5%">
                      {leader ? `${(leader.winRate ?? 0).toFixed(1)}%` : null}
                    </Loadable>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-surface-2 border border-border">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-medium text-muted-foreground">
                      Followers
                    </span>
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-surface-3 text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                    </span>
                  </div>
                  <div className="text-2xl font-semibold leading-tight tracking-tight font-mono tabular-nums text-foreground">
                    <Loadable loading={isLoading ?? false} chars={3}>
                      {leader?.totalFollowers}
                    </Loadable>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-surface-2 border border-border">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-medium text-muted-foreground">
                      {tCommon("total_trades")}
                    </span>
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-surface-3 text-muted-foreground">
                      <BarChart3 className="h-3.5 w-3.5" />
                    </span>
                  </div>
                  <div className="text-2xl font-semibold leading-tight tracking-tight font-mono tabular-nums text-foreground">
                    <Loadable loading={isLoading ?? false} chars={4}>
                      {leader?.totalTrades}
                    </Loadable>
                  </div>
                </div>
              </div>

              {/* Profit Share Info */}
              <div className="flex flex-wrap items-center justify-between gap-4 mt-6 pt-6 border-t border-border/50 dark:border-border-strong/50">
                <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="text-sm text-subtle-foreground">{tCommon("profit_share")}</span>
                  <span className="font-semibold font-mono tabular-nums text-foreground">
                    <Loadable loading={isLoading ?? false} placeholder="20%">
                      {leader ? `${leader.profitSharePercent}%` : null}
                    </Loadable>
                  </span>
                  <span className="text-sm text-subtle-foreground">|</span>
                  <span className="text-sm text-subtle-foreground">{tCommon("total_profit")}</span>
                  <span className="font-semibold font-mono tabular-nums text-up">
                    <Loadable loading={isLoading ?? false} placeholder="$12,345">
                      {/*
                        NO `$`. `stats-calculator.ts:39-49` names this exact
                        line: *"The leaderboard prints these with a literal '$'
                        in front of them, publicly."* `totalProfit` is summed
                        across a leader's trades in whatever quote asset each
                        one settled in.
                      */}
                      {leader ? `${(leader.totalProfit ?? 0).toLocaleString("en-US")}` : null}
                    </Loadable>
                  </span>
                </div>

                {/*
                  The CTA renders in both states — it is a static string in a
                  fixed-height button and withholding it would have moved this
                  whole row. Only its DESTINATION is unknown, so while pending
                  the link is inert (`pointer-events-none` plus `tabIndex={-1}`
                  so it is unreachable by mouse and by keyboard alike) rather
                  than pointing at `/copy-trading/leader/undefined`.
                */}
                <Link
                  href={leader ? `/copy-trading/leader/${leader.id}` : "#"}
                  aria-disabled={leader ? undefined : true}
                  tabIndex={leader ? undefined : -1}
                  className={`shrink-0${leader ? "" : " pointer-events-none"}`}
                >
                  <Button
                    size="lg"
                    className="h-12 px-6 rounded-xl bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/25 group"
                  >
                    {tExt("view_profile") || tExt("view_profile")}
                    <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
              </div>
            </div>
          </m.div>
        </div>
      </div>
    </section>
  );
}
