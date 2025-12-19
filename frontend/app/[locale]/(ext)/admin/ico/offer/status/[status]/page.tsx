"use client";
import DataTable from "@/components/blocks/data-table";
import { useColumns } from "../../columns";
import { analytics } from "../../analytics";
import { useParams } from "next/navigation";
import { Package } from "lucide-react";
import { useTranslations } from "next-intl";

export default function OfferingsList() {
  const t = useTranslations("ext_admin");
  const columns = useColumns();
  const { status } = useParams() as { status: string };
  const capitalizedStatus = status?.charAt(0).toUpperCase() + status.slice(1);
  return (
    <DataTable
      apiEndpoint="/api/admin/ico/offer"
      model="icoTokenOffering"
      modelConfig={{ status: capitalizedStatus }}
      permissions={{
        access: "view.ico.offer",
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
      title={`${capitalizedStatus} Token Offers`}
      itemTitle="ICO Token Offering"
      description={t("filter_token_offerings_by_status")}
      columns={columns}
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
