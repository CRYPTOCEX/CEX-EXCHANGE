"use client";
import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";
import { ecommerceProductAnalytics } from "./analytics";
export default function EcommerceProductPage() {
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
      pageSize={10}
      canCreate
      canEdit
      canDelete
      canView
      title="Ecommerce Products"
      itemTitle="Product"
      columns={columns}
      analytics={ecommerceProductAnalytics}
    />
  );
}
