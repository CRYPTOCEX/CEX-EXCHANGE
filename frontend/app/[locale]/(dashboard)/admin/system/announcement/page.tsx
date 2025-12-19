"use client";
import DataTable from "@/components/blocks/data-table";
import { Megaphone } from "lucide-react";
import { useColumns, useFormConfig } from "./columns";
import { useAnalytics } from "./analytics";
import { useTranslations } from "next-intl";
export default function AnnouncementPage() {
  const t = useTranslations("dashboard_admin");
  const columns = useColumns();
  const formConfig = useFormConfig();
  const analytics = useAnalytics();
  return (
    <DataTable
      apiEndpoint="/api/admin/system/announcement"
      model="announcement"
      permissions={{
        access: "access.announcement",
        view: "view.announcement",
        create: "create.announcement",
        edit: "edit.announcement",
        delete: "delete.announcement",
      }}
      pageSize={12}
      canCreate
      canEdit
      canDelete
      canView
      isParanoid={false}
      title="Announcements"
      description={t("manage_system_announcements_and_notifications")}
      itemTitle="Announcement"
      columns={columns}
      formConfig={formConfig}
      analytics={analytics}
      design={{
        animation: "orbs",
        icon: Megaphone,
      }}
    />
  );
}
