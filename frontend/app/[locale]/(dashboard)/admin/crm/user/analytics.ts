"use client";

import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

import { useTranslations } from "next-intl";
export function useAnalytics() {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  return [
    // ─────────────────────────────────────────────────────────────
    // Row 1 — the population as it stands RIGHT NOW.
    //
    // Everything here runs with the date window removed
    // (`valueMode: "current"`), because "how many accounts are alive"
    // is a stock, not a flow. The COHORT that registered inside the
    // window lives in row 2; the old page mixed the two and titled a
    // single bucket "Total Users".
    //
    // MAU and the dormancy count are the two numbers this page existed
    // without: `lastLogin` is a real column and until the grammar grew a
    // NOW()-relative predicate the only thing any card could say about
    // it was IS NULL.
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
            id: "total_users",
            title: tCommon("total_users"),
            metric: "userBase",
            model: "user",
            aggregation: { field: "id", op: "count" },
            valueMode: "current",
            format: "number",
            icon: "Users",
          },
          {
            id: "monthly_active_users",
            title: t("active_in_last_30_days"),
            metric: "activeLast30",
            model: "user",
            // MAU. A moving 30-day offset from NOW(), so it means the same
            // thing on every timeframe the page offers — it is deliberately
            // NOT the selected window, which would make "monthly active"
            // read "active in the last 24 hours" on the 24h view.
            aggregation: {
              op: "count",
              field: "id",
              where: [{ field: "lastLogin", op: ">=", value: { ago: "30d" } }],
            },
            valueMode: "current",
            format: "number",
            icon: "Activity",
          },
          {
            id: "dormant_users",
            title: t("dormant_90_days"),
            metric: "dormant90",
            model: "user",
            // Logged in at least once and then stopped. Accounts that never
            // logged in at all are NULL here and fall out of the comparison,
            // which is correct — they are an onboarding failure, not churn,
            // and they have their own tile.
            aggregation: {
              op: "count",
              field: "id",
              where: [{ field: "lastLogin", op: "<", value: { ago: "90d" } }],
            },
            valueMode: "current",
            format: "number",
            invert: true,
            icon: "UserMinus",
          },
          {
            id: "never_logged_in",
            title: tCommon("never_logged_in"),
            metric: "neverLoggedIn",
            model: "user",
            aggregation: {
              op: "count",
              field: "id",
              where: [{ field: "lastLogin", value: null }],
            },
            valueMode: "current",
            format: "number",
            invert: true,
            icon: "UserX",
          },
          {
            id: "enforcement_backlog",
            title: t("suspended_banned"),
            metric: "enforcement",
            model: "user",
            // One IN-list instead of two chained !=: the previous form was
            // correct only until somebody adds a fifth status member.
            aggregation: {
              op: "count",
              field: "id",
              where: [{ field: "status", values: ["SUSPENDED", "BANNED"] }],
            },
            valueMode: "current",
            format: "number",
            invert: true,
            icon: "ShieldBan",
          },
          {
            id: "failed_login_lockouts",
            title: t("accounts_with_3_failed_logins"),
            metric: "lockedOut",
            model: "user",
            // Credential-stuffing detector. `failedLoginAttempts` resets on a
            // successful login, so a standing population here is an attack in
            // progress, not history.
            aggregation: {
              op: "count",
              field: "id",
              where: [{ field: "failedLoginAttempts", op: ">=", value: "3" }],
            },
            valueMode: "current",
            format: "number",
            invert: true,
            icon: "ShieldAlert",
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
            id: "accountsByRole",
            title: t("accounts_by_role"),
            // `scope: "all"` because the question is "how many privileged
            // accounts exist", not "how many were minted this month".
            //
            // The bars carry role NAMES. `groupBy: "roleId"` is resolved
            // through the `belongsTo` association on the user model, so the
            // engine renders "Super Admin" where the column holds a 1.
            description: t("all_accounts_by_role_name_ignoring_the_date_window"),
            type: "bar" as const,
            model: "user",
            metrics: [],
            config: {
              groupBy: "roleId",
              limit: 6,
              scope: "all" as const,
            },
          },
        ],
      },
    ],

    // ─────────────────────────────────────────────────────────────
    // Row 2 — the onboarding funnel, as counts of the SAME cohort: the
    // accounts registered inside the selected window. `phoneVerified` is
    // a real NOT NULL column no card ever touched.
    //
    // The two rates are computed over that cohort rather than over the
    // whole table, so a broken mail provider shows up the same day
    // instead of being diluted by every user who ever verified.
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
          id: "new_users",
          title: t("new_signups"),
          metric: "newSignups",
          model: "user",
          // Its own alias rather than the built-in `total`: the snapshot pass
          // that serves the `current` cards on this page also re-publishes
          // `total` as the all-time row count, so a period card reading
          // `total` would silently report the whole table.
          aggregation: { op: "count", field: "id" },
          valueMode: "periodTotal",
          format: "number",
          icon: "UserPlus",
        },
        {
          id: "verified_signups",
          title: tCommon("verified"),
          metric: "verifiedSignups",
          model: "user",
          aggregation: { field: "emailVerified", value: "true" },
          valueMode: "periodTotal",
          format: "number",
          icon: "MailCheck",
        },
        {
          id: "phone_verified_signups",
          title: tCommon("phone_verified"),
          metric: "phoneVerifiedSignups",
          model: "user",
          aggregation: { field: "phoneVerified", value: "true" },
          valueMode: "periodTotal",
          format: "number",
          icon: "Phone",
        },
        {
          id: "activated_signups",
          title: t("activated_logged_in"),
          metric: "activatedSignups",
          model: "user",
          aggregation: {
            op: "count",
            field: "id",
            where: [{ field: "lastLogin", value: null, negate: true }],
          },
          valueMode: "periodTotal",
          format: "number",
          icon: "UserCheck",
        },
        {
          id: "email_verification_rate",
          title: t("email_verification_rate"),
          metric: "verificationRate",
          model: "user",
          derived: { op: "percent", of: ["verifiedSignups", "newSignups"] },
          format: "percent",
          icon: "Percent",
        },
        {
          id: "activation_rate",
          title: tCommon("activation_rate"),
          metric: "activationRate",
          model: "user",
          derived: { op: "percent", of: ["activatedSignups", "newSignups"] },
          format: "percent",
          icon: "Gauge",
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // Row 3 — the funnel over time. The gap between the lines is
    // activation lag; a widening gap means the verification mail path
    // is failing. This slot used to hold five status series applied to
    // a creation cohort, which reported today's bans as historical.
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
          id: "onboardingFunnelOverTime",
          title: t("user_registrations_over_time"),
          description: t("registered_then_email_verified_phone_verified"),
          type: "line" as const,
          model: "user",
          metrics: [
            "total",
            "verifiedSignups",
            "phoneVerifiedSignups",
            "activatedSignups",
          ],
          timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
          labels: {
            total: "Registered",
            verifiedSignups: "Email verified",
            phoneVerifiedSignups: "Phone verified",
            activatedSignups: "Logged in",
          },
        },
      ],
    },
  ] as AnalyticsConfig;
}
