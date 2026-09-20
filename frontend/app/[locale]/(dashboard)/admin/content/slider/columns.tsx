"use client";
import React from "react";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import {
  Shield,
  Image as ImageIcon,
  Link2,
  CalendarIcon,
  ToggleLeft,
} from "lucide-react";
import type {
  FormConfig,
  ViewConfig,
} from "@/components/blocks/data-table/types/table";
import { Badge } from "@/components/ui/badge";
import { Lightbox } from "@/components/ui/lightbox";

export function useColumns() {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  return [
    {
      key: "id",
      title: "ID",
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
      title: tCommon("link"),
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
              className="text-primary hover:underline"
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
          label: (value) => (value ? tCommon("active") : tCommon("inactive")),
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

/* -------------------------------------------------------------------------- *
 * View dialog
 *
 * Five flat columns, so this would normally be a table to leave alone — except
 * that the one thing a slider RECORD is, is the picture, and the zero-config
 * dialog mangles exactly that. `image` wins the primary-column election, so the
 * header renders it through ImageCell, which draws every image at
 * `w-32 h-32 object-cover rounded-full`: a 1920x600 promotional banner becomes a
 * 128px CIRCLE cropped to its middle square. An operator opening a slide to
 * check which one it is cannot tell.
 *
 * So the panel is barely a config at all — it is a preview at the banner's own
 * aspect ratio, the destination it sends people to, and its on/off state as a
 * header pill. Nothing else about a slider is worth grouping.
 * -------------------------------------------------------------------------- */

export function useViewConfig(): ViewConfig {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  return React.useMemo<ViewConfig>(
    () => ({
      size: "2xl",

      /* The destination URL is the only human-readable field a slide has; the
         id is a uuid and there is no name. A slide with nowhere to go says so,
         because that is a misconfiguration worth seeing at the top. */
      title: (row) => row.link || t("no_destination_set"),

      badges: (row) => (
        <Badge tone={row.status ? "success" : "neutral"} appearance="soft">
          {row.status ? tCommon("active") : tCommon("inactive")}
        </Badge>
      ),

      sections: [
        {
          id: "preview",
          title: tCommon("preview"),
          icon: ImageIcon,
          priority: 1,
          render: (row) =>
            row.image ? (
              <Lightbox
                src={row.image}
                alt={t("slider_banner")}
                // `object-contain` and an auto height, against ImageCell's
                // cover-crop: a banner's whole point is its full width.
                className="w-full h-auto max-h-72 object-contain"
                wrapperClassName="rounded-lg border border-border bg-muted overflow-hidden"
              />
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {t("no_image_uploaded_this_slide_renders")}
              </p>
            ),
        },
        {
          id: "destination",
          title: tCommon("destination"),
          icon: Link2,
          columns: 1,
          priority: 2,
          fields: [
            {
              key: "link",
              title: t("target_url"),
              icon: Link2,
              fullWidth: true,
              copyable: true,
              emptyText: t("clicking_this_slide_goes_nowhere"),
              // The column's own renderer has no wrapping rule, so a long
              // campaign URL ran off the tile. Same link, allowed to break.
              render: (value) => (
                <Link
                  href={String(value)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline break-all"
                >
                  {String(value)}
                </Link>
              ),
            },
          ],
        },
        {
          id: "reference",
          title: tCommon("reference"),
          icon: Shield,
          columns: 2,
          priority: 3,
          fields: [
            { key: "id", title: t("slider_id"), icon: Shield, copyable: true },
            { key: "createdAt", title: tCommon("created"), icon: CalendarIcon },
          ],
        },
      ],
    }),
    []
  );
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
