"use client";
import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";
import { ecommerceShippingAnalytics } from "./analytics";
export default function EcommerceShippingPage() {
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
      pageSize={10}
      canCreate
      canEdit
      canDelete
      canView
      title="Ecommerce Shipping"
      itemTitle="Shipping"
      columns={columns}
      analytics={ecommerceShippingAnalytics}
    />
  );
}
