"use client";
import DataTable from "@/components/blocks/data-table";
import { useColumns, useFormConfig } from "./columns";
import { nftTokenAnalytics } from "./analytics";
import { useTranslations } from "next-intl";
import { Gem } from "lucide-react";

export default function NFTsPage() {
  const t = useTranslations("ext_admin");
  const columns = useColumns();
  const formConfig = useFormConfig();

  return (
    <DataTable
      apiEndpoint="/api/admin/nft/token"
      model="nftToken"
      permissions={{
        access: "access.nft.token",
        view: "view.nft.token",
        create: "create.nft.token",
        edit: "edit.nft.token",
        delete: "delete.nft.token",
      }}
      pageSize={12}
      canCreate={false}
      canEdit={true}
      canDelete={true}
      canView={true}
      isParanoid={true}
      title="NFTs"
      itemTitle="NFT"
      description={t("view_and_manage_individual_nft_items")}
      columns={columns}
      formConfig={formConfig}
      analytics={nftTokenAnalytics}
      design={{
        animation: "orbs",
        primaryColor: "purple",
        secondaryColor: "pink",
        icon: Gem,
      }}
    />
  );
} 