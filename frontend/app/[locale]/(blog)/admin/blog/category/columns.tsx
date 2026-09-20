"use client";

import React from "react";
import {
  Shield,
  ClipboardList,
  Image as ImageIcon,
  CalendarIcon,
  FolderTree,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import type {
  FormConfig,
  ViewConfig,
} from "@/components/blocks/data-table/types/table";

import { useTranslations } from "next-intl";
// Column definitions for table display only
export function useColumns() {
  const t = useTranslations("blog_admin");
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
      description: t("unique_system_identifier_for_the_blog_category"),
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
      description: t("category_featured_image"),
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "name",
      title: tCommon("name"),
      type: "text",
      icon: FolderTree,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tCommon("display_name_of_the_category"),
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "compound",
      title: tCommon("category"),
      type: "compound",
      disablePrefixSort: true,
      sortable: true,
      searchable: true,
      filterable: true,
      priority: 1,
      icon: FolderTree,
      description: t("category_information_with_image_and_name"),
      render: {
        type: "compound",
        config: {
          image: {
            key: "image",
            fallback: "/img/placeholder.svg",
            type: "image",
            title: tCommon("image"),
            description: t("category_featured_image"),
            filterable: false,
            sortable: false,
          },
          primary: {
            key: "name",
            title: tCommon("name"),
            type: "text",
            sortable: true,
            searchable: true,
            filterable: true,
            description: tCommon("display_name_of_the_category"),
            priority: 1,
          },
        },
      },
    },
    {
      key: "slug",
      title: tCommon("slug"),
      type: "text",
      icon: ClipboardList,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("url_friendly_slug_for_the_category_used_in_urls"),
      priority: 2,
    },
    {
      key: "description",
      title: tCommon("description"),
      type: "text",
      icon: ClipboardList,
      sortable: false,
      searchable: true,
      filterable: false,
      description: t("detailed_description_of_the_blog_category"),
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "createdAt",
      title: tCommon("created_at"),
      type: "date",
      icon: CalendarIcon,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("date_when_the_category_was_created"),
      render: { type: "date", format: "PPP" },
      priority: 3,
    },
  ] as ColumnDefinition[];
}

/* -------------------------------------------------------------------------- *
 * View dialog
 *
 * The scalar half of a category is short enough that the derived dialog was
 * already fine. What it could not show at all is the half that an operator
 * opens a category FOR: `posts`, which the list endpoint joins in (id, title,
 * createdAt) but which is not a column, so no derived or default section ever
 * reaches it. "How many posts am I about to orphan by deleting this?" was
 * unanswerable from the panel.
 * -------------------------------------------------------------------------- */

/** Posts shown inline before the list is summarised. */
const POST_PREVIEW_LIMIT = 12;

export function useViewConfig(): ViewConfig {
  const t = useTranslations("blog_admin");
  const tCommon = useTranslations("common");
  return React.useMemo<ViewConfig>(
    () => ({
      size: "3xl",

      badges: (row) => {
        const count = Array.isArray(row.posts) ? row.posts.length : 0;
        return (
          <Badge tone={count ? "info" : "neutral"} appearance="soft">
            {count === 1 ? "1 post" : t("posts", { count: String(count) })}
          </Badge>
        );
      },

      sections: [
        {
          id: "details",
          title: t("category_details"),
          icon: FolderTree,
          columns: 2,
          fields: [
            { key: "name", icon: FolderTree },
            { key: "slug", icon: ClipboardList, copyable: true },
            { key: "description", icon: ClipboardList, fullWidth: true },
            { key: "image", icon: ImageIcon },
          ],
        },
        {
          id: "posts",
          title: t("posts_in_this_category"),
          icon: FileText,
          condition: (row) => Array.isArray(row.posts) && row.posts.length > 0,
          // A list of post records, not a key/value pair — the generic tile
          // would stringify the whole array into one unreadable line.
          render: (row) => (
            <div className="space-y-2">
              {row.posts
                .slice(0, POST_PREVIEW_LIMIT)
                .map((post: any, index: number) => (
                  <div
                    key={post.id ?? index}
                    className="flex items-start justify-between gap-4 rounded-lg border border-border p-3"
                  >
                    <p className="min-w-0 break-words text-sm font-medium">
                      {post.title || tCommon("untitled")}
                    </p>
                    <p className="shrink-0 text-xs text-muted-foreground">
                      {post.createdAt
                        ? format(new Date(post.createdAt), "PP")
                        : "—"}
                    </p>
                  </div>
                ))}
              {row.posts.length > POST_PREVIEW_LIMIT && (
                <p className="text-xs text-muted-foreground">
                  {`+${row.posts.length - POST_PREVIEW_LIMIT} more`}
                </p>
              )}
            </div>
          ),
        },
        {
          id: "record",
          title: tCommon("record"),
          icon: Shield,
          columns: 2,
          fields: [
            { key: "id", icon: Shield, copyable: true },
            { key: "createdAt", icon: CalendarIcon },
          ],
        },
      ],
    }),
    []
  );
}

// Form configuration - defines create/edit form structure
export function useFormConfig() {
  const t = useTranslations("blog_admin");
  const tCommon = useTranslations("common");
  return {
    create: {
      title: tCommon("create_new_category"),
      description: t("add_a_new_blog_category_to_organize_your_content"),
      groups: [
        {
          id: "category-basic",
          title: tCommon("category_information"),
          icon: FolderTree,
          priority: 1,
          fields: [
            { key: "image", compoundKey: "compound", required: false },
            { key: "name", compoundKey: "compound", required: true, maxLength: 255 },
            { key: "slug", required: true, maxLength: 255 },
            { key: "description", required: false },
          ],
        },
      ],
    },
    edit: {
      title: tCommon("edit_category"),
      description: t("update_category_details_and_organization_settings"),
      groups: [
        {
          id: "category-basic",
          title: tCommon("category_information"),
          icon: FolderTree,
          priority: 1,
          fields: [
            { key: "image", compoundKey: "compound", required: false },
            { key: "name", compoundKey: "compound", required: true, maxLength: 255 },
            { key: "slug", required: true, maxLength: 255 },
            { key: "description", required: false },
          ],
        },
      ],
    },
  } as FormConfig;
}
