"use client";
import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";
import { useTranslations } from "next-intl";

/**
 * Platform P&L.
 * ============================================================================
 *
 * On a profit page every figure has to be MONEY. The previous version was 18
 * counters and three donuts that all counted ROWS of `adminProfit.type`, so one
 * 50,000 USD gateway fee and one 0.00001 BTC trading fee each contributed 1 —
 * which inverts the ranking the page exists to show. The three cards that did
 * claim to be money (`amount`, `average`, `currency`) had no aggregation the
 * old engine could read and rendered a literal 0.
 *
 * Two structural corrections beyond "use SUM":
 *
 *  1. REFERRAL_REWARD is a platform PAYOUT, not a fee: `recordPlatformLoss`
 *     writes it with a NEGATIVE amount precisely so the report nets out. It
 *     appeared in none of the 18 counters, none of the three donuts and not in
 *     the trend chart, so even a corrected amount-based page would have shown
 *     gross fees as if they were profit. `netProfit` includes it by
 *     construction, and it now has a card of its own.
 *
 *  2. This page already renders `ProfitSummaryDashboard` above the table, fed
 *     by `/api/admin/finance/profit/summary`, which does the per-type and
 *     PER-CURRENCY sums correctly. Restating that taxonomy here in a different
 *     unit is what made one screen show "Binary Orders" twice with two
 *     different numbers. The analytics tab therefore owns what the panel
 *     lacks — the time dimension, the sign split, and the per-event shape —
 *     and nothing else.
 *
 * Second pass — the revenue-line ranking, which is the one thing a P&L page
 * cannot do without and the one thing the old grammar could not express. `type`
 * has nineteen members; ranking them by MONEY is what says whether the platform
 * is a trading business or a gateway business this month.
 *
 * On the overlap with the panel: the panel is ALL-TIME and per-currency
 * (`profit/summary.get.ts` groups with no date filter). Both bars below are
 * scoped to the SELECTED WINDOW, so they answer "what earned this period",
 * which the panel cannot. Their titles say so. Cross-currency magnitude still
 * applies to THOSE TWO BARS — a ranked breakdown is its own GROUP BY and cannot
 * also group by currency — but no longer to the KPIs. `adminProfit.currency` is
 * a real per-row column, so every SUM tile below carries `inUSD: "currency"`:
 * a 0.4 BTC fee and a 50,000 NGN fee used to be added together and shown as
 * "$50,000.4", and they are now priced at their own rates and reported as one
 * real USD figure, with anything the engine had no rate for named on the card
 * instead of counted as zero. The panel remains the authority for a
 * per-currency figure, which is why this tab still does not restate one.
 *
 * Still not expressible: "profit trend BY revenue line" as a stacked area — a
 * ranked breakdown is its own GROUP BY and cannot also carry the time axis.
 */
export function useAnalytics() {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");

  return [
    // ─────────────────────────────────────────────────────────────
    // Section 1 — what the platform earned, what it paid out, and the
    // shape of a single fee event.
    // ─────────────────────────────────────────────────────────────
    [
      {
        type: "kpi",
        responsive: {
          mobile: { cols: 1 },
          tablet: { cols: 2, span: 2 },
          desktop: { cols: 3, span: 2 },
        },
        items: [
          {
            // Signed sum: negative REFERRAL_REWARD and platform-loss rows net
            // out automatically, which is the whole point of storing them that
            // way. This is the number reported upward.
            id: "net_profit",
            title: tCommon("net_profit"),
            metric: "netProfit",
            model: "adminProfit",
            aggregation: { field: "amount", op: "sum", inUSD: "currency" },
            valueMode: "periodTotal",
            format: "currency",
            icon: "mdi:cash-multiple",
          },
          {
            id: "gross_fees_captured",
            title: t("gross_fees_captured"),
            metric: "grossFees",
            model: "adminProfit",
            aggregation: {
              field: "amount",
              op: "sum",
              inUSD: "currency",
              where: [{ field: "amount", op: ">", value: 0 }],
            },
            valueMode: "periodTotal",
            format: "currency",
            icon: "mdi:cash-plus",
          },
          {
            // Net alone hides a business where both sides are exploding.
            // The value is negative, so a "rise" in the delta chip means a
            // LARGER payout — hence `invert`.
            id: "platform_payouts",
            title: t("platform_payouts"),
            metric: "payouts",
            model: "adminProfit",
            aggregation: {
              field: "amount",
              op: "sum",
              inUSD: "currency",
              where: [{ field: "amount", op: "<", value: 0 }],
            },
            valueMode: "periodTotal",
            format: "currency",
            invert: true,
            icon: "mdi:cash-minus",
          },
          {
            id: "referral_rewards_paid",
            title: t("referral_rewards_paid"),
            metric: "referralPayouts",
            model: "adminProfit",
            aggregation: {
              field: "amount",
              op: "sum",
              inUSD: "currency",
              where: [{ field: "type", value: "REFERRAL_REWARD" }],
            },
            valueMode: "periodTotal",
            format: "currency",
            invert: true,
            icon: "mdi:account-arrow-right",
          },
          {
            /**
             * Distinguishes a high-frequency, low-margin line from a
             * low-frequency, high-margin one — two businesses that need
             * opposite operational attention.
             *
             * The "$" is off, because only a SUM can be denominated: the engine
             * rejects `inUSD` on an average by design, and averaging first is
             * what the header describes — one 50,000 NGN fee and one 0.00001 BTC
             * fee average to 25,000.000005 of nothing, which was being printed
             * as "$25,000". Unitless it is still the shape signal it is here
             * for; the per-currency figure is the panel's job.
             */
            id: "average_profit_per_event",
            title: t("average_profit_per_event"),
            metric: "avgProfit",
            model: "adminProfit",
            aggregation: { field: "amount", op: "avg" },
            valueMode: "periodTotal",
            format: "number",
            icon: "mdi:calculator",
          },
          {
            /**
             * A MAX picks one row and shows its stored `amount`, in whatever
             * currency that row happens to be in — so the "largest" fee was
             * whichever denomination has the smallest unit, and 50,000 NGN (~$36)
             * beat 0.4 BTC every time while both wore a dollar sign. `inUSD`
             * cannot rescue a max either; ranking across denominations needs the
             * conversion INSIDE the comparison, which the engine does not do.
             * Number, not currency, until it can.
             */
            id: "largest_single_fee",
            title: t("largest_single_fee"),
            metric: "largestFee",
            model: "adminProfit",
            aggregation: { field: "amount", op: "max" },
            valueMode: "periodTotal",
            format: "number",
            icon: "mdi:arrow-top-right",
          },
          {
            id: "fee_events_booked",
            title: tCommon("total_transactions"),
            metric: "feeEvents",
            model: "adminProfit",
            aggregation: { field: "id", op: "count" },
            valueMode: "periodTotal",
            format: "number",
            icon: "mdi:receipt-text",
          },
          {
            // The card the old config tried to render and could not. Sudden
            // growth means fee configuration was switched on for markets
            // nobody reviewed. As-of, because it describes the standing
            // configuration rather than a flow.
            id: "currencies_earning_fees",
            title: t("currencies_earning_fees"),
            metric: "distinctCurrencies",
            model: "adminProfit",
            aggregation: { field: "currency", op: "countDistinct" },
            valueMode: "current",
            format: "number",
            icon: "mdi:currency-usd",
          },
          {
            // `chain` is a real column that no card has ever referenced.
            // COUNT(DISTINCT) skips NULLs, so this is on-chain fee coverage.
            id: "chains_earning_fees",
            title: t("chains_earning_fees"),
            metric: "chainsEarning",
            model: "adminProfit",
            aggregation: { field: "chain", op: "countDistinct" },
            valueMode: "current",
            format: "number",
            icon: "mdi:link-variant",
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
            /**
             * The card this page exists for, and it has never been on it: which
             * revenue lines actually earned, ranked, in money.
             *
             * It replaces "Gross Fees vs Platform Payouts" — a two-series bar
             * whose two numbers are already the second and third KPI tiles four
             * inches away, and whose trend is the section below. A sign split
             * is a fact about two figures; this is a ranking over nineteen.
             *
             * SUM over `amount` and not over positives only, so a line that
             * pays out more than it earns (REFERRAL_REWARD is stored negative
             * by `recordPlatformLoss`) is ranked at its true contribution.
             */
            id: "profit_by_revenue_line",
            title: t("top_revenue_lines_this_period"),
            type: "bar",
            model: "adminProfit",
            metrics: [],
            config: {
              groupBy: "type",
              limit: 10,
              measure: { field: "amount", op: "sum" },
            },
          },
        ],
      },
    ],

    // ─────────────────────────────────────────────────────────────
    // Section 2 — the growth question, in amounts. The old trend chart
    // plotted fee FREQUENCY, which can rise while revenue falls.
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
          id: "profitsOverTime",
          title: t("net_profit_over_time"),
          type: "bar",
          model: "adminProfit",
          metrics: ["netProfit"],
          timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
          labels: {
            netProfit: "Net Profit",
          },
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // Section 3 — margin per event, by line. The ranking above and
    // this one together separate the two businesses the global
    // "Average Profit per Event" tile blends: a high-frequency,
    // fractions-of-a-cent trading fee and a low-frequency, large
    // gateway or binary fee need opposite operational attention, and
    // a single blended average hides both.
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
          id: "avg_profit_by_revenue_line",
          title: t("average_profit_per_event_by_revenue_line"),
          type: "bar",
          model: "adminProfit",
          metrics: [],
          config: {
            groupBy: "type",
            limit: 8,
            measure: { field: "amount", op: "avg" },
          },
        },
      ],
    },
  ] as AnalyticsConfig;
}
