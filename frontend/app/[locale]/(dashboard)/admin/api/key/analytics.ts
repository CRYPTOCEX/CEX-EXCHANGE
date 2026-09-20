"use client";
import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";
import { useTranslations } from "next-intl";

export function useAnalytics() {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");

  return [
    // ─────────────────────────────────────────────────────────────
    // Row 1 — security posture of the live fleet.
    //
    // Every tile here is a snapshot (`valueMode: "current"`), because a
    // credential's risk has nothing to do with the month it was minted.
    //
    // The three age-based tiles are the point of the page: an expired key
    // that is still enabled, a key nobody has used in a quarter and a
    // signing secret nobody has rotated in half a year are all standing
    // liabilities, and none of them was expressible until the grammar
    // grew a NOW()-relative predicate. `{ ago: "0d" }` is exactly NOW().
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
            id: "live_api_keys",
            title: tCommon("active_keys"),
            metric: "liveKeys",
            model: "apiKey",
            aggregation: {
              op: "count",
              field: "id",
              where: [{ field: "disabled", value: "false" }],
            },
            valueMode: "current",
            format: "number",
            icon: "Key",
          },
          {
            id: "expired_but_enabled",
            title: t("expired_but_still_enabled"),
            metric: "expiredStillEnabled",
            model: "apiKey",
            // `expiresAt` is advisory metadata, not an enforcement flag — a key
            // past its date keeps authenticating until somebody disables it.
            // This is therefore a live revocation worklist, not a report.
            // Keys with no expiry are NULL here and correctly fall out.
            aggregation: {
              op: "count",
              field: "id",
              where: [
                { field: "expiresAt", op: "<", value: { ago: "0d" } },
                { field: "disabled", value: "false" },
              ],
            },
            valueMode: "current",
            format: "number",
            invert: true,
            icon: "CalendarX",
          },
          {
            id: "stale_api_keys",
            title: t("active_idle_90_days"),
            metric: "staleKeys",
            model: "apiKey",
            // Used once and then abandoned. Distinct from "never used": these
            // belong to an integration that really existed and was retired
            // without anybody revoking its credential.
            aggregation: {
              op: "count",
              field: "id",
              where: [
                { field: "lastUsedAt", op: "<", value: { ago: "90d" } },
                { field: "disabled", value: "false" },
              ],
            },
            valueMode: "current",
            format: "number",
            invert: true,
            icon: "Clock",
          },
          {
            id: "never_used_api_keys",
            title: t("active_but_never_used"),
            metric: "neverUsed",
            model: "apiKey",
            // Unused credentials are pure liability — this is the standing
            // revocation worklist.
            aggregation: {
              op: "count",
              field: "id",
              where: [
                { field: "lastUsedAt", value: null },
                { field: "disabled", value: "false" },
              ],
            },
            valueMode: "current",
            format: "number",
            invert: true,
            icon: "TimerOff",
          },
          {
            id: "ip_restricted_api_keys",
            title: t("ip_restricted_keys"),
            metric: "ipRestricted",
            model: "apiKey",
            aggregation: {
              op: "count",
              field: "id",
              where: [
                { field: "ipRestriction", value: "true" },
                { field: "disabled", value: "false" },
              ],
            },
            valueMode: "current",
            format: "number",
            icon: "ShieldCheck",
          },
          {
            id: "ip_restriction_coverage",
            title: t("ip_restriction_coverage"),
            metric: "ipCoverage",
            model: "apiKey",
            // The one hardening ratio a security review asks for. It used to
            // be three cards that all reported the inverse of their title.
            derived: { op: "percent", of: ["ipRestricted", "liveKeys"] },
            format: "percent",
            icon: "Percent",
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
            id: "apiKeyTypeDistribution",
            title: t("api_key_type_distribution"),
            type: "pie" as const,
            model: "apiKey",
            metrics: ["user", "plugin"],
            config: {
              field: "type",
              status: [
                {
                  value: "user",
                  label: t("user_keys"),
                  color: "green",
                  icon: "mdi:account",
                },
                {
                  value: "plugin",
                  label: t("plugin_keys"),
                  color: "blue",
                  icon: "mdi:layers",
                },
              ],
            },
          },
        ],
      },
    ],

    // ─────────────────────────────────────────────────────────────
    // Row 2 — issuance rate, split by who the key belongs to. A spike in
    // plugin keys is an integration rollout; a spike in user keys with no
    // matching rise in usage is usually a scripted signup wave.
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
          id: "apiKeyCreationOverTime",
          title: t("api_keys_over_time"),
          description: t("keys_issued_per_bucket_by_owner_type"),
          type: "stackedBar" as const,
          model: "apiKey",
          metrics: ["user", "plugin"],
          timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
          labels: {
            user: t("user_keys"),
            plugin: t("plugin_keys"),
          },
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // Row 3 — rotation hygiene, and what revocation actually looks like.
    //
    // The `disabledBy` split the blueprint asked for stays as the
    // "Revoked by an Admin" tile beside its total: it has two members, so
    // a ranked chart of it would be one bar and a zero row for the keys
    // that are still live. The ranked slot goes to `disabledReason`,
    // where the values are free text and therefore genuinely unknown at
    // config time — which is the case a top-N exists for.
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
            id: "unrotated_secrets",
            title: t("signing_secrets_older_than_180_days"),
            metric: "staleSecrets",
            model: "apiKey",
            // `secretCreatedAt` is stamped on issue AND on rotation, so an old
            // value here means the HMAC secret has never been rotated. Scoped
            // to live keys — a rotation backlog on revoked credentials is not
            // a backlog.
            aggregation: {
              op: "count",
              field: "id",
              where: [
                { field: "secretCreatedAt", op: "<", value: { ago: "180d" } },
                { field: "disabled", value: "false" },
              ],
            },
            valueMode: "current",
            format: "number",
            invert: true,
            icon: "KeyRound",
          },
          {
            id: "admin_revoked_api_keys",
            title: t("revoked_by_an_admin"),
            metric: "adminRevoked",
            model: "apiKey",
            // Admin-initiated revocations are incidents; user-initiated ones
            // are housekeeping. Conflating them hides the incident count.
            aggregation: {
              op: "count",
              field: "id",
              where: [{ field: "disabledBy", value: "admin" }],
            },
            valueMode: "current",
            format: "number",
            invert: true,
            icon: "ShieldBan",
          },
          {
            id: "disabled_api_keys",
            title: t("disabled_keys"),
            metric: "disabledKeys",
            model: "apiKey",
            aggregation: {
              op: "count",
              field: "id",
              where: [{ field: "disabled", value: "true" }],
            },
            valueMode: "current",
            format: "number",
            icon: "Lock",
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
            id: "revocationReasons",
            title: t("why_keys_were_revoked"),
            // The measure counts only disabled rows, so live keys collapse
            // into the "Unspecified" group at zero — and the part of that
            // group that is NOT zero is real: keys somebody revoked without
            // recording why, which is the audit gap on this table.
            description: t("disabled_keys_by_recorded_reason_unspecified"),
            type: "bar" as const,
            model: "apiKey",
            metrics: [],
            config: {
              groupBy: "disabledReason",
              limit: 6,
              scope: "all" as const,
              measure: {
                op: "count" as const,
                field: "id",
                where: [{ field: "disabled", value: "true" }],
              },
            },
          },
        ],
      },
    ],
  ] as AnalyticsConfig;
}
