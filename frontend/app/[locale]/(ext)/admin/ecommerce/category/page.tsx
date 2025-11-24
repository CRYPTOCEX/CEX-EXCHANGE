"use client";
import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";
export default function EcommerceCategoryPage() {
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
      pageSize={10}
      canCreate
      canEdit
      canDelete
      canView
      title="Ecommerce Categories"
      itemTitle="Category"
      columns={columns}
    />
  );
}
