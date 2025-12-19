"use client";
import DataTable from "@/components/blocks/data-table";
import { Bell } from "lucide-react";
import { useColumns, useFormConfig } from "./columns";
import { useTranslations } from "next-intl";
export default function NotificationTemplatesPage() {
  const t = useTranslations("dashboard_admin");
  const columns = useColumns();
  const formConfig = useFormConfig();
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
      pageSize={12}
      canCreate={false}
      canEdit
      editLink="/admin/system/notification/template/[id]"
      canDelete={false}
      canView
      isParanoid={false}
      title={t("notification_templates")}
      description={t("manage_notification_templates_and_messaging")}
      itemTitle="Notification Template"
      columns={columns}
      formConfig={formConfig}
      design={{
        animation: "orbs",
        icon: Bell,
      }}
    />
  );
}
