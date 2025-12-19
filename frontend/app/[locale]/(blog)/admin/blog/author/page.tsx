"use client";
import React from "react";
import DataTable from "@/components/blocks/data-table";
import { UserCircle } from "lucide-react";
import { useColumns, useFormConfig } from "./columns";
import { useAnalytics } from "./analytics";
import { useTranslations } from "next-intl";

export default function AuthorPage(): React.JSX.Element {
  const t = useTranslations("blog_admin");
  const columns = useColumns();
  const formConfig = useFormConfig();
  const analytics = useAnalytics();

  return (
    <DataTable
      apiEndpoint="/api/admin/blog/author"
      model="author"
      permissions={{
        access: "access.blog.author",
        view: "view.blog.author",
        create: "create.blog.author",
        edit: "edit.blog.author",
        delete: "delete.blog.author",
      }}
      pageSize={12}
      canCreate={false}
      canEdit
      canDelete
      canView
      title={t("author_management")}
      description={t("manage_blog_author_applications_and_approve")}
      itemTitle="Author"
      columns={columns}
      formConfig={formConfig}
      analytics={analytics}
      design={{
        animation: "orbs",
        icon: UserCircle,
      }}
    />
  );
}
