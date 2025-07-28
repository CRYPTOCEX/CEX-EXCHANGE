"use client";
import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";
import { analytics } from "./analytics";
export default function AnnouncementPage() {
  return (
    <DataTable
      apiEndpoint="/api/admin/system/announcement"
      model="announcement"
      permissions={{
        access: "access.system.announcement",
        view: "view.system.announcement",
        create: "create.system.announcement",
        edit: "edit.system.announcement",
        delete: "delete.system.announcement",
      }}
      pageSize={10}
      canCreate={true}
      canEdit={true}
      canDelete={true}
      canView={true}
      title="Announcements"
      itemTitle="Announcement"
      columns={columns}
      analytics={analytics}
    />
  );
}
