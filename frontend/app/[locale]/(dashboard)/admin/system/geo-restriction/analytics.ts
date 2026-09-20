"use client";
import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";
import { useTranslations } from "next-intl";

export function useAnalytics() {
  const t = useTranslations("dashboard_admin");

  return [
    // ─────────────────────────────────────────────────────────────
    // Row 1 — the compliance state, as it stands RIGHT NOW.
    //
    // Every tile is a snapshot with the date window removed, because the
    // question this desk answers is "what is in force", never "what did
    // somebody type this month". The headline is COUNT(DISTINCT
    // countryCode): a country can carry more than one rule, and the old
    // COUNT(*) double-counted it.
    //
    // The two schedule tiles are new. A rule only bites while it is BOTH
    // enabled AND inside its effectiveFrom/effectiveTo window, and until
    // the grammar grew a NOW()-relative predicate nothing on this page
    // could read those two columns at all — so a sanctions rule that
    // lapsed last month looked identical to one still in force.
    //
    // NOTE ON EXACTNESS: both tiles test a date that is SET. An
    // open-ended rule (NULL effectiveFrom / NULL effectiveTo) never
    // lapses and is never pending, and a NULL comparison is false, so it
    // correctly falls out of both counts. What is still NOT expressible
    // is the positive "in force right now" predicate, which needs
    // `effectiveTo IS NULL OR effectiveTo >= NOW()` — an OR between a
    // null test and a date test, which the guard list cannot compose.
    // ─────────────────────────────────────────────────────────────
    [
      {
        type: "kpi" as const,
        responsive: {
          mobile: { cols: 1, span: 1 },
          tablet: { cols: 2, span: 2 },
          desktop: { cols: 3, span: 2 },
        },
        items: [
          {
            id: "countries_blocked_now",
            title: t("countries_blocked_now"),
            metric: "countriesBlocked",
            model: "geoRestriction",
            aggregation: {
              field: "countryCode",
              op: "countDistinct",
              where: [
                { field: "type", value: "BLOCK" },
                { field: "status", value: "true" },
              ],
            },
            valueMode: "current",
            format: "number",
            icon: "Globe",
          },
          {
            id: "rules_in_force",
            title: t("rules_in_force"),
            metric: "rulesInForce",
            model: "geoRestriction",
            aggregation: {
              op: "count",
              field: "id",
              where: [{ field: "status", value: "true" }],
            },
            valueMode: "current",
            format: "number",
            icon: "ShieldCheck",
          },
          {
            id: "lapsed_but_enabled",
            title: t("enabled_but_past_their_end_date"),
            metric: "lapsedButEnabled",
            model: "geoRestriction",
            // `{ ago: "0d" }` is exactly NOW(). A rule whose effectiveTo has
            // passed no longer bites, but it is still switched on and still
            // shown as active in the list — so the register says a country is
            // restricted when it is not. That is the single highest-value row
            // on this page, and it replaces the old "In-Force Rules with an
            // End Date", which flagged every scheduled rule including the
            // ones behaving correctly.
            aggregation: {
              op: "count",
              field: "id",
              where: [
                { field: "effectiveTo", op: "<", value: { ago: "0d" } },
                { field: "status", value: "true" },
              ],
            },
            valueMode: "current",
            format: "number",
            invert: true,
            icon: "CalendarX",
          },
          {
            id: "scheduled_not_yet_live",
            title: t("scheduled_not_yet_in_force"),
            metric: "scheduledNotYetLive",
            model: "geoRestriction",
            // The mirror image: enabled, but effectiveFrom is still in the
            // future. Staged compliance dates are the reason those columns
            // exist, so this is a healthy number — it is here so the
            // "Rules In Force" count above can be read honestly.
            aggregation: {
              op: "count",
              field: "id",
              where: [
                { field: "effectiveFrom", op: ">", value: { ago: "0d" } },
                { field: "status", value: "true" },
              ],
            },
            valueMode: "current",
            format: "number",
            icon: "CalendarClock",
          },
          {
            id: "rules_missing_legal_reference",
            title: t("in_force_rules_missing_a_legal_reference"),
            metric: "noLegalReference",
            model: "geoRestriction",
            // This table is the evidentiary record an auditor asks for. A live
            // rule with no citation is an audit finding waiting to happen.
            aggregation: {
              op: "count",
              field: "id",
              where: [
                { field: "legalReference", value: null },
                { field: "status", value: "true" },
              ],
            },
            valueMode: "current",
            format: "number",
            invert: true,
            icon: "Gavel",
          },
          {
            id: "rules_not_enforced",
            title: t("configured_but_not_enforced"),
            metric: "rulesDisabled",
            model: "geoRestriction",
            // Drift detector. A rule somebody switched off and forgot is the
            // exact shape of a compliance failure.
            aggregation: {
              op: "count",
              field: "id",
              where: [{ field: "status", value: "false" }],
            },
            valueMode: "current",
            format: "number",
            invert: true,
            icon: "ShieldOff",
          },
        ],
      },
      {
        type: "chart" as const,
        responsive: {
          mobile: { cols: 1, span: 1 },
          tablet: { cols: 1, span: 2 },
          desktop: { cols: 1, span: 1 },
        },
        items: [
          {
            id: "legalBasisInForce",
            title: t("restrictions_by_legal_basis"),
            // This REPLACES the status pie that used to sit here, and the
            // reason is `scope: "all"`. A pie's slices are always counted
            // inside the selected date window, so a donut titled
            // "restrictions by legal basis" on a compliance register actually
            // read "rules somebody TYPED this month, by legal basis" — and on
            // the 24h view it was empty. A ranked breakdown can be told to
            // ignore the window, so this is the standing policy mix, which is
            // the only version of the question anyone asks.
            //
            // The measure counts enabled rules only; disabled ones have their
            // own tile above.
            description: t("enabled_rules_by_legal_basis_ignoring"),
            type: "bar" as const,
            model: "geoRestriction",
            metrics: [],
            config: {
              groupBy: "reason",
              limit: 6,
              scope: "all" as const,
              measure: {
                op: "count" as const,
                field: "id",
                where: [{ field: "status", value: "true" }],
              },
            },
          },
        ],
      },
    ],

    // ─────────────────────────────────────────────────────────────
    // Row 2 — authoring cadence, as ONE series.
    //
    // This used to be a six-series stacked bar over the same legal-basis
    // aliases the donut beside it produced: the same six numbers drawn
    // twice, once as a ring and once as a stack, on a table that takes a
    // handful of rows a quarter. The mix now lives in the ranked bar
    // above, where it is un-windowed and therefore true; what a time
    // axis adds is only "when did policy move", and that is one line.
    // ─────────────────────────────────────────────────────────────
    {
      type: "chart" as const,
      responsive: {
        mobile: { cols: 1, span: 1 },
        tablet: { cols: 1, span: 1 },
        desktop: { cols: 1, span: 1 },
      },
      items: [
        {
          id: "geoRulesAuthoredOverTime",
          title: t("countries_added_over_time"),
          description: t("rules_authored_per_bucket"),
          type: "bar" as const,
          model: "geoRestriction",
          metrics: ["total"],
          timeframes: ["7d", "30d", "3m", "6m", "y"],
          labels: {
            total: "Rules authored",
          },
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // Row 3 — how hard the live policy bites. FULL takes the country off
    // the platform; PARTIAL only refuses the listed activities; an ALLOW
    // rule is a carve-out that beats a BLOCK for the same country, so
    // its count is the size of the exception list.
    // ─────────────────────────────────────────────────────────────
    {
      type: "kpi" as const,
      responsive: {
        mobile: { cols: 1, span: 1 },
        tablet: { cols: 3, span: 1 },
        desktop: { cols: 3, span: 1 },
      },
      items: [
        {
          id: "full_lockouts_in_force",
          title: t("full_platform_lockouts"),
          metric: "fullLockouts",
          model: "geoRestriction",
          aggregation: {
            op: "count",
            field: "id",
            where: [
              { field: "scope", value: "FULL" },
              { field: "status", value: "true" },
            ],
          },
          valueMode: "current",
          format: "number",
          icon: "Lock",
        },
        {
          id: "partial_restrictions_in_force",
          title: t("activity_level_restrictions"),
          metric: "partialRestrictions",
          model: "geoRestriction",
          aggregation: {
            op: "count",
            field: "id",
            where: [
              { field: "scope", value: "PARTIAL" },
              { field: "status", value: "true" },
            ],
          },
          valueMode: "current",
          format: "number",
          icon: "ListChecks",
        },
        {
          id: "permits_in_force",
          title: t("permits"),
          metric: "permitsInForce",
          model: "geoRestriction",
          aggregation: {
            op: "count",
            field: "id",
            where: [
              { field: "type", value: "ALLOW" },
              { field: "status", value: "true" },
            ],
          },
          valueMode: "current",
          format: "number",
          icon: "CheckSquare",
        },
      ],
    },
  ] as AnalyticsConfig;
}
