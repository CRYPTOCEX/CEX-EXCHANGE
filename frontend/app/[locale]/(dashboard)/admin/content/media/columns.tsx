"use client";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import {
  Shield,
  FileText,
  Image as ImageIcon,
  CalendarIcon,
  Maximize2,
} from "lucide-react";
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
      description: t("unique_media_file_identifier"),
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "path",
      title: t("thumbnail"),
      type: "image",
      icon: ImageIcon,
      sortable: false,
      searchable: false,
      filterable: false,
      description: t("media_file_preview_image"),
      priority: 1,
      render: { type: "image", size: "lg" },
    },
    {
      key: "name",
      title: tCommon("name"),
      type: "text",
      icon: FileText,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("original_filename_of_the_media_file"),
      priority: 1,
    },
    {
      key: "width",
      title: t("width"),
      type: "number",
      icon: Maximize2,
      sortable: true,
      searchable: false,
      filterable: true,
      description: t("image_width_in_pixels"),
      priority: 2,
    },
    {
      key: "height",
      title: t("height"),
      type: "number",
      icon: Maximize2,
      sortable: true,
      searchable: false,
      filterable: true,
      description: t("image_height_in_pixels"),
      priority: 2,
    },
    {
      key: "dateModified",
      title: tCommon("modified"),
      type: "date",
      icon: CalendarIcon,
      sortable: true,
      searchable: false,
      filterable: true,
      description: t("last_modification_date_and_time"),
      priority: 3,
      render: { type: "date", format: "PPP" },
    },
  ];
}
