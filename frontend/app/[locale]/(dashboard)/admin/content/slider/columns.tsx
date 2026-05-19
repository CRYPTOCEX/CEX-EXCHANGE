"use client";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import {
  Shield,
  Image as ImageIcon,
  Link2,
  CalendarIcon,
  ToggleLeft,
} from "lucide-react";
import type { FormConfig } from "@/components/blocks/data-table/types/table";

export function useColumns() {
  const t = useTranslations("dashboard_admin");
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
      description: t("unique_slider_identifier"),
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "image",
      title: tCommon("image"),
      type: "image",
      icon: ImageIcon,
      sortable: false,
      searchable: false,
      filterable: false,
      description: t("slider_banner_image_displayed_on_the_homepage"),
      priority: 1,
      render: { type: "image", size: "xl" },
    },
    {
      key: "link",
      title: t("link"),
      type: "text",
      icon: Link2,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("target_url_when_slider_image_is_clicked"),
      priority: 1,
      render: {
        type: "custom",
        render: (value: any) => {
          return (
            <Link
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 dark:text-blue-400 hover:underline"
            >
              {value}
            </Link>
          );
        },
      },
    },
    {
      key: "status",
      title: tCommon("status"),
      type: "boolean",
      icon: ToggleLeft,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("active_status_of_the_slider"),
      priority: 1,
      render: {
        type: "badge",
        config: {
          variant: (value) => (value ? "success" : "muted"),
          withDot: true,
          label: (value) => (value ? "Active" : "Inactive"),
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
      description: t("date_when_the_slider_was_created"),
      render: { type: "date", format: "PPP" },
      priority: 3,
      expandedOnly: true,
    },
  ];
}

export function useFormConfig(): FormConfig {
  const t = useTranslations("dashboard_admin");
  return {
    create: {
      title: t("create_new_slider"),
      description: t("add_a_new_slider_image_to_the_homepage_carousel"),
      groups: [
        {
          id: "slider-content",
          title: t("slider_content"),
          description: t("upload_image_and_set_destination_link"),
          icon: ImageIcon,
          priority: 1,
          fields: [
            {
              key: "image",
              required: true,
              maxLength: 1000,
            },
            {
              key: "link",
              required: false,
              maxLength: 1000,
            },
          ],
        },
        {
          id: "settings",
          title: t("visibility_settings"),
          description: t("control_slider_visibility"),
          icon: ToggleLeft,
          priority: 2,
          fields: [
            {
              key: "status",
              required: false,
              defaultValue: true,
            },
          ],
        },
      ],
    },
    edit: {
      title: t("edit_slider"),
      description: t("update_slider_image_and_settings"),
      groups: [
        {
          id: "slider-content",
          title: t("slider_content"),
          description: t("update_image_and_destination_link"),
          icon: ImageIcon,
          priority: 1,
          fields: [
            {
              key: "image",
              required: true,
              maxLength: 1000,
            },
            {
              key: "link",
              required: false,
              maxLength: 1000,
            },
          ],
        },
        {
          id: "settings",
          title: t("visibility_settings"),
          description: t("control_slider_visibility"),
          icon: ToggleLeft,
          priority: 2,
          fields: [
            {
              key: "status",
              required: false,
            },
          ],
        },
      ],
    },
  };
}
