"use client";
import React from "react";
import {
  CalendarIcon,
  Clock,
  FileText,
  Gavel,
  Globe,
  ListChecks,
  ShieldBan,
  StickyNote,
  ToggleRight,
} from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import type {
  FormConfig,
  ViewConfig,
} from "@/components/blocks/data-table/types/table";
import { useTranslations } from "next-intl";

/** Activities a PARTIAL rule can restrict. Mirrors GeoAction on the server. */
const ACTION_OPTIONS = [
  { value: "REGISTER", label: "Create an account" },
  { value: "LOGIN", label: "Sign in" },
  { value: "TRADE", label: "Place trades" },
  { value: "DEPOSIT", label: "Deposit funds" },
  { value: "WITHDRAW", label: "Withdraw funds" },
  { value: "KYC", label: "Submit identity verification" },
  { value: "P2P", label: "Use P2P trading" },
  { value: "INVEST", label: "Invest, stake or join token sales" },
  { value: "SWAP", label: "Swap tokens on-chain (DEX)" },
];

const TYPE_OPTIONS = [
  { value: "BLOCK", label: "Restrict" },
  { value: "ALLOW", label: "Permit" },
];

const SCOPE_OPTIONS = [
  { value: "FULL", label: "Entire platform" },
  { value: "PARTIAL", label: "Selected activities" },
];

const REASON_OPTIONS = [
  { value: "SANCTIONS", label: "Sanctions" },
  { value: "UNLICENSED", label: "Not licensed here" },
  { value: "REGULATORY", label: "Regulatory requirement" },
  { value: "HIGH_RISK", label: "High risk jurisdiction" },
  { value: "INTERNAL_POLICY", label: "Internal policy" },
  { value: "OTHER", label: "Other" },
];

export function useColumns() {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");

  return [
    {
      key: "countryName",
      title: tCommon("country"),
      type: "text",
      icon: Globe,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("country_this_rule_applies_to"),
      priority: 1,
    },
    {
      key: "countryCode",
      title: t("iso_code"),
      type: "select",
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("iso_3166_1_alpha_2_country_code"),
      priority: 2,
    },
    {
      key: "type",
      title: tCommon("type"),
      type: "select",
      options: TYPE_OPTIONS,
      sortable: true,
      filterable: true,
      description: t("restrict_denies_the_country_permit_overrides_a_restriction"),
      priority: 1,
      render: {
        type: "badge",
        config: {
          withDot: true,
          variant: (value: string) =>
            value === "ALLOW" ? "success" : "destructive",
          labels: { BLOCK: "Restricted", ALLOW: "Permitted" },
        },
      },
    },
    {
      key: "scope",
      title: tCommon("scope"),
      type: "select",
      options: SCOPE_OPTIONS,
      sortable: true,
      filterable: true,
      description: t("whether_the_whole_platform_or_only_certain_activities_are_affected"),
      priority: 2,
      render: {
        type: "badge",
        config: {
          withDot: false,
          variant: (value: string) => (value === "FULL" ? "warning" : "info"),
          labels: { FULL: "Entire platform", PARTIAL: "Selected activities" },
        },
      },
    },
    {
      key: "restrictedActions",
      title: t("restricted_activities"),
      type: "multiselect",
      options: ACTION_OPTIONS,
      sortable: false,
      filterable: false,
      expandedOnly: true,
      fullWidth: true,
      description: t("activities_blocked_when_the_scope_is_selected_activities"),
      priority: 3,
    },
    {
      key: "reason",
      title: t("legal_basis"),
      type: "select",
      options: REASON_OPTIONS,
      icon: Gavel,
      sortable: true,
      filterable: true,
      description: t("why_this_jurisdiction_is_restricted"),
      priority: 2,
      render: {
        type: "badge",
        config: {
          withDot: false,
          variant: (value: string) =>
            value === "SANCTIONS" ? "destructive" : "secondary",
          labels: {
            SANCTIONS: "Sanctions",
            UNLICENSED: "Not licensed",
            REGULATORY: "Regulatory",
            HIGH_RISK: "High risk",
            INTERNAL_POLICY: "Internal policy",
            OTHER: "Other",
          },
        },
      },
    },
    {
      key: "legalReference",
      title: t("legal_reference"),
      type: "text",
      searchable: true,
      filterable: true,
      expandedOnly: true,
      description: t("citation_for_this_restriction_e_g_ofac_31_cfr_part_560"),
      priority: 3,
    },
    {
      key: "status",
      title: tCommon("status"),
      type: "boolean",
      icon: ToggleRight,
      sortable: true,
      filterable: true,
      description: t("whether_this_rule_is_currently_enforced"),
      priority: 1,
      render: {
        type: "badge",
        config: {
          withDot: true,
          variant: (value: boolean) => (value ? "success" : "muted"),
          labels: { true: "Enforced", false: "Staged" },
        },
      },
    },
    {
      key: "effectiveFrom",
      title: t("effective_from"),
      type: "date",
      icon: CalendarIcon,
      sortable: true,
      filterable: true,
      expandedOnly: true,
      description: t("leave_empty_to_apply_immediately"),
      render: { type: "date", format: "PPP" },
      priority: 3,
    },
    {
      key: "effectiveTo",
      title: t("effective_until"),
      type: "date",
      icon: CalendarIcon,
      sortable: true,
      filterable: true,
      expandedOnly: true,
      description: t("leave_empty_to_apply_indefinitely"),
      render: { type: "date", format: "PPP" },
      priority: 3,
    },
    {
      key: "notes",
      title: tCommon("notes"),
      type: "textarea",
      sortable: false,
      filterable: false,
      expandedOnly: true,
      fullWidth: true,
      description: t("internal_notes_visible_only_to_administrators"),
      priority: 4,
    },
    {
      key: "createdAt",
      title: tCommon("created_at"),
      type: "date",
      icon: CalendarIcon,
      sortable: true,
      filterable: true,
      expandedOnly: true,
      description: t("when_this_rule_was_added"),
      render: { type: "date", format: "PPP" },
      priority: 4,
    },
  ] as ColumnDefinition[];
}

/* -------------------------------------------------------------------------- *
 * View dialog
 *
 * A rule is only in force when it is BOTH enabled AND inside its
 * effectiveFrom/effectiveTo window — the table can only show the first half of
 * that, so a rule saved for next quarter looks identical to one biting right
 * now. The dialog states the combined answer in the header badge and puts the
 * window itself in the headline figures.
 * -------------------------------------------------------------------------- */

function labelOf(
  options: Array<{ value: string; label: string }>,
  value: any
): string | null {
  const match = options.find((option) => option.value === value);
  return match ? match.label : value ? String(value) : null;
}

/**
 * `restrictedActions` is a MySQL JSON column: prod hands it back parsed while
 * local MariaDB hands back the raw string, so both shapes have to be accepted.
 */
function normalizeActions(value: any): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

type EnforcementState = {
  label: string;
  tone: "success" | "warning" | "info" | "neutral";
};

function enforcementState(row: any): EnforcementState {
  if (!row?.status) return { label: "Staged", tone: "neutral" };

  const now = Date.now();
  const from = row.effectiveFrom ? new Date(row.effectiveFrom).getTime() : null;
  const to = row.effectiveTo ? new Date(row.effectiveTo).getTime() : null;

  if (from && from > now) return { label: "Scheduled", tone: "info" };
  if (to && to < now) return { label: "Expired", tone: "warning" };
  return { label: "Enforced", tone: "success" };
}

/** What the rule does, as one sentence — the enums say it in two halves. */
function ruleSentence(row: any): string {
  const permitted = row?.type === "ALLOW";
  const whole = row?.scope === "FULL";
  if (permitted) {
    return whole
      ? "Permitted across the entire platform"
      : "Permitted for the selected activities";
  }
  return whole
    ? "Restricted from the entire platform"
    : "Restricted from the selected activities";
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
      subtitle: (row) => ruleSentence(row),

      badges: (row) => {
        const state = enforcementState(row);
        return (
          <>
            <Badge tone={state.tone} appearance="soft">
              {state.label}
            </Badge>
            {row.deletedAt && (
              <Badge tone="neutral" appearance="soft">
                Retired
              </Badge>
            )}
          </>
        );
      },

      stats: [
        {
          label: tCommon("reason"),
          icon: Gavel,
          value: (row) => labelOf(REASON_OPTIONS, row.reason) || "—",
        },
        {
          label: t("effective_from"),
          icon: CalendarIcon,
          value: (row) =>
            row.effectiveFrom
              ? format(new Date(row.effectiveFrom), "PPP")
              : "Immediately",
        },
        {
          label: t("effective_until"),
          icon: CalendarIcon,
          value: (row) =>
            row.effectiveTo
              ? format(new Date(row.effectiveTo), "PPP")
              : "No end date",
        },
      ],

      sections: [
        {
          id: "activities",
          title: t("what_is_restricted"),
          icon: ShieldBan,
          columns: 1,
          // A FULL rule has no activity list, and the subtitle already says the
          // whole platform is covered — an empty heading would say less.
          condition: (row) => row.scope === "PARTIAL",
          fields: [
            {
              key: "restrictedActions",
              fullWidth: true,
              emptyText:
                t("no_activities_selected_this_rule_currently"),
              /* The default multiselect cell truncates at three chips and
                 prints the raw enum ("WITHDRAW"). In the dialog the list IS
                 the rule, so every activity is shown, under the same wording
                 the create form used. */
              render: (value) => {
                const actions = normalizeActions(value);
                if (!actions.length) return null;
                return (
                  <div className="flex flex-wrap gap-1.5">
                    {actions.map((action) => (
                      <Badge key={action} tone="destructive" appearance="soft">
                        {labelOf(ACTION_OPTIONS, action)}
                      </Badge>
                    ))}
                  </div>
                );
              },
            },
          ],
        },
        {
          id: "justification",
          title: t("legal_basis"),
          icon: Gavel,
          columns: 2,
          fields: [
            {
              key: "legalReference",
              icon: FileText,
              emptyText: t("no_citation_recorded"),
            },
            {
              key: "notes",
              icon: StickyNote,
              fullWidth: true,
              emptyText: t("no_internal_notes"),
            },
          ],
        },
        {
          id: "record",
          title: t("record_history"),
          icon: Clock,
          columns: 2,
          collapsible: true,
          defaultCollapsed: true,
          fields: [
            { key: "createdAt", icon: CalendarIcon },
            {
              key: "updatedAt",
              title: tCommon("last_updated"),
              icon: CalendarIcon,
              render: (value) => format(new Date(value), "PPP"),
            },
            {
              key: "deletedAt",
              title: tCommon("retired"),
              icon: CalendarIcon,
              condition: (row) => Boolean(row.deletedAt),
              render: (value) => format(new Date(value), "PPP"),
            },
          ],
        },
      ],
    }),
    [t, tCommon]
  );
}

export function useFormConfig(): FormConfig {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");

  // The country list comes from the server so it can flag jurisdictions that
  // already carry a rule — creating a duplicate is rejected, and finding that
  // out only after pressing save is a poor way to learn it.
  const countryField = {
    key: "countryCode",
    required: true,
    label: tCommon("country"),
    description: t("the_jurisdiction_this_rule_applies_to"),
    apiEndpoint: {
      url: "/api/admin/system/geo-restriction/country",
      method: "GET",
    },
  };

  const groups = [
    {
      id: "jurisdiction",
      title: t("jurisdiction"),
      icon: Globe,
      priority: 1,
      fields: [
        countryField,
        {
          key: "type",
          required: true,
          label: tCommon("type"),
          description: t(
            "restrict_denies_access_permit_carves_the_country_out_of_a_wider_restriction"
          ),
          options: TYPE_OPTIONS,
        },
      ],
    },
    {
      id: "scope",
      title: t("what_is_restricted"),
      icon: ShieldBan,
      priority: 2,
      fields: [
        {
          key: "scope",
          required: true,
          label: tCommon("scope"),
          description: t(
            "entire_platform_locks_the_country_out_selected_activities_blocks_only_what_you_choose"
          ),
          options: SCOPE_OPTIONS,
        },
        {
          key: "restrictedActions",
          label: t("restricted_activities"),
          description: t(
            "required_when_the_scope_is_selected_activities_a_partial_rule_with_nothing_selected_blocks_nothing"
          ),
          options: ACTION_OPTIONS,
          // Only meaningful for PARTIAL rules; showing it for FULL invites an
          // operator to fill it in and assume it narrows the block.
          condition: (values: any) => values?.scope === "PARTIAL",
        },
      ],
    },
    {
      id: "justification",
      title: t("legal_basis"),
      icon: Gavel,
      priority: 3,
      fields: [
        {
          key: "reason",
          required: true,
          label: tCommon("reason"),
          description: t("recorded_for_audit_purposes"),
          options: REASON_OPTIONS,
        },
        {
          key: "legalReference",
          label: t("legal_reference"),
          description: t("citation_e_g_ofac_31_cfr_part_560_or_mica_art_59"),
        },
        {
          key: "notes",
          label: tCommon("notes"),
          description: t("context_for_whoever_reviews_this_later"),
        },
      ],
    },
    {
      id: "enforcement",
      title: t("enforcement_window"),
      icon: ListChecks,
      priority: 4,
      fields: [
        {
          key: "status",
          label: tCommon("status"),
          description: t(
            "enforced_applies_the_rule_now_staged_saves_it_without_enforcing_it"
          ),
        },
        {
          key: "effectiveFrom",
          label: t("effective_from"),
          description: t(
            "schedule_the_rule_to_start_on_a_date_leave_empty_for_immediately"
          ),
        },
        {
          key: "effectiveTo",
          label: t("effective_until"),
          description: t(
            "schedule_the_rule_to_stop_leave_empty_for_indefinitely"
          ),
        },
      ],
    },
  ];

  return {
    create: {
      title: t("restrict_a_country"),
      description: t(
        "add_a_jurisdiction_to_the_geographic_access_policy_changes_take_effect_immediately"
      ),
      groups,
    },
    edit: {
      title: t("edit_country_restriction"),
      description: t("update_this_jurisdictions_access_rule"),
      groups,
    },
  };
}

export const GEO_ACTION_OPTIONS = ACTION_OPTIONS;
export const GEO_TYPE_OPTIONS = TYPE_OPTIONS;
export const GEO_SCOPE_OPTIONS = SCOPE_OPTIONS;
export const GEO_REASON_OPTIONS = REASON_OPTIONS;

export const GEO_FORM_ICONS = { FileText, StickyNote };
