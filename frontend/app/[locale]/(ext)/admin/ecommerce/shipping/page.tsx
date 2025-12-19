"use client";
import DataTable from "@/components/blocks/data-table";
import { useColumns, useFormConfig } from "./columns";
import { useAnalytics } from "./analytics";
import { Truck } from "lucide-react";
import { useTranslations } from "next-intl";

export default function EcommerceShippingPage() {
  const t = useTranslations("ext_admin");
  const columns = useColumns();
  const formConfig = useFormConfig();
  const analytics = useAnalytics();
  return (
    <DataTable
      apiEndpoint="/api/admin/ecommerce/shipping"
      model="ecommerceShipping"
      permissions={{
        access: "access.ecommerce.shipping",
        view: "view.ecommerce.shipping",
        create: "create.ecommerce.shipping",
        edit: "edit.ecommerce.shipping",
        delete: "delete.ecommerce.shipping",
      }}
      pageSize={12}
      canCreate
      canEdit
      canDelete
      canView
      title={t("shipping_records")}
      description={t("manage_shipping_methods_and_rates")}
      itemTitle="Shipping"
      columns={columns}
      formConfig={formConfig}
      analytics={analytics}
      design={{
        animation: "orbs",
        primaryColor: "amber",
        secondaryColor: "emerald",
        icon: Truck,
      }}
    />
  );
}
