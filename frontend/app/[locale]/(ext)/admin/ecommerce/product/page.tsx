"use client";
import DataTable from "@/components/blocks/data-table";
import { useColumns, useFormConfig } from "./columns";
import { useAnalytics } from "./analytics";
import { Package } from "lucide-react";
import { useTranslations } from "next-intl";

export default function EcommerceProductPage() {
  const t = useTranslations("ext_admin");
  const columns = useColumns();
  const formConfig = useFormConfig();
  const analytics = useAnalytics();
  return (
    <DataTable
      apiEndpoint="/api/admin/ecommerce/product"
      model="ecommerceProduct"
      permissions={{
        access: "access.ecommerce.product",
        view: "view.ecommerce.product",
        create: "create.ecommerce.product",
        edit: "edit.ecommerce.product",
        delete: "delete.ecommerce.product",
      }}
      pageSize={12}
      canCreate
      canEdit
      canDelete
      canView
      title={t("store_products")}
      description={t("manage_your_product_catalog")}
      itemTitle="Product"
      columns={columns}
      formConfig={formConfig}
      analytics={analytics}
      design={{
        animation: "orbs",
        primaryColor: "amber",
        secondaryColor: "emerald",
        icon: Package,
      }}
    />
  );
}
