"use client";
import React from "react";
import {
  Shield,
  User,
  ClipboardList,
  DollarSign,
  CalendarIcon,
  Settings,
  Wallet,
  TrendingUp,
  Clock,
  Mail,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type {
  FormConfig,
  ViewConfig,
} from "@/components/blocks/data-table/types/table";

import { useTranslations } from "next-intl";
export function useColumns(): ColumnDefinition[] {
  const tCommon = useTranslations("common");
  const tExtAdmin = useTranslations("ext_admin");
  return [
    {
      key: "user",
      title: tCommon("user"),
      type: "compound",
      expandedTitle: (row) => `User: ${row.id}`,
      icon: User,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("investor_who_created_this_ai_investment"),
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
      description: tExtAdmin("ai_investment_plan_selected_by_the_user"),
      render: (value: any, row: any) => {
        const plan = row?.plan || value;
        return plan ? plan.title : "N/A";
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
      description: tExtAdmin("total_amount_invested_in_this_ai_investment"),
      priority: 1,
    },
    {
      key: "status",
      title: tCommon("status"),
      type: "select",
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("current_status_of_the_ai_investment"),
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
      key: "profit",
      title: tCommon("profit"),
      type: "number",
      icon: TrendingUp,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tExtAdmin("total_profit_earned_from_this_ai_investment"),
      priority: 1,
    },
    {
      key: "symbol",
      title: tCommon("symbol"),
      type: "text",
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("trading_market_or_pair_symbol_used"),
      priority: 2,
    },
    {
      key: "type",
      title: tCommon("wallet_type"),
      type: "select",
      icon: Wallet,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("type_of_wallet_used_spot_or_eco_wallet"),
      options: [
        { value: "SPOT", label: tCommon("spot") },
        { value: "ECO", label: tCommon("eco") },
      ],
      priority: 2,
      render: {
        type: "badge",
        config: {
          variant: (value) => {
            switch (value) {
              case "SPOT":
                return "success";
              case "ECO":
                return "info";
              default:
                return "secondary";
            }
          },
          withDot: false,
        },
      },
    },
    {
      key: "result",
      title: tCommon("result"),
      type: "select",
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("investment_outcome_win_loss_or_draw"),
      options: [
        { value: "WIN", label: tCommon("win") },
        { value: "LOSS", label: tCommon("loss") },
        { value: "DRAW", label: tCommon("draw") },
      ],
      priority: 2,
      expandedOnly: true,
      render: {
        type: "badge",
        config: {
          // WIN/LOSS/DRAW hues come from `lib/status-tone.ts`.
          withDot: false,
        },
      },
    },
    {
      key: "duration",
      title: tCommon("duration"),
      type: "custom",
      icon: Clock,
      sortable: true,
      searchable: false,
      filterable: false,
      description: tExtAdmin("investment_duration_with_timeframe_e_g"),
      render: (value: any, row: any) => {
        const duration = row?.duration || value;
        if (!duration) return "N/A";
        return `${duration.duration} ${duration.timeframe}`;
      },
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
      description: tExtAdmin("date_and_time_when_the_ai_investment_was_created"),
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
 * An investment log row is four different things at once — a person, a product
 * (plan + duration + market), a sum of money, and an outcome — and the flat
 * grid rendered all eleven columns as one undifferentiated list in which the
 * two figures that actually matter (what went in, what came out) sat between
 * a uuid and a wallet type. The money is promoted to the stat strip, the state
 * to header pills, and the rest is grouped the way the domain groups it.
 * -------------------------------------------------------------------------- */

function toNumber(value: any): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Amounts here are crypto as well as fiat, so the tail is kept. */
function formatAmount(value: any): string {
  return toNumber(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 8,
  });
}

function statusTone(status?: string) {
  switch (String(status).toUpperCase()) {
    case "ACTIVE":
      return "info" as const;
    case "COMPLETED":
      return "success" as const;
    case "CANCELLED":
      return "neutral" as const;
    case "REJECTED":
      return "destructive" as const;
    default:
      return "neutral" as const;
  }
}

function resultTone(result?: string) {
  switch (String(result).toUpperCase()) {
    case "WIN":
      return "success" as const;
    case "LOSS":
      return "destructive" as const;
    default:
      return "neutral" as const;
  }
}

export function useViewConfig(): ViewConfig {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");

  return React.useMemo<ViewConfig>(
    () => ({
      size: "3xl",

      // The primary column is the investor compound, so the header would
      // otherwise repeat what the "Investor" section already says. The plan is
      // what identifies the record.
      title: (row) => row.plan?.title || tCommon("ai_investment"),
      subtitle: (row) => row.symbol || undefined,

      badges: (row) => (
        <>
          <Badge
            tone={statusTone(row.status)}
            appearance="soft"
            className="capitalize"
          >
            {String(row.status ?? "").toLowerCase() || "unknown"}
          </Badge>
          {row.result && (
            <Badge
              tone={resultTone(row.result)}
              appearance="soft"
              className="capitalize"
            >
              {String(row.result).toLowerCase()}
            </Badge>
          )}
        </>
      ),

      stats: [
        {
          label: tCommon("invested"),
          icon: DollarSign,
          value: (row) => formatAmount(row.amount),
        },
        // `tone` is a fixed value rather than a function of the row, so a signed
        // figure is expressed as two mutually exclusive entries.
        {
          label: tCommon("profit"),
          icon: TrendingUp,
          tone: "success",
          condition: (row) => toNumber(row.profit) >= 0,
          value: (row) => `+${formatAmount(row.profit)}`,
        },
        {
          label: tCommon("profit"),
          icon: TrendingUp,
          tone: "destructive",
          condition: (row) => toNumber(row.profit) < 0,
          value: (row) => formatAmount(row.profit),
        },
        {
          label: t("net_return"),
          icon: Wallet,
          value: (row) =>
            formatAmount(toNumber(row.amount) + toNumber(row.profit)),
        },
      ],

      sections: [
        {
          id: "investor",
          title: tExt("investor"),
          icon: User,
          columns: 2,
          fields: [
            {
              key: "user.firstName",
              title: tCommon("name"),
              icon: User,
              render: (_value, row) =>
                [row.user?.firstName, row.user?.lastName]
                  .filter(Boolean)
                  .join(" ") || "—",
            },
            {
              key: "user.email",
              title: tCommon("email"),
              icon: Mail,
              copyable: true,
              render: (value) => (
                <span className="break-all">{String(value)}</span>
              ),
            },
          ],
        },
        {
          id: "position",
          title: tCommon("position"),
          icon: ClipboardList,
          columns: 2,
          fields: [
            { key: "type", icon: Wallet },
            { key: "duration", icon: Clock },
          ],
        },
        {
          id: "record",
          title: tCommon("record"),
          icon: Shield,
          columns: 2,
          fields: [
            { key: "id", icon: Shield, copyable: true },
            { key: "createdAt", icon: CalendarIcon },
          ],
        },
      ],
    }),
    [tCommon]
  );
}

export function useFormConfig(): FormConfig {
  const tCommon = useTranslations("common");
  const tExtAdmin = useTranslations("ext_admin");
  return {
    create: {
      title: tExtAdmin("create_new_investment_log"),
      description: tExtAdmin("record_a_new_ai_investment_transaction"),
      groups: [],
    },
    edit: {
      title: tExtAdmin("edit_investment_log"),
      description: tExtAdmin("modify_ai_investment_log_details_results"),
      groups: [
        // `type` is deliberately NOT editable: it decides which wallet the
        // payout goes to, and the principal has already been debited from the
        // original one. The backend refuses a change to it.
        {
          id: "results",
          title: tExtAdmin("investment_results"),
          icon: TrendingUp,
          priority: 1,
          fields: [
            {
              key: "profit",
              required: false,
            },
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
        // The status select that used to live here was a lie: the update
        // handler never read the field, so an admin could pick "Completed",
        // save, see a success toast, and nothing would happen — no status
        // change and, more importantly, no payout. Status changes belong to the
        // dedicated status action, which moves the money with them.
      ],
    },
  };
}
