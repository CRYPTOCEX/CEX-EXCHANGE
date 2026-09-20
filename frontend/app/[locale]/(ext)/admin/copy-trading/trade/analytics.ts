"use client";
import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";
import { useTranslations } from "next-intl";

/**
 * Copy-trading replication health and exposure.
 *
 * `copyTradingTrade` carries ten numeric columns — cost, fee, profit, slippage,
 * latencyMs among them — and the old page read none of them: three status
 * counts, a four-of-ten-member status pie, a two-of-twelve-member side pie and
 * a three-series count line.
 *
 * Two of its cards were actively wrong in opposite directions from the same
 * boolean. `{ field: "isLeaderTrade", value: true }` compiled to `= 'true'`,
 * which MySQL coerces to 0, so "Leader Trades" reported the FOLLOWER count;
 * `value: false` was falsy, so the old extractor discarded the instruction and
 * "Follower Trades" rendered 0. The engine now reads the model's attribute type
 * and emits `= 1` / `= 0`, and a `false` in a `where` guard survives.
 *
 * REPLICATION_FAILED — a follower's money that did not follow the leader — was
 * counted by no card, pie or series in the entire domain. It leads this page as
 * a rate, because that is the number worth waking somebody for.
 *
 * STILL NOT EXPRESSIBLE: P&L bucketed by `closedAt` rather than `createdAt` —
 * `dateField` is declared once per page, not per chart, and this page's other
 * series are keyed to when the trade was opened. Binary win rate is also absent:
 * `binaryResult` would give it, but it costs a numerator card, a denominator
 * card and a derived card for one figure on a page that is already at thirteen
 * items, and the SPOT side of the book is the larger risk.
 */
export function useAnalytics() {
  const t = useTranslations("ext_admin");

  return [
    // ─────────────────────────────────────────────────────────────
    // Row 1 — live exposure and the product's core promise.
    // ─────────────────────────────────────────────────────────────
    [
      {
        type: "kpi",
        responsive: {
          mobile: { cols: 1, span: 1 },
          tablet: { cols: 2, span: 2 },
          desktop: { cols: 2, span: 2 },
        },
        items: [
          {
            /**
             * Money in the market right now — all of it.
             *
             * A position that is CLOSING has an unfilled exit order against it
             * and a position that is PARTIALLY_FILLED has a live remainder;
             * both are exposure, and both were outside a card titled "Open
             * Exposure" because guards are ANDed and there was no OR. The
             * IN-list is the whole risk number instead of a third of it.
             *
             * NO DOLLAR SIGN, AND NO `inUSD` EITHER. `cost` does not have one
             * denomination: the replication path stores the QUOTE outlay for a
             * BUY (`amount * price + fee`) and the BASE quantity for a SELL
             * (`copyAmount`), so one column holds 30,000 USDT on one row and
             * 0.5 BTC on the next. No column says which — `feeCurrency` is
             * always the quote asset and would price that 0.5 BTC as fifty
             * cents — so there is nothing `inUSD` can group by, and the card
             * was printing "$30,000.50" for a book worth eighty thousand.
             */
            id: "open_exposure",
            title: t("open_exposure"),
            metric: "openExposure",
            model: "copyTradingTrade",
            aggregation: {
              op: "sum",
              field: "cost",
              where: [
                {
                  field: "status",
                  values: ["OPEN", "CLOSING", "PARTIALLY_FILLED"],
                },
              ],
            },
            valueMode: "current",
            format: "number",
            icon: "mdi:chart-box-outline",
          },
          {
            /**
             * CLOSING is the interval between "we asked to exit" and "the exit
             * filled". It is supposed to last seconds. A row still sitting in it
             * an hour later is a position the platform believes is closed and
             * the market believes is open — the follower is carrying risk
             * nobody is watching, and the exit order has probably died.
             *
             * The exposure itself is inside the card beside this one now, which
             * frees this slot for the thing an admin can act on. `updatedAt`
             * moves on every status write, so it is the correct clock for "how
             * long has it been in THIS state".
             */
            id: "stuck_closing",
            title: t("stuck_exiting_over_1h"),
            metric: "stuckClosing",
            model: "copyTradingTrade",
            aggregation: {
              op: "count",
              field: "id",
              where: [
                { field: "status", value: "CLOSING" },
                { field: "updatedAt", op: "<", value: { ago: "1h" } },
              ],
            },
            valueMode: "current",
            format: "number",
            invert: true,
            icon: "mdi:exit-run",
          },
          {
            // Throughput of the replication engine — the figure the desk
            // reports upward. `isLeaderTrade = 0` now means what it says.
            // Unitless for the same reason as Open Exposure above: `cost` is
            // quote units on a BUY and base units on a SELL.
            id: "copy_volume",
            title: t("copy_volume"),
            metric: "copyVolume",
            model: "copyTradingTrade",
            aggregation: {
              op: "sum",
              field: "cost",
              where: [{ field: "isLeaderTrade", value: "false" }],
            },
            format: "number",
            icon: "mdi:content-copy",
          },
          {
            // Every point of this is a follower whose money did not follow.
            //
            // Denominator is LEADER trades, not follower trades: `cron.ts`
            // parks the LEADER row as REPLICATION_FAILED after the retry bound
            // (`trade.update({ status: "REPLICATION_FAILED" })` on the row it
            // is replicating FROM), so the failures live in the leader
            // population. Dividing them by the follower count would put the
            // numerator outside its own denominator.
            id: "replication_failure_rate",
            title: t("replication_failure_rate"),
            metric: "replicationFailureRate",
            model: "copyTradingTrade",
            derived: {
              op: "percent",
              of: ["replicationFailed", "leaderTrades"],
            },
            format: "percent",
            invert: true,
            icon: "mdi:alert-decagram",
          },
        ],
      },
      {
        type: "chart",
        responsive: {
          mobile: { span: 1 },
          tablet: { span: 2 },
          desktop: { span: 1 },
        },
        items: [
          {
            id: "replicationFailureRateOverTime",
            title: t("replication_failure_rate"),
            type: "line",
            model: "copyTradingTrade",
            metrics: ["replicationFailureRate"],
            timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
            labels: { replicationFailureRate: "Failure rate %" },
          },
        ],
      },
    ],

    // ─────────────────────────────────────────────────────────────
    // Row 2 — execution quality. Every column here was stored and never read.
    // ─────────────────────────────────────────────────────────────
    {
      type: "kpi",
      responsive: {
        mobile: { cols: 1, span: 1 },
        tablet: { cols: 2, span: 1 },
        desktop: { cols: 4, span: 1 },
      },
      items: [
        {
          // The denominator of the rate above: trades that had to be
          // replicated. `= 1` is emitted from the model's attribute type — the
          // old card compared this tinyint against the string 'true', which
          // MySQL coerces to 0, so it reported the follower count instead.
          id: "leader_trades",
          title: t("leader_trades"),
          metric: "leaderTrades",
          model: "copyTradingTrade",
          aggregation: {
            op: "count",
            field: "id",
            where: [{ field: "isLeaderTrade", value: "true" }],
          },
          icon: "mdi:account-star",
        },
        {
          id: "replication_failed",
          title: t("replications_failed"),
          metric: "replicationFailed",
          model: "copyTradingTrade",
          aggregation: { field: "status", value: "REPLICATION_FAILED" },
          invert: true,
          icon: "mdi:close-network",
        },
        {
          // Slow replication means followers get worse fills than the leader —
          // the most common copy-trading complaint, previously unmeasurable.
          // AVG skips NULLs, so unreplicated rows do not drag it down.
          id: "average_latency",
          title: t("avg_replication_latency_ms"),
          metric: "avgLatency",
          model: "copyTradingTrade",
          aggregation: {
            op: "avg",
            field: "latencyMs",
            where: [{ field: "isLeaderTrade", value: "false" }],
          },
          format: "number",
          invert: true,
          icon: "mdi:timer-outline",
        },
        {
          // The numeric proof behind the latency complaints.
          id: "average_slippage",
          title: t("average_slippage"),
          metric: "avgSlippage",
          model: "copyTradingTrade",
          aggregation: { op: "avg", field: "slippage" },
          format: "number",
          invert: true,
          icon: "mdi:arrow-expand-horizontal",
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // Row 3 — do followers earn what leaders earn? The divergence is the
    // product's honesty check, and it needed both the boolean fix and a sum.
    // ─────────────────────────────────────────────────────────────
    [
      {
        type: "kpi",
        responsive: {
          mobile: { cols: 1, span: 1 },
          tablet: { cols: 2, span: 2 },
          desktop: { cols: 2, span: 2 },
        },
        items: [
          {
            /**
             * Unlike `cost`, realised profit says what it is denominated in:
             * `profitCurrency` is the market's quote asset, written on every
             * replicated row. Without it these two cards added a NEO/ETH gain
             * of 0.004 straight onto a BTC/USDT gain of 300 and labelled the
             * result "$300.00" — the same defect `stats-calculator.ts` was
             * rewritten to remove on the subscriber's own screen.
             *
             * A leader SPOT row created by `tradeListener` carries no
             * `profitCurrency`, so it lands in the card's `unpriced` list
             * instead of being folded in at zero. That is the honest outcome
             * and it makes the gap visible.
             */
            id: "leader_realised_pnl",
            title: t("leader_realised_p_l"),
            metric: "leaderPnl",
            model: "copyTradingTrade",
            aggregation: {
              op: "sum",
              field: "profit",
              inUSD: "profitCurrency",
              where: [
                { field: "status", value: "CLOSED" },
                { field: "isLeaderTrade", value: "true" },
              ],
            },
            format: "currency",
            icon: "mdi:account-star",
          },
          {
            id: "follower_realised_pnl",
            title: t("follower_realised_p_l"),
            metric: "followerPnl",
            model: "copyTradingTrade",
            aggregation: {
              op: "sum",
              field: "profit",
              inUSD: "profitCurrency",
              where: [
                { field: "status", value: "CLOSED" },
                { field: "isLeaderTrade", value: "false" },
              ],
            },
            format: "currency",
            icon: "mdi:account-multiple-check",
          },
        ],
      },
      {
        type: "chart",
        responsive: {
          mobile: { span: 1 },
          tablet: { span: 2 },
          desktop: { span: 1 },
        },
        items: [
          {
            // Grouped, not stacked: realised P&L is signed, and stacking a loss
            // under a profit draws a bar that means nothing.
            id: "realisedPnlLeaderVsFollower",
            title: t("realised_p_l_leader_vs_follower"),
            type: "bar",
            model: "copyTradingTrade",
            metrics: ["leaderPnl", "followerPnl"],
            timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
            labels: {
              leaderPnl: "Leader",
              followerPnl: "Follower",
            },
          },
        ],
      },
    ],

    // ─────────────────────────────────────────────────────────────
    // Row 4 — what the desk earns, split by the unit it earns it in.
    // ─────────────────────────────────────────────────────────────
    {
      type: "chart",
      responsive: {
        mobile: { span: 1 },
        tablet: { span: 1 },
        desktop: { span: 1 },
      },
      items: [
        {
          /**
           * Fee revenue, ranked by `feeCurrency`.
           *
           * There was no fee card on this page at all, and that was the right
           * call while the only option was one SUM: `fee` is denominated by the
           * per-row `feeCurrency`, so a single total adds USDT to BTC and
           * prints a number that is not money in any unit. A ranked breakdown
           * groups by the denomination first, so each bar is a real figure.
           *
           * A ranked BAR rather than a donut: the tail rolls into "Other" and a
           * ring of six token symbols cannot be read.
           */
          id: "copyTradingFeesByCurrency",
          title: t("fees_earned_by_currency"),
          type: "bar",
          model: "copyTradingTrade",
          metrics: [],
          config: {
            groupBy: "feeCurrency",
            limit: 6,
            measure: { op: "sum", field: "fee" },
          },
        },
      ],
    },
  ] as AnalyticsConfig;
}
