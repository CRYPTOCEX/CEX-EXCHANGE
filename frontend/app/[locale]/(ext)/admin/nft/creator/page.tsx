"use client";
import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";
import { nftCreatorAnalytics } from "./analytics";
import { useTranslations } from "next-intl";

export default function NFTCreatorsPage() {
  const t = useTranslations("ext");
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
      pageSize={10}
      canCreate={false}
      canEdit={true}
      canDelete={false}
      canView={true}
      isParanoid={false}
      title="NFT Creators"
      itemTitle="Creator"
      description={t("manage_creator_profiles_verification_status_and")}
      columns={columns}
      analytics={nftCreatorAnalytics}
    />
  );
}