"use client";
import DataTable from "@/components/blocks/data-table";
import { useColumns, useFormConfig } from "./columns";
import { Tag } from "lucide-react";
import { useTranslations } from "next-intl";

export default function EcommerceCategoryPage() {
  const t = useTranslations("ext_admin");
  const columns = useColumns();
  const formConfig = useFormConfig();
  return (
    <DataTable
      apiEndpoint="/api/admin/ecommerce/category"
      model="ecommerceCategory"
      permissions={{
        access: "access.ecommerce.category",
        view: "view.ecommerce.category",
        create: "create.ecommerce.category",
        edit: "edit.ecommerce.category",
        delete: "delete.ecommerce.category",
      }}
      pageSize={12}
      canCreate
      canEdit
      canDelete
      canView
      title={t("product_categories")}
      description={t("organize_product_categories")}
      itemTitle="Category"
      columns={columns}
      formConfig={formConfig}
      design={{
        animation: "orbs",
        primaryColor: "amber",
        secondaryColor: "emerald",
        icon: Tag,
      }}
    />
  );
}
