"use client";
import DataTable from "@/components/blocks/data-table";
import { useColumns, useFormConfig, useViewConfig } from "./columns";
import { nftListingAnalytics } from "./analytics";
import { useTranslations } from "next-intl";
import { ShoppingBag } from "lucide-react";

export default function NFTListingsPage() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const columns = useColumns();
  const formConfig = useFormConfig();
  const viewConfig = useViewConfig();

  // Create/Edit/Delete for NFT resources are user-side only; admin can disable via the status column.
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
      canEdit={false}
      canDelete={false}
      canView={true}
      isParanoid={false}
      title={tCommon("nft_listings")}
      itemTitle="Listing"
      description={t("monitor_active_marketplace_listings_and_auctions")}
      columns={columns}
      formConfig={formConfig}
      viewConfig={viewConfig}
      analytics={nftListingAnalytics}
      design={{
        icon: ShoppingBag,
      }}
    />
  );
} 