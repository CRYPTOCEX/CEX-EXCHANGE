"use client";

import {
  Shield,
  ClipboardList,
  CalendarIcon,
  Image as ImageIcon,
  User,
  FileText,
  Tag,
  Newspaper,
  Mail,
} from "lucide-react";
import { format } from "date-fns";
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
      title: t("post"),
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
        config: {
          variant: (value) => {
            switch (value) {
              case "PUBLISHED":
                return "success";
              case "DRAFT":
                return "warning";
              default:
                return "secondary";
            }
          },
        },
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

// Form configuration - defines create/edit form structure
export function useFormConfig() {
  const t = useTranslations("blog_admin");
  const tCommon = useTranslations("common");
  return {
    create: {
      title: t("create_new_blog_post"),
      description: t("write_and_publish_a_new_blog"),
      groups: [
        {
          id: "post-author",
          title: tCommon("author"),
          icon: User,
          priority: 1,
          fields: [
            {
              key: "authorId",
              required: true,
              apiEndpoint: {
                url: "/api/admin/blog/author/options",
                method: "GET",
              },
            },
          ],
        },
        {
          id: "post-basic",
          title: t("post_information"),
          icon: FileText,
          priority: 2,
          fields: [
            { key: "image", required: false },
            { key: "title", required: true, maxLength: 255 },
            { key: "slug", required: true, maxLength: 255 },
            { key: "description", required: false },
          ],
        },
        {
          id: "post-category",
          title: t("categorization"),
          icon: Tag,
          priority: 3,
          fields: [
            {
              key: "categoryId",
              required: true,
              apiEndpoint: {
                url: "/api/admin/blog/category/options",
                method: "GET",
              },
            },
            {
              key: "status",
              required: true,
              options: [
                { value: "PUBLISHED", label: tCommon("published") },
                { value: "DRAFT", label: tCommon("draft") },
              ],
            },
          ],
        },
        {
          id: "post-content",
          title: tCommon("content"),
          icon: Newspaper,
          priority: 4,
          fields: [
            { key: "content", required: true, uploadDir: "posts" },
          ],
        },
      ],
    },
    edit: {
      title: t("edit_blog_post"),
      description: t("update_blog_post_content_settings_and"),
      groups: [
        {
          id: "post-basic",
          title: t("post_information"),
          icon: FileText,
          priority: 1,
          fields: [
            { key: "image", required: false },
            { key: "title", required: true, maxLength: 255 },
            { key: "slug", required: true, maxLength: 255 },
            { key: "description", required: false },
          ],
        },
        {
          id: "post-category",
          title: t("categorization"),
          icon: Tag,
          priority: 2,
          fields: [
            {
              key: "categoryId",
              required: true,
              apiEndpoint: {
                url: "/api/admin/blog/category/options",
                method: "GET",
              },
            },
            {
              key: "status",
              required: true,
              options: [
                { value: "PUBLISHED", label: tCommon("published") },
                { value: "DRAFT", label: tCommon("draft") },
              ],
            },
          ],
        },
        {
          id: "post-content",
          title: tCommon("content"),
          icon: Newspaper,
          priority: 3,
          fields: [
            { key: "content", required: true, uploadDir: "posts" },
          ],
        },
      ],
    },
  } as FormConfig;
}
