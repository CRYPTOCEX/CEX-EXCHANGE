"use client";

import {
  Shield,
  DollarSign,
  ClipboardList,
  CalendarIcon,
  CheckSquare,
  User,
  Settings,
} from "lucide-react";
import type { FormConfig } from "@/components/blocks/data-table/types/table";

import { useTranslations } from "next-intl";
export function useColumns() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  return [
    {
      key: "referrer",
      idKey: "id",
      labelKey: "name",
      title: tCommon("referrer"),
      type: "select",
      baseKey: "referrerId",
      sortKey: "referrer.firstName",
      expandedTitle: (row) => `Referrer: ${row.id}`,
      icon: User,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("the_user_who_earned_this_reward"),
      apiEndpoint: {
        url: "/api/admin/crm/user/options",
        method: "GET",
      },
      render: {
        type: "compound",
        config: {
          image: {
            key: "avatar",
            fallback: "/img/placeholder.svg",
            type: "image",
            title: tCommon("avatar"),
            description: t("referrers_profile_picture"),
            filterable: false,
            sortable: false,
          },
          primary: {
            key: ["firstName", "lastName"],
            title: [tCommon("first_name"), tCommon("last_name")],
            icon: User,
            sortable: true,
            searchable: true,
            filterable: true,
            sortKey: "firstName",
          },
          secondary: {
            key: "email",
            title: tCommon("email"),
            sortable: true,
            searchable: true,
            filterable: true,
            sortKey: "email",
          },
        },
      },
      priority: 1,
    },
    {
      key: "condition",
      title: t("condition"),
      type: "custom",
      icon: ClipboardList,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("the_affiliate_condition_that_was_met"),
      render: (value: any, row: any) => {
        const condition = row?.condition || value;
        return condition ? condition.title : "N/A";
      },
      priority: 1,
    },
    {
      key: "reward",
      title: tCommon("reward"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: false,
      filterable: true,
      description: t("the_monetary_amount_or_percentage_earned"),
      priority: 1,
    },
    {
      key: "isClaimed",
      title: t("claimed"),
      type: "boolean",
      icon: CheckSquare,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("whether_the_referrer_has_claimed_and"),
      priority: 1,
      render: {
        type: "badge",
        config: {
          variant: (value: boolean) => {
            return value ? "success" : "warning";
          },
          format: (value: boolean) => {
            return value ? "Claimed" : "Pending";
          },
          withDot: true,
        },
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
      description: t("the_date_and_time_when_this"),
      render: { type: "date", format: "PPP" },
      priority: 2,
      expandedOnly: true,
    },
    {
      key: "id",
      title: tCommon("id"),
      type: "text",
      icon: Shield,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("unique_system_identifier_for_this_reward_record"),
      priority: 4,
      expandedOnly: true,
    },
  ] as ColumnDefinition[];
}

export function useFormConfig() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  return {
    create: {
      title: t("create_new_reward"),
      description: t("issue_a_new_affiliate_reward_for"),
      groups: [
        {
          id: "referrer",
          title: tCommon("referrer"),
          icon: User,
          priority: 1,
          fields: [
            {
              key: "referrerId",
              required: true,
              apiEndpoint: {
                url: "/api/admin/crm/user/options",
                method: "GET",
              },
              validation: (value) => {
                if (!value) return "Referrer is required";
                return null;
              },
            },
            {
              key: "conditionId",
              required: true,
              apiEndpoint: {
                url: "/api/admin/ext/affiliate/condition/options",
                method: "GET",
              },
              validation: (value) => {
                if (!value) return "Condition is required";
                return null;
              },
            },
          ],
        },
        {
          id: "reward-details",
          title: t("reward_details"),
          icon: DollarSign,
          priority: 2,
          fields: [
            { key: "reward", required: true, min: 0, validation: (value) => {
              if (value === null || value === undefined || value === "") return "Reward is required";
              if (isNaN(value)) return "Reward must be a valid number";
              if (value < 0) return "Reward must be greater than or equal to 0";
              return null;
            }},
            { key: "isClaimed", required: false },
          ],
        },
      ],
    },
    edit: {
      title: t("edit_reward"),
      description: t("modify_the_reward_details_amount_and"),
      groups: [
        {
          id: "referrer",
          title: tCommon("referrer"),
          icon: User,
          priority: 1,
          fields: [
            {
              key: "referrerId",
              required: true,
              apiEndpoint: {
                url: "/api/admin/crm/user/options",
                method: "GET",
              },
              validation: (value) => {
                if (!value) return "Referrer is required";
                return null;
              },
            },
            {
              key: "conditionId",
              required: true,
              apiEndpoint: {
                url: "/api/admin/ext/affiliate/condition/options",
                method: "GET",
              },
              validation: (value) => {
                if (!value) return "Condition is required";
                return null;
              },
            },
          ],
        },
        {
          id: "reward-details",
          title: t("reward_details"),
          icon: DollarSign,
          priority: 2,
          fields: [
            { key: "reward", required: true, min: 0, validation: (value) => {
              if (value === null || value === undefined || value === "") return "Reward is required";
              if (isNaN(value)) return "Reward must be a valid number";
              if (value < 0) return "Reward must be greater than or equal to 0";
              return null;
            }},
            { key: "isClaimed", required: false },
          ],
        },
      ],
    },
  } as FormConfig;
}
