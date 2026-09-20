"use client";
import DataTable from "@/components/blocks/data-table";
import { useColumns, useFormConfig, useViewConfig } from "./columns";
import { nftCollectionAnalytics } from "./analytics";
import { useTranslations } from "next-intl";
import { Folder } from "lucide-react";

export default function NFTCollectionsPage() {
  const t = useTranslations("ext_admin");
  const columns = useColumns();
  const formConfig = useFormConfig();
  const viewConfig = useViewConfig();

  // Create/Edit/Delete for NFT resources are user-side only; admin can disable via the status column.
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
      canDelete={false}
      canView={true}
      isParanoid={true}
      title={t("nft_collections")}
      itemTitle="Collection"
      description={t("manage_nft_collection_configurations")}
      columns={columns}
      formConfig={formConfig}
      viewConfig={viewConfig}
      analytics={nftCollectionAnalytics}
      design={{
        icon: Folder,
      }}
    />
  );
} 