"use client";
import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";
export default function NotificationTemplatesPage() {
  return (
    <DataTable
      apiEndpoint="/api/admin/system/notification/template"
      model="notificationTemplate"
      permissions={{
        access: "access.notification.template",
        view: "view.notification.template",
        create: "create.notification.template",
        edit: "edit.notification.template",
        delete: "delete.notification.template",
      }}
      pageSize={10}
      canEdit={true}
      editLink="/admin/system/notification/template/[id]"
      canView={true}
      isParanoid={false}
      title="Notification Templates"
      itemTitle="Notification Template"
      columns={columns}
    />
  );
}
