"use client";
import DataTable from "@/components/blocks/data-table";
import { useColumns, useFormConfig, useViewConfig } from "./columns";
import { nftOfferAnalytics } from "./analytics";
import { useTranslations } from "next-intl";
import { Zap } from "lucide-react";

export default function NFTOffersPage() {
  const t = useTranslations("ext_admin");
  const columns = useColumns();
  const formConfig = useFormConfig();
  const viewConfig = useViewConfig();

  // Create/Edit/Delete for NFT resources are user-side only; admin can disable via the status column.
  return (
    <DataTable
      apiEndpoint="/api/admin/nft/offer"
      model="nftOffer"
      permissions={{
        access: "access.nft.offer",
        view: "view.nft.offer",
        create: "create.nft.offer",
        edit: "edit.nft.offer",
        delete: "delete.nft.offer",
      }}
      pageSize={12}
      canCreate={false}
      canEdit={false}
      canDelete={false}
      canView={true}
      isParanoid={false}
      title={t("nft_offers_bids")}
      itemTitle="Offer"
      description={t("monitor_and_manage_purchase_offers_and")}
      columns={columns}
      formConfig={formConfig}
      viewConfig={viewConfig}
      analytics={nftOfferAnalytics}
      design={{
        icon: Zap,
      }}
    />
  );
}