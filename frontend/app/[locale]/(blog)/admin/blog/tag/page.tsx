"use client";
import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";
import { tagAnalytics } from "./analytics";
export default function TagPage() {
  return (
    <DataTable
      apiEndpoint="/api/admin/blog/tag"
      model="tag"
      permissions={{
        access: "access.blog.tag",
        view: "view.blog.tag",
        create: "create.blog.tag",
        edit: "edit.blog.tag",
        delete: "delete.blog.tag",
      }}
      pageSize={10}
      canCreate
      canEdit
      canDelete
      canView
      title="Tag Management"
      itemTitle="Tag"
      columns={columns}
      analytics={tagAnalytics}
    />
  );
}
