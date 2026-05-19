"use client";
import DataTable from "@/components/blocks/data-table";
import { useColumns, useFormConfig } from "./columns";
import { nftAuctionAnalytics } from "./analytics";
import { useTranslations } from "next-intl";
import { Layers } from "lucide-react";

export default function NFTAuctionsPage() {
  const t = useTranslations("ext_admin");
  const columns = useColumns();
  const formConfig = useFormConfig();

  return (
    <DataTable
      apiEndpoint="/api/admin/nft/auction"
      model="nftListing"
      permissions={{
        access: "access.nft.auction",
        view: "view.nft.auction",
        create: "create.nft.auction",
        edit: "edit.nft.auction",
        delete: "delete.nft.auction",
      }}
      pageSize={12}
      canCreate={false}
      canEdit={true}
      canDelete={false}
      canView={true}
      isParanoid={false}
      title="NFT Auctions"
      itemTitle="Auction"
      description={t("manage_and_monitor_nft_auction_events")}
      columns={columns}
      formConfig={formConfig}
      analytics={nftAuctionAnalytics}
      design={{
        animation: "orbs",
        primaryColor: "purple",
        secondaryColor: "pink",
        icon: Layers,
      }}
    />
  );
}