"use client";
import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";
import { nftActivityAnalytics } from "./analytics";

export default function NFTActivityPage() {
  return (
    <DataTable
      apiEndpoint="/api/admin/nft/activity"
      model="nftActivity"
      permissions={{
        access: "access.nft.activity",
        view: "view.nft.activity",
        create: "create.nft.activity",
        edit: "edit.nft.activity",
        delete: "delete.nft.activity",
      }}
      pageSize={15}
      canCreate={false}
      canEdit={false}
      canDelete={true}
      canView={true}
      isParanoid={true}
      title="NFT Activity"
      itemTitle="Activity"
      description="Monitor all marketplace activity including mints, sales, transfers, and bids"
      columns={columns}
      analytics={nftActivityAnalytics}
    />
  );
} 