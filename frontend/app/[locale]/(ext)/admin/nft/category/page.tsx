"use client";
import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";
import { nftCategoryAnalytics } from "./analytics";

export default function NFTCategoriesPage() {
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
      pageSize={10}
      canCreate={true}
      canEdit={true}
      canDelete={true}
      canView={true}
      isParanoid={true}
      title="NFT Categories"
      itemTitle="Category"
      description="Manage NFT categories and genres for better organization and discovery"
      columns={columns}
      analytics={nftCategoryAnalytics}
    />
  );
}