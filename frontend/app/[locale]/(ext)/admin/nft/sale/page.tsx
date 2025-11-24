"use client";
import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";
import { nftSaleAnalytics } from "./analytics";

export default function NFTSalesPage() {
  return (
    <DataTable
      apiEndpoint="/api/admin/nft/sale"
      model="nftSale"
      permissions={{
        access: "access.nft.sale",
        view: "view.nft.sale",
        create: "create.nft.sale",
        edit: "edit.nft.sale",
        delete: "delete.nft.sale",
      }}
      pageSize={10}
      canCreate={false}
      canEdit={false}
      canDelete={false}
      canView={true}
      isParanoid={true}
      title="NFT Sales"
      itemTitle="Sale"
      description="Monitor completed sales transactions and marketplace revenue"
      columns={columns}
      analytics={nftSaleAnalytics}
    />
  );
} 