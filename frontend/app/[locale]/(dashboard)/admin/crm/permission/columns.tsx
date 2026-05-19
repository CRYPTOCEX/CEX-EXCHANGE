"use client";
import { Shield, Hash, Tag } from "lucide-react";

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
      description: t("unique_identifier_for_the_permission_record"),
      priority: 3,
    },
    {
      key: "name",
      title: t("permission_name"),
      type: "text",
      sortable: true,
      searchable: true,
      filterable: true,
      icon: Shield,
      description: t("unique_permission_name_for_access_control"),
      priority: 1,
    },
    {
      key: "roles",
      title: t("roles"),
      type: "tags",
      icon: Tag,
      sortable: false,
      searchable: false,
      filterable: false,
      description: t("list_of_roles_that_have_been"),
      render: {
        type: "tags",
        config: { maxDisplay: 3 },
      },
      priority: 2,
    },
  ];
}

