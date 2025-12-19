"use client";
import DataTable from "@/components/blocks/data-table";
import { useColumns, useFormConfig } from "./columns";
import { analytics } from "./analytics";
import { Package } from "lucide-react";
import { useTranslations } from "next-intl";

export default function OfferingsList() {
  const t = useTranslations("ext_admin");
  const columns = useColumns();
  const formConfig = useFormConfig();
  return (
    <DataTable
      apiEndpoint="/api/admin/ico/offer"
      model="icoTokenOffering"
      permissions={{
        access: "access.ico.offer",
        view: "view.ico.offer",
        create: "create.ico.offer",
        edit: "edit.ico.offer",
        delete: "delete.ico.offer",
      }}
      pageSize={12}
      canCreate={true}
      createLink="/admin/ico/offer/create"
      canEdit={false}
      canDelete={true}
      canView={true}
      viewLink="/admin/ico/offer/[id]"
      isParanoid={true}
      title="ICO Token Offerings"
      itemTitle="ICO Token Offering"
      description={t("manage_token_offerings_and_configurations")}
      columns={columns}
      formConfig={formConfig}
      analytics={analytics}
      design={{
        animation: "orbs",
        primaryColor: 'teal',
        secondaryColor: 'cyan',
        icon: Package,
      }}
    />
  );
}
