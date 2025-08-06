"use client";
import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";
import { nftTokenAnalytics } from "./analytics";

export default function NFTsPage() {
  return (
    <DataTable
      apiEndpoint="/api/admin/nft/token"
      model="nftToken"
      permissions={{
        access: "access.nft.token",
        view: "view.nft.token",
        create: "create.nft.token",
        edit: "edit.nft.token",
        delete: "delete.nft.token",
      }}
      pageSize={10}
      canCreate={false}
      canEdit={true}
      canDelete={true}
      canView={true}
      isParanoid={true}
      title="NFTs"
      itemTitle="NFT"
      description="Manage individual NFTs, review content, and moderate listings"
      columns={columns}
      analytics={nftTokenAnalytics}
    />
  );
} 