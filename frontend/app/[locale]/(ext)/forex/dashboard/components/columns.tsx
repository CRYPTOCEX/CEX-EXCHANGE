import React from "react";
import { useTranslations } from "next-intl";
import {
  Shield,
  DollarSign,
  Clock,
  TrendingUp,
  BarChart,
  Calendar,
  Activity,
  FileText,
  Fingerprint,
  Percent,
  Wallet,
} from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { statusTone } from "@/lib/status-tone";
import type { ViewConfig } from "@/components/blocks/data-table/types/table";

export function useForexInvestmentColumns() {
  const t = useTranslations("ext_forex");
  const tCommon = useTranslations("common");
  const tExtAdmin = useTranslations("ext_admin");

  return [
  {
    key: "id",
    title: "ID",
    type: "text",
    icon: Shield,
    sortable: true,
    searchable: true,
    filterable: true,
    description: t("unique_identifier_for_this_forex_investment"),
    priority: 3,
    expandedOnly: true,
  },
  {
    key: "plan",
    title: tCommon("plan"),
    type: "custom",
    icon: BarChart,
    sortable: true,
    searchable: true,
    filterable: true,
    description: t("your_selected_forex_trading_plan_with"),
    priority: 1,
    render: {
      type: "custom",
      render: (value) => {
        if (!value) return "N/A";
        return value.title;
      },
    },
  },
  {
    key: "duration",
    title: tCommon("duration"),
    type: "custom",
    icon: Clock,
    sortable: true,
    searchable: true,
    filterable: true,
    description: t("investment_period_length_before_completion_and"),
    priority: 2,
    render: {
      type: "custom",
      render: (value) => {
        if (!value) return "N/A";
        return `${value.duration} ${value.timeframe}`;
      },
    },
  },
  {
    key: "amount",
    title: tCommon("amount"),
    type: "number",
    icon: Wallet,
    sortable: true,
    filterable: true,
    description: t("your_initial_investment_amount_deposited_into"),
    priority: 1,
  },
  {
    key: "profit",
    title: tCommon("profit_loss"),
    type: "number",
    icon: TrendingUp,
    sortable: true,
    filterable: true,
    description: tExtAdmin("total_profit_or_loss_generated_from"),
    priority: 1,
  },
  {
    key: "result",
    title: tCommon("result"),
    type: "select",
    icon: Activity,
    sortable: true,
    filterable: true,
    options: [
      { value: "WIN", label: tCommon("win") },
      { value: "LOSS", label: tCommon("loss") },
      { value: "DRAW", label: tCommon("draw") },
    ],
    render: {
      type: "badge",
      // WIN/LOSS/DRAW hues come from `lib/status-tone.ts`.
      config: {},
    },
    description: tExtAdmin("final_trading_outcome_win_profit_loss"),
    priority: 2,
  },
  {
    key: "status",
    title: tCommon("status"),
    type: "select",
    icon: Activity,
    sortable: true,
    filterable: true,
    options: [
      { value: "ACTIVE", label: tCommon("active") },
      { value: "COMPLETED", label: tCommon("completed") },
      { value: "CANCELLED", label: tCommon("cancelled") },
      { value: "REJECTED", label: tCommon("rejected") },
    ],
    render: {
      type: "badge",
      // Hue resolves centrally through `lib/status-tone.ts`; do not re-add a
      // local `variant` here.
      config: {},
    },
    description: t("current_status_of_your_investment_in"),
    priority: 1,
  },
  {
    key: "createdAt",
    title: tCommon("created_at"),
    type: "date",
    icon: Calendar,
    sortable: true,
    filterable: true,
    description: t("date_and_time_when_this_investment"),
    priority: 2,
  },
] as ColumnDefinition[];
}

/* -------------------------------------------------------------------------- *
 * View dialog
 * -------------------------------------------------------------------------- */

/** DECIMAL columns arrive from mysql2 as STRINGS; coerce before any maths. */
function num(value: any): number {
  return Number(value ?? 0) || 0;
}

function money(value: any): string {
  return num(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function dateOnly(value: any): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : format(date, "PPP");
}

/**
 * Return on investment as a percentage.
 *
 * `roiPercentage` is the field of record; `profit` is kept only for rows
 * written before it existed, so it is the fallback rather than the source.
 */
function roi(row: any): number | null {
  /*
    THE SIGN COMES FROM `result`, ALWAYS.

    Settlement used to derive `roiPercentage` from an UNSIGNED magnitude
    (`forex/utils/cron.ts` — the same file's `signedProfit` comment records that
    exact bug being fixed for `profit` and leaving this column behind), so a
    LOSS stored `+25` and the dashboard rendered "ROI +25.00%" directly beside
    "Profit/Loss −250.00" on one card. New rows are written signed; every row
    written before is not.

    `abs(value) × sign(result)` is correct for both, and idempotent on an
    already-signed value — which is what lets the write-side fix and this
    coexist rather than double-negating.
  */
  const sign = (() => {
    const outcome = String(row?.result ?? "").toUpperCase();
    if (outcome === "LOSS") return -1;
    if (outcome === "DRAW") return 0;
    return 1;
  })();

  if (row?.roiPercentage !== null && row?.roiPercentage !== undefined) {
    return Math.abs(num(row.roiPercentage)) * sign;
  }
  const amount = num(row?.amount);
  if (!amount) return null;
  // `profit` is already signed, so this branch needs no help.
  return (num(row?.profit) / amount) * 100;
}

/**
 * View dialog for a forex investment.
 *
 * The eight table columns show the plan, the amount and the outcome; the
 * record also carries the ROI it was actually settled at, the maturity date,
 * the plan's own terms and the version of the agreement the investor accepted.
 * Those are three different questions — what did I buy, what is it worth, what
 * did I sign — and one flat grid answers none of them well.
 *
 * The dialog header is the `plan` column, so the plan's own detail is shown
 * through its relation rather than repeated as a tile.
 */
export function useForexInvestmentViewConfig(): ViewConfig {
  const t = useTranslations("ext_forex");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  return React.useMemo<ViewConfig>(
    () => ({
      size: "3xl",

      subtitle: (row) =>
        [
          row.duration
            ? row.duration.duration + " " + row.duration.timeframe
            : null,
          row.plan?.name,
        ]
          .filter(Boolean)
          .join(" · "),

      badges: (row) => (
        <>
          <Badge tone={statusTone(row.status)} appearance="soft">
            {String(row.status ?? "").toLowerCase()}
          </Badge>
          {row.result && (
            <Badge tone={statusTone(row.result)} appearance="soft">
              {String(row.result).toLowerCase()}
            </Badge>
          )}
        </>
      ),

      stats: [
        {
          label: tCommon("invested"),
          icon: Wallet,
          value: (row) => money(row.amount),
        },
        {
          label: tExt("profit_loss"),
          icon: TrendingUp,
          value: (row) => {
            const profit = num(row.profit);
            return (
              <span
                className={
                  profit > 0
                    ? "text-success"
                    : profit < 0
                      ? "text-destructive"
                      : undefined
                }
              >
                {(profit > 0 ? "+" : "") + money(profit)}
              </span>
            );
          },
        },
        {
          label: "ROI",
          icon: Percent,
          value: (row) => {
            const value = roi(row);
            return value === null ? "—" : value.toFixed(2) + "%";
          },
        },
        {
          label: tCommon("matures"),
          icon: Calendar,
          value: (row) => dateOnly(row.endDate),
        },
      ],

      sections: [
        {
          id: "plan",
          title: tCommon("plan"),
          icon: BarChart,
          columns: 2,
          fields: [
            {
              key: "plan.profitPercentage",
              title: t("advertised_roi"),
              icon: Percent,
              render: (value) =>
                value === null || value === undefined
                  ? "—"
                  : num(value) + "%",
            },
            { key: "duration", icon: Clock },
            {
              key: "plan.description",
              title: tCommon("about_this_plan"),
              icon: FileText,
              fullWidth: true,
              hideEmpty: true,
              render: (value) => (
                <span className="break-words">{String(value ?? "")}</span>
              ),
            },
          ],
        },
        {
          id: "timeline",
          title: tCommon("timeline"),
          icon: Calendar,
          columns: 2,
          fields: [
            { key: "createdAt", title: tCommon("started"), icon: Calendar },
            {
              key: "termsAcceptedAt",
              title: t("terms_accepted"),
              icon: Shield,
              hideEmpty: true,
              render: (value) => dateOnly(value),
            },
          ],
        },
        {
          id: "record",
          title: tCommon("record"),
          icon: Fingerprint,
          columns: 2,
          collapsible: true,
          defaultCollapsed: true,
          fields: [
            {
              key: "id",
              title: tExt("investment_id"),
              icon: Fingerprint,
              copyable: true,
              render: (value) => (
                <span className="font-mono text-xs break-all">
                  {String(value ?? "")}
                </span>
              ),
            },
            {
              key: "termsVersion",
              title: t("terms_version"),
              icon: Shield,
              hideEmpty: true,
            },
            {
              // A JSON string; the dialog's structured renderer parses and lays
              // it out, so no custom render is needed here.
              key: "metadata",
              title: tCommon("metadata"),
              icon: FileText,
              fullWidth: true,
              hideEmpty: true,
            },
          ],
        },
      ],
    }),
    []
  );
}
