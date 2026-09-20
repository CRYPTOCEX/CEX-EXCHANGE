"use client";
import React from "react";
import {
  Shield,
  ClipboardList,
  DollarSign,
  CalendarIcon,
  User,
  TrendingUp,
  Settings,
  Mail,
  Percent,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { statusLabel, statusTone } from "@/lib/status-tone";
import type {
  FormConfig,
  ViewConfig,
} from "@/components/blocks/data-table/types/table";

import { useTranslations } from "next-intl";
export function useColumns() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  return [
    {
      key: "id",
      title: "ID",
      type: "text",
      icon: Shield,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("unique_system_identifier_for_this_forex"),
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "user",
      title: tCommon("user"),
      type: "compound",
      expandedTitle: (row) => `User: ${row.id}`,
      icon: User,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("investor_details_including_profile_picture_full"),
      render: {
        type: "compound",
        config: {
          image: {
            key: "avatar",
            fallback: "/img/placeholder.svg",
            type: "image",
            title: tCommon("avatar"),
            description: tCommon("users_profile_picture"),
            filterable: false,
            sortable: false,
          },
          primary: {
            key: ["firstName", "lastName"],
            title: [tCommon("first_name"), tCommon("last_name")],
            icon: User,
          },
          secondary: {
            key: "email",
            title: tCommon("email"),
            icon: Mail,
          },
        },
      },
      priority: 1,
    },
    {
      key: "plan",
      title: tCommon("plan"),
      type: "custom",
      icon: ClipboardList,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("selected_forex_trading_plan_with_specific"),
      render: (value: any, row: any) => (row?.plan ? row.plan.title : "N/A"),
      priority: 1,
    },
    {
      key: "amount",
      title: tCommon("amount"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: false,
      filterable: true,
      description: t("initial_investment_amount_deposited_into_the"),
      priority: 1,
    },
    {
      key: "profit",
      title: tCommon("profit"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: false,
      filterable: true,
      description: t("total_profit_or_loss_generated_from"),
      priority: 1,
    },
    {
      key: "status",
      title: tCommon("status"),
      type: "select",
      icon: Settings,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("current_investment_status_in_the_trading_lifecycle"),
      options: [
        { value: "ACTIVE", label: tCommon("active") },
        { value: "COMPLETED", label: tCommon("completed") },
        { value: "CANCELLED", label: tCommon("cancelled") },
        { value: "REJECTED", label: tCommon("rejected") },
      ],
      priority: 1,
      render: {
        type: "badge",
        // Hue resolves centrally through `lib/status-tone.ts`; do not re-add a
        // local `variant` here.
        config: {},
      },
    },
    {
      key: "duration",
      title: tCommon("duration"),
      type: "custom",
      icon: CalendarIcon,
      sortable: true,
      searchable: false,
      filterable: false,
      description: t("investment_period_length_e_g_7"),
      render: (value: any, row: any) => {
        const duration = row?.duration || value;
        return duration ? `${duration.duration} ${duration.timeframe}` : "N/A";
      },
      priority: 2,
      expandedOnly: true,
    },
    {
      key: "result",
      title: tCommon("result"),
      type: "select",
      icon: TrendingUp,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("final_trading_outcome_win_profit_loss"),
      options: [
        { value: "WIN", label: tCommon("win") },
        { value: "LOSS", label: tCommon("loss") },
        { value: "DRAW", label: tCommon("draw") },
      ],
      priority: 2,
      expandedOnly: true,
      render: {
        type: "badge",
        // WIN/LOSS/DRAW hues come from `lib/status-tone.ts`.
        config: {},
      },
    },
    {
      key: "createdAt",
      title: tCommon("created_at"),
      type: "date",
      icon: CalendarIcon,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("date_and_time_when_the_investment"),
      render: { type: "date", format: "PPP" },
      priority: 2,
      expandedOnly: true,
    },
  ] as ColumnDefinition[];
}

/* -------------------------------------------------------------------------- *
 * View dialog
 *
 * An investment is a position: a stake, a term, and a result. The flat panel
 * printed `amount` and `profit` as two identical-looking number tiles with no
 * sign, no relation to each other and no term, so "is this one up or down, and
 * when does it settle" took arithmetic. The stat strip answers that first, and
 * status/result move to header pills where a decision reads them.
 * -------------------------------------------------------------------------- */

function toNumber(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;
  const num = typeof value === "number" ? value : parseFloat(String(value));
  return Number.isFinite(num) ? num : null;
}

function formatMoney(value: any): string {
  const num = toNumber(value);
  if (num === null) return "—";
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Signed money reads wrong without its sign; `+` is not implied by tone. */
function formatSigned(value: any): string {
  const num = toNumber(value);
  if (num === null) return "—";
  return `${num > 0 ? "+" : ""}${formatMoney(num)}`;
}

function moneyTone(value: any): "success" | "destructive" | "default" {
  const num = toNumber(value);
  if (num === null || num === 0) return "default";
  return num > 0 ? "success" : "destructive";
}

function termLabel(row: any): string {
  const duration = row?.duration;
  if (!duration?.duration) return "—";
  return `${duration.duration} ${String(duration.timeframe ?? "").toLowerCase()}`.trim();
}

export function useViewConfig(): ViewConfig {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  return React.useMemo<ViewConfig>(
    () => ({
      size: "3xl",

      badges: (row) => (
        <>
          <Badge tone={statusTone(row.status)} appearance="soft">
            {statusLabel(row.status) || tCommon("unknown")}
          </Badge>
          {row.result && (
            <Badge tone={statusTone(row.result)} appearance="soft">
              {statusLabel(row.result)}
            </Badge>
          )}
        </>
      ),

      stats: [
        {
          label: tCommon("invested"),
          icon: DollarSign,
          value: (row) => formatMoney(row.amount),
        },
        {
          label: tExt("profit_loss"),
          icon: TrendingUp,
          // The tone is per-ROW here (a loss is not a config-time constant), so
          // it is applied to the value rather than through the static `tone`.
          value: (row) => (
            <span
              className={
                moneyTone(row.profit) === "success"
                  ? "text-success"
                  : moneyTone(row.profit) === "destructive"
                    ? "text-destructive"
                    : undefined
              }
            >
              {formatSigned(row.profit)}
            </span>
          ),
        },
        {
          label: tCommon("return"),
          icon: Percent,
          value: (row) => {
            const amount = toNumber(row.amount);
            const profit = toNumber(row.profit);
            if (!amount || profit === null) return "—";
            const pct = (profit / amount) * 100;
            return (
              <span
                className={
                  pct > 0
                    ? "text-success"
                    : pct < 0
                      ? "text-destructive"
                      : undefined
                }
              >
                {`${pct > 0 ? "+" : ""}${pct.toFixed(2)}%`}
              </span>
            );
          },
          condition: (row) => toNumber(row.amount) !== null,
        },
        {
          label: tCommon("term"),
          icon: CalendarIcon,
          value: (row) => termLabel(row),
        },
      ],

      sections: [
        {
          id: "position",
          title: tCommon("position"),
          icon: ClipboardList,
          columns: 2,
          fields: [
            {
              key: "plan",
              title: tCommon("plan"),
              icon: ClipboardList,
              render: (_value, row) => row.plan?.title || "—",
            },
            {
              // The joined `user` is already the dialog header; the email is
              // what an operator copies into a support thread.
              key: "userId",
              title: tExt("investor"),
              icon: User,
              render: (_value, row) => row.user?.email || "—",
            },
            {
              key: "id",
              title: tExt("investment_id"),
              icon: Shield,
              copyable: true,
              render: (value) => (
                <span className="font-mono text-xs break-all">{value}</span>
              ),
            },
          ],
        },
        {
          id: "timeline",
          title: tCommon("timeline"),
          icon: Clock,
          columns: 3,
          fields: [
            {
              key: "createdAt",
              title: tCommon("started"),
              icon: CalendarIcon,
              render: (value) => format(new Date(value), "PPp"),
            },
            {
              key: "endDate",
              title: tCommon("matures"),
              icon: Clock,
              render: (value) => format(new Date(value), "PPp"),
            },
            {
              key: "updatedAt",
              title: tCommon("last_updated"),
              icon: Clock,
              render: (value) => format(new Date(value), "PPp"),
            },
          ],
        },
      ],
    }),
    []
  );
}

export function useFormConfig() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  return {
    create: {
      title: t("create_new_forex_investment"),
      description: t("manually_create_a_forex_investment_transaction"),
      groups: [],
    },
    edit: {
      title: t("edit_forex_investment"),
      description: t("update_investment_status_trading_results_and"),
      groups: [
        {
          id: "trading-results",
          title: t("trading_results"),
          icon: TrendingUp,
          priority: 1,
          fields: [
            { key: "profit", required: false },
            {
              key: "result",
              required: false,
              options: [
                { value: "WIN", label: tCommon("win") },
                { value: "LOSS", label: tCommon("loss") },
                { value: "DRAW", label: tCommon("draw") },
              ],
            },
          ],
        },
        {
          id: "investment-status",
          title: tExt("investment_status"),
          icon: Settings,
          priority: 2,
          fields: [
            {
              key: "status",
              required: true,
              options: [
                { value: "ACTIVE", label: tCommon("active") },
                { value: "COMPLETED", label: tCommon("completed") },
                { value: "CANCELLED", label: tCommon("cancelled") },
                { value: "REJECTED", label: tCommon("rejected") },
              ],
            },
          ],
        },
      ],
    },
  } as FormConfig;
}
