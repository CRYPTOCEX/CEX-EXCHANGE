"use client";
import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";
import { nftAuctionAnalytics } from "./analytics";
import { useTranslations } from "next-intl";

export default function NFTAuctionsPage() {
  const t = useTranslations("ext");
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
      description={t("monitor_nft_auction_activity_track_bidding")}
      columns={columns}
      analytics={nftAuctionAnalytics}
    />
  );
}