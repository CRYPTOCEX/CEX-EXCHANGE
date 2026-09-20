"use client";
import React from "react";
import {
  Shield,
  User,
  DollarSign,
  ClipboardList,
  CalendarIcon,
  TrendingUp,
  Percent,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { statusLabel, statusTone } from "@/lib/status-tone";
import type { ViewConfig } from "@/components/blocks/data-table/types/table";
import { useTranslations } from "next-intl";
export function useColumns(): ColumnDefinition[] {
  const tCommon = useTranslations("common");
  const tDashboardAdmin = useTranslations("dashboard_admin");
  return [
    {
      key: "id",
      title: "ID",
      type: "text",
      icon: Shield,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("unique_identifier_for_the_investment"),
      priority: 2,
      expandedOnly: true,
    },
    {
      key: "user",
      title: tCommon("user"),
      type: "compound",
      icon: User,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("investor_information"),
      render: {
        type: "compound",
        config: {
          image: {
            key: "avatar",
            fallback: "/img/placeholder.svg",
            type: "image",
            title: tCommon("avatar"),
            description: tCommon("user_avatar"),
          },
          primary: {
            key: ["firstName", "lastName"],
            title: [tCommon("first_name"), tCommon("last_name")],
            description: [tDashboardAdmin("investors_first_name"), tDashboardAdmin("investors_last_name")],
            sortable: true,
            searchable: true,
            filterable: true,
            icon: User,
          },
          secondary: {
            key: "email",
            title: tCommon("email"),
            icon: ClipboardList,
            sortable: true,
            searchable: true,
            filterable: true,
          },
        },
      },
      priority: 1,
    },
    {
      key: "plan",
      idKey: "id",
      labelKey: "name",
      // `plan` is the association alias, not a column — filtering on it is an
      // "Unknown column" error rather than an empty list. The record stores
      // `planId`. Not `baseKey`, which would also rewrite the submit payload.
      filterKey: "planId",
      title: tCommon("plan"),
      type: "select",
      icon: TrendingUp,
      sortable: true,
      searchable: true,
      filterable: true,
      sortKey: "plan.title",
      description: tDashboardAdmin("investment_plan_selected"),
      render: (value: any, row: any) => {
        const plan = row?.plan || value;
        return plan ? plan.title : "N/A";
      },
      apiEndpoint: {
        url: "/api/admin/finance/investment/plan/options",
        method: "GET",
      },
      priority: 1,
    },
    {
      key: "duration",
      idKey: "id",
      labelKey: "name",
      title: tCommon("duration"),
      type: "select",
      icon: CalendarIcon,
      sortable: true,
      searchable: false,
      filterable: false,
      description: tDashboardAdmin("investment_time_period"),
      sortKey: "duration",
      render: (value: any, row: any) => {
        const duration = row?.duration || value;
        return duration ? `${duration.duration} ${duration.timeframe}` : "N/A";
      },
      apiEndpoint: {
        url: "/api/admin/finance/investment/duration/options",
        method: "GET",
      },
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
      description: tDashboardAdmin("amount_invested_by_user"),
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
      description: tDashboardAdmin("profit_or_loss_amount"),
      priority: 1,
    },
    {
      key: "result",
      title: tCommon("result"),
      type: "select",
      icon: TrendingUp,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("investment_outcome"),
      options: [
        { value: "WIN", label: tCommon("win") },
        { value: "LOSS", label: tCommon("loss") },
        { value: "DRAW", label: tCommon("draw") },
      ],
      render: {
        // No local `variant`: WIN/LOSS/DRAW are outcome states the platform
        // table already rules on, so the hue comes from `lib/status-tone.ts`.
        type: "badge",
        config: {},
      },
      priority: 1,
    },
    {
      key: "status",
      title: tCommon("status"),
      type: "select",
      icon: ClipboardList,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("current_investment_status"),
      options: [
        { value: "ACTIVE", label: tCommon("active") },
        { value: "COMPLETED", label: tCommon("completed") },
        { value: "CANCELLED", label: tCommon("cancelled") },
        { value: "REJECTED", label: tCommon("rejected") },
      ],
      render: {
        // No local `variant`: the hue comes from `lib/status-tone.ts`. Adding one
        // back here silently overrides the platform's canonical status colours.
        type: "badge",
        config: {},
      },
      priority: 1,
    },
    {
      key: "endDate",
      title: tCommon("end_date"),
      type: "date",
      icon: CalendarIcon,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("when_the_investment_period_ends"),
      render: { type: "date", format: "PPP" },
      priority: 2,
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
      description: tDashboardAdmin("when_the_investment_was_created"),
      render: { type: "date", format: "PPP" },
      priority: 2,
      expandedOnly: true,
    },
  ];
}

/**
 * mysql2 hands back every DECIMAL as a STRING, so an amount arrives as "500.00"
 * and arithmetic on it silently concatenates. Every figure below is coerced
 * once, here, and a non-numeric value resolves to null rather than NaN.
 */
function toNumber(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatAmount(value: any, signed = false): string {
  const amount = toNumber(value);
  if (amount === null) return "—";
  const abs = Math.abs(amount);
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    // Crypto plans settle in sub-cent amounts; a flat 2 places printed 0.00.
    maximumFractionDigits: abs > 0 && abs < 1 ? 8 : 2,
    signDisplay: signed ? "exceptZero" : "auto",
  });
}

/**
 * Ink for a signed figure.
 *
 * Colour is never the only carrier — every call site prints the sign next to
 * it — because `--success`/`--destructive` are not separable under deuteranopia.
 */
function signedInk(value: any): string {
  const amount = toNumber(value);
  if (amount === null || amount === 0) return "text-foreground";
  return amount < 0 ? "text-destructive" : "text-success";
}

/**
 * The view dialog for an investment record.
 *
 * The flat grid gave equal weight to ten tiles, three of which printed
 * "[object Object]"-adjacent output because `plan` and `duration` are joined
 * relations rather than scalars. The money an operator opens this record for —
 * what was staked, what it returned, and what that is as a percentage — becomes
 * the stat strip; the plan terms and the record's dates become two small groups.
 */
export function useViewConfig(): ViewConfig {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");

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
          icon: Wallet,
          value: (row) => formatAmount(row.amount),
        },
        {
          label: tCommon("profit"),
          icon: DollarSign,
          value: (row) => (
            <span className={signedInk(row.profit)}>
              {formatAmount(row.profit, true)}
            </span>
          ),
        },
        {
          label: "ROI",
          icon: Percent,
          // Derived rather than read off the row: the table's own columns carry
          // the two figures it is computed from, and a stake of 0 has no ROI at
          // all — printing "Infinity%" for a rejected zero-amount record was the
          // alternative.
          value: (row) => {
            const amount = toNumber(row.amount);
            const profit = toNumber(row.profit);
            if (amount === null || profit === null || amount === 0) return "—";
            const roi = (profit / amount) * 100;
            return (
              <span className={signedInk(profit)}>
                {roi > 0 ? "+" : ""}
                {roi.toFixed(2)}%
              </span>
            );
          },
        },
        {
          label: tCommon("total_return"),
          icon: TrendingUp,
          value: (row) => {
            const amount = toNumber(row.amount);
            const profit = toNumber(row.profit);
            if (amount === null) return "—";
            return formatAmount(amount + (profit ?? 0));
          },
        },
      ],

      sections: [
        {
          id: "investment-plan",
          title: t("plan_term"),
          description: t("the_product_the_investor_bought_into"),
          icon: TrendingUp,
          columns: 2,
          fields: [
            {
              key: "plan",
              title: tCommon("plan"),
              icon: TrendingUp,
              // The column's renderer is a bare function rather than the
              // `{ type }` object the cell renderer expects, so the joined
              // relation is read directly here.
              render: (_value, row) => row.plan?.title || "—",
            },
            {
              key: "duration",
              title: tCommon("duration"),
              icon: CalendarIcon,
              render: (_value, row) =>
                row.duration
                  ? `${row.duration.duration} ${row.duration.timeframe}`
                  : "—",
            },
          ],
        },
        {
          id: "investment-record",
          title: t("record_timeline"),
          icon: CalendarIcon,
          columns: 3,
          fields: [
            { key: "id", icon: Shield, copyable: true },
            { key: "createdAt", title: tCommon("started"), icon: CalendarIcon },
            {
              key: "endDate",
              title: tCommon("matures"),
              icon: CalendarIcon,
              emptyText: tCommon("not_set"),
            },
          ],
        },
      ],
    }),
    [tCommon]
  );
}
