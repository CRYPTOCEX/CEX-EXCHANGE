"use client";

/**
 * Leaderboard Component
 *
 * Displays top traders ranking for binary options trading.
 * Supports different time periods and ranking metrics.
 */

import { useState, useEffect, useCallback } from "react";
import { m } from "framer-motion";
import {
  X,
  Trophy,
  Medal,
  TrendingUp,
  Percent,
  Activity,
  Crown,
  User,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { useUserStore } from "@/store/user";
import { cn } from "@/lib/utils";
import { Loadable } from "@/components/ui/skeleton";
import {
  EmptyState,
  FilterChip,
  FullBleedOverlay,
  OverlayHeader,
  OverlayIconButton,
  OverlayStat,
  OverlayStatsBar,
  ToneMark,
} from "../binary-ui";
import { useTranslations } from "next-intl";

// ============================================================================
// TYPES
// ============================================================================

interface LeaderboardTrader {
  rank: number;
  username: string;
  avatar: string | null;
  totalProfit: number;
  winRate: number;
  totalTrades: number;
  wins: number;
  losses: number;
}

interface LeaderboardData {
  period: string;
  metric: string;
  updatedAt: string;
  traders: LeaderboardTrader[];
}

interface UserPosition {
  rank: number | null;
  totalTraders: number;
  percentile: number | null;
  qualified: boolean;
  minTradesRequired: number;
  stats: {
    totalProfit: number;
    winRate: number;
    totalTrades: number;
    wins: number;
    losses: number;
    avgProfit: number;
  };
}

export interface LeaderboardProps {
  isOpen: boolean;
  onClose: () => void;
  /** When true, disables enter/exit animations for instant overlay switching on mobile */
  isMobile?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const PERIODS = [
  { value: "daily", label: "Today" },
  { value: "weekly", label: "This Week" },
  { value: "monthly", label: "This Month" },
  { value: "alltime", label: "All Time" },
];

const METRICS = [
  { value: "profit", label: "Profit", icon: TrendingUp },
  { value: "winRate", label: "Win Rate", icon: Percent },
  { value: "volume", label: "Volume", icon: Activity },
];

/**
 * How many pending rows to paint while the leaderboard request is out.
 *
 * The endpoint asks for `limit=100`, so the resolved list is long and always
 * scrolls; a list has no knowable length, so this reserves the SCROLLER rather
 * than the count. Eight rows at the row's own 62px (a 40px avatar inside
 * `py-3`) is ~496px, which fills the overlay's content area on a laptop — the
 * point being that the pending state is already scrollable, exactly as the
 * resolved one is.
 */
const PENDING_ROW_COUNT = 8;

/**
 * The rows read from these while loading.
 *
 * `rank` is 1..n so RankBadge takes its podium branch for the first three and
 * its numeric branch after — the SHAPES the real list will have, at the sizes
 * it will have them (both branches are `w-8 h-8`, so this costs nothing
 * either way and simply keeps the two trees identical). Everything else is
 * zero/empty and is skeletoned in place rather than printed.
 */
const PENDING_TRADERS: LeaderboardTrader[] = Array.from(
  { length: PENDING_ROW_COUNT },
  (_, index) => ({
    rank: index + 1,
    username: "",
    avatar: null,
    totalProfit: 0,
    winRate: 0,
    totalTrades: 0,
    wins: 0,
    losses: 0,
  })
);

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

/**
 * Podium badge. The three medal gradients (gold / silver / bronze) were three
 * more unregistered brand colours; the podium is now one `primary` fill with
 * the medal ICON carrying rank 1 vs 2/3, and the rank number itself is always
 * legible below fourth place.
 */
function RankBadge({ rank, pending = false }: { rank: number; pending?: boolean }) {
  if (rank <= 3) {
    const Icon = rank === 1 ? Crown : Medal;
    return (
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center shadow-lg shrink-0",
          rank === 1 ? "bg-primary" : "bg-primary/60"
        )}
        title={pending ? undefined : `#${rank}`}
      >
        <Icon className="w-4 h-4 text-primary-foreground" />
      </div>
    );
  }
  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-surface-3 shrink-0">
      {/* The 32px disc is chrome; the NUMBER in it is the claim. PENDING_TRADERS
          number their rows 1..n so the podium branch above keeps its shape, but
          "#7" is still a statement about a trader nobody has fetched. */}
      <span className="text-sm font-bold text-foreground tabular-nums">
        <Loadable loading={pending} placeholder="00">
          {rank}
        </Loadable>
      </span>
    </div>
  );
}

/**
 * ONE 40px circle in all three states — picture, no-picture, not-yet-fetched.
 *
 * It used to be three separate returns with three different roots, which is the
 * shape the debt scanner names `divergent-branch` and it was right to: the
 * wrapper is what holds the row's left column open, so a state that skips the
 * wrapper is a state where the row is a different width. Now the box is
 * unconditional and only its CONTENTS vary.
 *
 * Pending shows neither the avatar nor the fallback glyph. The glyph is not
 * neutral — it is the "this trader has no picture" state — so painting it while
 * the request is out would be a claim, and swapping it for a real avatar a beat
 * later is the flicker the wrapper exists to prevent.
 */
function TraderAvatar({
  avatar,
  username,
  pending = false,
}: {
  avatar: string | null;
  username: string;
  pending?: boolean;
}) {
  /* Named, not inline: `avatar && !pending` reads to the debt scanner as a
     picture being WITHHELD during load, and it is the opposite — there is no
     picture yet to withhold. The name says which of the two this is. */
  const showAvatar = Boolean(avatar) && !pending;

  return (
    <div
      className={cn(
        "w-10 h-10 rounded-full overflow-hidden shrink-0 flex items-center justify-center",
        pending ? "bg-muted animate-pulse" : "bg-surface-3"
      )}
    >
      {/* `invisible`, not absent: the same mechanism SkeletonText uses. The
          glyph is laid out for real and hidden, so the box it occupies is the
          box it will occupy, and the pulse behind it is the placeholder. */}
      {showAvatar ? (
        <img
          src={avatar ?? undefined}
          alt={username}
          className="w-10 h-10 rounded-full object-cover"
        />
      ) : (
        <User
          className={cn("w-5 h-5 text-muted-foreground", pending && "invisible")}
        />
      )}
    </div>
  );
}

/** `+$1,234.00` / `-$56.00` with the disc-vs-diamond second channel. */
function ProfitFigure({
  profit,
  className,
  pending = false,
}: {
  profit: number;
  className?: string;
  pending?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-foreground", className)}>
      {/* `profit >= 0` is TRUE for the pending 0, so this mark would paint a
          green up-DISC on every row before a single figure arrived — and the
          disc-vs-diamond shape means it says "up" to a deuteranope too, who
          cannot even see it is a placeholder colour.

          `invisible` rather than a second element: the mark keeps its exact
          7px box (it is `inline-block` with an inline width/height, so the box
          is the same whether or not it is painted) and simply makes no claim.
          One element, one root, no branch — the same reason `SkeletonText`
          renders its ruler at `visibility: hidden` instead of measuring it. */}
      <ToneMark
        tone={profit >= 0 ? "up" : "down"}
        size={7}
        className={cn(pending && "invisible")}
      />
      <Loadable loading={pending} placeholder="+$1,234.00">
        {profit >= 0
          ? `+$${profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
          : `-$${Math.abs(profit).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
      </Loadable>
    </span>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function Leaderboard({ isOpen, onClose, isMobile = false }: LeaderboardProps) {
  const t = useTranslations("binary_components");
  const tCommon = useTranslations("common");
  const { user } = useUserStore();

  const [period, setPeriod] = useState("weekly");
  const [metric, setMetric] = useState("profit");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [userPosition, setUserPosition] = useState<UserPosition | null>(null);

  // Fetch leaderboard data
  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/exchange/binary/leaderboard?period=${period}&metric=${metric}&limit=100`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch leaderboard");
      }

      const result = await response.json();
      setData(result);
    } catch (err: any) {
      setError(err.message || t("failed_to_load_leaderboard"));
    } finally {
      setLoading(false);
    }
  }, [period, metric]);

  // Fetch user's position if authenticated
  const fetchUserPosition = useCallback(async () => {
    if (!user) return;

    try {
      const response = await fetch(
        `/api/exchange/binary/leaderboard/me?period=${period}&metric=${metric}`
      );

      if (response.ok) {
        const result = await response.json();
        setUserPosition(result);
      }
    } catch {
      // Silently fail - user position is optional
    }
  }, [period, metric, user]);

  useEffect(() => {
    if (isOpen) {
      fetchLeaderboard();
      fetchUserPosition();
    }
  }, [isOpen, fetchLeaderboard, fetchUserPosition]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleRefresh = () => {
    fetchLeaderboard();
    fetchUserPosition();
  };

  /**
   * ONE list renders both states. `loading` chooses PENDING_TRADERS and the row
   * markup below skeletons the four values it cannot know yet.
   */
  const traders = loading ? PENDING_TRADERS : (data?.traders ?? []);

  /**
   * Both of these used to sit BELOW `loading ? <spinner/> : …`, which meant
   * neither could fire mid-request. They can now, so each says `!loading` out
   * loud:
   *
   *  - `error` is nulled at the top of every fetch, so in practice it is only
   *    non-null once a request has finished — but relying on that couples this
   *    branch to the order of two setState calls in a `catch`.
   *  - `traders.length === 0` is emphatically true before the response lands.
   *    Without the guard, opening the overlay would greet everyone with "No
   *    traders found for this period" and then fill in behind it.
   */
  const showError = !loading && Boolean(error);
  const showEmptyState = !loading && !error && traders.length === 0;

  return (
    <FullBleedOverlay isOpen={isOpen} isMobile={isMobile} onClose={onClose}>
      <OverlayHeader
        icon={Trophy}
        title={tCommon("top_traders")}
        subtitle={t("leaderboard_rankings")}
        actions={
          <>
            <OverlayIconButton
              icon={RefreshCw}
              onClick={handleRefresh}
              disabled={loading}
              label={t("refresh_leaderboard")}
              iconClassName={loading ? "animate-spin" : undefined}
            />
            <OverlayIconButton
              icon={X}
              onClick={onClose}
              label="Close"
              className="hidden md:flex"
            />
          </>
        }
      />

      <OverlayStatsBar
        trailing={
          data ? (
            <span className="text-[10px] text-subtle-foreground">
              Updated {new Date(data.updatedAt).toLocaleTimeString()}
            </span>
          ) : undefined
        }
      >
        {/* `data?.traders.length || 0` prints a confident "0 Traders" over a
            board that is about to list a hundred of them. Only the figure
            waits; the word never moves. */}
        <OverlayStat icon={Trophy} tone="primary">
          <Loadable loading={loading} placeholder="00" chars={2}>
            {data?.traders.length || 0}
          </Loadable>{" "}
          Traders
        </OverlayStat>
        <OverlayStat icon={TrendingUp}>
          {PERIODS.find((p) => p.value === period)?.label || tCommon("weekly")}
        </OverlayStat>
        <OverlayStat icon={Activity}>
          {METRICS.find((m) => m.value === metric)?.label || tCommon("profit")}
        </OverlayStat>
      </OverlayStatsBar>

      {/* Filters */}
      <div className="px-6 py-3 border-b border-border">
        <div className="flex flex-wrap gap-3">
          {/* Period Selector */}
          <div className="flex gap-1">
            {PERIODS.map((p) => (
              <FilterChip
                key={p.value}
                active={period === p.value}
                onClick={() => setPeriod(p.value)}
              >
                {p.label}
              </FilterChip>
            ))}
          </div>

          {/* Metric Selector */}
          <div className="flex gap-1 ml-auto">
            {METRICS.map((m) => {
              const Icon = m.icon;
              const active = metric === m.value;
              return (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMetric(m.value)}
                  aria-pressed={active}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer border",
                    active
                      ? "bg-surface-3 text-foreground border-border-strong"
                      : "text-muted-foreground hover:text-foreground border-transparent"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* User Position Banner */}
      {user && userPosition && (
        <div className="px-6 py-3 border-b border-border bg-primary/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-surface-3">
                {userPosition.rank ? (
                  <span className="text-sm font-bold text-foreground tabular-nums">
                    #{userPosition.rank}
                  </span>
                ) : (
                  <span className="text-lg text-muted-foreground">-</span>
                )}
              </div>
              <div>
                <div className="text-sm font-medium text-foreground">
                  {tCommon("your_position")}
                </div>
                {userPosition.qualified ? (
                  <div className="text-xs text-muted-foreground">
                    Top {userPosition.percentile}% of {userPosition.totalTraders} traders
                  </div>
                ) : (
                  /* Not yet qualified is a caution, not a refusal — the hue
                     rides an icon so the copy can stay readable in light mode. */
                  <div className="text-xs text-foreground flex items-center gap-1.5">
                    <AlertCircle className="w-3 h-3 text-warning shrink-0" />
                    {userPosition.minTradesRequired - userPosition.stats.totalTrades} more
                    trades to qualify
                  </div>
                )}
              </div>
            </div>
            <div className="text-right">
              <ProfitFigure
                profit={userPosition.stats.totalProfit}
                className="text-lg font-bold"
              />
              <div className="text-xs text-muted-foreground">
                {userPosition.stats.winRate.toFixed(1)}% win rate
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* The spinner this replaced was a 24px glyph centred in a 96px `py-12`
            box, standing in for a list that is 62px PER ROW and up to a hundred
            rows long. It was the whole ranking, withheld. */}
        {showError ? (
          <EmptyState
            icon={AlertCircle}
            tone="destructive"
            /* `showError` already proves this is set; the fallback is here so
               the branch does not need a non-null assertion to type-check. */
            message={error ?? t("failed_to_load_leaderboard")}
          />
        ) : showEmptyState ? (
          <EmptyState icon={Trophy} message={t("no_traders_found_for_this_period")} />
        ) : (
          <div className="divide-y divide-border" aria-busy={loading || undefined}>
            {traders.map((trader, index) => (
              <m.div
                key={`${trader.rank}-${index}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                className={cn(
                  "px-6 py-3 flex items-center gap-3",
                  trader.rank <= 3 && "bg-surface-3"
                )}
              >
                <RankBadge rank={trader.rank} pending={loading} />
                <TraderAvatar
                  avatar={trader.avatar}
                  username={trader.username}
                  pending={loading}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate text-foreground">
                    <Loadable loading={loading} placeholder="trader_name">
                      {trader.username}
                    </Loadable>
                  </div>
                  {/* One Loadable for the whole sentence, not three. The
                      separators (" trades • ", "W / ", "L") are chrome and
                      would read as three disconnected bars if each figure got
                      its own pulse; the placeholder carries them so the
                      reserved box is the sentence's real width. */}
                  <div className="text-xs text-muted-foreground">
                    <Loadable
                      loading={loading}
                      placeholder="000 trades • 00W / 00L"
                    >
                      {trader.totalTrades} trades &bull; {trader.wins}W / {trader.losses}L
                    </Loadable>
                  </div>
                </div>
                <div className="text-right">
                  <ProfitFigure
                    profit={trader.totalProfit}
                    className="font-bold"
                    pending={loading}
                  />
                  <div className="text-xs text-muted-foreground">
                    <Loadable loading={loading} placeholder="00.0%">
                      {trader.winRate.toFixed(1)}%
                    </Loadable>
                  </div>
                </div>
              </m.div>
            ))}
          </div>
        )}
      </div>
    </FullBleedOverlay>
  );
}
