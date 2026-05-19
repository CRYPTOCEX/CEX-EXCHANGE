"use client";

import { Shield, CheckSquare, Building2, Hash } from "lucide-react";
import { useTranslations } from "next-intl";
export function useColumns(): ColumnDefinition[] {
  const tCommon = useTranslations("common");
  const tDashboardAdmin = useTranslations("dashboard_admin");
  return [
    {
      key: "id",
      title: tCommon("id"),
      type: "text",
      icon: Hash,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("unique_identifier_for_the_exchange_provider"),
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "name",
      title: tCommon("name"),
      type: "text",
      icon: Building2,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("internal_name_of_the_exchange_provider"),
      priority: 1,
    },
    {
      key: "title",
      title: tCommon("title"),
      type: "text",
      icon: Building2,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("display_title_for_the_exchange_provider"),
      priority: 1,
    },
    {
      key: "status",
      title: tCommon("status"),
      type: "boolean",
      icon: CheckSquare,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("active_status_of_the_exchange_provider"),
      priority: 1,
      render: {
        type: "badge",
        config: {
          withDot: true,
          variant: (value: boolean) => (value ? "success" : "secondary"),
          labels: {
            true: "Active",
            false: "Inactive",
          },
        },
      },
    },
    {
      key: "licenseStatus",
      title: tDashboardAdmin("license"),
      type: "boolean",
      icon: Shield,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("license_verification_status"),
      priority: 1,
      render: {
        type: "badge",
        config: {
          withDot: true,
          variant: (value: boolean) => (value ? "success" : "secondary"),
          labels: {
            true: "Licensed",
            false: "Unlicensed",
          },
        },
      },
    },
  ];
}
