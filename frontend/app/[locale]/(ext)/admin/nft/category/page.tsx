"use client";
import DataTable from "@/components/blocks/data-table";
import { useColumns, useFormConfig } from "./columns";
import { nftCategoryAnalytics } from "./analytics";
import { useTranslations } from "next-intl";
import { Palette } from "lucide-react";

export default function NFTCategoriesPage() {
  const t = useTranslations("ext_admin");
  const columns = useColumns();
  const formConfig = useFormConfig();

  return (
    <DataTable
      apiEndpoint="/api/admin/nft/category"
      model="nftCategory"
      permissions={{
        access: "access.nft.category",
        view: "view.nft.category",
        create: "create.nft.category",
        edit: "edit.nft.category",
        delete: "delete.nft.category",
      }}
      pageSize={12}
      canCreate={true}
      canEdit={true}
      canDelete={true}
      canView={true}
      isParanoid={true}
      title="NFT Categories"
      itemTitle="Category"
      description={t("organize_and_manage_nft_collection_categories")}
      columns={columns}
      formConfig={formConfig}
      analytics={nftCategoryAnalytics}
      design={{
        animation: "orbs",
        primaryColor: "purple",
        secondaryColor: "pink",
        icon: Palette,
      }}
    />
  );
}