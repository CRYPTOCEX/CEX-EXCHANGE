"use client";
import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";
import { nftCollectionAnalytics } from "./analytics";

export default function NFTCollectionsPage() {
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
      pageSize={10}
      canCreate={false}
      canEdit={true}
      canDelete={true}
      canView={true}
      isParanoid={true}
      title="NFT Collections"
      itemTitle="Collection"
      description="Manage NFT collections, verify creators, and monitor collection performance"
      columns={columns}
      analytics={nftCollectionAnalytics}
    />
  );
} 