"use client";
import DataTable from "@/components/blocks/data-table";
import { useColumns, useFormConfig } from "./columns";
import { nftCreatorAnalytics } from "./analytics";
import { useTranslations } from "next-intl";
import { Users } from "lucide-react";

export default function NFTCreatorsPage() {
  const t = useTranslations("ext_admin");
  const columns = useColumns();
  const formConfig = useFormConfig();

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
      canEdit={true}
      canDelete={false}
      canView={true}
      isParanoid={false}
      title="NFT Creators"
      itemTitle="Creator"
      description={t("manage_nft_creator_profiles_verification_status")}
      columns={columns}
      formConfig={formConfig}
      analytics={nftCreatorAnalytics}
      design={{
        animation: "orbs",
        primaryColor: "purple",
        secondaryColor: "pink",
        icon: Users,
      }}
    />
  );
}