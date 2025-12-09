"use client";
import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";
import { nftTokenAnalytics } from "./analytics";
import { useTranslations } from "next-intl";

export default function NFTsPage() {
  const t = useTranslations("ext");
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
      pageSize={10}
      canCreate={false}
      canEdit={true}
      canDelete={true}
      canView={true}
      isParanoid={true}
      title="NFTs"
      itemTitle="NFT"
      description={t("manage_individual_nfts_review_content_and")}
      columns={columns}
      analytics={nftTokenAnalytics}
    />
  );
} 