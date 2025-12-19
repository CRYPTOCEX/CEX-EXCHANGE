"use client";
import DataTable from "@/components/blocks/data-table";
import { useColumns } from "./columns";
import { useAnalytics } from "./analytics";
import { ShoppingBag } from "lucide-react";
import { useTranslations } from "next-intl";

export default function EcommerceOrderPage() {
  const t = useTranslations("ext_admin");
  const columns = useColumns();
  const analytics = useAnalytics();
  return (
    <DataTable
      apiEndpoint="/api/admin/ecommerce/order"
      model="ecommerceOrder"
      permissions={{
        access: "access.ecommerce.order",
        view: "view.ecommerce.order",
        create: "create.ecommerce.order",
        edit: "edit.ecommerce.order",
        delete: "delete.ecommerce.order"}}
      pageSize={12}
      canDelete
      canView
      viewLink="/admin/ecommerce/order/[id]"
      title={t("customer_orders")}
      description={t("process_and_manage_customer_orders")}
      itemTitle="Order"
      columns={columns}
      analytics={analytics}
      design={{
        animation: "orbs",
        primaryColor: "amber",
        secondaryColor: "emerald",
        icon: ShoppingBag}}
    />
  );
}
