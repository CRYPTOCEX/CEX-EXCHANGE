"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CreditCard, FileText, Globe, Settings, Clock, User, Calendar } from "lucide-react";
import type { FormConfig } from "@/components/blocks/data-table/types/table";

import { useTranslations } from "next-intl";
export function useColumns() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  return [
    {
      key: "paymentMethod",
      title: tCommon("payment_method"),
      type: "compound",
      icon: CreditCard,
      priority: 1,
      filterable: true,
      sortable: true,
      searchable: true,
      description: t("payment_method_name_and_details_for"),
      render: {
        type: "compound",
        config: {
          image: {
            key: "icon",
            fallback: "/img/placeholder.svg",
            type: "text",
            title: tCommon("icon"),
            description: tExt("payment_method_icon_or_logo"),
            renderImage: (value: string, row: any) => (
              <Avatar className="h-10 w-10">
                <AvatarImage src={value} alt={row.name} />
                <AvatarFallback className="text-xs">
                  {row.name?.charAt(0)?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
            ),
          },
          primary: {
            key: "name",
            title: tCommon("name"),
            description: tExt("display_name_of_the_payment_method"),
          },
          secondary: {
            key: "description",
            title: tCommon("description"),
            render: (value: string) => (
              <span className="text-sm text-muted-foreground line-clamp-1">
                {value || "No description"}
              </span>
            ),
          },
        },
      },
    },
    {
      key: "available",
      title: tCommon("status"),
      type: "boolean",
      icon: Settings,
      priority: 1,
      filterable: true,
      description: t("whether_this_payment_method_is_currently"),
      render: {
        type: "badge",
        config: {
          withDot: true,
          variant: (value: boolean) => (value ? "success" : "destructive"),
          label: (value: boolean) => (value ? "Active" : "Inactive"),
        },
      },
    },
    {
      key: "isGlobal",
      title: tCommon("type"),
      type: "boolean",
      icon: Globe,
      priority: 2,
      filterable: true,
      description: t("global_methods_are_available_to_all"),
      render: {
        type: "badge",
        config: {
          withDot: false,
          variant: (value: boolean) => (value === true ? "success" : "secondary"),
          label: (value: boolean) => (value === true ? "Global" : "User"),
        },
      },
    },
    {
      key: "processingTime",
      title: tCommon("processing_time"),
      type: "text",
      icon: Clock,
      priority: 2,
      description: t("expected_time_for_payment_to_be"),
      render: {
        type: "custom",
        render: (value: string) => (
          <span className="text-sm">
            {value || <span className="text-muted-foreground">Not specified</span>}
          </span>
        ),
      },
    },
    {
      key: "fees",
      title: tCommon("fees"),
      type: "text",
      icon: CreditCard,
      priority: 3,
      description: t("fee_structure_and_charges_associated_with"),
      expandedOnly: true,
    },
    {
      key: "instructions",
      title: tCommon("instructions"),
      type: "textarea",
      icon: FileText,
      priority: 4,
      description: t("step_by_step_instructions_for_using"),
      expandedOnly: true,
    },
    {
      key: "popularityRank",
      title: tCommon("sort_order"),
      type: "number",
      icon: Settings,
      priority: 3,
      sortable: true,
      description: t("display_order_priority_lower_numbers_appear"),
      render: {
        type: "custom",
        render: (value: number) => (
          <span className="text-sm font-mono">
            {value ?? 0}
          </span>
        ),
      },
    },
    {
      key: "user",
      title: tExt("created_by"),
      type: "compound",
      icon: User,
      priority: 4,
      expandedOnly: true,
      description: tExt("user_who_created_this_payment_method"),
      render: {
        type: "compound",
        config: {
          primary: {
            key: ["firstName", "lastName"],
            title: [tCommon("first_name"), tCommon("last_name")],
            description: [tExt("creators_first_name"), tExt("creators_last_name")],
          },
          secondary: {
            key: "email",
            title: tCommon("email"),
          },
        },
      },
    },
    {
      key: "createdAt",
      title: tCommon("created"),
      type: "date",
      icon: Calendar,
      priority: 4,
      sortable: true,
      description: t("date_when_the_payment_method_was"),
      render: {
        type: "date",
        format: "PPP",
      },
      expandedOnly: true,
    },
  ];
}

export function useFormConfig(): FormConfig {
  const tCommon = useTranslations("common");
  const tDashboardAdmin = useTranslations("dashboard_admin");
  const tExt = useTranslations("ext");
  const tExtAdmin = useTranslations("ext_admin");
  return {
    create: {
      title: tExt("create_new_payment_method"),
      description: tExtAdmin("add_a_new_payment_method_for"),
      groups: [
        {
          id: "basic-info",
          title: tDashboardAdmin("basic_information"),
          icon: CreditCard,
          priority: 1,
          fields: [
            {
              key: "icon",
              required: true,
            },
            {
              key: "name",
              required: true,
            },
            { key: "description", required: false },
          ],
        },
        {
          id: "instructions",
          title: tCommon("instructions"),
          icon: FileText,
          priority: 2,
          fields: [
            { key: "instructions", required: false },
            { key: "metadata", required: false },
          ],
        },
        {
          id: "settings",
          title: tCommon("settings"),
          icon: Settings,
          priority: 3,
          fields: [
            { key: "isGlobal", required: true },
            { key: "available", required: true },
            {
              key: "popularityRank",
              required: true,
              min: 0
            },
          ],
        },
        {
          id: "fees-timing",
          title: tExtAdmin("fees_timing"),
          icon: Clock,
          priority: 4,
          fields: [
            {
              key: "processingTime",
              required: false,
            },
            {
              key: "fees",
              required: false,
            },
          ],
        },
      ],
    },
    edit: {
      title: tCommon("edit_payment_method"),
      description: tExtAdmin("update_payment_method_details_availability_instruc"),
      groups: [
        {
          id: "basic-info",
          title: tDashboardAdmin("basic_information"),
          icon: CreditCard,
          priority: 1,
          fields: [
            {
              key: "icon",
              required: true,
            },
            {
              key: "name",
              required: true,
            },
            { key: "description", required: false },
          ],
        },
        {
          id: "instructions",
          title: tCommon("instructions"),
          icon: FileText,
          priority: 2,
          fields: [
            { key: "instructions", required: false },
            { key: "metadata", required: false },
          ],
        },
        {
          id: "settings",
          title: tCommon("settings"),
          icon: Settings,
          priority: 3,
          fields: [
            { key: "isGlobal", required: true },
            { key: "available", required: true },
            {
              key: "popularityRank",
              required: true,
              min: 0
            },
          ],
        },
        {
          id: "fees-timing",
          title: tExtAdmin("fees_timing"),
          icon: Clock,
          priority: 4,
          fields: [
            {
              key: "processingTime",
              required: false,
            },
            {
              key: "fees",
              required: false,
            },
          ],
        },
      ],
    },
  };
}
