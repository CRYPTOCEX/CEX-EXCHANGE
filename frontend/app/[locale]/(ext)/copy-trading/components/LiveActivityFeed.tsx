"use client";

import { m, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Users,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Loadable } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";

interface TradeActivity {
  leaderDisplayName: string;
  symbol: string;
  side: "BUY" | "SELL";
  profit: number;
  profitPercent: number;
  timeAgo: string;
  followersCount: number;
}

interface LiveActivityFeedProps {
  recentTrades: TradeActivity[];
  isLoading?: boolean;
}

/**
 * One trade row, in BOTH states.
 *
 * The pending row used to be a separate `LoadingItem` holding three grey bars.
 * It had no second line under the leader's name, so the row was ~18px shorter
 * than the one it stood in for — five of them, and the live-indicator footer
 * plus everything below this section on the landing page slid down ~90px the
 * moment the feed arrived.
 *
 * While pending, direction defaults to the profitable/BUY styling. That is a
 * colour choice, not a layout one — both branches are the same 10x10 tile and
 * the same badge box — so nothing moves when the real side lands.
 */
function TradeActivityCard({
  trade,
  index,
  loading = false,
}: {
  trade?: TradeActivity;
  index: number;
  loading?: boolean;
}) {
  const t = useTranslations("ext_copy-trading");
  const tExt = useTranslations("ext");
  const isProfitable = (trade?.profit ?? 0) >= 0;
  const isBuy = (trade?.side ?? "BUY") === "BUY";

  return (
    <m.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="group"
    >
      {/* Opaque `card` + a full-strength hairline. The row was `bg-card/50
          dark:bg-muted/50` over the page ground with a half-strength border, so
          in dark both the surface and its edge dissolved into the background
          and the feed read as an unframed list. */}
      <div className="flex items-center gap-4 p-4 rounded-lg border border-border bg-card hover:border-primary/40 hover:bg-surface-2 transition-colors duration-200">
        {/* Trade Direction Icon */}
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
            isProfitable
              ? "bg-up/10"
              : "bg-down/10"
          }`}
        >
          {isProfitable ? (
            <TrendingUp className="w-5 h-5 text-up" />
          ) : (
            <TrendingDown className="w-5 h-5 text-down" />
          )}
        </div>

        {/* Trade Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-foreground truncate">
              <Loadable loading={loading} placeholder={tExt("leader_name")}>
                {trade?.leaderDisplayName}
              </Loadable>
            </span>
            <Badge
              variant="outline"
              className={`text-xs ${
                isBuy
                  ? "bg-up/10 text-up-ink border-up/30"
                  : "bg-down/10 text-down-ink border-down/30"
              }`}
            >
              <Loadable loading={loading} placeholder="BUY">
                {trade?.side}
              </Loadable>
            </Badge>
            <span className="text-sm font-medium text-muted-foreground">
              <Loadable loading={loading} placeholder="BTC/USDT">
                {trade?.symbol}
              </Loadable>
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-sm">
            <span
              className={`font-semibold ${
                isProfitable
                  ? "text-up"
                  : "text-down"
              }`}
            >
              <Loadable loading={loading} placeholder="+12.34%">
                {trade
                  ? `${isProfitable ? "+" : ""}${trade.profitPercent.toFixed(2)}%`
                  : null}
              </Loadable>
            </span>
            {/* The copier count is genuinely conditional on the RESOLVED data —
                a trade nobody copied has no count to show — so while pending it
                reserves its box rather than appearing later and widening this
                line. It is on the same line as the figure beside it, so this
                costs no height either way. */}
            {loading ? (
              <span className="flex items-center gap-1 text-subtle-foreground">
                <Users className="w-3 h-3" />
                <Loadable loading placeholder="12" /> copied
              </span>
            ) : trade && trade.followersCount > 0 ? (
              <span className="flex items-center gap-1 text-subtle-foreground">
                <Users className="w-3 h-3" />
                {trade.followersCount} copied
              </span>
            ) : null}
          </div>
        </div>

        {/* Time */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
          <Clock className="w-3 h-3" />
          <span>
            <Loadable loading={loading} placeholder="2h ago">
              {trade?.timeAgo}
            </Loadable>
          </span>
        </div>
      </div>
    </m.div>
  );
}

/** Rows to reserve while the feed is in flight; the endpoint returns five. */
const PENDING_ROW_COUNT = 5;

export default function LiveActivityFeed({
  recentTrades,
  isLoading,
}: LiveActivityFeedProps) {
  const t = useTranslations("ext_copy-trading");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");

  /*
    The pending branch removed from above this line swapped the whole
    `<section>` — including the heading it already knew — for a second copy that
    had lost the subtitle paragraph and the "trades from the last 24 hours"
    footer, and used a different badge icon. Both states now come from the one
    tree below.

    The empty check has to wait for the fetch to resolve: on a fresh install
    with no trades in the window, an unqualified `!recentTrades.length` would be
    true DURING the fetch too, so the section would be absent, then appear, then
    disappear again.
  */
  if (!isLoading && (!recentTrades || recentTrades.length === 0)) {
    return null;
  }

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-1/2 left-0 w-full h-px bg-linear-to-r from-transparent via-primary/20 to-transparent" />

      <div className="container mx-auto relative z-10">
        <div className="max-w-2xl mx-auto">
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
              <Sparkles className="w-4 h-4 text-primary mr-2" />
              <span className="text-sm font-medium text-primary">
                {tExt("live_activity") || tExt("live_activity")}
              </span>
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight mb-4">
              <span className="text-primary">
                {tCommon("recent_trades") || tCommon("recent_trades")}
              </span>
            </h2>
            <p className="text-muted-foreground">
              {t("see_what_leaders_are_trading") ||
                t("see_what_our_top_leaders_are_trading_right_now")}
            </p>
          </m.div>

          {/* Activity Feed */}
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {isLoading
                ? Array.from({ length: PENDING_ROW_COUNT }, (_, index) => (
                    <TradeActivityCard
                      key={`pending-${index}`}
                      index={index}
                      loading
                    />
                  ))
                : recentTrades.map((trade, index) => (
                    <TradeActivityCard
                      key={`${trade.leaderDisplayName}-${trade.symbol}-${trade.timeAgo}-${index}`}
                      trade={trade}
                      index={index}
                    />
                  ))}
            </AnimatePresence>
          </div>

          {/* Live indicator */}
          <m.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex items-center justify-center gap-2 mt-8 text-sm text-subtle-foreground"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <span>{t("trades_from_last_24h") || t("trades_from_the_last_24_hours")}</span>
          </m.div>
        </div>
      </div>
    </section>
  );
}
