"use client";
import DataTable from "@/components/blocks/data-table";
import { useColumns, useFormConfig } from "./columns";
import { nftOfferAnalytics } from "./analytics";
import { useTranslations } from "next-intl";
import { Zap } from "lucide-react";

export default function NFTOffersPage() {
  const t = useTranslations("ext_admin");
  const columns = useColumns();
  const formConfig = useFormConfig();

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
      canEdit={true}
      canDelete={true}
      canView={true}
      isParanoid={true}
      title="NFT Offers & Bids"
      itemTitle="Offer"
      description={t("monitor_and_manage_purchase_offers_and")}
      columns={columns}
      formConfig={formConfig}
      analytics={nftOfferAnalytics}
      design={{
        animation: "orbs",
        primaryColor: "purple",
        secondaryColor: "pink",
        icon: Zap,
      }}
    />
  );
}