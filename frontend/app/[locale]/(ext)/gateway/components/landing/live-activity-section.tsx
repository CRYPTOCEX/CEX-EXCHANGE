"use client";

/**
 * Recent activity feed — rebuilt on the Obsidian landing kit.
 *
 * Every row was a translucent `bg-card/80` plate with a `border-border/50`
 * hairline, and the section was separated by a `from-transparent via-primary/20`
 * gradient rule. A 50%-alpha hairline over a page ground that is itself washed
 * with accent is the reason these rows read as smudges rather than as cards:
 * `Section bordered` and `Panel` give the same separation with an opaque edge.
 *
 * `success` on a completed payment is correct and is NOT `up` — R1 reserves
 * `up`/`down` for direction of money, and "this payment settled" is a state.
 * The one `up` on the page is the live indicator, which is what `LivePill` is.
 */

import { m, useReducedMotion } from "framer-motion";
import { Activity, CheckCircle2, Globe } from "lucide-react";
import { LivePill, Panel, Section, SectionHeading } from "@/components/landing";
import { Loadable } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";

interface ActivityItem {
  type: "payment_completed" | "merchant_joined";
  amount?: number;
  currency?: string;
  timeAgo: string;
  merchantCategory?: string;
}

interface LiveActivitySectionProps {
  activity: ActivityItem[];
  isLoading?: boolean;
}

/**
 * Six rows to draw while the feed is in flight.
 *
 * A feed has no knowable length; this reserves the CONTAINER at the size the
 * section renders anyway (`slice(0, 6)`). Every field is replaced by a
 * placeholder at render time.
 */
const PENDING_ACTIVITY: ActivityItem[] = Array.from({ length: 6 }, () => ({
  type: "payment_completed",
  amount: 0,
  currency: "USD",
  timeAgo: "",
}));

function ActivityCard({
  item,
  index,
  loading = false,
}: {
  item: ActivityItem;
  index: number;
  /**
   * Row is a placeholder.
   *
   * This replaces a separate `LoadingCard` component that lived beside this one
   * and drew the same row in grey bars — `h-4 w-32` for the title, `h-3 w-20`
   * for the timestamp, `h-7 w-20` for the amount chip. It was a second copy of
   * this layout with nothing keeping the two in step, and its bars did not
   * match: the real title is `text-sm` (20px) against `h-4` (16px), and the
   * real chip is a bordered `px-2.5 py-1` box, not a plain rounded rectangle.
   * One component now renders both states.
   */
  loading?: boolean;
}) {
  const t = useTranslations("ext_gateway");
  const tExt = useTranslations("ext");
  const prefersReducedMotion = useReducedMotion();
  const isPayment = item.type === "payment_completed";

  return (
    <m.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35, ease: "easeOut" }}
    >
      <Panel hover className="flex items-center gap-4 p-4">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${
            isPayment ? "border-success/20 bg-success/10" : "border-primary/20 bg-primary/10"
          }`}
        >
          {isPayment ? (
            <CheckCircle2 className="h-4.5 w-4.5 text-success" />
          ) : (
            <Globe className="h-4.5 w-4.5 text-primary" />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            <Loadable loading={loading} placeholder={t("payment_completed")}>
              {isPayment
                ? t("payment_completed")
                : `Merchant joined from ${item.merchantCategory || tExt("global")}`}
            </Loadable>
          </p>
          <p className="text-xs text-muted-foreground">
            <Loadable loading={loading} placeholder="2 minutes ago">
              {item.timeAgo}
            </Loadable>
          </p>
        </div>

        {/* The chip renders while pending too — it is the row's right-hand
            column, and without it the title's flex track is wider than it is
            about to be. */}
        {loading || (isPayment && item.amount) ? (
          <span className="shrink-0 rounded-lg border border-border bg-surface-2 px-2.5 py-1 font-mono text-sm font-semibold tabular-nums text-foreground">
            {/*
              THE HARDCODED `$` IS GONE. It sat immediately in front of the
              row's OWN currency code, so a 0.05 BTC payment rendered literally
              "$0.05 BTC". `gateway/landing/index.get.ts:143-147` sends
              `p.amount` and `p.currency` per row; the code is the unit and the
              `$` was a second, contradictory one.
            */}
            <Loadable loading={loading} placeholder="1,240">
              {item.amount?.toLocaleString("en-US")}
            </Loadable>
            {item.currency && (
              <span className="ml-1 text-xs font-normal text-muted-foreground">{item.currency}</span>
            )}
          </span>
        ) : null}
      </Panel>
    </m.div>
  );
}

export default function LiveActivitySection({ activity, isLoading }: LiveActivitySectionProps) {
  const t = useTranslations("ext_gateway");
  const tExt = useTranslations("ext");

  if (!isLoading && (!activity || activity.length === 0)) {
    return null;
  }

  const completed = activity.filter((a) => a.type === "payment_completed");
  /*
    ONE UNIT OR NO SCALAR. These rows each carry their OWN `currency`
    (`gateway/landing/index.get.ts:143-147`), so adding them produces a number
    that is not a quantity of anything — the same defect the merchant-facing
    dashboard already fixed and documented ("a merchant holding ₦40,000, 0.5 BTC
    and 25 USDT read '$40,025.50 available'"). Summing is honest only when every
    row shares a denomination; otherwise there is no total to publish.
  */
  const volumeCurrencies = new Set(
    completed.map((a) => String(a.currency ?? "").toUpperCase()).filter(Boolean)
  );
  const volumeCurrency = volumeCurrencies.size === 1 ? [...volumeCurrencies][0] : null;
  const totalVolume =
    volumeCurrencies.size <= 1
      ? completed.reduce((sum, a) => sum + (Number(a.amount) || 0), 0)
      : 0;
  const rows = isLoading ? PENDING_ACTIVITY : activity.slice(0, 6);

  return (
    <Section bordered>
      <SectionHeading
        eyebrow={tExt("live_activity")}
        eyebrowIcon={Activity}
        title={t("real_time_transactions")}
        subtitle={tExt("see_whats_happening")}
      />

      {/* One grid, one row component, two states. */}
      <div className="mx-auto grid max-w-4xl gap-4 md:grid-cols-2">
        {rows.map((item, index) => (
          <ActivityCard
            key={`${item.type}-${index}`}
            item={item}
            index={index}
            loading={!!isLoading}
          />
        ))}
      </div>

      {/*
        The summary row renders while pending as well.

        `!isLoading &&` was the scanner's "content withheld until loaded": this
        strip is 10rem below the grid and roughly 30px tall, so the section grew
        by that much the instant the feed arrived — the classic version of the
        defect, where the skeleton above it is perfect and the page still jumps
        because a sibling appears.
      */}
      {(isLoading || totalVolume > 0) && (
        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
          <LivePill label={tExt("live_activity")} />
          <span className="text-sm text-muted-foreground">
            {tExt("recent_volume")}:{" "}
            <span className="font-mono font-semibold tabular-nums text-foreground">
              <Loadable loading={!!isLoading} placeholder="128,400">
                {totalVolume.toLocaleString("en-US")}
              </Loadable>
              {volumeCurrency && (
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  {volumeCurrency}
                </span>
              )}
            </span>
          </span>
          <span className="text-sm text-muted-foreground">
            <span className="font-mono font-semibold tabular-nums text-foreground">
              <Loadable loading={!!isLoading} chars={2}>
                {completed.length}
              </Loadable>
            </span>{" "}
            {t("payments_processed")}
          </span>
        </div>
      )}
    </Section>
  );
}
