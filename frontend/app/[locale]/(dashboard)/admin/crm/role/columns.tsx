"use client";
import { Shield, ListChecks, Hash } from "lucide-react";
import type { FormConfig } from "@/components/blocks/data-table/types/table";

import { useTranslations } from "next-intl";
export function useColumns() {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  return [
    {
      key: "id",
      title: tCommon("id"),
      type: "text",
      sortable: true,
      searchable: true,
      filterable: true,
      icon: Hash,
      description: t("unique_identifier_for_the_role_record"),
      priority: 3,
    },
    {
      key: "name",
      title: t("role_name"),
      type: "text",
      sortable: true,
      searchable: true,
      filterable: true,
      icon: Shield,
      description: t("unique_name_of_the_role_e_g_admin_user_moderator"),
      priority: 1,
    },
    {
      key: "permissions",
      title: tCommon("permissions"),
      type: "multiselect",
      icon: ListChecks,
      sortable: false,
      searchable: false,
      filterable: false,
      description: t("list_of_permissions_assigned_to_this"),
      apiEndpoint: {
        url: "/api/admin/crm/permission/options",
        method: "GET",
      },
      render: {
        type: "tags",
        config: { maxDisplay: 3 },
      },
      priority: 2,
    },
  ];
}

export function useFormConfig(): FormConfig {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  return {
    create: {
      title: t("create_new_role"),
      description: t("set_up_a_new_user_role_with_specific_permissions"),
      groups: [
        {
          id: "role-info",
          title: t("role_information"),
          icon: Shield,
          priority: 1,
          fields: [
            {
              key: "name",
              required: true,
              validation: (value) => {
                if (!value) return "Role name is required";
                if (value.length < 1) return "Role name cannot be empty";
                return null;
              },
            },
          ],
        },
        {
          id: "permissions",
          title: tCommon("permissions"),
          icon: ListChecks,
          priority: 2,
          fields: [
            {
              key: "permissions",
              required: true,
              apiEndpoint: {
                url: "/api/admin/crm/permission/options",
                method: "GET",
              },
            },
          ],
        },
      ],
    },
    edit: {
      title: t("edit_role"),
      description: t("update_role_details_and_permission_assignments"),
      groups: [
        {
          id: "role-info",
          title: t("role_information"),
          icon: Shield,
          priority: 1,
          fields: [
            {
              key: "name",
              required: true,
              validation: (value) => {
                if (!value) return "Role name is required";
                if (value.length < 1) return "Role name cannot be empty";
                return null;
              },
            },
          ],
        },
        {
          id: "permissions",
          title: tCommon("permissions"),
          icon: ListChecks,
          priority: 2,
          fields: [
            {
              key: "permissions",
              required: true,
              apiEndpoint: {
                url: "/api/admin/crm/permission/options",
                method: "GET",
              },
            },
          ],
        },
      ],
    },
  };
}
