"use client";
import React from "react";
import {
  CalendarIcon,
  FileText,
  Globe,
  Hash,
  MapPin,
  Network,
  Route,
  ShieldQuestion,
  User,
} from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import type { ViewConfig } from "@/components/blocks/data-table/types/table";
import { useTranslations } from "next-intl";

/**
 * Reason codes, in the same vocabulary the server writes. Kept as a flat
 * option list so the column is filterable — "show me every ANONYMIZED_IP
 * refusal last week" is a question operators actually ask.
 */
const REASON_OPTIONS = [
  { value: "COUNTRY_BLOCKED", label: "Country restricted" },
  { value: "NOT_IN_ALLOWLIST", label: "Not on the allowlist" },
  { value: "UNKNOWN_COUNTRY_BLOCKED", label: "Country unknown (blocked)" },
  { value: "IP_BLOCKLIST", label: "IP blocklisted" },
  { value: "ANONYMIZED_IP", label: "VPN / proxy / Tor" },
  { value: "LOOKUP_FAILED_CLOSED", label: "Engine failure (blocked)" },
  { value: "ADMIN_BYPASS", label: "Administrator bypass" },
  { value: "IP_ALLOWLIST", label: "IP allowlisted" },
  { value: "ACCOUNT_EXIT", label: "Wind-down carve-out" },
  { value: "COUNTRY_ALLOWED", label: "Country permitted" },
  { value: "ACTION_NOT_RESTRICTED", label: "Activity not restricted" },
  { value: "UNKNOWN_COUNTRY_ALLOWED", label: "Country unknown (allowed)" },
  { value: "LOOKUP_FAILED_OPEN", label: "Engine failure (allowed)" },
  { value: "EXEMPT_PATH", label: "Exempt path" },
  { value: "DISABLED", label: "Enforcement off" },
];

const SOURCE_OPTIONS = [
  { value: "CDN_HEADER", label: "CDN header" },
  { value: "IP_LOOKUP", label: "IP lookup" },
  { value: "KYC", label: "Verified identity" },
  { value: "PROFILE", label: "User profile" },
  { value: "MANUAL", label: "Manually supplied" },
  { value: "NONE", label: "Not determined" },
];

export function useColumns() {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");

  return [
    {
      key: "createdAt",
      title: tCommon("time"),
      type: "date",
      icon: CalendarIcon,
      sortable: true,
      filterable: true,
      description: t("when_this_decision_was_made"),
      render: { type: "date", format: "PPpp" },
      priority: 1,
    },
    {
      key: "decision",
      title: tCommon("decision"),
      type: "select",
      options: [
        { value: "BLOCKED", label: tCommon("blocked") },
        { value: "ALLOWED", label: t("allowed") },
        { value: "BYPASSED", label: t("bypassed") },
      ],
      sortable: true,
      filterable: true,
      description: t("what_the_platform_did_with_this_request"),
      priority: 1,
      render: {
        type: "badge",
        config: {
          withDot: true,
          variant: (value: string) =>
            value === "BLOCKED"
              ? "destructive"
              : value === "BYPASSED"
                ? "warning"
                : "success",
        },
      },
    },
    {
      key: "countryName",
      title: tCommon("country"),
      type: "text",
      icon: Globe,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("country_resolved_for_this_request"),
      priority: 1,
    },
    {
      key: "countryCode",
      title: t("iso_code"),
      type: "text",
      sortable: true,
      searchable: true,
      filterable: true,
      expandedOnly: true,
      description: t("iso_3166_1_alpha_2_country_code"),
      priority: 3,
    },
    {
      key: "reasonCode",
      title: tCommon("reason"),
      type: "select",
      options: REASON_OPTIONS,
      icon: ShieldQuestion,
      sortable: true,
      filterable: true,
      description: t("why_the_platform_reached_this_decision"),
      priority: 2,
      render: {
        type: "badge",
        config: {
          withDot: false,
          variant: (value: string) =>
            value?.includes("BLOCK") || value === "ANONYMIZED_IP" || value === "NOT_IN_ALLOWLIST"
              ? "destructive"
              : "secondary",
        },
      },
    },
    {
      key: "ip",
      title: tCommon("ip_address"),
      type: "text",
      icon: Network,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("address_the_request_came_from"),
      priority: 2,
    },
    {
      key: "source",
      title: t("determined_by"),
      type: "select",
      options: SOURCE_OPTIONS,
      icon: MapPin,
      sortable: true,
      filterable: true,
      expandedOnly: true,
      description: t("which_signal_established_the_country"),
      priority: 3,
    },
    {
      key: "hitCount",
      title: t("repeats"),
      type: "number",
      icon: Hash,
      sortable: true,
      filterable: true,
      description: t(
        "identical_decisions_from_the_same_address_collapsed_into_this_entry"
      ),
      priority: 2,
    },
    {
      key: "path",
      title: tCommon("path"),
      type: "text",
      icon: Route,
      sortable: true,
      searchable: true,
      filterable: true,
      expandedOnly: true,
      fullWidth: true,
      description: t("what_the_visitor_was_trying_to_reach"),
      priority: 3,
    },
    {
      key: "method",
      title: tCommon("method"),
      type: "text",
      sortable: true,
      filterable: true,
      expandedOnly: true,
      priority: 4,
    },
    {
      key: "action",
      title: tCommon("activity"),
      type: "text",
      sortable: true,
      filterable: true,
      expandedOnly: true,
      description: t("the_activity_this_request_was_classified_as"),
      priority: 4,
    },
    {
      key: "userId",
      title: tCommon("user"),
      type: "text",
      icon: User,
      sortable: true,
      searchable: true,
      filterable: true,
      expandedOnly: true,
      description: t("signed_in_user_if_any_most_decisions_precede_sign_in"),
      priority: 4,
    },
    {
      key: "isProxy",
      title: t("vpn_or_proxy"),
      type: "boolean",
      sortable: true,
      filterable: true,
      expandedOnly: true,
      priority: 4,
    },
    {
      key: "isTor",
      title: t("tor"),
      type: "boolean",
      sortable: true,
      filterable: true,
      expandedOnly: true,
      priority: 4,
    },
    {
      key: "userAgent",
      title: tCommon("user_agent"),
      type: "text",
      sortable: false,
      searchable: true,
      filterable: false,
      expandedOnly: true,
      fullWidth: true,
      priority: 5,
    },
    {
      key: "reasonDetail",
      title: t("detail"),
      type: "textarea",
      sortable: false,
      filterable: false,
      expandedOnly: true,
      fullWidth: true,
      description: t("the_message_returned_to_the_visitor"),
      priority: 5,
    },
  ] as ColumnDefinition[];
}

/* -------------------------------------------------------------------------- *
 * View dialog
 *
 * One row is one decision, and a decision is only defensible if the whole chain
 * is visible at once: WHO (address, country and how that country was
 * established), WHAT they were reaching for, WHAT the platform did, and the
 * exact sentence they were given. The header carries the chain's conclusion,
 * the stats carry the reasoning, and the sections carry the evidence.
 * -------------------------------------------------------------------------- */

function labelOf(
  options: Array<{ value: string; label: string }>,
  value: any
): string | null {
  const match = options.find((option) => option.value === value);
  return match ? match.label : value ? String(value) : null;
}

const DECISION_LABELS: Record<string, string> = {
  BLOCKED: "Blocked",
  ALLOWED: "Allowed",
  BYPASSED: "Bypassed",
};

function decisionTone(decision: string): "destructive" | "warning" | "success" {
  if (decision === "BLOCKED") return "destructive";
  if (decision === "BYPASSED") return "warning";
  return "success";
}

/**
 * A one-sided signal, painted one-sidedly.
 *
 * The generic boolean cell renders `false` as a RED "No" with a cross — which
 * on this table means "not a proxy", the benign and overwhelmingly common case,
 * shown in the same ink as a blocked decision. Anonymity only means something
 * when it is PRESENT, so the absent case is a quiet neutral chip.
 */
function AnonymityFlag({ on }: { on: boolean }) {
  const tCommon = useTranslations("common");
  return (
    <Badge tone={on ? "destructive" : "neutral"} appearance="soft">
      {on ? tCommon("yes") : tCommon("no")}
    </Badge>
  );
}

export function useViewConfig(): ViewConfig {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");

  return React.useMemo<ViewConfig>(
    () => ({
      size: "3xl",

      title: (row) => (
        <span className="flex flex-wrap items-baseline gap-2">
          <span>{row.countryName || t("unknown_country")}</span>
          {row.countryCode && (
            <span className="font-mono text-sm font-normal text-muted-foreground">
              {row.countryCode}
            </span>
          )}
        </span>
      ),
      // What the visitor was actually reaching for. It is the one thing that
      // makes an entry recognisable, and it is too long for a stat tile.
      subtitle: (row) => (
        <span className="font-mono text-xs break-all">
          {[row.method, row.path].filter(Boolean).join(" ")}
        </span>
      ),

      badges: (row) => (
        <Badge tone={decisionTone(row.decision)} appearance="soft">
          {DECISION_LABELS[row.decision] ?? row.decision ?? "—"}
        </Badge>
      ),

      stats: [
        {
          label: tCommon("reason"),
          icon: ShieldQuestion,
          value: (row) => labelOf(REASON_OPTIONS, row.reasonCode) || "—",
        },
        {
          label: tCommon("time"),
          icon: CalendarIcon,
          value: (row) =>
            row.createdAt ? format(new Date(row.createdAt), "PPpp") : "—",
        },
        {
          label: t("determined_by"),
          icon: MapPin,
          value: (row) => labelOf(SOURCE_OPTIONS, row.source) || "—",
        },
        {
          label: t("repeats"),
          icon: Hash,
          value: (row) => row.hitCount ?? 1,
        },
      ],

      sections: [
        {
          id: "origin",
          title: tCommon("origin"),
          description:
            t("where_the_request_came_from_and"),
          icon: Globe,
          columns: 3,
          fields: [
            { key: "ip", icon: Network, copyable: true },
            { key: "countryCode", icon: Globe },
            /* `city` and `region` are recorded by the resolver
               (`utils/geo/audit.ts`) but have no column of their own, so they
               need an explicit `render` to reach the dialog at all. They are
               also `condition`ed rather than left to the em dash: a CDN header
               yields a country and nothing else, so on most rows a "City —"
               tile would be two thirds of this section saying nothing.

               `hideEmpty` would have been the obvious way to say that; it is
               declared on ViewFieldConfig but nothing reads it, so a condition
               is what actually drops the tile. */
            {
              key: "city",
              title: tCommon("city"),
              icon: MapPin,
              condition: (row) => Boolean(row.city),
              render: (value) => String(value),
            },
            {
              key: "region",
              title: tCommon("region"),
              icon: MapPin,
              condition: (row) => Boolean(row.region),
              render: (value) => String(value),
            },
            {
              key: "isProxy",
              render: (value) => <AnonymityFlag on={Boolean(value)} />,
            },
            {
              key: "isTor",
              render: (value) => <AnonymityFlag on={Boolean(value)} />,
            },
            {
              // The third anonymity signal the resolver records. It has no
              // column because it is too weak to spend a table column on — a
              // datacenter IP is normal for API traffic — but on a disputed
              // block it is part of the picture.
              key: "isHosting",
              title: t("datacenter_ip"),
              render: (value) => <AnonymityFlag on={Boolean(value)} />,
            },
          ],
        },
        {
          id: "request",
          title: t("request"),
          icon: Route,
          columns: 2,
          fields: [
            { key: "action", icon: Route, emptyText: t("not_classified") },
            {
              key: "userId",
              icon: User,
              copyable: true,
              emptyText: t("not_signed_in"),
            },
          ],
        },
        {
          id: "detail",
          title: tCommon("tokens"),
          icon: FileText,
          columns: 1,
          fields: [
            {
              /* WHICH rule did this. The reason code says the shape of the
                 decision ("Country restricted"); this says which row of the
                 restrictions table produced it, which is the thing a disputed
                 block turns on. Absent when no rule was involved at all — an
                 exempt path, or enforcement switched off — and surfaced
                 nowhere else in the product. */
              key: "restrictionId",
              title: t("rule_applied"),
              icon: ShieldQuestion,
              copyable: true,
              condition: (row) => Boolean(row.restrictionId),
              render: (value) => (
                <span className="font-mono text-xs break-all">
                  {String(value)}
                </span>
              ),
            },
            {
              key: "reasonDetail",
              fullWidth: true,
              emptyText: t("no_message_was_returned"),
            },
            {
              key: "userAgent",
              fullWidth: true,
              emptyText: t("no_user_agent_sent"),
              render: (value) => (
                <span className="font-mono text-xs break-all">
                  {String(value)}
                </span>
              ),
            },
          ],
        },
      ],
    }),
    [t, tCommon]
  );
}
