"use client";

import { Shield, User, ClipboardList, CalendarIcon, UserCircle, Mail } from "lucide-react";
import type { FormConfig } from "@/components/blocks/data-table/types/table";

import { useTranslations } from "next-intl";
// Column definitions for table display only
export function useColumns() {
  const t = useTranslations("blog_admin");
  const tCommon = useTranslations("common");
  return [
    {
      key: "id",
      title: tCommon("id"),
      type: "text",
      icon: Shield,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("unique_system_identifier_for_the_blog_author"),
      priority: 3,
      expandedOnly: true
    },
    {
      key: "user",
      title: tCommon("user"),
      type: "compound",
      icon: User,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("author_user_information_including_name_email"),
      render: {
        type: "compound",
        config: {
          image: {
            key: "avatar",
            fallback: "/img/placeholder.svg",
            type: "image",
            title: tCommon("avatar"),
            description: tCommon("user_avatar")
          },
          primary: {
            key: ["firstName", "lastName"],
            title: [tCommon("first_name"), tCommon("last_name")],
            description: [tCommon("users_first_name"), tCommon("users_last_name")],
            icon: User
          },
          secondary: {
            key: "email",
            title: tCommon("email"),
            icon: Mail
          }
        }
      },
      priority: 1
    },
    {
      key: "status",
      title: tCommon("status"),
      type: "select",
      icon: ClipboardList,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("current_status_of_the_author_application"),
      options: [
        { value: "PENDING", label: tCommon("pending") },
        { value: "APPROVED", label: tCommon("approved") },
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
              case "APPROVED":
                return "success";
              case "REJECTED":
                return "danger";
              default:
                return "secondary";
            }
          },
          withDot: true
        }
      }
    },
    {
      key: "createdAt",
      title: tCommon("created_at"),
      type: "date",
      icon: CalendarIcon,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("date_when_the_author_application_was_submitted"),
      render: { type: "date", format: "PPP" },
      priority: 3
    },
  ] as ColumnDefinition[];
}

// Form configuration - defines create/edit form structure
export function useFormConfig() {
  const t = useTranslations("blog_admin");
  const tCommon = useTranslations("common");
  return {
    edit: {
      title: t("edit_author_status"),
      description: t("update_the_status_of_the_author"),
      groups: [
        {
          id: "author-status",
          title: t("author_status"),
          icon: UserCircle,
          priority: 1,
          fields: [
            {
              key: "status",
              required: true,
              options: [
                { value: "PENDING", label: tCommon("pending") },
                { value: "APPROVED", label: tCommon("approved") },
                { value: "REJECTED", label: tCommon("rejected") },
              ]
            },
          ]
        },
      ]
    }
  } as FormConfig;
}
