"use client";
import React from "react";
import {
  Shield,
  ClipboardList,
  DollarSign,
  User,
  Key,
  Mail,
  Settings,
  Clock,
  Gauge,
} from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import type {
  FormConfig,
  ViewConfig,
} from "@/components/blocks/data-table/types/table";

import { useTranslations } from "next-intl";
// Column definitions for table display only
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
      description: t("unique_system_identifier_for_the_forex"),
      priority: 3,
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
      description: t("account_owner_information_including_name_email"),
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
            description: [tCommon("users_first_name"), tCommon("users_last_name")],
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
      key: "userId",
      title: tCommon("user"),
      type: "select",
      icon: User,
      sortable: false,
      searchable: false,
      filterable: false,
      description: t("select_the_account_owner_from_registered_users"),
      priority: 1,
      expandedOnly: true,
    },
    {
      key: "accountId",
      title: tCommon("account_id"),
      type: "text",
      icon: ClipboardList,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("unique_trading_account_number_provided_by"),
      priority: 1,
    },
    {
      key: "broker",
      title: t("broker"),
      type: "text",
      icon: ClipboardList,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("name_of_the_forex_broker_managing"),
      priority: 1,
    },
    {
      key: "type",
      title: tCommon("type"),
      type: "select",
      icon: ClipboardList,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("account_type_demo_for_practice_trading"),
      options: [
        { value: "DEMO", label: tCommon("demo") },
        { value: "LIVE", label: tCommon("live") },
      ],
      priority: 1,
      render: {
        type: "badge",
        config: {
          variant: (value: any) => {
            switch (value) {
              case "DEMO":
                return "warning";
              case "LIVE":
                return "success";
              default:
                return "secondary";
            }
          },
        },
      },
    },
    {
      key: "balance",
      title: tCommon("balance"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: false,
      filterable: true,
      description: t("current_account_balance_available_for_trading"),
      priority: 1,
    },
    {
      key: "mt",
      title: t("mt_version"),
      type: "select",
      icon: Key,
      sortable: true,
      searchable: false,
      filterable: true,
      description: t("metatrader_platform_version_mt4_or_mt5"),
      priority: 2,
      expandedOnly: true,
      options: [
        { value: "4", label: t("mt4") },
        { value: "5", label: t("mt5") },
      ],
    },
    {
      key: "leverage",
      title: tCommon("leverage"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: false,
      filterable: true,
      description: t("trading_leverage_ratio_e_g_1"),
      priority: 2,
      expandedOnly: true,
    },
    {
      key: "status",
      title: tCommon("status"),
      type: "toggle",
      icon: Shield,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("account_active_status_enabled_accounts_can"),
      priority: 1,
    },
  ] as ColumnDefinition[];
}

/* -------------------------------------------------------------------------- *
 * View dialog
 *
 * The three things that identify a trading account — what it is worth, how
 * leveraged it is, and whether it is a DEMO or a LIVE account — were three
 * undifferentiated tiles among ten, with `mt` and `leverage` marked
 * `expandedOnly` so they only ever appeared here in the first place. The panel
 * leads with the figures and states DEMO/LIVE and enabled/disabled as header
 * pills, because approving a withdrawal against a DEMO account is the mistake
 * this screen exists to prevent.
 * -------------------------------------------------------------------------- */

function toNumber(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;
  const num = typeof value === "number" ? value : parseFloat(String(value));
  return Number.isFinite(num) ? num : null;
}

function formatBalance(value: any): string {
  const num = toNumber(value);
  if (num === null) return "—";
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
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
          <Badge
            tone={row.type === "LIVE" ? "success" : "warning"}
            appearance="soft"
          >
            {row.type === "LIVE" ? tCommon("live") : tCommon("demo")}
          </Badge>
          <Badge tone={row.status ? "success" : "neutral"} appearance="soft">
            {row.status ? tCommon("enabled") : tCommon("disabled")}
          </Badge>
        </>
      ),

      stats: [
        {
          label: tCommon("balance"),
          icon: DollarSign,
          value: (row) => formatBalance(row.balance),
        },
        {
          label: tCommon("leverage"),
          icon: Gauge,
          value: (row) => {
            const leverage = toNumber(row.leverage);
            return leverage === null ? "—" : `1:${leverage}`;
          },
        },
        {
          label: tExt("platform"),
          icon: Key,
          value: (row) => (row.mt ? `MT${row.mt}` : "—"),
        },
      ],

      sections: [
        {
          id: "account",
          title: tCommon("trading_account"),
          icon: ClipboardList,
          columns: 2,
          fields: [
            { key: "accountId", icon: ClipboardList, copyable: true },
            { key: "broker", icon: ClipboardList },
            {
              // The raw `userId` renders as a uuid; the row carries the joined
              // `user`, which is what an operator is actually looking for.
              key: "userId",
              title: tCommon("owner"),
              icon: User,
              render: (_value, row) =>
                [row.user?.firstName, row.user?.lastName]
                  .filter(Boolean)
                  .join(" ") ||
                row.user?.email ||
                "—",
            },
            {
              key: "id",
              title: t("record_id"),
              icon: Shield,
              copyable: true,
              render: (value) => (
                <span className="font-mono text-xs break-all">{value}</span>
              ),
            },
            {
              // Kept as a FIELD even though the header carries a status pill:
              // `status` is a `toggle` column, so this tile is the live switch
              // that PUTs to /api/admin/forex/account/{id}/status. The pill is
              // the state at a glance; this is the control, and naming an
              // explicit `sections` list is what would otherwise drop it.
              key: "status",
              title: t("account_enabled"),
              icon: Settings,
            },
          ],
        },
        {
          id: "timeline",
          title: tCommon("timeline"),
          icon: Clock,
          columns: 2,
          fields: [
            {
              key: "createdAt",
              title: tCommon("opened"),
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

// Form configuration - defines create/edit form structure
export function useFormConfig() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  return {
    create: {
      title: t("create_new_forex_account"),
      description: t("set_up_a_new_forex_trading"),
      groups: [
        {
          id: "account-owner",
          title: t("account_owner"),
          icon: User,
          priority: 1,
          fields: [
            {
              key: "userId",
              required: true,
              apiEndpoint: {
                url: "/api/admin/crm/user/options",
                method: "GET",
              },
            },
          ],
        },
        {
          id: "broker-details",
          title: t("broker_platform"),
          icon: ClipboardList,
          priority: 2,
          fields: [
            { key: "accountId", required: false },
            { key: "broker", required: false },
            {
              key: "mt",
              required: false,
              options: [
                { value: "4", label: t("mt4") },
                { value: "5", label: t("mt5") },
              ],
            },
            {
              key: "type",
              required: true,
              options: [
                { value: "DEMO", label: tCommon("demo") },
                { value: "LIVE", label: tCommon("live") },
              ],
            },
          ],
        },
        {
          id: "trading-settings",
          title: tCommon("trading_settings"),
          icon: DollarSign,
          priority: 3,
          fields: [
            { key: "balance", required: false, min: 0 },
            { key: "leverage", required: false, min: 0 },
          ],
        },
        {
          id: "settings",
          title: t("account_settings"),
          icon: Settings,
          priority: 4,
          fields: [{ key: "status" }],
        },
      ],
    },
    edit: {
      title: t("edit_forex_account"),
      description: t("update_forex_trading_account_settings_broker"),
      groups: [
        {
          id: "broker-details",
          title: t("broker_platform"),
          icon: ClipboardList,
          priority: 1,
          fields: [
            { key: "accountId", required: false },
            { key: "broker", required: false },
            {
              key: "mt",
              required: false,
              options: [
                { value: "4", label: t("mt4") },
                { value: "5", label: t("mt5") },
              ],
            },
            {
              key: "type",
              required: true,
              options: [
                { value: "DEMO", label: tCommon("demo") },
                { value: "LIVE", label: tCommon("live") },
              ],
            },
          ],
        },
        {
          id: "trading-settings",
          title: tCommon("trading_settings"),
          icon: DollarSign,
          priority: 2,
          fields: [
            { key: "balance", required: false, min: 0 },
            { key: "leverage", required: false, min: 0 },
          ],
        },
        {
          id: "settings",
          title: t("account_settings"),
          icon: Settings,
          priority: 3,
          fields: [{ key: "status" }],
        },
      ],
    },
  } as FormConfig;
}
