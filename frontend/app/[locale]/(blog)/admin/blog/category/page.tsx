"use client";
import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";
export default function CategoryPage() {
  return (
    <DataTable
      apiEndpoint="/api/admin/blog/category"
      model="category"
      permissions={{
        access: "access.blog.category",
        view: "view.blog.category",
        create: "create.blog.category",
        edit: "edit.blog.category",
        delete: "delete.blog.category",
      }}
      pageSize={10}
      canCreate
      canEdit
      canDelete
      canView
      title="Category Management"
      itemTitle="Category"
      columns={columns}
    />
  );
}
