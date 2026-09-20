"use client";

import { m, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  CheckCircle2,
  Activity,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Loadable, SkeletonText } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";

interface RecentCompletion {
  planName: string;
  result: "WIN" | "LOSS" | "DRAW";
  profit: number;
  profitPercent: number;
  duration: string;
  timeAgo: string;
  anonymizedUser: string;
}

interface RecentCompletionsSectionProps {
  completions: RecentCompletion[];
  isLoading?: boolean;
}

// A completed investment either made money or lost it, which is direction —
// so these take `--up` / `--down` (R1), not the success/destructive pair that
// means "the operation succeeded" / "this will destroy something".
const resultConfig = {
  WIN: {
    icon: TrendingUp,
    bg: "bg-up/10",
    text: "text-up",
    border: "border-up/20",
    label: "Profit",
  },
  LOSS: {
    icon: TrendingDown,
    bg: "bg-down/10",
    text: "text-down",
    border: "border-down/20",
    label: "Loss",
  },
  DRAW: {
    icon: Minus,
    bg: "bg-muted/10",
    text: "text-muted-foreground",
    border: "border-border/20",
    label: "Break Even",
  },
};

/**
 * One completed investment, in both states.
 *
 * `completion` is optional, which retires the `LoadingCard` twin below. That
 * twin had already drifted: `border-border/50` where this card's border colour
 * is the RESULT tint, no `hover:shadow-md`, no badge at all, and `h-4`/`h-3`
 * blocks where the real rows are a `font-medium` line plus a 22px badge (26px)
 * and a `text-sm` line (20px). Six of them in a two-column grid ran three rows
 * short by ~10px each.
 *
 * With no completion the card takes the DRAW config — the one entry in
 * `resultConfig` that is neutral. Falling back to WIN or LOSS would paint a
 * grid of green and red cards on a landing page before a single result had
 * arrived, and R1 gives those two hues exactly that meaning.
 */
function CompletionCard({
  completion,
  index,
}: {
  completion?: RecentCompletion;
  index: number;
}) {
  const t = useTranslations("ext_forex");
  const isPending = !completion;
  const config =
    (completion && resultConfig[completion.result]) || resultConfig.DRAW;
  const Icon = config.icon;

  return (
    <m.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      className={`flex items-center gap-4 p-4 rounded-xl bg-card/80 dark:bg-surface-2/80 border ${config.border} hover:shadow-md transition-all duration-300`}
    >
      {/* Result Icon */}
      <div
        className={`w-10 h-10 rounded-full ${config.bg} flex items-center justify-center flex-shrink-0`}
      >
        <Icon className={`w-5 h-5 ${config.text}`} />
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-foreground truncate">
            <Loadable loading={isPending} placeholder={t("trader")}>
              {completion?.anonymizedUser}
            </Loadable>
          </span>
          {/* The direction is carried by the icon to the left of this row and
              by the signed figure to the right. The 12px badge LABEL takes
              neutral ink because `text-up` on `bg-up/10` measures 2.98:1 in
              light mode — the colour is the signal, not the legibility. */}
          <Badge
            variant="outline"
            className={`${config.bg} ${config.border} text-foreground text-xs`}
          >
            {/* The pill's own padding and 12px type hold the row height; only
                the word inside it is a claim about the outcome. */}
            {isPending ? <SkeletonText placeholder="Profit" /> : config.label}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground truncate">
          <Loadable loading={isPending} placeholder={t("forex_plan_30_days")}>
            {completion ? `${completion.planName} • ${completion.duration}` : null}
          </Loadable>
        </p>
      </div>

      {/* Profit/Loss Amount */}
      <div className="text-right flex-shrink-0">
        <p className={`font-bold ${config.text}`}>
          <Loadable loading={isPending} placeholder="+00.0%">
            {completion
              ? `${completion.result === "WIN" ? "+" : completion.result === "LOSS" ? "-" : ""}${Math.abs(parseFloat(String(completion.profitPercent)) || 0).toFixed(1)}%`
              : null}
          </Loadable>
        </p>
        <p className="text-xs text-subtle-foreground flex items-center justify-end gap-1">
          <Clock className="w-3 h-3" />
          <Loadable loading={isPending} placeholder="0d ago">
            {completion?.timeAgo}
          </Loadable>
        </p>
      </div>
    </m.div>
  );
}

export default function RecentCompletionsSection({
  completions,
  isLoading,
}: RecentCompletionsSectionProps) {
  const t = useTranslations("ext_forex");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");

  /**
   * `loading` and `empty` are different states.
   *
   * `if (!isLoading && !completions.length) return null` reserved the whole
   * section during the fetch — `py-20` twice, a centred header, a grid and an
   * ~88px summary pill — and then discarded it on an install with no completed
   * investments. It now resolves to a genuine empty state instead.
   */
  const showEmptyState = !isLoading && (!completions || completions.length === 0);
  const hasCompletions = !isLoading && !!completions && completions.length > 0;

  return (
    <section className="py-20 relative overflow-hidden">
      <div className="container mx-auto relative z-10">
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
            <Activity className="w-4 h-4 text-primary mr-2" />
            <span className="text-sm font-medium text-primary">
              {tExt("live_activity") || tExt("live_activity")}
            </span>
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {tCommon("recent") || tCommon("recent")}{" "}
            <span className="text-primary">
              {t("completions") || t("completions")}
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("see_how_investors_are_performing") ||
              t("see_how_investors_are_performing_on")}
          </p>
        </m.div>

        {showEmptyState ? (
          /* Gated on `!isLoading` through the predicate above, or it asserts
             "no completions" against a `completions` array that is `[]` only
             because the request has not returned. */
          <div className="max-w-4xl mx-auto rounded-lg border border-border bg-card p-16 text-center">
            <Activity className="mx-auto mb-4 h-12 w-12 text-subtle-foreground" />
            <h3 className="mb-2 text-xl font-semibold text-foreground">
              {tExt("live_activity") || tExt("live_activity")}
            </h3>
            <p className="mx-auto max-w-md text-sm text-muted-foreground">
              {t("no_investment_has_run_to_completion")}
            </p>
          </div>
        ) : (
          /* TWO pending rows, not six. The container is `md:grid-cols-2`, so
             two cards IS one row — six reserved three rows (~180px more than
             one) against a feed that shows whatever has actually closed. One
             row is the knowable part; the number of rows is not. */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
            <AnimatePresence mode="popLayout">
              {isLoading
                ? [0, 1].map((i) => (
                    <CompletionCard key={`pending-${i}`} index={i} />
                  ))
                : completions.slice(0, 6).map((completion, index) => (
                    <CompletionCard
                      key={`${completion.anonymizedUser}-${index}`}
                      completion={completion}
                      index={index}
                    />
                  ))}
            </AnimatePresence>
          </div>
        )}

        {/*
          Summary Stats — reserved while loading.

          This was gated on `!isLoading && completions.length > 0`, so the pill
          was absent during the fetch and appeared underneath the grid on
          arrival: a `mt-10` plus a `py-3` pill, ~88px, added to the bottom of
          the section and pushing every later section of the landing page down
          by that much. It is the exact shape SKELETONS.md calls the subtlest
          one — the skeleton above it could be pixel-perfect and the page would
          still jump, because the movement comes from what the pending state
          OMITS.

          `isLoading ||` reserves it; the two figures inside are the only
          unknowns. `hasCompletions` still guards the resolved case, so an
          install with genuinely no completions gets no summary — that branch is
          reached for real now that the section resolves to an empty state
          rather than to nothing.
        */}
        {(isLoading || hasCompletions) && (
          <m.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="mt-10 flex justify-center"
          >
            <div className="flex items-center gap-6 px-6 py-3 rounded-full bg-card/50 dark:bg-surface-2/50 border border-border/50 dark:border-border-strong/50">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-up" />
                <span className="text-sm text-muted-foreground">
                  <span className="font-semibold text-up">
                    <Loadable loading={!!isLoading} placeholder="0">
                      {isLoading
                        ? null
                        : completions.filter((c) => c.result === "WIN").length}
                    </Loadable>
                  </span>{" "}
                  {tCommon("wins") || "wins"}
                </span>
              </div>
              <div className="w-px h-4 bg-muted" />
              <span className="text-sm text-subtle-foreground">
                {t("from_last") || t("from_last")}{" "}
                <Loadable loading={!!isLoading} placeholder="0">
                  {isLoading ? null : completions.length}
                </Loadable>{" "}
                {tCommon("investments") || "investments"}
              </span>
            </div>
          </m.div>
        )}
      </div>
    </section>
  );
}
