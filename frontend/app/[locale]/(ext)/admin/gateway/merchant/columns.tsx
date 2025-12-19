"use client";

import {
  Hash,
  User,
  Mail,
  Globe,
  Building2,
  CheckCircle2,
  Shield,
  CalendarIcon,
  DollarSign,
  ToggleLeft,
  Settings,
} from "lucide-react";
import type { FormConfig } from "@/components/blocks/data-table/types/table";

import { useTranslations } from "next-intl";
export function useColumns(): ColumnDefinition[] {
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const tExtAdmin = useTranslations("ext_admin");
  return [
    {
      key: "name",
      title: tExtAdmin("business_name"),
      type: "text",
      icon: Building2,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("the_registered_business_name_of_the"),
      priority: 1,
    },
    {
      key: "user",
      title: tExtAdmin("owner"),
      type: "compound",
      icon: User,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("the_account_owner_who_manages_this"),
      priority: 2,
      render: {
        type: "compound",
        config: {
          image: {
            key: "avatar",
            fallback: "/img/placeholder.svg",
            type: "image",
            title: tCommon("avatar"),
            description: tCommon("users_avatar"),
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
    },
    {
      key: "status",
      title: tCommon("status"),
      type: "select",
      icon: CheckCircle2,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("current_operational_status_of_the_merchant"),
      priority: 1,
      render: {
        type: "badge",
        config: {
          withDot: true,
          variant: (value: string) => {
            switch (value) {
              case "ACTIVE":
                return "success";
              case "PENDING":
                return "warning";
              case "SUSPENDED":
                return "destructive";
              case "REJECTED":
                return "destructive";
              default:
                return "secondary";
            }
          },
        },
      },
      options: [
        { value: "PENDING", label: tCommon("pending") },
        { value: "ACTIVE", label: tCommon("active") },
        { value: "SUSPENDED", label: tCommon("suspended") },
        { value: "REJECTED", label: tCommon("rejected") },
      ],
    },
    {
      key: "verificationStatus",
      title: tExt("verification"),
      type: "select",
      icon: Shield,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("kyb_know_your_business_verification_status"),
      priority: 2,
      render: {
        type: "badge",
        config: {
          withDot: true,
          variant: (value: string) => {
            switch (value) {
              case "VERIFIED":
                return "success";
              case "PENDING":
                return "warning";
              case "UNVERIFIED":
                return "secondary";
              case "REJECTED":
                return "destructive";
              default:
                return "secondary";
            }
          },
        },
      },
      options: [
        { value: "UNVERIFIED", label: tExt("unverified") },
        { value: "PENDING", label: tCommon("pending") },
        { value: "VERIFIED", label: tCommon("verified") },
        { value: "REJECTED", label: tCommon("rejected") },
      ],
    },
    {
      key: "testMode",
      title: tCommon("test_mode"),
      type: "boolean",
      icon: ToggleLeft,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tExtAdmin("indicates_if_merchant_is_operating_in"),
      priority: 3,
      render: {
        type: "badge",
        config: {
          withDot: false,
          variant: (value: boolean) => (value ? "warning" : "success"),
          transform: (value: boolean) => (value ? "Test Mode" : "Live Mode"),
        },
      },
    },
    {
      key: "email",
      title: tExtAdmin("business_email"),
      type: "text",
      icon: Mail,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("primary_contact_email_address_for_business"),
      expandedOnly: true,
    },
    {
      key: "website",
      title: tCommon("website"),
      type: "text",
      icon: Globe,
      sortable: false,
      searchable: false,
      filterable: false,
      description: tExtAdmin("official_website_url_where_the_merchant"),
      expandedOnly: true,
    },
    {
      key: "feePercentage",
      title: tCommon("fee"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: false,
      filterable: false,
      description: tExtAdmin("transaction_fee_percentage_charged_to_this"),
      expandedOnly: true,
    },
    {
      key: "createdAt",
      title: tCommon("created_at"),
      type: "date",
      icon: CalendarIcon,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tExtAdmin("date_and_time_when_the_merchant"),
      render: {
        type: "date",
        format: "PPP",
      },
      expandedOnly: true,
    },
    {
      key: "id",
      title: tCommon("id"),
      type: "text",
      icon: Hash,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("unique_system_identifier_for_the_merchant"),
      expandedOnly: true,
    },
  ];
}

export function useFormConfig(): FormConfig {
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const tExtAdmin = useTranslations("ext_admin");
  return {
    create: {
      title: tExtAdmin("create_new_merchant"),
      description: tExtAdmin("register_a_new_payment_gateway_merchant"),
      groups: [
        {
          id: "business-info",
          title: tCommon("business_information"),
          icon: Building2,
          priority: 1,
          fields: [
            {
              key: "name",
              required: true,
              minLength: 2,
              maxLength: 191
            },
            {
              key: "email",
              required: true,
              maxLength: 255
            },
          ],
        },
      ],
    },
    edit: {
      title: tExtAdmin("edit_merchant"),
      description: tExtAdmin("update_merchant_business_information_verification"),
      groups: [
        {
          id: "business-info",
          title: tCommon("business_information"),
          icon: Building2,
          priority: 1,
          fields: [
            {
              key: "name",
              required: true,
              minLength: 2,
              maxLength: 191
            },
            {
              key: "email",
              required: true,
              maxLength: 255
            },
            {
              key: "website",
              required: false,
              maxLength: 500
            },
          ],
        },
        {
          id: "status-verification",
          title: tExtAdmin("status_verification"),
          icon: Shield,
          priority: 2,
          fields: [
            {
              key: "status",
              required: true,
              options: [
                { value: "PENDING", label: tCommon("pending") },
                { value: "ACTIVE", label: tCommon("active") },
                { value: "SUSPENDED", label: tCommon("suspended") },
                { value: "REJECTED", label: tCommon("rejected") },
              ],
            },
            {
              key: "verificationStatus",
              required: true,
              options: [
                { value: "UNVERIFIED", label: tExt("unverified") },
                { value: "PENDING", label: tCommon("pending") },
                { value: "VERIFIED", label: tCommon("verified") },
              ],
            },
          ],
        },
        {
          id: "fee-settings",
          title: tExtAdmin("fee_settings"),
          icon: Settings,
          priority: 3,
          fields: [
            {
              key: "feePercentage",
              required: true,
              min: 0,
              max: 100
            },
            {
              key: "testMode",
              required: true
            },
          ],
        },
      ],
    },
  };
}
