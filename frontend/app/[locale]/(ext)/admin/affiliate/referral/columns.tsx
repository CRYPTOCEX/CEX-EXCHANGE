"use client";

import { Shield, User, ClipboardList, CalendarIcon, Users, Settings } from "lucide-react";
import type { FormConfig } from "@/components/blocks/data-table/types/table";

import { useTranslations } from "next-intl";
export function useColumns(): ColumnDefinition[] {
  const tCommon = useTranslations("common");
  const tExtAdmin = useTranslations("ext_admin");
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
      description: tExtAdmin("the_user_who_shared_their_referral"),
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
            description: tExtAdmin("referrers_profile_picture"),
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
      key: "referred",
      idKey: "id",
      labelKey: "name",
      title: tExtAdmin("referred"),
      type: "select",
      baseKey: "referredId",
      sortKey: "referred.firstName",
      expandedTitle: (row) => `Referred: ${row.id}`,
      icon: User,
      sortable: true,
      searchable: true,
      filterable: true,
      apiEndpoint: {
        url: "/api/admin/crm/user/options",
        method: "GET",
      },
      description: tExtAdmin("the_new_user_who_joined_thes_link_or_code"),
      render: {
        type: "compound",
        config: {
          image: {
            key: "avatar",
            fallback: "/img/placeholder.svg",
            type: "image",
            title: tCommon("avatar"),
            description: tExtAdmin("referred_users_profile_picture"),
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
      key: "status",
      title: tCommon("status"),
      type: "select",
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("current_state_of_the_referral_relationship"),
      options: [
        { value: "PENDING", label: tCommon("pending") },
        { value: "ACTIVE", label: tCommon("active") },
        { value: "REJECTED", label: tCommon("rejected") },
      ],
      priority: 1,
      render: {
        type: "badge",
        config: {
          variant: (value) => {
            switch (value) {
              case "PENDING":
                return "warning";
              case "ACTIVE":
                return "success";
              case "REJECTED":
                return "destructive";
              default:
                return "secondary";
            }
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
      description: tExtAdmin("the_date_and_time_when_this"),
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
      description: tExtAdmin("unique_system_identifier_for_this_referral_record"),
      priority: 4,
      expandedOnly: true,
    },
  ];
}

export function useFormConfig(): FormConfig {
  const tCommon = useTranslations("common");
  const tExtAdmin = useTranslations("ext_admin");
  return {
    create: {
      title: tExtAdmin("create_new_referral"),
      description: tExtAdmin("establish_a_new_referral_relationship_between"),
      groups: [
        {
          id: "users",
          title: tExtAdmin("referral_users"),
          icon: Users,
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
              key: "referredId",
              required: true,
              apiEndpoint: {
                url: "/api/admin/crm/user/options",
                method: "GET",
              },
              validation: (value) => {
                if (!value) return "Referred user is required";
                return null;
              },
            },
          ],
        },
        {
          id: "settings",
          title: tCommon("settings"),
          icon: Settings,
          priority: 2,
          fields: [
            {
              key: "status",
              required: true,
              options: [
                { value: "PENDING", label: tCommon("pending") },
                { value: "ACTIVE", label: tCommon("active") },
                { value: "REJECTED", label: tCommon("rejected") },
              ],
              validation: (value) => {
                if (!value) return "Status is required";
                if (!["PENDING", "ACTIVE", "REJECTED"].includes(value)) {
                  return "Status must be one of: PENDING, ACTIVE, REJECTED";
                }
                return null;
              },
            },
          ],
        },
      ],
    },
    edit: {
      title: tExtAdmin("edit_referral"),
      description: tExtAdmin("update_the_referral_relationship_details_and"),
      groups: [
        {
          id: "users",
          title: tExtAdmin("referral_users"),
          icon: Users,
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
              key: "referredId",
              required: true,
              apiEndpoint: {
                url: "/api/admin/crm/user/options",
                method: "GET",
              },
              validation: (value) => {
                if (!value) return "Referred user is required";
                return null;
              },
            },
          ],
        },
        {
          id: "settings",
          title: tCommon("settings"),
          icon: Settings,
          priority: 2,
          fields: [
            {
              key: "status",
              required: true,
              options: [
                { value: "PENDING", label: tCommon("pending") },
                { value: "ACTIVE", label: tCommon("active") },
                { value: "REJECTED", label: tCommon("rejected") },
              ],
              validation: (value) => {
                if (!value) return "Status is required";
                if (!["PENDING", "ACTIVE", "REJECTED"].includes(value)) {
                  return "Status must be one of: PENDING, ACTIVE, REJECTED";
                }
                return null;
              },
            },
          ],
        },
      ],
    },
  };
}
