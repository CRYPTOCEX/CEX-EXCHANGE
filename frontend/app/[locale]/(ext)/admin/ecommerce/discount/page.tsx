"use client";
import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";
import { ecommerceDiscountAnalytics } from "./analytics";
export default function EcommerceDiscountPage() {
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
      pageSize={10}
      canCreate
      canEdit
      canDelete
      canView
      title="Ecommerce Discounts"
      itemTitle="Discount"
      columns={columns}
      analytics={ecommerceDiscountAnalytics}
    />
  );
}
