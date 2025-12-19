"use client";
import {
  Layers,
  Database,
  Coins,
  DollarSign,
  FileText,
  Clock,
  Shield,
  TrendingUp,
  Settings,
} from "lucide-react";
import type { FormConfig } from "@/components/blocks/data-table/types/table";

import { useTranslations } from "next-intl";
// Column definitions for table display only
export function useColumns(): ColumnDefinition[] {
  const tCommon = useTranslations("common");
  const tExtAdmin = useTranslations("ext_admin");
  return [
    {
      key: "name",
      title: tExtAdmin("pool_name"),
      type: "text",
      icon: Layers,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("unique_name_identifier_for_the_staking_pool"),
      priority: 1,
    },
    {
      key: "token",
      title: tExtAdmin("token"),
      type: "text",
      icon: Coins,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("token_name_and_symbol_that_users"),
      render: {
        type: "custom",
        render: (value: any, row: any) => `${row.token} (${row.symbol})`,
      },
      priority: 1,
    },
    {
      key: "apr",
      title: tCommon("apr"),
      type: "number",
      icon: TrendingUp,
      sortable: true,
      searchable: false,
      filterable: false,
      description: tExtAdmin("annual_percentage_rate_expected_yearly_return"),
      render: {
        type: "custom",
        render: (value: number) => `${value}%`,
      },
      priority: 1,
    },
    {
      key: "status",
      title: tCommon("status"),
      type: "select",
      icon: Shield,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("current_operational_status_of_the_staking_pool"),
      render: {
        type: "badge",
        config: {
          withDot: true,
          variant: (value: string) => {
            switch (value.toUpperCase()) {
              case "ACTIVE":
                return "success";
              case "INACTIVE":
                return "secondary";
              case "COMING_SOON":
                return "warning";
              default:
                return "secondary";
            }
          },
        },
      },
      options: [
        { value: "ACTIVE", label: tCommon("active") },
        { value: "INACTIVE", label: tCommon("inactive") },
        { value: "COMING_SOON", label: tCommon("coming_soon") },
      ],
      priority: 1,
    },
    {
      key: "minStake",
      title: tCommon("min_stake"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: false,
      filterable: false,
      description: tExtAdmin("minimum_amount_of_tokens_required_to"),
      priority: 2,
    },
    {
      key: "lockPeriod",
      title: tExtAdmin("lock_period_days"),
      type: "number",
      icon: Clock,
      sortable: true,
      searchable: false,
      filterable: false,
      description: tExtAdmin("duration_in_days_that_staked_tokens"),
      render: {
        type: "custom",
        render: (value: number) => `${value} days`,
      },
      priority: 2,
    },
    {
      key: "order",
      title: tExtAdmin("display_order"),
      type: "number",
      sortable: true,
      searchable: false,
      filterable: false,
      description: tExtAdmin("order_in_which_this_pool_appears"),
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "isPromoted",
      title: tExtAdmin("promoted"),
      type: "toggle",
      sortable: false,
      searchable: false,
      filterable: true,
      description: tExtAdmin("featured_pool_that_appears_prominently_in"),
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "createdAt",
      title: tCommon("created_at"),
      type: "date",
      sortable: true,
      searchable: false,
      filterable: false,
      description: tExtAdmin("date_and_time_when_this_staking_pool_was_created"),
      render: {
        type: "date",
        format: "PPP",
      },
      priority: 3,
      expandedOnly: true,
    },
  ];
}

// Form configuration - defines create/edit form structure
export function useFormConfig(): FormConfig {
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const tExtAdmin = useTranslations("ext_admin");
  return {
    create: {
      title: tExtAdmin("create_new_staking_pool"),
      description: tExtAdmin("set_up_a_new_staking_pool"),
      groups: [
        {
          id: "pool-identity",
          title: tExtAdmin("pool_identity"),
          icon: Layers,
          priority: 1,
          fields: [
            { key: "name", required: true, minLength: 2, maxLength: 100 },
            { key: "token", required: true, maxLength: 50 },
            { key: "symbol", required: true, minLength: 1, maxLength: 10 },
            { key: "icon", required: false, maxLength: 191 },
            { key: "description", required: true },
          ],
        },
        {
          id: "wallet-settings",
          title: tExtAdmin("wallet_settings"),
          icon: Database,
          priority: 2,
          fields: [
            {
              key: "walletType",
              required: true,
              options: [
                { value: "FIAT", label: tCommon("fiat") },
                { value: "SPOT", label: tCommon("spot") },
                { value: "ECO", label: tCommon("eco") },
              ],
            },
            { key: "walletChain", required: false, maxLength: 191 },
          ],
        },
        {
          id: "staking-parameters",
          title: tExtAdmin("staking_parameters"),
          icon: DollarSign,
          priority: 3,
          fields: [
            { key: "apr", required: true, min: 0 },
            { key: "lockPeriod", required: true, min: 0 },
            { key: "minStake", required: true, min: 0 },
            { key: "maxStake", required: false, min: 0 },
            { key: "availableToStake", required: true, min: 0 },
            { key: "earlyWithdrawalFee", required: true, min: 0, max: 100 },
            { key: "adminFeePercentage", required: true, min: 0, max: 100 },
          ],
        },
        {
          id: "earning-settings",
          title: tExtAdmin("earning_settings"),
          icon: TrendingUp,
          priority: 4,
          fields: [
            {
              key: "earningFrequency",
              required: true,
              options: [
                { value: "DAILY", label: tExt("daily") },
                { value: "WEEKLY", label: tExt("weekly") },
                { value: "MONTHLY", label: tExt("monthly") },
                { value: "END_OF_TERM", label: tExt("end_of_term") },
              ],
            },
            { key: "autoCompound", required: true },
          ],
        },
        {
          id: "external-information",
          title: tExtAdmin("external_information"),
          icon: FileText,
          priority: 5,
          fields: [
            { key: "externalPoolUrl", required: false, maxLength: 191 },
            { key: "profitSource", required: true },
            { key: "fundAllocation", required: true },
            { key: "risks", required: true },
            { key: "rewards", required: true },
          ],
        },
        {
          id: "display-settings",
          title: tCommon("display_settings"),
          icon: Settings,
          priority: 6,
          fields: [
            {
              key: "status",
              required: true,
              options: [
                { value: "ACTIVE", label: tCommon("active") },
                { value: "INACTIVE", label: tCommon("inactive") },
                { value: "COMING_SOON", label: tCommon("coming_soon") },
              ],
            },
            { key: "isPromoted", required: true },
            { key: "order", required: true, min: 0 },
          ],
        },
      ],
    },
    edit: {
      title: tExtAdmin("edit_staking_pool"),
      description: tExtAdmin("modify_staking_pool_parameters_apr_rates"),
      groups: [
        {
          id: "pool-identity",
          title: tExtAdmin("pool_identity"),
          icon: Layers,
          priority: 1,
          fields: [
            { key: "name", required: true, minLength: 2, maxLength: 100 },
            { key: "token", required: true, maxLength: 50 },
            { key: "symbol", required: true, minLength: 1, maxLength: 10 },
            { key: "icon", required: false, maxLength: 191 },
            { key: "description", required: true },
          ],
        },
        {
          id: "wallet-settings",
          title: tExtAdmin("wallet_settings"),
          icon: Database,
          priority: 2,
          fields: [
            {
              key: "walletType",
              required: true,
              options: [
                { value: "FIAT", label: tCommon("fiat") },
                { value: "SPOT", label: tCommon("spot") },
                { value: "ECO", label: tCommon("eco") },
              ],
            },
            { key: "walletChain", required: false, maxLength: 191 },
          ],
        },
        {
          id: "staking-parameters",
          title: tExtAdmin("staking_parameters"),
          icon: DollarSign,
          priority: 3,
          fields: [
            { key: "apr", required: true, min: 0 },
            { key: "lockPeriod", required: true, min: 0 },
            { key: "minStake", required: true, min: 0 },
            { key: "maxStake", required: false, min: 0 },
            { key: "availableToStake", required: true, min: 0 },
            { key: "earlyWithdrawalFee", required: true, min: 0, max: 100 },
            { key: "adminFeePercentage", required: true, min: 0, max: 100 },
          ],
        },
        {
          id: "earning-settings",
          title: tExtAdmin("earning_settings"),
          icon: TrendingUp,
          priority: 4,
          fields: [
            {
              key: "earningFrequency",
              required: true,
              options: [
                { value: "DAILY", label: tExt("daily") },
                { value: "WEEKLY", label: tExt("weekly") },
                { value: "MONTHLY", label: tExt("monthly") },
                { value: "END_OF_TERM", label: tExt("end_of_term") },
              ],
            },
            { key: "autoCompound", required: true },
          ],
        },
        {
          id: "external-information",
          title: tExtAdmin("external_information"),
          icon: FileText,
          priority: 5,
          fields: [
            { key: "externalPoolUrl", required: false, maxLength: 191 },
            { key: "profitSource", required: true },
            { key: "fundAllocation", required: true },
            { key: "risks", required: true },
            { key: "rewards", required: true },
          ],
        },
        {
          id: "display-settings",
          title: tCommon("display_settings"),
          icon: Settings,
          priority: 6,
          fields: [
            {
              key: "status",
              required: true,
              options: [
                { value: "ACTIVE", label: tCommon("active") },
                { value: "INACTIVE", label: tCommon("inactive") },
                { value: "COMING_SOON", label: tCommon("coming_soon") },
              ],
            },
            { key: "isPromoted", required: true },
            { key: "order", required: true, min: 0 },
          ],
        },
      ],
    },
  };
}
