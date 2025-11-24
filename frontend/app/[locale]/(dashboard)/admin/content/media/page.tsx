"use client";
import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";
export default function MediaPage() {
  return (
    <DataTable
      apiEndpoint="/api/admin/content/media"
      model="media"
      permissions={{
        access: "access.content.media",
        view: "view.content.media",
        create: "create.content.media",
        edit: "edit.content.media",
        delete: "delete.content.media",
      }}
      pageSize={10}
      canDelete
      title="Media Management"
      itemTitle="Media"
      columns={columns}
    />
  );
}
