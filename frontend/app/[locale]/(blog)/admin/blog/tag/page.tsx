"use client";
import DataTable from "@/components/blocks/data-table";
import { Tag } from "lucide-react";
import { useColumns, useFormConfig } from "./columns";
import { useAnalytics } from "./analytics";
import { useTranslations } from "next-intl";

export default function TagPage() {
  const t = useTranslations("blog_admin");
  const columns = useColumns();
  const formConfig = useFormConfig();
  const analytics = useAnalytics();

  return (
    <DataTable
      apiEndpoint="/api/admin/blog/tag"
      model="tag"
      permissions={{
        access: "access.blog.tag",
        view: "view.blog.tag",
        create: "create.blog.tag",
        edit: "edit.blog.tag",
        delete: "delete.blog.tag",
      }}
      pageSize={12}
      canCreate
      canEdit
      canDelete
      canView
      title={t("tag_management")}
      description={t("manage_blog_tags_to_help_categorize")}
      itemTitle="Tag"
      columns={columns}
      formConfig={formConfig}
      analytics={analytics}
      design={{
        animation: "orbs",
        icon: Tag,
      }}
    />
  );
}
