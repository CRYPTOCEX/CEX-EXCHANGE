"use client";
import React from "react";
import {
  Shield,
  ClipboardList,
  Image as ImageIcon,
  CheckSquare,
  DollarSign,
  CalendarIcon,
  Sparkles,
  TrendingUp,
  Settings,
  Clock,
  Percent,
  BarChart3,
  Flame,
} from "lucide-react";
import type {
  FormConfig,
  ViewConfig,
} from "@/components/blocks/data-table/types/table";
import { Badge } from "@/components/ui/badge";
import { statusTone } from "@/lib/status-tone";

import { useTranslations } from "next-intl";
export function useColumns(): ColumnDefinition[] {
  const tCommon = useTranslations("common");
  const tExtAdmin = useTranslations("ext_admin");
  return [
    {
      key: "image",
      title: tCommon("image"),
      type: "image",
      icon: ImageIcon,
      sortable: false,
      searchable: false,
      filterable: false,
      description: tExtAdmin("plan_image_url"),
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "name",
      title: tCommon("name"),
      type: "text",
      icon: Sparkles,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("internal_plan_name"),
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "plan",
      title: tCommon("plan"),
      type: "compound",
      expandedTitle: (row) => `Plan: ${row.name}`,
      disablePrefixSort: true,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("ai_investment_plan_with_name_and_image"),
      render: {
        type: "compound",
        config: {
          image: {
            key: "image",
            fallback: "/img/placeholder.svg",
            type: "image",
            title: tCommon("image"),
            description: tExtAdmin("plan_image_url"),
            filterable: false,
            sortable: false,
          },
          primary: {
            key: "name",
            title: tCommon("name"),
          },
        },
      },
      priority: 1,
    },
    {
      key: "title",
      title: tCommon("title"),
      type: "text",
      icon: ClipboardList,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("public_facing_title_displayed_to_users"),
      priority: 1,
    },
    {
      key: "profitPercentage",
      title: tCommon("profit"),
      type: "number",
      icon: Percent,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tExtAdmin("expected_profit_percentage_for_this_investment"),
      priority: 1,
    },
    {
      key: "status",
      title: tCommon("status"),
      type: "toggle",
      icon: CheckSquare,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("plan_availability_status_active_or_inactive"),
      priority: 1,
    },
    {
      key: "durations",
      title: tCommon("durations"),
      type: "multiselect",
      icon: Clock,
      sortable: false,
      searchable: false,
      filterable: false,
      description: tExtAdmin("available_investment_duration_options_for_this"),
      priority: 2,
      apiEndpoint: {
        url: "/api/admin/ai/investment/duration/options",
        method: "GET",
      },
      render: {
        type: "custom",
        render: (value: any, row: any) => {
          if (!value || !Array.isArray(value) || value.length === 0)
            return "None";
          const tags = value.map((d: any) => `${d.duration} ${d.timeframe}`);
          return (
            <div className="flex flex-wrap gap-1">
              {tags.map((tag: string, index: number) => (
                <span
                  key={index}
                  className="rounded bg-primary/10 px-2 py-1 text-xs font-medium text-primary-ink"
                >
                  {tag}
                </span>
              ))}
            </div>
          );
        },
      },
    },
    {
      key: "minAmount",
      title: tCommon("min_amount"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tExtAdmin(
        "minimum_investment_amount_required_to_participate"
      ),
      priority: 2,
      expandedOnly: true,
    },
    {
      key: "maxAmount",
      title: tCommon("max_amount"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tExtAdmin(
        "maximum_investment_amount_allowed_per_transaction"
      ),
      priority: 2,
      expandedOnly: true,
    },
    {
      key: "invested",
      title: tCommon("invested"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tExtAdmin("total_amount_currently_invested_in_this_plan"),
      priority: 2,
      expandedOnly: true,
    },
    {
      key: "minProfit",
      title: tCommon("min_profit"),
      type: "number",
      icon: Percent,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tExtAdmin("minimum_profit_percentage_that_can_be_generated"),
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "maxProfit",
      title: tCommon("max_profit"),
      type: "number",
      icon: Percent,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tExtAdmin("maximum_profit_percentage_that_can_be_generated"),
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "defaultProfit",
      title: tCommon("default_profit"),
      type: "number",
      icon: Percent,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tExtAdmin("default_profit_percentage_used_for_new_investments"),
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "defaultResult",
      title: tCommon("default_result"),
      type: "select",
      icon: TrendingUp,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("default_outcome_assigned_to_new_investments"),
      options: [
        { value: "WIN", label: tCommon("win") },
        { value: "LOSS", label: tCommon("loss") },
        { value: "DRAW", label: tCommon("draw") },
      ],
      priority: 3,
      expandedOnly: true,
      render: {
        type: "badge",
        // WIN/LOSS/DRAW hues come from `lib/status-tone.ts`.
        config: {},
      },
    },
    {
      key: "trending",
      title: tCommon("trending"),
      type: "boolean",
      icon: TrendingUp,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin(
        "whether_this_plan_is_marked_as_trending_or_popular"
      ),
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "description",
      title: tCommon("description"),
      type: "text",
      icon: ClipboardList,
      sortable: false,
      searchable: true,
      filterable: false,
      description: tExtAdmin("detailed_description_of_the_investment_plan"),
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "createdAt",
      title: tCommon("created_at"),
      type: "date",
      icon: CalendarIcon,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("date_when_this_investment_plan_was_created"),
      render: { type: "date", format: "PPP" },
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "id",
      title: "ID",
      type: "text",
      icon: Shield,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("unique_system_identifier_for_this_ai"),
      priority: 3,
      expandedOnly: true,
    },
  ];
}

/* -------------------------------------------------------------------------- *
 * View dialog
 *
 * A plan is a PRODUCT definition plus the book of money already sitting in it.
 * The four numbers an operator checks first — the two entry limits, the
 * headline profit rate and how much is invested — go in the stat strip; the
 * rest splits into what the plan promises (profit configuration), how long it
 * runs (durations) and what has actually been placed against it.
 * -------------------------------------------------------------------------- */

const INVESTMENT_STATUS_ORDER = ["ACTIVE", "COMPLETED", "CANCELLED", "REJECTED"];

function money(value: any): string {
  const amount = Number(value ?? 0);
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function useViewConfig(): ViewConfig {
  const tCommon = useTranslations("common");
  const tExtAdmin = useTranslations("ext_admin");

  return React.useMemo<ViewConfig>(
    () => ({
      size: "3xl",

      badges: (row) => (
        <>
          <Badge tone={row.status ? "success" : "neutral"} appearance="soft">
            {row.status ? tCommon("active") : tCommon("inactive")}
          </Badge>
          {row.trending && (
            <Badge tone="warning" appearance="soft">
              <Flame className="h-3 w-3" />
              {tCommon("trending")}
            </Badge>
          )}
        </>
      ),

      stats: [
        {
          label: tCommon("min_amount"),
          icon: DollarSign,
          value: (row) => `$${money(row.minAmount)}`,
        },
        {
          label: tCommon("max_amount"),
          icon: DollarSign,
          value: (row) => `$${money(row.maxAmount)}`,
        },
        {
          label: tCommon("profit"),
          icon: Percent,
          tone: "success",
          value: (row) => `${Number(row.profitPercentage ?? 0)}%`,
        },
        {
          label: tCommon("invested"),
          icon: BarChart3,
          value: (row) => `$${money(row.invested)}`,
        },
      ],

      sections: [
        {
          id: "basics",
          title: tCommon("basic_information"),
          icon: Sparkles,
          columns: 1,
          priority: 1,
          fields: [
            { key: "title", icon: ClipboardList },
            { key: "description", icon: ClipboardList, fullWidth: true },
          ],
        },
        {
          id: "profit",
          title: tCommon("profit_configuration"),
          icon: TrendingUp,
          columns: 4,
          priority: 2,
          fields: ["minProfit", "maxProfit", "defaultProfit", "defaultResult"],
        },
        {
          id: "durations",
          title: tExtAdmin("duration_options"),
          icon: Clock,
          columns: 1,
          priority: 3,
          // The column already renders these as chips; the tile just needs the
          // whole row so a plan with eight terms does not wrap into a ribbon.
          fields: [{ key: "durations", fullWidth: true }],
        },
        {
          id: "investments",
          title: tExtAdmin("investment_activity"),
          description: tExtAdmin("positions_currently_booked_against_this_plan"),
          icon: BarChart3,
          columns: 1,
          priority: 4,
          condition: (row) => Boolean(row.investments?.length),
          render: (row) => {
            const investments: any[] = row.investments ?? [];
            const staked = investments.reduce(
              (sum, item) => sum + Number(item.amount ?? 0),
              0
            );
            const profit = investments.reduce(
              (sum, item) => sum + Number(item.profit ?? 0),
              0
            );
            const counts = investments.reduce<Record<string, number>>(
              (acc, item) => {
                const key = String(item.status ?? "ACTIVE");
                acc[key] = (acc[key] ?? 0) + 1;
                return acc;
              },
              {}
            );
            const statuses = Object.keys(counts).sort(
              (a, b) =>
                INVESTMENT_STATUS_ORDER.indexOf(a) -
                INVESTMENT_STATUS_ORDER.indexOf(b)
            );
            return (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg border border-border p-3 min-w-0">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">
                      Positions
                    </p>
                    <p className="text-sm font-semibold">{investments.length}</p>
                  </div>
                  <div className="rounded-lg border border-border p-3 min-w-0">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">
                      Staked
                    </p>
                    <p className="text-sm font-semibold">${money(staked)}</p>
                  </div>
                  <div className="rounded-lg border border-border p-3 min-w-0">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">
                      {tExtAdmin("paid_profit")}
                    </p>
                    <p
                      className={
                        profit > 0
                          ? "text-sm font-semibold text-success"
                          : profit < 0
                            ? "text-sm font-semibold text-destructive"
                            : "text-sm font-semibold text-muted-foreground"
                      }
                    >
                      {profit > 0 ? "+" : ""}${money(profit)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {statuses.map((status) => (
                    <Badge key={status} tone={statusTone(status)} appearance="soft">
                      {status} · {counts[status]}
                    </Badge>
                  ))}
                </div>
              </div>
            );
          },
        },
        {
          id: "plan-settings",
          title: tCommon("plan_settings"),
          icon: Settings,
          columns: 2,
          priority: 5,
          // `status` is a TOGGLE column, so this tile is the live switch — the
          // pill beside the title only reads it. Dropping the field to avoid the
          // overlap would remove the one action this dialog has. `trending` is a
          // plain boolean with no such affordance, so the badge is its only home.
          fields: [{ key: "status", icon: CheckSquare }],
        },
        {
          id: "record",
          title: tCommon("record"),
          icon: Shield,
          columns: 2,
          priority: 6,
          fields: [
            { key: "id", icon: Shield, copyable: true },
            { key: "createdAt", icon: CalendarIcon },
          ],
        },
      ],
    }),
    [tCommon, tExtAdmin]
  );
}

export function useFormConfig(): FormConfig {
  const tCommon = useTranslations("common");
  const tExtAdmin = useTranslations("ext_admin");
  return {
    create: {
      title: tExtAdmin("create_new_investment_plan"),
      description: tExtAdmin("set_up_a_new_ai_investment"),
      groups: [
        {
          id: "basic-information",
          title: tCommon("basic_information"),
          icon: Sparkles,
          priority: 1,
          fields: [
            { key: "name", compoundKey: "plan", required: true, maxLength: 191 },
            { key: "image", compoundKey: "plan", required: false, maxLength: 1000 },
            { key: "title", required: true, maxLength: 191 },
            { key: "description", required: false },
          ],
        },
        {
          id: "investment-limits",
          title: tExtAdmin("investment_limits"),
          icon: DollarSign,
          priority: 2,
          fields: [
            { key: "invested", required: true, min: 0 },
            { key: "minAmount", required: true, min: 0 },
            { key: "maxAmount", required: true, min: 0 },
          ],
        },
        {
          id: "profit-configuration",
          title: tCommon("profit_configuration"),
          icon: TrendingUp,
          priority: 3,
          fields: [
            { key: "profitPercentage", required: true, min: 0 },
            { key: "minProfit", required: true },
            { key: "maxProfit", required: true },
            { key: "defaultProfit", required: true },
            {
              key: "defaultResult",
              required: true,
              options: [
                { value: "WIN", label: tCommon("win") },
                { value: "LOSS", label: tCommon("loss") },
                { value: "DRAW", label: tCommon("draw") },
              ],
            },
          ],
        },
        {
          id: "duration-options",
          title: tExtAdmin("duration_options"),
          icon: Clock,
          priority: 4,
          fields: [
            {
              key: "durations",
              required: true,
              apiEndpoint: {
                url: "/api/admin/ai/investment/duration/options",
                method: "GET",
              },
            },
          ],
        },
        {
          id: "plan-settings",
          title: tCommon("plan_settings"),
          icon: Settings,
          priority: 5,
          fields: [
            { key: "trending", required: false },
            { key: "status", required: true },
          ],
        },
      ],
    },
    edit: {
      title: tCommon("edit_investment_plan"),
      description: tExtAdmin("modify_ai_investment_plan_settings_profit"),
      groups: [
        {
          id: "basic-information",
          title: tCommon("basic_information"),
          icon: Sparkles,
          priority: 1,
          fields: [
            { key: "name", compoundKey: "plan", required: true, maxLength: 191 },
            { key: "image", compoundKey: "plan", required: false, maxLength: 1000 },
            { key: "title", required: true, maxLength: 191 },
            { key: "description", required: false },
          ],
        },
        {
          id: "investment-limits",
          title: tExtAdmin("investment_limits"),
          icon: DollarSign,
          priority: 2,
          fields: [
            { key: "invested", required: true, min: 0 },
            { key: "minAmount", required: true, min: 0 },
            { key: "maxAmount", required: true, min: 0 },
          ],
        },
        {
          id: "profit-configuration",
          title: tCommon("profit_configuration"),
          icon: TrendingUp,
          priority: 3,
          fields: [
            { key: "profitPercentage", required: true, min: 0 },
            { key: "minProfit", required: true },
            { key: "maxProfit", required: true },
            { key: "defaultProfit", required: true },
            {
              key: "defaultResult",
              required: true,
              options: [
                { value: "WIN", label: tCommon("win") },
                { value: "LOSS", label: tCommon("loss") },
                { value: "DRAW", label: tCommon("draw") },
              ],
            },
          ],
        },
        {
          id: "duration-options",
          title: tExtAdmin("duration_options"),
          icon: Clock,
          priority: 4,
          fields: [
            {
              key: "durations",
              required: true,
              apiEndpoint: {
                url: "/api/admin/ai/investment/duration/options",
                method: "GET",
              },
            },
          ],
        },
        {
          id: "plan-settings",
          title: tCommon("plan_settings"),
          icon: Settings,
          priority: 5,
          fields: [
            { key: "trending", required: false },
            { key: "status", required: true },
          ],
        },
      ],
    },
  };
}
