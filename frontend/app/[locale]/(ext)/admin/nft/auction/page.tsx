"use client";
import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";
import { nftAuctionAnalytics } from "./analytics";

export default function NFTAuctionsPage() {
  return (
    <DataTable
      apiEndpoint="/api/admin/nft/auction"
      model="nftAuction"
      permissions={{
        access: "access.nft.auction",
        view: "view.nft.auction",
        create: "create.nft.auction",
        edit: "edit.nft.auction",
        delete: "delete.nft.auction",
      }}
      pageSize={10}
      canCreate={false}
      canEdit={true}
      canDelete={false}
      canView={true}
      isParanoid={false}
      title="NFT Auctions"
      itemTitle="Auction"
      description="Monitor NFT auction activity, track bidding performance, and manage auction lifecycle"
      columns={columns}
      analytics={nftAuctionAnalytics}
    />
  );
}