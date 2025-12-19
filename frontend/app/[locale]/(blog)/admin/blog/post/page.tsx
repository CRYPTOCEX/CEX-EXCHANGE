"use client";
import DataTable from "@/components/blocks/data-table";
import { Newspaper } from "lucide-react";
import { useColumns, useFormConfig } from "./columns";
import { useAnalytics } from "./analytics";
import { useTranslations } from "next-intl";

export default function PostPage() {
  const t = useTranslations("blog_admin");
  const columns = useColumns();
  const formConfig = useFormConfig();
  const analytics = useAnalytics();

  return (
    <DataTable
      apiEndpoint="/api/admin/blog/post"
      model="post"
      permissions={{
        access: "access.blog.post",
        view: "view.blog.post",
        create: "create.blog.post",
        edit: "edit.blog.post",
        delete: "delete.blog.post",
      }}
      pageSize={12}
      canCreate
      canEdit
      canDelete
      canView
      title={t("post_management")}
      description={t("create_edit_and_publish_blog_posts")}
      itemTitle="Post"
      columns={columns}
      formConfig={formConfig}
      analytics={analytics}
      design={{
        animation: "orbs",
        icon: Newspaper,
      }}
    />
  );
}
