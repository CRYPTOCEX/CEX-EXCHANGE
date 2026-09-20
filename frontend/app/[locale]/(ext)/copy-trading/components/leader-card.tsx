"use client";

import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { statusTone } from "@/lib/status-tone";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loadable } from "@/components/ui/skeleton";
import { m } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Users,
  BarChart3,
  Zap,
  Shield,
  Trophy,
  Flame,
  ArrowRight,
  Target,
  Percent,
  ChevronRight,
} from "lucide-react";
import { useTranslations } from "next-intl";

interface Leader {
  id: string;
  displayName: string;
  avatar?: string;
  tradingStyle: string;
  riskLevel: string;
  tradingType?: string;
  winRate: number;
  roi: number;
  totalFollowers: number;
  totalTrades?: number;
  profitSharePercent: number;
  maxFollowers?: number;
  sparkline?: number[];
  rank?: number;
  user?: {
    firstName?: string;
    lastName?: string;
    avatar?: string;
  };
  isFollowing?: boolean;
}

interface LeaderCardProps {
  /** Omitted only while `loading` — every other caller passes a real leader. */
  leader?: Leader;
  index?: number;
  variant?: "default" | "compact" | "featured";
  /**
   * Render the card's own frame with its figures pending.
   *
   * Added because both call sites — the directory at
   * `copy-trading/leader/client.tsx` and the landing page's top-leaders strip —
   * used to draw their pending grid as bare `h-[340px] rounded-2xl bg-muted`
   * slabs. That shape shares nothing with this card: the card is `rounded-lg`
   * with a hairline and an accent rule, and its height is produced by its
   * content (which is only ~340px when the leader happens to publish a
   * follower cap). So the grid re-drew wholesale, and on the directory the
   * height changed on every filter change too, because the fetch re-runs.
   */
  loading?: boolean;
  /**
   * A guided-tour anchor, forwarded to the card's outer frame.
   *
   * Threaded as a prop rather than hardcoded, because this card is rendered by
   * BOTH the landing page's top-leaders strip and the leader directory. An
   * anchor written into the component itself would exist on both pages and on
   * every card in the grid, and `querySelector` takes the first match — so a
   * walkthrough that means "here is one trader's published record" would point
   * at whichever card happened to render first. The directory passes it for its
   * first card only; every other call site leaves it undefined, and React then
   * omits the attribute entirely.
   */
  "data-tour"?: string;
}

/**
 * Risk rungs are a STATE, and LOW/MEDIUM/HIGH already live in the central
 * `STATUS_TONE` table, so only the wording stays local.
 */
const riskLevelLabel: Record<string, string> = {
  LOW: "Low Risk",
  MEDIUM: "Medium Risk",
  HIGH: "High Risk",
};

/**
 * This risk marker is a text run, not a pill, so the tone resolves to ink
 * rather than to a Badge.
 */
const toneInk: Record<BadgeTone, string> = {
  primary: "text-primary",
  secondary: "text-secondary-foreground",
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
  info: "text-info",
  neutral: "text-muted-foreground",
};

const tradingTypeConfig: Record<
  string,
  { label: string; className: string }
> = {
  SPOT: {
    label: "Spot",
    className: "bg-primary/10 text-primary-ink",
  },
  BINARY: {
    label: "Binary",
    className: "bg-primary/10 text-primary-ink",
  },
  BOTH: {
    label: "Spot + Binary",
    className: "bg-primary/10 text-primary-ink",
  },
};

const tradingStyleConfig: Record<
  string,
  { icon: any; color: string; label: string }
> = {
  SCALPING: {
    icon: Zap,
    color: "text-primary",
    label: "Scalping",
  },
  DAY_TRADING: {
    icon: BarChart3,
    color: "text-primary",
    label: "Day Trading",
  },
  SWING: {
    icon: TrendingUp,
    color: "text-primary",
    label: "Swing",
  },
  POSITION: {
    icon: Shield,
    color: "text-primary",
    label: "Position",
  },
};

export default function LeaderCard({
  leader,
  index = 0,
  loading = false,
  "data-tour": dataTour,
}: LeaderCardProps) {
  const t = useTranslations("ext_copy-trading");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const avatar = leader?.avatar || leader?.user?.avatar;
  const initials = (leader?.displayName ?? "")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const isPositiveRoi = (leader?.roi ?? 0) >= 0;
  // Unrecognised levels keep the old fallback to MEDIUM.
  const riskLevel =
    leader && riskLevelLabel[leader.riskLevel] ? leader.riskLevel : "MEDIUM";
  const styleConfig =
    (leader && tradingStyleConfig[leader.tradingStyle]) ||
    tradingStyleConfig.DAY_TRADING;
  const StyleIcon = styleConfig.icon;
  const typeConfig =
    tradingTypeConfig[leader?.tradingType || "SPOT"] || tradingTypeConfig.SPOT;

  const isTopPerformer = (leader?.roi ?? 0) > 30;
  const isHotTrader = (leader?.totalFollowers ?? 0) > 50;
  const spotsUsed = leader?.maxFollowers
    ? (leader.totalFollowers / leader.maxFollowers) * 100
    : 0;

  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      data-tour={dataTour}
      className="group h-full"
    >
      {/* The card's destination is the one thing that is genuinely unknown
          while pending, so the link stays in place (it is the h-full block that
          gives the card its cell) and is made inert instead of pointing at
          `/copy-trading/leader/undefined`. */}
      <Link
        href={leader ? `/copy-trading/leader/${leader.id}` : "#"}
        aria-disabled={leader ? undefined : true}
        tabIndex={leader ? undefined : -1}
        className={cn("block h-full", !leader && "pointer-events-none")}
      >
        <Card className="relative h-full overflow-hidden border border-border/60 bg-card hover:border-border-strong transition-all duration-300 ">
          {/* Top accent line — this encodes ROI direction, so it takes the
              price pair (R1) rather than success/destructive. It was a
              three-stop gradient that ended on `warning` for a losing leader,
              which read as a caution rather than as a number going down. */}
          <div
            className={cn(
              "absolute top-0 left-0 right-0 h-0.5",
              isPositiveRoi ? "bg-up" : "bg-down"
            )}
          />

          <CardContent className="p-5">
            {/* Header: Avatar + Name + Badges */}
            <div className="flex items-start gap-3.5 mb-5">
              <div className="relative shrink-0">
                {/* The Avatar element carries the 12x12 box and the ring, so it
                    stays mounted in both states rather than being swapped for a
                    second element that would have to re-declare them. Radix
                    renders the fallback whenever there is no `src`. */}
                <Avatar className="h-12 w-12 ring-2 ring-border">
                  <AvatarImage src={loading ? undefined : avatar} alt={leader?.displayName} />
                  <AvatarFallback
                    className={
                      loading
                        ? "animate-pulse bg-muted"
                        : "bg-primary text-primary-foreground font-semibold text-sm"
                    }
                  >
                    {loading ? null : initials}
                  </AvatarFallback>
                </Avatar>
                {/* Online indicator */}
                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-success border-2 border-border rounded-full" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <h3 className="font-semibold text-base text-foreground truncate">
                    <Loadable loading={loading} placeholder={tExt("leader_name")}>
                      {leader?.displayName}
                    </Loadable>
                  </h3>
                  {/* Status badges */}
                  {isTopPerformer && (
                    <div className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/10">
                      <Trophy className="h-3 w-3 text-primary" />
                    </div>
                  )}
                  {isHotTrader && !isTopPerformer && (
                    <div className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/10">
                      <Flame className="h-3 w-3 text-primary" />
                    </div>
                  )}
                </div>

                {/* Style and risk badges */}
                <div className="flex items-center flex-wrap gap-1.5">
                  <div className={`flex items-center gap-1 text-xs ${styleConfig.color}`}>
                    <StyleIcon className="h-3 w-3" />
                    <span className="font-medium">
                      <Loadable loading={loading} placeholder={tExt("day_trading")}>
                        {leader ? styleConfig.label : null}
                      </Loadable>
                    </span>
                  </div>
                  <span className="text-muted-foreground">•</span>
                  <span
                    className={`text-xs font-medium ${toneInk[statusTone(riskLevel)]}`}
                  >
                    <Loadable loading={loading} placeholder={t("medium_risk")}>
                      {leader ? riskLevelLabel[riskLevel] : null}
                    </Loadable>
                  </span>
                  <span
                    className={`shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded whitespace-nowrap ${typeConfig.className}`}
                  >
                    <Loadable loading={loading} placeholder="Spot">
                      {leader ? typeConfig.label : null}
                    </Loadable>
                  </span>
                </div>
              </div>
            </div>

            {/* Stats Row.

                The tiles were `bg-muted dark:bg-muted/50`. Half-strength
                `muted` over `card` lands ~3 points of lightness apart in dark,
                so the three figures read as bare text on the card instead of as
                panels. `surface-2` is the opaque rung above `card` and takes a
                hairline, which holds in both themes. */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              {/* ROI */}
              <div className="text-center p-3 rounded-lg border border-border bg-surface-2">
                <div className="flex items-center justify-center gap-1 mb-1">
                  {isPositiveRoi ? (
                    <TrendingUp className="h-3.5 w-3.5 text-up" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5 text-down" />
                  )}
                  <span className="text-[10px] uppercase tracking-wider text-subtle-foreground font-medium">
                    ROI
                  </span>
                </div>
                <p
                  className={`text-lg font-bold ${
                    isPositiveRoi
                      ? "text-up"
                      : "text-down"
                  }`}
                >
                  <Loadable loading={loading} placeholder="+12.3%">
                    {leader
                      ? `${isPositiveRoi ? "+" : ""}${leader.roi.toFixed(1)}%`
                      : null}
                  </Loadable>
                </p>
              </div>

              {/* Win Rate */}
              <div className="text-center p-3 rounded-lg border border-border bg-surface-2">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Target className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[10px] uppercase tracking-wider text-subtle-foreground font-medium">
                    {tCommon("win_rate")}
                  </span>
                </div>
                <p className="text-lg font-bold text-foreground">
                  <Loadable loading={loading} placeholder="67.5%">
                    {leader ? `${leader.winRate.toFixed(1)}%` : null}
                  </Loadable>
                </p>
              </div>

              {/* Followers */}
              <div className="text-center p-3 rounded-lg border border-border bg-surface-2">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Users className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[10px] uppercase tracking-wider text-subtle-foreground font-medium">
                    Followers
                  </span>
                </div>
                <p className="text-lg font-bold text-foreground">
                  <Loadable loading={loading} chars={3}>
                    {leader?.totalFollowers}
                  </Loadable>
                </p>
              </div>
            </div>

            {/* Capacity Progress.
                Reserved while pending: this block is ~44px, and skipping it
                until the fetch landed made every card in the grid that much
                shorter than the one it was about to become. A leader with no
                published cap still collapses it once we KNOW there is none. */}
            {(loading || leader?.maxFollowers) && (
              <div className="mb-5">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-subtle-foreground">Capacity</span>
                  <span className="text-muted-foreground font-medium">
                    <Loadable loading={loading} placeholder="12/100">
                      {leader ? `${leader.totalFollowers}/${leader.maxFollowers}` : null}
                    </Loadable>
                  </span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      spotsUsed > 90
                        ? "bg-destructive"
                        : spotsUsed > 70
                        ? "bg-warning"
                        : "bg-success"
                    }`}
                    style={{ width: `${Math.min(spotsUsed, 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Footer: Profit Share + CTA */}
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted">
                  <Percent className="h-3 w-3 text-subtle-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground">
                    <Loadable loading={loading} placeholder="20%">
                      {leader ? `${leader.profitSharePercent}%` : null}
                    </Loadable>
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">{tCommon("profit_share")}</span>
              </div>

              <div className="flex items-center gap-1 text-sm font-medium text-primary group-hover:gap-2 transition-all">
                <span>{tExt("view_profile")}</span>
                <ChevronRight className="h-4 w-4" />
              </div>
            </div>

            {/* Following indicator */}
            {leader?.isFollowing && (
              <div className="absolute top-3 right-3">
                <Badge className="bg-primary/10 text-primary-ink border-0 text-xs">
                  Following
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </Link>
    </m.div>
  );
}
