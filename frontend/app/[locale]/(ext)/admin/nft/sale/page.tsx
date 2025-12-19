"use client";
import DataTable from "@/components/blocks/data-table";
import { useColumns } from "./columns";
import { nftSaleAnalytics } from "./analytics";
import { useTranslations } from "next-intl";
import { TrendingUp } from "lucide-react";

export default function NFTSalesPage() {
  const t = useTranslations("ext_admin");
  const columns = useColumns();

  return (
    <DataTable
      apiEndpoint="/api/admin/nft/sale"
      model="nftSale"
      permissions={{
        access: "access.nft.sale",
        view: "view.nft.sale",
        create: "create.nft.sale",
        edit: "edit.nft.sale",
        delete: "delete.nft.sale"}}
      pageSize={12}
      canCreate={false}
      canEdit={false}
      canDelete={false}
      canView={true}
      isParanoid={true}
      title="NFT Sales"
      itemTitle="Sale"
      description={t("track_and_analyze_completed_nft_sales")}
      columns={columns}
      analytics={nftSaleAnalytics}
      design={{
        animation: "orbs",
        primaryColor: "purple",
        secondaryColor: "pink",
        icon: TrendingUp}}
    />
  );
} 