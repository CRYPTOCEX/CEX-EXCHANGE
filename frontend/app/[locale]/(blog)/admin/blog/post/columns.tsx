"use client";

import React from "react";
import {
  Shield,
  ClipboardList,
  CalendarIcon,
  Image as ImageIcon,
  User,
  Newspaper,
  Mail,
  Eye,
  FileText,
  AlignLeft,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import type { ViewConfig } from "@/components/blocks/data-table/types/table";
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
      description: t("unique_system_identifier_for_the_blog_post"),
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
      description: t("post_featured_image"),
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "title",
      title: tCommon("title"),
      type: "text",
      icon: Newspaper,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("post_title"),
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "author",
      idKey: "id",
      labelKey: "name",
      baseKey: "authorId",
      sortKey: "author.user.firstName",
      title: tCommon("author"),
      type: "select",
      icon: Shield,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("author_who_wrote_this_blog_post"),
      apiEndpoint: {
        url: "/api/admin/blog/author/options",
        method: "GET",
      },
      render: {
        type: "compound",
        config: {
          primary: {
            key: ["user.firstName", "user.lastName"],
            title: [tCommon("first_name"), tCommon("last_name")],
            description: [t("authors_first_name"), t("authors_last_name")],
            icon: User,
          },
          secondary: {
            key: "user.email",
            title: tCommon("email"),
            icon: Mail,
          },
        },
      },
      priority: 1,
    },
    {
      key: "category",
      idKey: "id",
      labelKey: "name",
      baseKey: "categoryId",
      sortKey: "category.name",
      title: tCommon("category"),
      type: "select",
      icon: ClipboardList,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("category_this_post_belongs_to_for_organization"),
      render: (value: any, row: any) => {
        const category = row?.category || value;
        return category ? category.name : "N/A";
      },
      apiEndpoint: {
        url: "/api/admin/blog/category/options",
        method: "GET",
      },
      priority: 1,
    },
    {
      key: "compound",
      title: tCommon("post"),
      type: "compound",
      disablePrefixSort: true,
      sortable: true,
      searchable: true,
      filterable: true,
      priority: 1,
      icon: Newspaper,
      description: t("post_information_with_featured_image_and_title"),
      render: {
        type: "compound",
        config: {
          image: {
            key: "image",
            fallback: "/img/placeholder.svg",
            type: "image",
            title: tCommon("image"),
            description: t("post_featured_image"),
            filterable: false,
            sortable: false,
          },
          primary: {
            key: "title",
            title: tCommon("title"),
            description: t("post_title"),
            sortable: true,
            sortKey: "title",
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
      description: t("url_friendly_slug_for_the_post_used_in_urls"),
      priority: 2,
      expandedOnly: true,
    },
    {
      key: "status",
      title: tCommon("status"),
      type: "select",
      icon: ClipboardList,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("publication_status_of_the_post_published_or_draft"),
      options: [
        { value: "PUBLISHED", label: tCommon("published") },
        { value: "DRAFT", label: tCommon("draft") },
      ],
      priority: 1,
      render: {
        type: "badge",
        // Hue comes from lib/status-tone.ts. The local copy made DRAFT amber,
        // reading as "needs attention"; the table calls it neutral — a draft is
        // an inert state, not a problem. PUBLISHED already agreed.
        // NOTE: config must stay present. Omitting it entirely makes BadgeCell
        // fall back to its default parameter { variant: "default" }, which is a
        // literal variant and bypasses statusTone() all over again.
        config: {},
      },
    },
    {
      key: "description",
      title: tCommon("description"),
      type: "textarea",
      icon: ClipboardList,
      sortable: false,
      searchable: true,
      filterable: false,
      description: t("brief_description_or_excerpt_of_the_post"),
      priority: 2,
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
      description: t("date_when_the_post_was_created"),
      render: { type: "date", format: "PPP" },
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "content",
      title: tCommon("content"),
      type: "editor",
      description: t("full_content_body_of_the_blog"),
      uploadDir: "posts",
      expandedOnly: true,
    },
  ] as ColumnDefinition[];
}

/* -------------------------------------------------------------------------- *
 * View dialog
 *
 * A post is a DOCUMENT, and the default dialog treated it as a row: eleven
 * tiles, one of which held the entire HTML body as an unbroken string of tags.
 *
 * The header needs overriding rather than deriving. `getPrimaryColumn` takes
 * the first column whose renderer is compound, and the `author` column renders
 * compound — so the panel titled every post with its AUTHOR's name and dropped
 * the author from the body at the same time. Titling on `title` fixes both, and
 * the author moves to the stat strip where it belongs.
 * -------------------------------------------------------------------------- */

/** Longest body preview worth putting in a dialog. */
const CONTENT_PREVIEW_CHARS = 800;

export function useViewConfig(): ViewConfig {
  const t = useTranslations("blog_admin");
  const tCommon = useTranslations("common");

  return React.useMemo<ViewConfig>(
    () => ({
      size: "4xl",

      title: (row) => row.title || `#${row.id}`,
      subtitle: (row) => (row.slug ? `/${row.slug}` : undefined),

      badges: (row) => {
        const published = String(row.status).toUpperCase() === "PUBLISHED";
        return (
          <Badge tone={published ? "success" : "neutral"} appearance="soft">
            {published ? tCommon("published") : tCommon("draft")}
          </Badge>
        );
      },

      stats: [
        {
          label: tCommon("author"),
          icon: User,
          value: (row) =>
            [row.author?.user?.firstName, row.author?.user?.lastName]
              .filter(Boolean)
              .join(" ") ||
            row.author?.user?.email ||
            "—",
        },
        {
          label: tCommon("category"),
          icon: ClipboardList,
          value: (row) => row.category?.name || "—",
        },
        {
          label: tCommon("views"),
          icon: Eye,
          value: (row) => Number(row.views ?? 0).toLocaleString(),
        },
        {
          label: tCommon("created_at"),
          icon: CalendarIcon,
          value: (row) =>
            row.createdAt ? format(new Date(row.createdAt), "MMM d, yyyy") : "—",
        },
      ],

      sections: [
        {
          id: "post",
          title: tCommon("post"),
          icon: Newspaper,
          columns: 2,
          // `slug` is deliberately absent: it is the subtitle under the title,
          // where it reads as the post's URL rather than as another tile.
          fields: ["image", "id"],
        },
        {
          id: "excerpt",
          title: tCommon("description"),
          icon: AlignLeft,
          columns: 1,
          condition: (row) => Boolean(row.description),
          fields: [{ key: "description", fullWidth: true }],
        },
        {
          id: "content",
          title: tCommon("content"),
          icon: FileText,
          // The body is stored as editor HTML. Rendered through the generic
          // cell it becomes a wall of literal `<p>` tags; injected as markup it
          // would drag the post's own stylesheet into an admin dialog. A
          // stripped, truncated preview answers the only question this panel is
          // asked — "is there a draft in here, and roughly what is it about".
          render: (row) => {
            const text = String(row.content ?? "")
              .replace(/<[^>]*>/g, " ")
              .replace(/&nbsp;/g, " ")
              .replace(/\s+/g, " ")
              .trim();

            if (!text) {
              return (
                <p className="text-sm text-muted-foreground">
                  {t("this_post_has_no_body_yet")}
                </p>
              );
            }

            const truncated = text.length > CONTENT_PREVIEW_CHARS;
            return (
              <div className="rounded-lg border border-border p-4 min-w-0">
                <p className="text-sm leading-relaxed text-foreground break-words">
                  {truncated
                    ? `${text.slice(0, CONTENT_PREVIEW_CHARS)}…`
                    : text}
                </p>
                <p className="mt-3 text-xs text-muted-foreground">
                  {truncated
                    ? `Showing the first ${CONTENT_PREVIEW_CHARS} of ${text.length.toLocaleString()} characters. Open the editor for the full post.`
                    : `${text.length.toLocaleString()} characters.`}
                </p>
              </div>
            );
          },
        },
      ],
    }),
    [t, tCommon]
  );
}

/**
 * There is deliberately no `useFormConfig` here any more.
 *
 * Create and edit are full pages — `post/create` and `post/[id]/edit`, both
 * driven by `components/blocks/blog/post-editor.tsx` — and `page.tsx` wires
 * them through DataTable's `createLink` / `editLink`. Both entry points into
 * the inline table form (the header create button and the row edit action)
 * check those links before falling back to the form, so a form config exported
 * here could never be rendered: it would be config that looks live, gets
 * edited, and changes nothing.
 */
