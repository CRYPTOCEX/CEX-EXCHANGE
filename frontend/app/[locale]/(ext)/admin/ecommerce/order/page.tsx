"use client";
import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";
import { ecommerceOrderAnalytics } from "./analytics";
export default function EcommerceOrderPage() {
  return (
    <DataTable
      apiEndpoint="/api/admin/ecommerce/order"
      model="ecommerceOrder"
      permissions={{
        access: "access.ecommerce.order",
        view: "view.ecommerce.order",
        create: "create.ecommerce.order",
        edit: "edit.ecommerce.order",
        delete: "delete.ecommerce.order",
      }}
      pageSize={10}
      canDelete
      viewLink="/admin/ecommerce/order/[id]"
      title="Ecommerce Orders"
      itemTitle="Order"
      columns={columns}
      analytics={ecommerceOrderAnalytics}
    />
  );
}
