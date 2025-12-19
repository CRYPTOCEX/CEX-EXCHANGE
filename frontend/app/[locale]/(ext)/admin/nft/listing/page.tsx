"use client";
import DataTable from "@/components/blocks/data-table";
import { useColumns, useFormConfig } from "./columns";
import { nftListingAnalytics } from "./analytics";
import { useTranslations } from "next-intl";
import { ShoppingBag } from "lucide-react";

export default function NFTListingsPage() {
  const t = useTranslations("ext_admin");
  const columns = useColumns();
  const formConfig = useFormConfig();

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
      pageSize={12}
      canCreate={false}
      canEdit={true}
      canDelete={true}
      canView={true}
      isParanoid={true}
      title="NFT Listings"
      itemTitle="Listing"
      description={t("monitor_active_marketplace_listings_and_auctions")}
      columns={columns}
      formConfig={formConfig}
      analytics={nftListingAnalytics}
      design={{
        animation: "orbs",
        primaryColor: "purple",
        secondaryColor: "pink",
        icon: ShoppingBag,
      }}
    />
  );
} 