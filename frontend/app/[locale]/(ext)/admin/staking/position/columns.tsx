"use client";
import {
  Target,
  TrendingUp,
  CircleDollarSign,
  User,
  Mail,
  DollarSign,
  Calendar,
  Settings,
  FileText,
} from "lucide-react";
import type { FormConfig } from "@/components/blocks/data-table/types/table";

import { useTranslations } from "next-intl";
// Column definitions for table display only
export function useColumns(): ColumnDefinition[] {
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const tExtAdmin = useTranslations("ext_admin");
  return [
    {
      key: "user",
      title: tCommon("user"),
      type: "compound",
      icon: User,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("user_who_owns_this_staking_position"),
      render: {
        type: "compound",
        config: {
          image: {
            key: "avatar",
            fallback: "/img/placeholder.svg",
            type: "image",
            title: tCommon("avatar"),
            description: tCommon("users_profile_picture"),
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
      key: "pool.name",
      title: tExtAdmin("pool"),
      type: "text",
      icon: Target,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("staking_pool_where_tokens_are_locked"),
      render: {
        type: "custom",
        render: (_: any, row: any) =>
          row.pool && row.pool.name ? row.pool.name : "N/A",
      },
      priority: 1,
    },
    {
      key: "amount",
      title: tCommon("staked_amount"),
      type: "number",
      icon: CircleDollarSign,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("total_amount_of_tokens_currently_staked"),
      priority: 1,
    },
    {
      key: "status",
      title: tCommon("status"),
      type: "select",
      icon: TrendingUp,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("current_status_of_the_staking_position"),
      render: {
        type: "badge",
        config: {
          withDot: true,
          variant: (value: string) => {
            switch (value.toUpperCase()) {
              case "ACTIVE":
                return "success";
              case "COMPLETED":
                return "success";
              case "PENDING_WITHDRAWAL":
                return "warning";
              case "CANCELLED":
                return "destructive";
              default:
                return "secondary";
            }
          },
        },
      },
      options: [
        { value: "ACTIVE", label: tCommon("active") },
        { value: "COMPLETED", label: tCommon("completed") },
        { value: "PENDING_WITHDRAWAL", label: tExt("pending_withdrawal") },
        { value: "CANCELLED", label: tCommon("cancelled") },
      ],
      priority: 1,
    },
    {
      key: "startDate",
      title: tExt("start_date"),
      type: "date",
      icon: Calendar,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tExtAdmin("date_when_tokens_were_staked_and_lock_period_began"),
      render: { type: "date", format: "PPP" },
      priority: 2,
    },
    {
      key: "endDate",
      title: tCommon("end_date"),
      type: "date",
      icon: Calendar,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tExtAdmin("date_when_lock_period_ends_and"),
      render: { type: "date", format: "PPP" },
      priority: 2,
    },
    {
      key: "id",
      title: tCommon("position_id"),
      type: "text",
      icon: Target,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("unique_identifier_for_this_staking_position"),
      render: {
        type: "custom",
        render: (value: string) => value.substring(0, 8) + "...",
      },
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
      description: tExtAdmin("date_and_time_when_this_position"),
      render: { type: "date", format: "PPP" },
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
      title: tExtAdmin("create_new_staking_position"),
      description: tExtAdmin("manually_create_a_staking_position_for"),
      groups: [
        {
          id: "user-selection",
          title: tExtAdmin("user_selection"),
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
          id: "position-details",
          title: tCommon("position_details"),
          icon: Target,
          priority: 2,
          fields: [
            {
              key: "poolId",
              required: true,
              apiEndpoint: {
                url: "/api/ext/staking/pool/options",
                method: "GET",
              },
            },
            { key: "amount", required: true, min: 0.000001 },
          ],
        },
        {
          id: "timeline",
          title: tCommon("timeline"),
          icon: Calendar,
          priority: 3,
          fields: [
            { key: "startDate", required: true },
            { key: "endDate", required: true },
          ],
        },
        {
          id: "settings",
          title: tCommon("settings"),
          icon: Settings,
          priority: 4,
          fields: [
            {
              key: "status",
              required: true,
              options: [
                { value: "ACTIVE", label: tCommon("active") },
                { value: "COMPLETED", label: tCommon("completed") },
                { value: "PENDING_WITHDRAWAL", label: tExt("pending_withdrawal") },
                { value: "CANCELLED", label: tCommon("cancelled") },
              ],
            },
            { key: "withdrawalRequested", required: true },
            { key: "withdrawalRequestDate", required: false },
          ],
        },
        {
          id: "admin-notes",
          title: tCommon("admin_notes"),
          icon: FileText,
          priority: 5,
          fields: [
            { key: "adminNotes", required: false },
            { key: "completedAt", required: false },
          ],
        },
      ],
    },
    edit: {
      title: tExtAdmin("edit_staking_position"),
      description: tExtAdmin("update_staking_position_details_including_amount"),
      groups: [
        {
          id: "position-details",
          title: tCommon("position_details"),
          icon: CircleDollarSign,
          priority: 1,
          fields: [{ key: "amount", required: true, min: 0.000001 }],
        },
        {
          id: "timeline",
          title: tCommon("timeline"),
          icon: Calendar,
          priority: 2,
          fields: [
            { key: "startDate", required: true },
            { key: "endDate", required: true },
          ],
        },
        {
          id: "settings",
          title: tCommon("settings"),
          icon: TrendingUp,
          priority: 3,
          fields: [
            {
              key: "status",
              required: true,
              options: [
                { value: "ACTIVE", label: tCommon("active") },
                { value: "COMPLETED", label: tCommon("completed") },
                { value: "PENDING_WITHDRAWAL", label: tExt("pending_withdrawal") },
                { value: "CANCELLED", label: tCommon("cancelled") },
              ],
            },
            { key: "withdrawalRequested", required: true },
            { key: "withdrawalRequestDate", required: false },
          ],
        },
        {
          id: "admin-notes",
          title: tCommon("admin_notes"),
          icon: FileText,
          priority: 4,
          fields: [
            { key: "adminNotes", required: false },
            { key: "completedAt", required: false },
          ],
        },
      ],
    },
  };
}
