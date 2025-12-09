"use client";
import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";
import { nftListingAnalytics } from "./analytics";
import { useTranslations } from "next-intl";

export default function NFTListingsPage() {
  const t = useTranslations("ext");
  return (
    <DataTable
      apiEndpoint="/api/admin/nft/listing"
      model="nftListing"
      permissions={{
        access: "access.nft.listing",
        view: "view.nft.listing",
        create: "create.nft.listing",
        edit: "edit.nft.listing",
        delete: "delete.nft.listing",
      }}
      pageSize={10}
      canCreate={false}
      canEdit={true}
      canDelete={true}
      canView={true}
      isParanoid={true}
      title="NFT Listings"
      itemTitle="Listing"
      description={t("monitor_active_marketplace_listings_auctions_and")}
      columns={columns}
      analytics={nftListingAnalytics}
    />
  );
} 