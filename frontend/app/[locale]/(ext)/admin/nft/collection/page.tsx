"use client";
import DataTable from "@/components/blocks/data-table";
import { useColumns, useFormConfig } from "./columns";
import { nftCollectionAnalytics } from "./analytics";
import { useTranslations } from "next-intl";
import { Folder } from "lucide-react";

export default function NFTCollectionsPage() {
  const t = useTranslations("ext_admin");
  const columns = useColumns();
  const formConfig = useFormConfig();

  return (
    <DataTable
      apiEndpoint="/api/admin/nft/collection"
      model="nftCollection"
      permissions={{
        access: "access.nft.collection",
        view: "view.nft.collection",
        create: "create.nft.collection",
        edit: "edit.nft.collection",
        delete: "delete.nft.collection",
      }}
      pageSize={12}
      canCreate={false}
      canEdit={true}
      canDelete={true}
      canView={true}
      isParanoid={true}
      title="NFT Collections"
      itemTitle="Collection"
      description={t("manage_nft_collection_configurations")}
      columns={columns}
      formConfig={formConfig}
      analytics={nftCollectionAnalytics}
      design={{
        animation: "orbs",
        primaryColor: "purple",
        secondaryColor: "pink",
        icon: Folder,
      }}
    />
  );
} 