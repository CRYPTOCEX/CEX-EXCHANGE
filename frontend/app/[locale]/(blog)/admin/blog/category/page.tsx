"use client";
import DataTable from "@/components/blocks/data-table";
import { FolderTree } from "lucide-react";
import { useColumns, useFormConfig } from "./columns";
import { useTranslations } from "next-intl";

export default function CategoryPage() {
  const t = useTranslations("blog_admin");
  const columns = useColumns();
  const formConfig = useFormConfig();

  return (
    <DataTable
      apiEndpoint="/api/admin/blog/category"
      model="category"
      permissions={{
        access: "access.blog.category",
        view: "view.blog.category",
        create: "create.blog.category",
        edit: "edit.blog.category",
        delete: "delete.blog.category",
      }}
      pageSize={12}
      canCreate
      canEdit
      canDelete
      canView
      title={t("category_management")}
      description={t("organize_and_manage_blog_post_categories")}
      itemTitle="Category"
      columns={columns}
      formConfig={formConfig}
      design={{
        animation: "orbs",
        icon: FolderTree,
      }}
    />
  );
}
