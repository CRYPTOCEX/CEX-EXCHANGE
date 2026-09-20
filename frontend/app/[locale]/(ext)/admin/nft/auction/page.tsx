"use client";
import DataTable from "@/components/blocks/data-table";
import { useColumns, useFormConfig, useViewConfig } from "./columns";
import { nftAuctionAnalytics } from "./analytics";
import { useTranslations } from "next-intl";
import { Layers } from "lucide-react";

export default function NFTAuctionsPage() {
  const t = useTranslations("ext_admin");
  const columns = useColumns();
  const formConfig = useFormConfig();
  const viewConfig = useViewConfig();

  // Create/Edit/Delete for NFT resources are user-side only; admin can disable via the status column.
  return (
    <DataTable
      apiEndpoint="/api/admin/nft/auction"
      model="nftListing"
      /**
       * An auction IS an `nftListing` with `type: "AUCTION"`. Without this the
       * analytics tab aggregated EVERY listing — fixed-price sales included —
       * under headings that all say "auction" or "bid".
       */
      modelConfig={{ type: "AUCTION" }}
      permissions={{
        access: "access.nft.auction",
        view: "view.nft.auction",
        create: "create.nft.auction",
        edit: "edit.nft.auction",
        delete: "delete.nft.auction",
      }}
      pageSize={12}
      canCreate={false}
      canEdit={false}
      canDelete={false}
      canView={true}
      isParanoid={false}
      title={t("nft_auctions")}
      itemTitle="Auction"
      description={t("manage_and_monitor_nft_auction_events")}
      columns={columns}
      formConfig={formConfig}
      viewConfig={viewConfig}
      analytics={nftAuctionAnalytics}
      design={{
        icon: Layers,
      }}
    />
  );
}