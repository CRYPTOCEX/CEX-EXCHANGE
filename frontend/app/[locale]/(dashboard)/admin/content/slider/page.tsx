"use client";
import DataTable from "@/components/blocks/data-table";
import { Layers } from "lucide-react";
import { useColumns, useFormConfig } from "./columns";
import { useAnalytics } from "./analytics";
import { useTranslations } from "next-intl";
export default function SliderPage() {
  const t = useTranslations("dashboard_admin");
  const columns = useColumns();
  const formConfig = useFormConfig();
  const analytics = useAnalytics();
  return (
    <DataTable
      apiEndpoint="/api/admin/content/slider"
      model="slider"
      permissions={{
        access: "access.slider",
        view: "view.slider",
        create: "create.slider",
        edit: "edit.slider",
        delete: "delete.slider",
      }}
      pageSize={12}
      canCreate
      canEdit
      canDelete
      canView
      title={t("slider_management")}
      description={t("manage_homepage_sliders_and_promotional_banners")}
      itemTitle="Slider"
      columns={columns}
      formConfig={formConfig}
      analytics={analytics}
      design={{
        animation: "orbs",
        icon: Layers,
      }}
    />
  );
}
