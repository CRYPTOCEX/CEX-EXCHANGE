"use client";
import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";
import { nftCreatorAnalytics } from "./analytics";

export default function NFTCreatorsPage() {
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
      description="Manage creator profiles, verification status, and performance analytics"
      columns={columns}
      analytics={nftCreatorAnalytics}
    />
  );
}