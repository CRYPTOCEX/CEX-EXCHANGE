"use client";
import DataTable from "@/components/blocks/data-table";
import { useColumns, useFormConfig } from "./columns";
import { useAnalytics } from "./analytics";
import { Percent } from "lucide-react";
import { useTranslations } from "next-intl";

export default function EcommerceDiscountPage() {
  const t = useTranslations("ext_admin");
  const columns = useColumns();
  const formConfig = useFormConfig();
  const analytics = useAnalytics();
  return (
    <DataTable
      apiEndpoint="/api/admin/ecommerce/discount"
      model="ecommerceDiscount"
      permissions={{
        access: "access.ecommerce.discount",
        view: "view.ecommerce.discount",
        create: "create.ecommerce.discount",
        edit: "edit.ecommerce.discount",
        delete: "delete.ecommerce.discount",
      }}
      pageSize={12}
      canCreate
      canEdit
      canDelete
      canView
      title={t("product_discounts")}
      description={t("configure_promotional_discounts")}
      itemTitle="Discount"
      columns={columns}
      formConfig={formConfig}
      analytics={analytics}
      design={{
        animation: "orbs",
        primaryColor: "amber",
        secondaryColor: "emerald",
        icon: Percent,
      }}
    />
  );
}
