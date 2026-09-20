"use client";
import DataTable from "@/components/blocks/data-table";
import { useColumns, useFormConfig, useViewConfig } from "./columns";
import { nftCreatorAnalytics } from "./analytics";
import { useTranslations } from "next-intl";
import { Users } from "lucide-react";

export default function NFTCreatorsPage() {
  const t = useTranslations("ext_admin");
  const columns = useColumns();
  const formConfig = useFormConfig();
  const viewConfig = useViewConfig();

  // Create/Edit/Delete for NFT resources are user-side only; admin can disable via the status column.
  return (
    <DataTable
      apiEndpoint="/api/admin/nft/creator"
      model="nftCreator"
      permissions={{
        access: "access.nft.creator",
        view: "view.nft.creator",
        create: "create.nft.creator",
        edit: "edit.nft.creator",
        delete: "delete.nft.creator",
      }}
      pageSize={12}
      canCreate={false}
      canEdit={false}
      canDelete={false}
      canView={true}
      isParanoid={false}
      title={t("nft_creators")}
      itemTitle="Creator"
      description={t("manage_nft_creator_profiles_verification_status")}
      columns={columns}
      formConfig={formConfig}
      viewConfig={viewConfig}
      analytics={nftCreatorAnalytics}
      design={{
        icon: Users,
      }}
    />
  );
}